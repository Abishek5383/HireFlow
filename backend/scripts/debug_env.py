import os
from dotenv import load_dotenv

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(backend_dir, ".env")
print("Absolute path of .env:", env_path)
print("File exists:", os.path.exists(env_path))

# Read the file directly to see if the key is inside
with open(env_path, "r", encoding="utf-8") as f:
    content = f.read()
    print(".env content (has XAI_API_KEY?):", "XAI_API_KEY" in content)
    for line in content.split("\n"):
        if "XAI_API_KEY" in line:
            print("Found line:", line.strip())

load_dotenv(env_path, override=True)
print("os.getenv('XAI_API_KEY'):", os.getenv("XAI_API_KEY"))
