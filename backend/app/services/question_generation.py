import json
import logging
import re
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from app.ai.gemini_service import call_ai_api, GROQ_API_KEY, XAI_API_KEY
from app.core.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)


def _has_active_ai() -> bool:
    """Return True if at least one AI provider is configured."""
    return (
        bool(GROQ_API_KEY)
        or bool(XAI_API_KEY and not XAI_API_KEY.startswith("xai-yourkeyhere"))
        or bool(GEMINI_API_KEY)
    )


def _parse_json_response(text: str, expect_list: bool = False) -> Any:
    """
    Robust JSON parser that strips markdown code fences and handles Groq's
    json_object wrapping (e.g. {"response": [...]}).
    
    If expect_list=True, we unwrap from a wrapping object if needed.
    """
    # Strip markdown fences
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    data = json.loads(text)

    if expect_list:
        if isinstance(data, list):
            return data
        # Groq json_object wraps array: {"response": [...], "items": [...], ...}
        if isinstance(data, dict):
            for key in ["questions", "items", "results", "data", "response", "array"]:
                if key in data and isinstance(data[key], list):
                    return data[key]
            # Try any first list value
            for val in data.values():
                if isinstance(val, list):
                    return val
        return []
    return data


async def _call_ai_for_object(prompt: str) -> Any:
    """
    Call AI API expecting a JSON object response.
    Uses json_mode=True since Groq supports json_object natively.
    """
    if GROQ_API_KEY or (XAI_API_KEY and not XAI_API_KEY.startswith("xai-yourkeyhere")):
        raw = await call_ai_api(prompt, json_mode=True)
        return _parse_json_response(raw, expect_list=False)

    if GEMINI_API_KEY:
        import google.generativeai as genai
        from app.core.config import gemini_semaphore
        async with gemini_semaphore:
            model = genai.GenerativeModel("gemini-2.0-flash-lite")
            response = await model.generate_content_async(
                prompt, generation_config={"response_mime_type": "application/json"}
            )
            return _parse_json_response(response.text, expect_list=False)

    raise HTTPException(status_code=503, detail="No AI provider configured.")


async def _call_ai_for_list(prompt: str) -> List[Any]:
    """
    Call AI API expecting a JSON array response.
    Uses json_mode=False (plain text) to avoid Groq wrapping arrays in objects.
    The model is explicitly instructed to return a raw JSON array.
    """
    if GROQ_API_KEY or (XAI_API_KEY and not XAI_API_KEY.startswith("xai-yourkeyhere")):
        # DO NOT use json_mode=True here - Groq wraps arrays in {"response": [...]}
        raw = await call_ai_api(prompt, json_mode=False)
        return _parse_json_response(raw, expect_list=True)

    if GEMINI_API_KEY:
        import google.generativeai as genai
        from app.core.config import gemini_semaphore
        async with gemini_semaphore:
            model = genai.GenerativeModel("gemini-2.0-flash-lite")
            response = await model.generate_content_async(
                prompt, generation_config={"response_mime_type": "application/json"}
            )
            return _parse_json_response(response.text, expect_list=True)

    raise HTTPException(status_code=503, detail="No AI provider configured.")


async def extract_structured_facts(resume_text: str) -> Dict[str, Any]:
    """
    Stage 1: Extract structured JSON data (skills, tools, projects, experience)
    from the raw resume text. Returns a JSON object — compatible with json_mode.
    """
    empty: Dict[str, Any] = {
        "skills": [],
        "tools_technologies": [],
        "projects": [],
        "experience": [],
    }

    if not _has_active_ai():
        logger.warning("No active LLM API keys set. Returning empty structured facts.")
        return empty

    prompt = (
        "You are an expert resume parsing system. Extract structured facts from the candidate's "
        "resume text and return a valid JSON object only. No markdown fences, no extra text.\n\n"
        "Resume Text:\n"
        "------------------\n"
        f"{resume_text}\n"
        "------------------\n\n"
        "Return a JSON object with exactly these keys:\n"
        "- skills: array of distinct programming languages, libraries, and methodologies\n"
        "- tools_technologies: array of distinct tools, software, IDEs, and platforms\n"
        "- projects: array of objects with keys: name (string), description (string), tech_used (string array)\n"
        "- experience: array of objects with keys: role (string), company (string), responsibilities (string array)\n"
        "\nRespond with ONLY the JSON object."
    )

    try:
        logger.info("Extracting structured facts via AI API...")
        data = await _call_ai_for_object(prompt)
        if isinstance(data, dict):
            for key in ["skills", "tools_technologies", "projects", "experience"]:
                if key not in data:
                    data[key] = []
            logger.info(
                f"Stage 1 succeeded: {len(data.get('skills', []))} skills, "
                f"{len(data.get('projects', []))} projects"
            )
            return data
    except Exception as e:
        logger.warning(f"Stage 1 structured facts extraction failed: {str(e)}")

    return empty


async def generate_grounded_questions(
    facts: Dict[str, Any],
    job_description: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Stage 2: Generate difficulty-tiered interview questions and reference answers
    derived from the structured resume facts. Returns a JSON array.
    """
    if not _has_active_ai():
        logger.warning("No active LLM API keys set. Returning empty questions list.")
        return []

    facts_str = json.dumps(facts, indent=2)
    job_desc_str = f"Job Description:\n{job_description}\n\n" if job_description else ""

    prompt = (
        "You are an elite technical interviewer. Generate interview questions and detailed reference answers "
        "derived STRICTLY from the candidate's structured resume facts. Do not invent projects or skills.\n\n"
        f"{job_desc_str}"
        "Structured Resume Facts:\n"
        "------------------\n"
        f"{facts_str}\n"
        "------------------\n\n"
        "Rules:\n"
        "1. Every question MUST reference a specific skill, tool, project, or experience from the facts.\n"
        "2. Generate 2-3 questions per project and 1-2 questions per distinct skill or tool.\n"
        "3. Mix difficulty tiers: basic/conceptual, applied/scenario, deep-dive/edge-case.\n"
        "4. If few projects/skills exist, use experience roles and responsibilities.\n"
        "5. Your response must be a RAW JSON array (starting with '[' and ending with ']'). "
        "Do NOT wrap it in an object. No markdown fences, no extra text.\n\n"
        "Each array item must have:\n"
        "- question: the interview question text\n"
        "- answer: detailed ideal reference answer for the HR recruiter\n"
        "- source: formatted as 'project:Name', 'skill:Name', 'tool:Name', or 'experience:Role'\n"
        "- type: exactly 'basic', 'applied', or 'deep-dive'\n"
        "\nRespond with ONLY the JSON array starting with '['."
    )

    try:
        logger.info("Generating grounded interview questions via AI API...")
        questions = await _call_ai_for_list(prompt)
        if isinstance(questions, list) and len(questions) > 0:
            logger.info(f"Stage 2 succeeded: generated {len(questions)} questions")
            return questions
        logger.warning("Stage 2 returned empty or invalid list")
    except Exception as e:
        logger.warning(f"Stage 2 question generation failed: {str(e)}")

    return []


async def generate_interview_questions_from_resume(
    resume_text: str,
    job_description: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Grounded question generation entrypoint. Runs the two-stage parsing and generation pipeline.
    """
    facts = await extract_structured_facts(resume_text)
    questions = await generate_grounded_questions(facts, job_description)
    return questions
