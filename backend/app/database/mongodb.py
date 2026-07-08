import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/smart_hr_recruitment")

# Parse db name from URI or default to "smart_hr_recruitment"
try:
    db_name = MONGODB_URI.split("/")[-1].split("?")[0]
    if not db_name:
        db_name = "smart_hr_recruitment"
except Exception:
    db_name = "smart_hr_recruitment"

client: AsyncIOMotorClient = None
db = None

def connect_to_mongo():
    global client, db
    logger.info(f"Connecting to MongoDB at {MONGODB_URI.split('@')[-1] if '@' in MONGODB_URI else MONGODB_URI}")
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[db_name]
    logger.info(f"Connected to database: {db_name}")

def close_mongo_connection():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")

def get_database():
    global db
    if db is None:
        connect_to_mongo()
    return db
