from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from bson import ObjectId
from app.database.mongodb import get_database
from app.schemas.interview import InterviewScheduleCreate, InterviewScheduleResponse
from app.utils.auth_helpers import get_current_user
from app.email.smtp_service import send_interview_email

router = APIRouter(prefix="/interviews", tags=["Interviews"])

def serialize_doc(doc) -> dict:
    if not doc:
        return None
    serialized = doc.copy()
    serialized["id"] = str(serialized["_id"])
    del serialized["_id"]
    if "candidate_id" in serialized and isinstance(serialized["candidate_id"], ObjectId):
        serialized["candidate_id"] = str(serialized["candidate_id"])
    return serialized

@router.post("", response_model=InterviewScheduleResponse, status_code=status.HTTP_201_CREATED)
async def schedule_interview(
    schedule_in: InterviewScheduleCreate,
    candidate_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    
    # Verify Candidate
    try:
        cand_obj_id = ObjectId(candidate_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Candidate ID format")
        
    candidate = await db.Candidates.find_one({"_id": cand_obj_id})
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
        
    # Verify Job
    job = await db.Jobs.find_one({"_id": candidate["job_id"]})
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job requirement not found")
        
    now = datetime.utcnow()
    
    # 1. Create schedule entry
    schedule_dict = schedule_in.dict()
    schedule_dict["candidate_id"] = cand_obj_id
    schedule_dict["scheduled_at"] = now
    
    # Check if candidate already has a scheduled interview and update or insert new
    # For auditing, we insert a new schedule record
    result = await db.InterviewSchedules.insert_one(schedule_dict)
    schedule_id = result.inserted_id
    
    # 2. Update candidate status to 'Interview Scheduled'
    await db.Candidates.update_one(
        {"_id": cand_obj_id},
        {"$set": {"status": "Interview Scheduled", "updated_at": now}}
    )
    
    # 3. Trigger Email Automation
    # This runs asynchronously in background or directly. Since send_interview_email is async, we await it.
    # It catches all errors inside and won't crash the API.
    email_success = await send_interview_email(
        candidate_id=candidate_id,
        candidate_name=candidate["name"],
        recipient_email=candidate["email"],
        job_title=job["title"],
        company_name=job["company_name"],
        date=schedule_in.date,
        time=schedule_in.time,
        mode=schedule_in.mode.value,
        meeting_link=schedule_in.meeting_link,
        notes=schedule_in.notes
    )
    
    # 4. Activity Log
    await db.ActivityLogs.insert_one({
        "user_id": current_user["id"],
        "action": "INTERVIEW_SCHEDULED",
        "details": f"Scheduled {schedule_in.mode.value} interview for candidate '{candidate['name']}' on {schedule_in.date} at {schedule_in.time}. Email status: {'Sent' if email_success else 'Failed'}",
        "timestamp": now
    })
    
    saved_schedule = await db.InterviewSchedules.find_one({"_id": schedule_id})
    return serialize_doc(saved_schedule)

@router.get("", response_model=List[dict])
async def list_interviews(current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    # Fetch all schedules and join with candidate info for a rich list
    cursor = db.InterviewSchedules.find().sort("scheduled_at", -1)
    schedules = await cursor.to_list(length=100)
    
    rich_schedules = []
    for s in schedules:
        cand = await db.Candidates.find_one({"_id": s["candidate_id"]})
        job = await db.Jobs.find_one({"_id": cand["job_id"]}) if cand else None
        
        serialized = serialize_doc(s)
        serialized["candidate_name"] = cand["name"] if cand else "Unknown"
        serialized["candidate_email"] = cand["email"] if cand else ""
        serialized["job_title"] = job["title"] if job else "N/A"
        rich_schedules.append(serialized)
        
    return rich_schedules
