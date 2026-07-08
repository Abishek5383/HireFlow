import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core import config # Initializes environment variables and Google GenAI at startup
from app.database.mongodb import connect_to_mongo, close_mongo_connection
from app.routers import auth, jobs, candidates, interviews, dashboard

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to MongoDB on startup
    connect_to_mongo()
    yield
    # Close database connection on shutdown
    close_mongo_connection()

app = FastAPI(
    title="Smart HR Recruitment Agent API",
    version="1.0.0",
    lifespan=lifespan
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error on request {request.url}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred."}
    )

# CORS configuration
# Allowing all origins for development, can be configured through env variables in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes under /api
app.include_router(auth.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(candidates.router, prefix="/api")
app.include_router(interviews.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart HR Recruitment Agent API. Go to /docs for interactive API reference."}
