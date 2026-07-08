import time
from fastapi import APIRouter, Depends
from datetime import datetime
from bson import ObjectId
from app.database.mongodb import get_database
from app.utils.auth_helpers import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# Simple in-process TTL cache for stats to avoid repeating heavy DB queries
_stats_cache = None
_stats_cache_time = 0.0
CACHE_TTL = 30.0 # 30 seconds TTL

def serialize_doc(doc) -> dict:
    if not doc:
        return None
    serialized = doc.copy()
    serialized["id"] = str(serialized["_id"])
    del serialized["_id"]
    if "user_id" in serialized:
        serialized["user_id"] = str(serialized["user_id"])
    return serialized

@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    global _stats_cache, _stats_cache_time
    now = time.time()
    if _stats_cache is not None and (now - _stats_cache_time) < CACHE_TTL:
        return _stats_cache

    db = get_database()
    
    # Simple counts
    total_resumes = await db.Candidates.count_documents({})
    shortlisted_count = await db.Candidates.count_documents({"status": "Shortlisted"})
    rejected_count = await db.Candidates.count_documents({"status": "Rejected"})
    interview_scheduled = await db.Candidates.count_documents({"status": "Interview Scheduled"})
    completed_count = await db.Candidates.count_documents({"status": "Completed"})
    new_count = await db.Candidates.count_documents({"status": "New"})
    
    # 1. Status breakdown for Pie Chart
    status_breakdown = [
        {"name": "New", "value": new_count},
        {"name": "Shortlisted", "value": shortlisted_count},
        {"name": "Interview Scheduled", "value": interview_scheduled},
        {"name": "Completed", "value": completed_count},
        {"name": "Rejected", "value": rejected_count}
    ]
    
    # 2. Jobs breakdown for Bar Chart (Job name, total candidates, avg match)
    jobs_cursor = db.Jobs.find()
    jobs = await jobs_cursor.to_list(length=100)
    
    job_stats = []
    for job in jobs:
        job_id = job["_id"]
        cand_count = await db.Candidates.count_documents({"job_id": job_id})
        
        # Calculate average match % using aggregation
        avg_match = 0.0
        if cand_count > 0:
            pipeline = [
                {"$match": {"job_id": job_id}},
                {"$group": {"_id": None, "avg_match": {"$avg": "$match_percentage"}}}
            ]
            agg_result = await db.Candidates.aggregate(pipeline).to_list(length=1)
            if agg_result:
                avg_match = round(agg_result[0]["avg_match"], 1)
                
        job_stats.append({
            "job_title": job["title"],
            "company": job["company_name"],
            "candidates_count": cand_count,
            "avg_match_percentage": avg_match
        })
        
    # 3. Recent candidate uploads (last 5)
    candidates_cursor = db.Candidates.find().sort("created_at", -1).limit(5)
    recent_candidates = await candidates_cursor.to_list(length=5)
    
    recent_list = []
    for c in recent_candidates:
        job = await db.Jobs.find_one({"_id": c["job_id"]})
        recent_list.append({
            "id": str(c["_id"]),
            "name": c["name"],
            "email": c["email"],
            "job_title": job["title"] if job else "Unknown Job",
            "match_percentage": c["match_percentage"],
            "status": c["status"],
            "created_at": c["created_at"]
        })
        
    # 4. Recent activity logs (last 10)
    logs_cursor = db.ActivityLogs.find().sort("timestamp", -1).limit(10)
    activities = await logs_cursor.to_list(length=10)
    serialized_activities = []
    for act in activities:
        user_name = "System"
        if "user_id" in act and act["user_id"]:
            try:
                user = await db.users.find_one({"_id": ObjectId(act["user_id"])})
                if user:
                    user_name = user["name"]
            except Exception:
                pass
        
        doc = serialize_doc(act)
        doc["user_name"] = user_name
        serialized_activities.append(doc)
        
    res = {
        "summary": {
            "total_resumes": total_resumes,
            "shortlisted": shortlisted_count,
            "rejected": rejected_count,
            "interviews_scheduled": interview_scheduled,
            "interviews_completed": completed_count,
            "new_candidates": new_count
        },
        "status_breakdown": status_breakdown,
        "job_stats": job_stats,
        "recent_candidates": recent_list,
        "activities": serialized_activities
    }
    _stats_cache = res
    _stats_cache_time = now
    return res
