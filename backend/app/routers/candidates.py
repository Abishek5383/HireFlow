import os
import hashlib
import logging
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from app.database.mongodb import get_database
from app.schemas.candidate import CandidateResponse, CandidateStatus, CandidateStatusUpdate
from app.utils.auth_helpers import get_current_user
from app.services.parser_service import extract_text
from app.services.matcher_service import calculate_skill_match
from app.ai.gemini_service import (
    generate_candidate_profile, 
    generate_candidate_summary, 
    generate_interview_questions,
    generate_preparation_notes
)
from app.services.question_generation import generate_interview_questions_from_resume
import random
import string

def generate_google_meet_link() -> str:
    part1 = "".join(random.choices(string.ascii_lowercase, k=3))
    part2 = "".join(random.choices(string.ascii_lowercase, k=4))
    part3 = "".join(random.choices(string.ascii_lowercase, k=3))
    return f"https://meet.google.com/{part1}-{part2}-{part3}"

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/candidates", tags=["Candidates"])

# Ensure uploads directory exists
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Size limit: 10 MB
MAX_FILE_SIZE = 10 * 1024 * 1024

def serialize_doc(doc) -> dict:
    if not doc:
        return None
    serialized = doc.copy()
    serialized["id"] = str(serialized["_id"])
    del serialized["_id"]
    for field in ["job_id", "resume_id"]:
        if field in serialized and isinstance(serialized[field], ObjectId):
            serialized[field] = str(serialized[field])
    return serialized

@router.post("/upload", response_model=List[CandidateResponse], status_code=status.HTTP_201_CREATED)
async def upload_resumes(
    job_id: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    
    # Verify Job exists
    try:
        job_obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Job ID format")
        
    job = await db.Jobs.find_one({"_id": job_obj_id})
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")
        
    job_required_skills = job.get("required_skills", [])
    
    created_candidates = []
    
    for file in files:
        # 1. Validate File Extension
        filename = file.filename
        _, ext = os.path.splitext(filename.lower())
        if ext not in [".pdf", ".docx"]:
            logger.warning(f"Rejected upload of {filename}: invalid file type")
            continue  # Skip invalid files or raise exception. Let's skip and log, or raise if bulk is empty
            
        # 2. Read content and compute hash for duplicate detection
        content = await file.read()
        file_size = len(content)
        
        # Validate File Size
        if file_size > MAX_FILE_SIZE:
            logger.warning(f"Rejected upload of {filename}: size {file_size} exceeds limit")
            continue
            
        file_hash = hashlib.sha256(content).hexdigest()
        
        # 3. Check for duplicates
        existing_resume = await db.Resumes.find_one({"file_hash": file_hash})
        if existing_resume:
            # Check if this candidate is already uploaded for THIS specific job
            existing_candidate = await db.Candidates.find_one({
                "job_id": job_obj_id,
                "resume_id": existing_resume["_id"]
            })
            if existing_candidate:
                logger.info(f"Skipping duplicate resume for same job: {filename}")
                # We can append it to returned list or skip it
                created_candidates.append(existing_candidate)
                continue
            
            # If resume exists but for a different job, reuse the resume record
            resume_obj_id = existing_resume["_id"]
            file_path = existing_resume["file_path"]
        else:
            # Save new file
            file_path = os.path.join(UPLOAD_DIR, f"{file_hash}{ext}")
            with open(file_path, "wb") as f:
                f.write(content)
                
            # Insert into Resumes collection
            resume_entry = {
                "filename": filename,
                "file_path": file_path,
                "file_hash": file_hash,
                "uploaded_at": datetime.utcnow()
            }
            resume_res = await db.Resumes.insert_one(resume_entry)
            resume_obj_id = resume_res.inserted_id
            
        # 4. Text Extraction
        try:
            raw_text = extract_text(file_path)
        except Exception as e:
            logger.error(f"Error extracting text from {filename}: {str(e)}")
            continue
            
        # 5. Gemini Profile Parsing
        try:
            profile_data = await generate_candidate_profile(raw_text)
        except Exception as e:
            logger.error(f"Error parsing resume {filename} with Gemini: {str(e)}")
            continue
            
        # 6. Skill Matching
        cand_skills = profile_data.get("skills", [])
        match_percentage, matching_skills, missing_skills = calculate_skill_match(
            cand_skills, job_required_skills
        )
        
        # 7. Threshold & Status Assignment
        status_val = CandidateStatus.NEW
        if match_percentage < 40.0:
            status_val = CandidateStatus.REJECTED
            
        now = datetime.utcnow()
        candidate_entry = {
            "job_id": job_obj_id,
            "resume_id": resume_obj_id,
            "name": profile_data.get("name", "Unknown"),
            "email": profile_data.get("email", ""),
            "phone": profile_data.get("phone", ""),
            "skills": cand_skills,
            "experience_years": float(profile_data.get("experience_years", 0.0)),
            "education": profile_data.get("education", "Unknown"),
            "experience_details": profile_data.get("experience_details", []),
            "projects": profile_data.get("projects", []),
            "certifications": profile_data.get("certifications", []),
            "summary": None,  # Will be generated on-demand or detail load
            "match_percentage": match_percentage,
            "matching_skills": matching_skills,
            "missing_skills": missing_skills,
            "status": status_val,
            "created_at": now,
            "updated_at": now
        }
        
        cand_res = await db.Candidates.insert_one(candidate_entry)
        candidate_entry["_id"] = cand_res.inserted_id
        created_candidates.append(candidate_entry)
        
        # Log Activity
        await db.ActivityLogs.insert_one({
            "user_id": current_user["id"],
            "action": "RESUME_UPLOADED",
            "details": f"Uploaded resume and created candidate '{candidate_entry['name']}' for job '{job['title']}' (Match: {match_percentage}%)",
            "timestamp": now
        })
        
    if not created_candidates and files:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Failed to parse any of the uploaded resumes. Please check file formatting or integrity."
        )
        
    return [serialize_doc(c) for c in created_candidates]

@router.get("/job/{job_id}", response_model=List[CandidateResponse])
async def list_candidates_by_job(
    job_id: str,
    search: Optional[str] = None,
    status_filter: Optional[CandidateStatus] = None,
    min_match: Optional[float] = None,
    min_experience: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    try:
        job_obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Job ID format")
        
    job = await db.Jobs.find_one({"_id": job_obj_id})
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job requirement not found")
        
    job_required_skills = job.get("required_skills", [])
    
    # 1. Fetch all candidates for this job
    cursor = db.Candidates.find({"job_id": job_obj_id})
    candidates = await cursor.to_list(length=200)
    
    # 2. Recalculate skill matches dynamically
    for cand in candidates:
        match_percentage, matching_skills, missing_skills = calculate_skill_match(
            cand.get("skills", []), job_required_skills
        )
        if (cand.get("match_percentage") != match_percentage or 
            cand.get("matching_skills") != matching_skills or 
            cand.get("missing_skills") != missing_skills):
            
            status_val = cand.get("status")
            if status_val in [CandidateStatus.NEW.value, CandidateStatus.REJECTED.value]:
                status_val = CandidateStatus.REJECTED.value if match_percentage < 40.0 else CandidateStatus.NEW.value
                
            await db.Candidates.update_one(
                {"_id": cand["_id"]},
                {"$set": {
                    "match_percentage": match_percentage,
                    "matching_skills": matching_skills,
                    "missing_skills": missing_skills,
                    "status": status_val,
                    "updated_at": datetime.utcnow()
                }}
            )
            cand["match_percentage"] = match_percentage
            cand["matching_skills"] = matching_skills
            cand["missing_skills"] = missing_skills
            cand["status"] = status_val

    # Construct filters for the return query
    query = {"job_id": job_obj_id}
    
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
        
    if status_filter:
        query["status"] = status_filter.value
        
    if min_match is not None:
        query["match_percentage"] = {"$gte": min_match}
        
    if min_experience is not None:
        query["experience_years"] = {"$gte": min_experience}
        
    cursor = db.Candidates.find(query).sort("match_percentage", -1)
    filtered_candidates = await cursor.to_list(length=200)
    return [serialize_doc(c) for c in filtered_candidates]

@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    try:
        cand_obj_id = ObjectId(candidate_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Candidate ID format")
        
    candidate = await db.Candidates.find_one({"_id": cand_obj_id})
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
        
    # Generate AI professional summary if not cached
    job = await db.Jobs.find_one({"_id": candidate["job_id"]})
    if job:
        # Recalculate skill match dynamically on fetch
        match_percentage, matching_skills, missing_skills = calculate_skill_match(
            candidate.get("skills", []), job.get("required_skills", [])
        )
        if (candidate.get("match_percentage") != match_percentage or 
            candidate.get("matching_skills") != matching_skills or 
            candidate.get("missing_skills") != missing_skills):
            
            status_val = candidate.get("status")
            if status_val in [CandidateStatus.NEW.value, CandidateStatus.REJECTED.value]:
                status_val = CandidateStatus.REJECTED.value if match_percentage < 40.0 else CandidateStatus.NEW.value
                
            await db.Candidates.update_one(
                {"_id": cand_obj_id},
                {"$set": {
                    "match_percentage": match_percentage,
                    "matching_skills": matching_skills,
                    "missing_skills": missing_skills,
                    "status": status_val,
                    "updated_at": datetime.utcnow()
                }}
            )
            candidate["match_percentage"] = match_percentage
            candidate["matching_skills"] = matching_skills
            candidate["missing_skills"] = missing_skills
            candidate["status"] = status_val

        if not candidate.get("summary"):
            summary = await generate_candidate_summary(candidate, job)
            await db.Candidates.update_one(
                {"_id": cand_obj_id},
                {"$set": {"summary": summary, "updated_at": datetime.utcnow()}}
            )
            candidate["summary"] = summary
            
        if not candidate.get("suggested_meeting_link"):
            suggested_meeting_link = generate_google_meet_link()
            await db.Candidates.update_one(
                {"_id": cand_obj_id},
                {"$set": {"suggested_meeting_link": suggested_meeting_link, "updated_at": datetime.utcnow()}}
            )
            candidate["suggested_meeting_link"] = suggested_meeting_link
            
        if not candidate.get("suggested_notes"):
            suggested_notes = await generate_preparation_notes(candidate, job)
            await db.Candidates.update_one(
                {"_id": cand_obj_id},
                {"$set": {"suggested_notes": suggested_notes, "updated_at": datetime.utcnow()}}
            )
            candidate["suggested_notes"] = suggested_notes
            
    return serialize_doc(candidate)

@router.put("/{candidate_id}/status", response_model=CandidateResponse)
async def update_candidate_status(
    candidate_id: str,
    status_in: CandidateStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    try:
        cand_obj_id = ObjectId(candidate_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Candidate ID format")
        
    candidate = await db.Candidates.find_one({"_id": cand_obj_id})
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
        
    now = datetime.utcnow()
    await db.Candidates.update_one(
        {"_id": cand_obj_id},
        {"$set": {"status": status_in.status.value, "updated_at": now}}
    )
    
    # Log Activity
    await db.ActivityLogs.insert_one({
        "user_id": current_user["id"],
        "action": "STATUS_CHANGED",
        "details": f"Changed status of candidate '{candidate['name']}' to '{status_in.status.value}'",
        "timestamp": now
    })
    
    updated_candidate = await db.Candidates.find_one({"_id": cand_obj_id})
    return serialize_doc(updated_candidate)

@router.get("/{candidate_id}/questions")
async def get_candidate_interview_questions(
    candidate_id: str,
    force: Optional[bool] = False,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    try:
        cand_obj_id = ObjectId(candidate_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Candidate ID format")
        
    candidate = await db.Candidates.find_one({"_id": cand_obj_id})
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
        
    # Return cached questions if they exist and force is False
    if not force and candidate.get("interview_questions"):
        return candidate["interview_questions"]
        
    job = await db.Jobs.find_one({"_id": candidate["job_id"]})
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated Job requirement not found")
        
    try:
        # Generate interview questions using candidate profile and job requirements
        questions = await generate_interview_questions(candidate, job)
    except Exception as e:
        logger.error(f"Failed to generate interview questions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate interview questions."
        )
        
    # Cache generated questions in the Candidate document
    await db.Candidates.update_one(
        {"_id": cand_obj_id},
        {"$set": {"interview_questions": questions, "updated_at": datetime.utcnow()}}
    )
    
    return questions
