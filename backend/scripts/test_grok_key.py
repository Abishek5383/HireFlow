import os
import sys
import asyncio
import httpx
from dotenv import load_dotenv

def test_key():
    # Load .env
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(backend_dir, ".env")
    print(f"Loading env from: {env_path}")
    load_dotenv(env_path, override=True)

    api_key = os.getenv("XAI_API_KEY")
    if not api_key or api_key == "xai-yourkeyhere":
        print("Error: XAI_API_KEY environment variable not found or contains the default placeholder in .env.")
        sys.exit(1)

    print(f"Active XAI_API_KEY (last 4 chars): ...{api_key[-4:]}")
    
    # Send a simple test prompt to Grok completions endpoint
    print("Sending test request to Grok API (grok-beta)...")
    try:
        async def main():
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "grok-beta",
                "messages": [
                    {"role": "user", "content": "Respond with exactly the single word 'Success'"}
                ],
                "temperature": 0.1
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers=headers,
                    json=payload
                )
            if response.status_code == 200:
                result = response.json()
                text = result["choices"][0]["message"]["content"].strip()
                print(f"Grok API Response: {text}")
                if "success" in text.lower():
                    print("SUCCESS: Your Grok API key is active and working perfectly!")
                else:
                    print("WARNING: Grok returned a response but it was unexpected:", text)
            else:
                print(f"ERROR: Grok API returned status code {response.status_code}. Detail: {response.text}")
                sys.exit(1)

        asyncio.run(main())
    except Exception as e:
        print(f"ERROR: Grok API call failed. Reason:\n{str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    test_key()
