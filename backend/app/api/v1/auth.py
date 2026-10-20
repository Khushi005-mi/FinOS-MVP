from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, EmailStr
from fastapi.security import OAuth2PasswordRequestForm
from typing import Optional

from app.db.session import get_db
from app.models.client import OrganizationModel, UserModel, UserRole
from app.core.security import get_password_hash, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

class SignupRequest(BaseModel):
    company_name: str
    email: EmailStr
    password: str
    gstin: str | None = None
    pan: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: str

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    """
    Registers a new tenant organization and its initial ADMIN user.
    """
    existing_user = await db.execute(select(UserModel).where(UserModel.email == payload.email))
    if existing_user.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    org = OrganizationModel(
        name=payload.company_name,
        gstin=payload.gstin,
        pan=payload.pan
    )
    db.add(org)
    await db.flush()  # Acquire org.id UUID

    user = UserModel(
        organization_id=org.id,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=UserRole.ADMIN
    )
    db.add(user)
    await db.commit()

    access_token = create_access_token(data={
        "sub": str(user.id),
        "org_id": str(org.id),
        "role": user.role
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email
    }

@router.post("/login", response_model=TokenResponse)
async def login(
    email: Optional[str] = Body(None),
    password: Optional[str] = Body(None),
    form_data: Optional[OAuth2PasswordRequestForm] = Depends(lambda: None), 
    db: AsyncSession = Depends(get_db)
):
    """
    DUAL-MODE LOGIN ENDPOINT:
    Supports BOTH standard JSON bodies ({ "email": "...", "password": "..." }) 
    AND Swagger OAuth2 Form data (username=..., password=...).
    """
    login_email = None
    login_password = None

    # Check if request came via JSON Body
    if email and password:
        login_email = email
        login_password = password
    # Check if request came via OAuth2 Form (Swagger Authorize button)
    elif form_data and form_data.username and form_data.password:
        login_email = form_data.username
        login_password = form_data.password

    if not login_email or not login_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email/Username and password are required."
        )

    result = await db.execute(select(UserModel).where(UserModel.email == login_email))
    user = result.scalars().first()

    if not user or not verify_password(login_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

    access_token = create_access_token(data={
        "sub": str(user.id),
        "org_id": str(user.organization_id),
        "role": user.role
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email
    }