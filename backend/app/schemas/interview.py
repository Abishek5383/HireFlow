from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class InterviewMode(str, Enum):
    ONLINE = "Online"
    OFFLINE = "Offline"

class InterviewScheduleCreate(BaseModel):
    date: str = Field(..., description="Date of the interview (YYYY-MM-DD)")
    time: str = Field(..., description="Time of the interview (HH:MM)")
    mode: InterviewMode = Field(default=InterviewMode.ONLINE)
    meeting_link: Optional[str] = Field(None, description="URL for online interview")
    notes: Optional[str] = Field(None, description="Optional preparation notes")

class InterviewScheduleResponse(InterviewScheduleCreate):
    id: str
    candidate_id: str
    scheduled_at: datetime

    class Config:
        from_attributes = True
