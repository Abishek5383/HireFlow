import os
import asyncio
import httpx
from dotenv import load_dotenv

async def main():
    # Load .env
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(backend_dir, ".env")
    load_dotenv(env_path)

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Error: GROQ_API_KEY not found in environment.")
        return
    
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.groq.com/openai/v1/models", headers=headers)
        if response.status_code == 200:
            print("Available Groq models:")
            for m in response.json().get("data", []):
                print("-", m.get("id"))
        else:
            print(f"Failed to fetch Groq models: Status {response.status_code}, {response.text}")

asyncio.run(main())
