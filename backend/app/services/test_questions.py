import os
import asyncio
import logging
from dotenv import load_dotenv

# Enable debug logging so we can see Stage 1/2 output
logging.basicConfig(level=logging.INFO, format="%(levelname)s - %(name)s - %(message)s")

# Load env before importing services
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(backend_dir, ".env"))

from app.services.question_generation import (
    extract_structured_facts,
    generate_grounded_questions,
    generate_interview_questions_from_resume,
    _call_ai_for_list,
    _call_ai_for_object,
)

sample_resume = """
John Doe
Software Engineer
Email: john.doe@example.com
Phone: 123-456-7890

Summary:
Full-stack software developer with 4 years of experience specializing in Python, React, and PostgreSQL.

Skills:
Languages: Python, JavaScript, SQL
Frameworks: React, FastAPI, Node.js
Databases: PostgreSQL, Redis
Tools: Docker, Git, Kubernetes

Projects:
1. Smart HR Recruitment Agent
   - Description: Developed an automated recruitment helper app that parses resumes, calculates matching, and schedules interviews.
   - Technologies: Python, FastAPI, MongoDB, React, TailwindCSS.

2. Cloud IoT Dashboard
   - Description: Built a real-time metrics visualizer dashboard for IoT sensor readings.
   - Technologies: React, Node.js, WebSockets, Redis, PostgreSQL.

Experience:
- Software Developer at Auto Desk (Jan 2023 - Present)
  - Developed and maintained critical backend REST APIs.
  - Implemented automated test coverage increasing quality by 25%.
"""

async def main():
    print("Testing grounded question generation...")
    from app.core.config import GEMINI_API_KEY, GROQ_API_KEY, XAI_API_KEY
    print(f"GEMINI_API_KEY resolved: {'Yes' if GEMINI_API_KEY else 'No'}")
    print(f"GROQ_API_KEY resolved: {'Yes' if GROQ_API_KEY else 'No'}")
    print(f"XAI_API_KEY resolved: {'Yes' if XAI_API_KEY else 'No'}")

    try:
        # Test raw object call
        print("\n--- Testing raw object AI call ---")
        obj = await _call_ai_for_object('Return a JSON object: {"status": "ok"}')
        print(f"Object call result: {obj}")

        # Test raw list call
        print("\n--- Testing raw list AI call ---")
        lst = await _call_ai_for_list(
            'Return a JSON array with one item: [{"question":"test?","answer":"yes.","source":"skill:Python","type":"basic"}]. '
            'Return ONLY the raw JSON array starting with [.'
        )
        print(f"List call result (count={len(lst)}): {lst}")

        # Stage 1 test
        print("\n--- Stage 1: Extracting facts ---")
        facts = await extract_structured_facts(sample_resume)
        print(f"Skills: {facts.get('skills', [])}")
        print(f"Projects: {[p.get('name') for p in facts.get('projects', [])]}")

        # Stage 2 test
        print("\n--- Stage 2: Generating questions ---")
        questions = await generate_grounded_questions(
            facts,
            job_description="Python developer with experience in React and databases."
        )
        print(f"Generated {len(questions)} questions:")
        for idx, q in enumerate(questions[:5]):
            print(f"\n[{idx + 1}] Source: {q.get('source')} | Type: {q.get('type')}")
            print(f"Question: {q.get('question')}")
            print(f"Answer: {str(q.get('answer', ''))[:120]}...")

        print("\nTest completed successfully!")
    except Exception as e:
        print(f"Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
