import os
import logging
import asyncio
from dotenv import load_dotenv
import google.generativeai as genai

logger = logging.getLogger(__name__)

# Locate backend directory root and load .env
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path, override=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
XAI_API_KEY = os.getenv("XAI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Auto-sanitize if a Groq key was pasted into XAI_API_KEY
if XAI_API_KEY:
    if XAI_API_KEY.startswith("xai-gsk_"):
        GROQ_API_KEY = XAI_API_KEY.replace("xai-", "")
        XAI_API_KEY = None
    elif XAI_API_KEY.startswith("gsk_"):
        GROQ_API_KEY = XAI_API_KEY
        XAI_API_KEY = None

if GEMINI_API_KEY:
    # Configure genai globally at startup
    genai.configure(api_key=GEMINI_API_KEY)
    masked_key = f"...{GEMINI_API_KEY[-4:]}"
    logger.info(f"Loaded GEMINI_API_KEY: {masked_key}")
else:
    logger.warning("GEMINI_API_KEY environment variable is not set.")

if GROQ_API_KEY:
    masked_groq = f"...{GROQ_API_KEY[-4:]}"
    logger.info(f"Loaded GROQ_API_KEY: {masked_groq}")
elif XAI_API_KEY and not XAI_API_KEY.startswith("xai-yourkeyhere"):
    masked_xai = f"...{XAI_API_KEY[-4:]}"
    logger.info(f"Loaded XAI_API_KEY: {masked_xai}")
else:
    logger.warning("Neither GROQ_API_KEY nor XAI_API_KEY is configured.")

# In-process rate limiter: max 1 concurrent AI call to prevent concurrent 429 rate limit spikes
gemini_semaphore = asyncio.Semaphore(1)
