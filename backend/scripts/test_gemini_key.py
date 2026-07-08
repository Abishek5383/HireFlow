import os
import sys
from dotenv import load_dotenv
import google.generativeai as genai

def test_key():
    # Load .env
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(backend_dir, ".env")
    print(f"Loading env from: {env_path}")
    load_dotenv(env_path)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not found in .env.")
        sys.exit(1)

    print(f"Active GEMINI_API_KEY (last 4 chars): ...{api_key[-4:]}")
    
    # Configure Gemini
    genai.configure(api_key=api_key)
    
    # Send a simple test prompt using gemini-2.0-flash-lite
    print("Sending test request to Gemini API (gemini-2.0-flash-lite)...")
    try:
        model = genai.GenerativeModel("gemini-2.0-flash-lite")
        response = model.generate_content("Respond with exactly the single word 'Success'")
        text = response.text.strip()
        print(f"Gemini API Response: {text}")
        if "success" in text.lower():
            print("SUCCESS: Your API key and quota are active and working perfectly!")
        else:
            print("WARNING: Gemini returned a response but it was unexpected:", text)
    except Exception as e:
        print(f"ERROR: Gemini API call failed. Reason:\n{str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    test_key()
