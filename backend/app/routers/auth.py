from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from app.database.mongodb import get_database
from app.schemas.auth import UserRegister, UserLogin, UserResponse, Token
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.utils.auth_helpers import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserRegister):
    db = get_database()
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    
    # Hash password and insert user
    hashed_password = get_password_hash(user_in.password)
    new_user = {
        "email": user_in.email,
        "password_hash": hashed_password,
        "name": user_in.name,
        "role": "HR"  # Default role is HR
    }
    result = await db.users.insert_one(new_user)
    user_id = str(result.inserted_id)

    # Log activity
    await db.ActivityLogs.insert_one({
        "user_id": user_id,
        "action": "USER_REGISTERED",
        "details": f"User {user_in.name} ({user_in.email}) registered",
        "timestamp": datetime.utcnow()
    })

    # Generate JWT
    access_token = create_access_token(data={"sub": user_id})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin):
    db = get_database()
    user = await db.users.find_one({"email": user_in.email})
    if not user or not verify_password(user_in.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = str(user["_id"])
    access_token = create_access_token(data={"sub": user_id})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout():
    # Stateless JWT logout is handled on client side, but we provide an endpoint as requested
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "role": current_user["role"]
    }
