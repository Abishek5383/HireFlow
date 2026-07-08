from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.database.mongodb import get_database
from app.schemas.job import JobCreate, JobUpdate, JobResponse
from app.utils.auth_helpers import get_current_user

router = APIRouter(prefix="/jobs", tags=["Jobs"])

def serialize_doc(doc) -> dict:
    if not doc:
        return None
    serialized = doc.copy()
    serialized["id"] = str(serialized["_id"])
    del serialized["_id"]
    if "created_by" in serialized and isinstance(serialized["created_by"], ObjectId):
        serialized["created_by"] = str(serialized["created_by"])
    return serialized

@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(job_in: JobCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    now = datetime.utcnow()
    
    # Store skills as lowercased for easier deterministic matching
    skills = [s.strip().lower() for s in job_in.required_skills if s.strip()]
    
    job_dict = job_in.dict()
    job_dict["required_skills"] = skills
    job_dict["created_by"] = ObjectId(current_user["id"])
    job_dict["created_at"] = now
    job_dict["updated_at"] = now
    
    result = await db.Jobs.insert_one(job_dict)
    inserted_id = result.inserted_id
    
    # Activity Log
    await db.ActivityLogs.insert_one({
        "user_id": current_user["id"],
        "action": "JOB_CREATED",
        "details": f"Created job posting '{job_in.title}' for '{job_in.company_name}'",
        "timestamp": now
    })
    
    saved_job = await db.Jobs.find_one({"_id": inserted_id})
    return serialize_doc(saved_job)

@router.get("", response_model=List[JobResponse])
async def list_jobs(current_user: dict = Depends(get_current_user)):
    db = get_database()
    cursor = db.Jobs.find().sort("created_at", -1)
    jobs = await cursor.to_list(length=100)
    return [serialize_doc(job) for job in jobs]

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    try:
        obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job ID format")
        
    job = await db.Jobs.find_one({"_id": obj_id})
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        
    return serialize_doc(job)

@router.put("/{job_id}", response_model=JobResponse)
async def update_job(job_id: str, job_in: JobUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    try:
        obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job ID format")
        
    job = await db.Jobs.find_one({"_id": obj_id})
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        
    update_data = {k: v for k, v in job_in.dict().items() if v is not None}
    
    if "required_skills" in update_data:
        update_data["required_skills"] = [s.strip().lower() for s in update_data["required_skills"] if s.strip()]
        
    if update_data:
        now = datetime.utcnow()
        update_data["updated_at"] = now
        await db.Jobs.update_one({"_id": obj_id}, {"$set": update_data})
        
        # Activity Log
        await db.ActivityLogs.insert_one({
            "user_id": current_user["id"],
            "action": "JOB_UPDATED",
            "details": f"Updated job posting '{job['title']}'",
            "timestamp": now
        })
        
    updated_job = await db.Jobs.find_one({"_id": obj_id})
    return serialize_doc(updated_job)

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    try:
        obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job ID format")
        
    job = await db.Jobs.find_one({"_id": obj_id})
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        
    await db.Jobs.delete_one({"_id": obj_id})
    
    await db.ActivityLogs.insert_one({
        "user_id": current_user["id"],
        "action": "JOB_DELETED",
        "details": f"Deleted job posting '{job['title']}'",
        "timestamp": datetime.utcnow()
    })
    
    return None
