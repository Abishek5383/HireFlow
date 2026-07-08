export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Job {
  id: string;
  title: string;
  company_name: string;
  department: string;
  required_skills: string[];
  minimum_experience: number;
  education: string;
  job_description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  job_id: string;
  resume_id: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience_years: number;
  education: string;
  experience_details: any;
  projects: any;
  certifications: string[];
  summary: string | null;
  suggested_notes?: string;
  suggested_meeting_link?: string;
  match_percentage: number;
  matching_skills: string[];
  missing_skills: string[];
  status: 'New' | 'Shortlisted' | 'Rejected' | 'Interview Scheduled' | 'Completed';
  created_at: string;
  updated_at: string;
}

export interface InterviewSchedule {
  id: string;
  candidate_id: string;
  date: string;
  time: string;
  mode: 'Online' | 'Offline';
  meeting_link?: string;
  notes?: string;
  scheduled_at: string;
  candidate_name?: string;
  candidate_email?: string;
  job_title?: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name?: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface DashboardStats {
  summary: {
    total_resumes: number;
    shortlisted: number;
    rejected: number;
    interviews_scheduled: number;
    interviews_completed: number;
    new_candidates: number;
  };
  status_breakdown: Array<{ name: string; value: number }>;
  job_stats: Array<{
    job_title: string;
    company: string;
    candidates_count: number;
    avg_match_percentage: number;
  }>;
  recent_candidates: Array<{
    id: string;
    name: string;
    email: string;
    job_title: string;
    match_percentage: number;
    status: string;
    created_at: string;
  }>;
  activities: ActivityLog[];
}
