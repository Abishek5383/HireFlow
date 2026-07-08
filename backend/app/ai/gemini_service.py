import os
import json
import logging
import re
import asyncio
import httpx
from typing import Dict, Any
from fastapi import HTTPException, status
import google.generativeai as genai
from app.core.config import GEMINI_API_KEY, XAI_API_KEY, GROQ_API_KEY, gemini_semaphore

logger = logging.getLogger(__name__)

async def call_groq_api(prompt: str, json_mode: bool = False) -> str:
    """
    Helper to call Groq API via HTTPX with exponential backoff on 429 errors.
    Uses llama-3.3-70b-versatile as the flagship model.
    Uses an in-process semaphore to serialize concurrent calls.
    """
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Groq API Key is not configured on the server. Please check the environment variables."
        )
        
    async with gemini_semaphore:
        backoff = 2
        for attempt in range(3):
            try:
                headers = {
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1
                }
                if json_mode:
                    payload["response_format"] = {"type": "json_object"}
                    
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers=headers,
                        json=payload
                    )
                    
                if response.status_code == 200:
                    result = response.json()
                    return result["choices"][0]["message"]["content"]
                elif response.status_code == 429:
                    logger.warning(f"Groq API rate limit hit (429). Sleeping for {backoff}s... (Attempt {attempt+1}/3)")
                    await asyncio.sleep(backoff)
                    backoff *= 2
                else:
                    logger.error(f"Groq API error status {response.status_code}: {response.text}")
                    raise RuntimeError(f"Groq API error status {response.status_code}")
            except Exception as e:
                logger.warning(f"Groq API call attempt {attempt+1} failed: {str(e)}")
                await asyncio.sleep(backoff)
                backoff *= 2
                
        # Final attempt
        try:
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1
            }
            if json_mode:
                payload["response_format"] = {"type": "json_object"}
                
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload
                )
                
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                logger.error(f"Groq API call failed after max retries: Status {response.status_code}, {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Groq API failed after max retries: Status {response.status_code}, {response.text}"
                )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            logger.error(f"Groq API call failed after max retries: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Groq AI Service is currently rate-limited or unavailable. Detail: {str(e)}"
            )

async def call_ai_api(prompt: str, json_mode: bool = False) -> str:
    """
    Dispatcher to call Groq if configured, else Grok (xAI).
    """
    if GROQ_API_KEY:
        return await call_groq_api(prompt, json_mode=json_mode)
    elif XAI_API_KEY and not XAI_API_KEY.startswith("xai-yourkeyhere"):
        return await call_grok_api(prompt, json_mode=json_mode)
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neither Groq API key nor Grok (xAI) API key is configured on the server."
        )

async def call_grok_api(prompt: str, json_mode: bool = False) -> str:
    """
    Helper to call xAI (Grok) API via HTTPX with exponential backoff on 429 errors.
    Uses an in-process semaphore to serialize concurrent calls.
    """
    if not XAI_API_KEY or XAI_API_KEY.startswith("xai-yourkeyhere"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="xAI (Grok) API Key is not configured on the server. Please check the environment variables."
        )
        
    async with gemini_semaphore:
        backoff = 2
        for attempt in range(3):
            try:
                headers = {
                    "Authorization": f"Bearer {XAI_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "grok-beta",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1
                }
                if json_mode:
                    payload["response_format"] = {"type": "json_object"}
                    
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        "https://api.x.ai/v1/chat/completions",
                        headers=headers,
                        json=payload
                    )
                    
                if response.status_code == 200:
                    result = response.json()
                    return result["choices"][0]["message"]["content"]
                elif response.status_code == 429:
                    logger.warning(f"Grok API rate limit hit (429). Sleeping for {backoff}s... (Attempt {attempt+1}/3)")
                    await asyncio.sleep(backoff)
                    backoff *= 2
                else:
                    logger.error(f"Grok API error status {response.status_code}: {response.text}")
                    raise RuntimeError(f"Grok API error status {response.status_code}")
            except Exception as e:
                logger.warning(f"Grok API call attempt {attempt+1} failed: {str(e)}")
                await asyncio.sleep(backoff)
                backoff *= 2
                
        # Final attempt
        try:
            headers = {
                "Authorization": f"Bearer {XAI_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "grok-beta",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1
            }
            if json_mode:
                payload["response_format"] = {"type": "json_object"}
                
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers=headers,
                    json=payload
                )
                
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                logger.error(f"Grok API call failed after max retries: Status {response.status_code}, {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Grok API failed after max retries: Status {response.status_code}, {response.text}"
                )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            logger.error(f"Grok API call failed after max retries: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Grok AI Service is currently rate-limited or unavailable. Detail: {str(e)}"
            )

async def generate_content_with_backoff(model, prompt, generation_config=None) -> Any:
    """
    Call Gemini generate_content_async with exponential backoff on 429 errors.
    Uses an in-process semaphore to serialize concurrent calls.
    """
    async with gemini_semaphore:
        backoff = 2
        for attempt in range(3):
            try:
                if generation_config:
                    return await model.generate_content_async(prompt, generation_config=generation_config)
                else:
                    return await model.generate_content_async(prompt)
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "quota" in err_str.lower() or "limit" in err_str.lower():
                    # Extract Google's recommended retry delay if available
                    match = re.search(r"Please retry in (\d+\.?\d*)s", err_str)
                    sleep_time = float(match.group(1)) + 1.0 if match else backoff
                    logger.warning(f"Gemini API rate limit hit (429). Sleeping for {sleep_time:.2f}s... (Attempt {attempt+1}/3)")
                    await asyncio.sleep(sleep_time)
                    backoff *= 2
                else:
                    raise e
        # Final attempt
        try:
            if generation_config:
                return await model.generate_content_async(prompt, generation_config=generation_config)
            else:
                return await model.generate_content_async(prompt)
        except Exception as e:
            logger.error(f"Gemini API call failed after max retries: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI Service is currently rate-limited or exhausted. Detail: {str(e)}"
            )

PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "prompts")

def load_prompt_template(filename: str) -> str:
    path = os.path.join(PROMPTS_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Prompt template {filename} not found.")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def parse_resume_locally(text: str) -> dict:
    """
    A robust local regex-based fallback parser for when Gemini/Groq is rate-limited or offline.
    """
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    
    # 1. Extract Name (guess first line of text or fallback)
    name = "Candidate"
    if lines:
        for line in lines[:5]:
            if "@" not in line and not any(c.isdigit() for c in line) and len(line.split()) <= 4:
                name = line
                break
                
    # 2. Extract Email
    email = ""
    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    if email_match:
        email = email_match.group(0)
        
    # 3. Extract Phone
    phone = ""
    # Look for common phone formats, but filter out long repeating sequences like 55555555555555555...
    phone_matches = re.findall(r"(?:\+?\d{1,4}[-\s]?)?\(?\d{3,5}\)?[-\s]?\d{3,5}[-\s]?\d{3,5}", text)
    for match in phone_matches:
        cleaned = re.sub(r"\D", "", match)
        # Check if the number is between 7 and 15 digits, and contains more than 2 unique digits
        if 7 <= len(cleaned) <= 15 and len(set(cleaned)) > 2:
            phone = match.strip()
            break
            
    # 4. Extract Skills (match against a catalog of common tech skills)
    known_skills = [
        "python", "javascript", "typescript", "java", "c++", "c#", "ruby", "php", "go", "rust",
        "react", "angular", "vue", "node", "express", "django", "flask", "fastapi", "spring",
        "html", "css", "sql", "postgresql", "mysql", "mongodb", "redis", "cassandra", "sqlite",
        "docker", "kubernetes", "aws", "gcp", "azure", "git", "ci/cd", "jenkins", "linux"
    ]
    skills = []
    text_lower = text.lower()
    for skill in known_skills:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text_lower):
            skills.append(skill.upper() if skill in ["sql", "html", "css", "aws", "gcp", "git"] else skill.capitalize())
            
    # 5. Extract Education
    education = "Bachelor's Degree"
    edu_keywords = ["b.tech", "btech", "b.e", "b.sc", "bsc", "m.tech", "mtech", "m.sc", "msc", "mca", "mba", "ph.d", "phd", "bachelor", "master", "university", "college"]
    for kw in edu_keywords:
        if kw in text_lower:
            education = "Master's Degree" if kw in ["master", "m.tech", "mtech", "m.sc", "msc", "mca", "mba"] else "Bachelor's Degree"
            break
            
    # 6. Experience Years
    experience_years = 1.0
    exp_matches = re.findall(r"(\d+)\+?\s*years?", text_lower)
    if exp_matches:
        experience_years = float(max(int(m) for m in exp_matches))
        
    # 7. Extract Projects (Local Parser Heuristic)
    projects = []
    text_upper = text.upper()
    project_headers = ["PROJECTS", "PERSONAL PROJECTS", "ACADEMIC PROJECTS", "KEY PROJECTS"]
    
    proj_idx = -1
    for h in project_headers:
        proj_idx = text_upper.find(h)
        if proj_idx != -1:
            proj_idx += len(h)
            break
            
    proj_end = len(text)
    if proj_idx != -1:
        next_headers = ["EDUCATION", "EXPERIENCE", "WORK EXPERIENCE", "CERTIFICATIONS", "SKILLS", "ADDITIONAL", "INTERESTS", "ACHIEVEMENTS", "DECLARATION"]
        for nh in next_headers:
            idx = text_upper.find(nh, proj_idx)
            if idx != -1 and idx < proj_end:
                proj_end = idx
                
        projects_lines = [line.strip() for line in text[proj_idx:proj_end].split("\n") if line.strip()]
        current_project = None
        for line in projects_lines:
            clean_line = re.sub(r"^[•\-\*]\s*", "", line).strip()
            if len(clean_line) < 100 and not clean_line.endswith(".") and not clean_line.endswith(";"):
                if current_project:
                    projects.append(current_project)
                current_project = {
                    "name": clean_line,
                    "description": ""
                }
            else:
                if current_project:
                    if current_project["description"]:
                        current_project["description"] += " " + clean_line
                    else:
                        current_project["description"] = clean_line
                else:
                    current_project = {
                        "name": clean_line[:50],
                        "description": clean_line
                    }
        if current_project:
            projects.append(current_project)

    # 8. Experience Details
    experience_details = [
        {
            "role": "Software Developer",
            "company": "Company",
            "duration": "Duration",
            "description": "Extracted locally from resume text."
        }
    ]
    experience_headers = ["EXPERIENCE", "WORK EXPERIENCE", "EMPLOYMENT HISTORY", "PROFESSIONAL EXPERIENCE"]
    exp_idx = -1
    for h in experience_headers:
        exp_idx = text_upper.find(h)
        if exp_idx != -1:
            exp_idx += len(h)
            break
            
    exp_end = len(text)
    if exp_idx != -1:
        for nh in ["EDUCATION", "PROJECTS", "CERTIFICATIONS", "SKILLS", "ADDITIONAL", "INTERESTS", "ACHIEVEMENTS"]:
            idx = text_upper.find(nh, exp_idx)
            if idx != -1 and idx < exp_end:
                exp_end = idx
                
        exp_lines = [line.strip() for line in text[exp_idx:exp_end].split("\n") if line.strip()]
        if exp_lines:
            experience_details = [
                {
                    "role": "Intern / Software Engineer",
                    "company": "Experience Section",
                    "duration": "Details",
                    "description": " ".join(exp_lines[:5])
                }
            ]

    return {
        "name": name,
        "email": email or "candidate@example.com",
        "phone": phone or "123-456-7890",
        "skills": skills or ["Software Development"],
        "experience_years": min(experience_years, 20.0),
        "education": education,
        "experience_details": experience_details,
        "projects": projects or [
            {
                "name": "Software Project",
                "description": "Developed software application using technical skills."
            }
        ]
    }

def get_local_summary(candidate: dict, job: dict) -> str:
    name = candidate.get("name", "The candidate")
    skills = ", ".join(candidate.get("skills", []))
    exp = candidate.get("experience_years", 0.0)
    edu = candidate.get("education", "educational background")
    job_title = job.get("title", "this role")
    return (
        f"{name} is a qualified professional with {exp} years of experience and a strong background in {edu}. "
        f"They possess key skills including {skills}, making them a relevant candidate to consider for the {job_title} position."
    )

async def generate_candidate_profile(resume_text: str) -> dict:
    """
    Calls configured AI (Groq/Grok) to parse raw resume text into structured JSON.
    Falls back to local regex parsing if rate-limited or offline.
    """
    if not GROQ_API_KEY and (not XAI_API_KEY or XAI_API_KEY.startswith("xai-yourkeyhere")):
        logger.warning("Neither GROQ nor XAI API key is configured, parsing resume locally.")
        return parse_resume_locally(resume_text)
    
    try:
        template = load_prompt_template("resume_parser.txt")
        prompt = template.format(resume_text=resume_text)
        
        response_text = await call_ai_api(prompt, json_mode=True)
        parsed = json.loads(response_text.strip())
        return parsed
    except Exception as e:
        logger.error(f"Failed to parse resume with AI, using local fallback parser: {str(e)}")
        return parse_resume_locally(resume_text)

async def generate_candidate_summary(candidate: dict, job: dict) -> str:
    """
    Calls configured AI (Groq/Grok) to generate a concise summary evaluating candidate suitability.
    """
    if not GROQ_API_KEY and (not XAI_API_KEY or XAI_API_KEY.startswith("xai-yourkeyhere")):
        return get_local_summary(candidate, job)
        
    try:
        template = load_prompt_template("candidate_summary.txt")
        prompt = template.format(
            candidate_name=candidate.get("name", "Unknown"),
            candidate_skills=", ".join(candidate.get("skills", [])),
            candidate_experience_years=candidate.get("experience_years", 0.0),
            candidate_education=candidate.get("education", "Unknown"),
            candidate_experience_details=str(candidate.get("experience_details", "")),
            candidate_projects=str(candidate.get("projects", "")),
            candidate_certifications=", ".join(candidate.get("certifications", [])),
            job_title=job.get("title", "Job Posting"),
            company_name=job.get("company_name", "Company"),
            job_description=job.get("job_description", ""),
            required_skills=", ".join(job.get("required_skills", []))
        )
        
        response_text = await call_ai_api(prompt)
        return response_text.strip()
    except Exception as e:
        logger.error(f"Failed to generate candidate summary with AI: {str(e)}")
        return get_local_summary(candidate, job)

async def generate_interview_questions(candidate: dict, job: dict) -> dict:
    """
    Calls configured AI (Groq/Grok) to generate 10-15 interview questions categorized into Technical, Project-Based, Scenario, Behavioral.
    """
    if not GROQ_API_KEY and (not XAI_API_KEY or XAI_API_KEY.startswith("xai-yourkeyhere")):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No active AI service key configured on the server."
        )
        
    try:
        template = load_prompt_template("interview_questions.txt")
        prompt = template.format(
            candidate_name=candidate.get("name", "Unknown"),
            candidate_skills=", ".join(candidate.get("skills", [])),
            candidate_experience_years=candidate.get("experience_years", 0.0),
            candidate_experience_details=str(candidate.get("experience_details", "")),
            candidate_projects=str(candidate.get("projects", "")),
            job_title=job.get("title", "Job Posting"),
            company_name=job.get("company_name", "Company"),
            required_skills=", ".join(job.get("required_skills", [])),
            job_description=job.get("job_description", "")
        )
        
        response_text = await call_ai_api(prompt, json_mode=True)
        return json.loads(response_text.strip())
    except Exception as e:
        logger.error(f"Failed to generate interview questions with AI: {str(e)}")
        # Return fallback questions on failure
        return {
            "technical": [
                {
                    "question": f"Can you describe your experience working with {', '.join(candidate.get('skills', [])[:5])}?",
                    "answer": "The candidate should detail specific projects, challenges, and core concepts associated with these technologies."
                },
                {
                    "question": f"How do you handle error handling, testing, and debugging in a stack using {candidate.get('skills', [''])[0]}?",
                    "answer": "Look for reference to unit testing frameworks, logging practices, try/except blocks, and debugging tools."
                },
                {
                    "question": "What are the core design patterns or architectural practices you follow in your software development workflow?",
                    "answer": "Assess knowledge of SOLID principles, MVC/MVVM patterns, dependency injection, and RESTful API standards."
                }
            ],
            "project_based": [
                {
                    "question": "Can you walk us through one of your recent technical projects in detail?",
                    "answer": "Look for explanations of system architecture, technology choices, and how they overcame technical bottlenecks."
                },
                {
                    "question": "Describe a difficult technical challenge you encountered on a project and how you went about solving it.",
                    "answer": "Evaluate their problem-solving workflow: gathering data, experimenting, consulting documentation, and testing the solution."
                },
                {
                    "question": "How do you handle code reviews, deployment processes, and version control in your projects?",
                    "answer": "Look for understanding of Git branching strategies (e.g., GitFlow), pull request practices, and CI/CD concepts."
                }
            ],
            "scenario": [
                {
                    "question": f"How would you approach solving a technical bottleneck for a role like {job.get('title')}?",
                    "answer": "They should explain their troubleshooting process: profiling, identifying latency, and testing incremental fixes."
                },
                {
                    "question": "If a critical service in production goes down and you are the only engineer available, what are your immediate steps?",
                    "answer": "Assess incident response skills: check status logs, isolate the issue, roll back if possible, communicate with stakeholders, and fix post-mortem."
                },
                {
                    "question": "How do you estimate timelines for a major new feature when requirements are vague or changing?",
                    "answer": "Evaluate planning: break tasks into sub-components, add buffers, run spikes/prototypes, and maintain clear expectations with product managers."
                }
            ],
            "behavioral": [
                {
                    "question": "Describe a time you faced a difficult conflict in a team and how you resolved it.",
                    "answer": "Assess soft skills, direct and constructive communication, empathy, and focus on collaborative team outcomes."
                },
                {
                    "question": "Tell us about a time you made a major mistake or had a project fail. What did you learn?",
                    "answer": "Evaluate accountability: taking responsibility, reflecting on the failure, implementing checks, and personal resilience."
                },
                {
                    "question": "How do you prioritize your tasks when you have multiple urgent deadlines simultaneously?",
                    "answer": "Look for prioritization frameworks (like the Eisenhower Matrix), communication with leads, and time management strategies."
                }
            ]
        }

async def generate_preparation_notes(candidate: dict, job: dict) -> str:
    """
    Calls configured AI (Groq/Grok) to generate personalized interview preparation notes for the candidate based on their skills.
    """
    if not GROQ_API_KEY and (not XAI_API_KEY or XAI_API_KEY.startswith("xai-yourkeyhere")):
        skills = ", ".join(candidate.get("skills", [])[:5])
        return f"Be prepared to explain your experience with: {skills}. Review the requirements for {job.get('title')}."
        
    try:
        prompt = (
            f"Generate a short, professional interview preparation note (2-3 sentences max) for a candidate named {candidate.get('name')}. "
            f"The candidate is applying for the job '{job.get('title')}' at '{job.get('company_name')}'. "
            f"Candidate skills: {', '.join(candidate.get('skills', []))}. "
            f"Job requirements: {', '.join(job.get('required_skills', []))}. "
            f"Write the notes in direct instruction style (e.g. 'Focus on explaining your experience with X, prepare to discuss project Y, and review core concepts of Z.')."
        )
        response_text = await call_ai_api(prompt)
        return response_text.strip()
    except Exception as e:
        logger.error(f"Failed to generate preparation notes with AI: {str(e)}")
        skills = ", ".join(candidate.get("skills", [])[:5])
        return f"Be prepared to explain your experience with: {skills}. Review the requirements for {job.get('title')}."
