from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class JobBase(BaseModel):
    title: str = Field(..., min_length=2)
    company_name: str = Field(..., min_length=2)
    department: str = Field(..., min_length=2)
    required_skills: List[str] = Field(default_factory=list)
    minimum_experience: float = Field(..., ge=0, description="Minimum years of experience required")
    education: str = Field(..., description="Required education level (e.g., Bachelor's, Master's)")
    job_description: str = Field(..., min_length=10)

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    company_name: Optional[str] = None
    department: Optional[str] = None
    required_skills: Optional[List[str]] = None
    minimum_experience: Optional[float] = None
    education: Optional[str] = None
    job_description: Optional[str] = None

class JobResponse(JobBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
