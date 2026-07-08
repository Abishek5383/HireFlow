from pydantic import BaseModel, Field
from typing import List, Optional, Any, Union, Dict
from datetime import datetime
from enum import Enum

class CandidateStatus(str, Enum):
    NEW = "New"
    SHORTLISTED = "Shortlisted"
    REJECTED = "Rejected"
    INTERVIEW_SCHEDULED = "Interview Scheduled"
    COMPLETED = "Completed"

class CandidateBase(BaseModel):
    name: str
    email: str
    phone: str
    skills: List[str] = Field(default_factory=list)
    experience_years: float = 0.0
    education: str
    experience_details: Any = None
    projects: Any = None
    certifications: List[str] = Field(default_factory=list)

class CandidateResponse(CandidateBase):
    id: str
    job_id: str
    resume_id: str
    match_percentage: float
    matching_skills: List[str]
    missing_skills: List[str]
    status: CandidateStatus
    summary: Optional[str] = None
    suggested_notes: Optional[str] = None
    suggested_meeting_link: Optional[str] = None
    interview_questions: Optional[Union[Dict[str, Any], List[Any]]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CandidateStatusUpdate(BaseModel):
    status: CandidateStatus
