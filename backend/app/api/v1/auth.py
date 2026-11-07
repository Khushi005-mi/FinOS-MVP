from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from app.db.session import get_db
from app.models.client import UserModel, OrganizationModel, UserRole
from app.core.security import get_password_hash, verify_password, create_access_token

router = APIRouter(tags=["Authentication"])

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    organization_name: str = Field(..., alias="company_name")
    role: str = "finance_user"

    class Config:
        populate_by_name = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: Optional[str] = None

# Support both /auth/signup and /signup (with and without trailing slashes)
@router.post("/auth/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@router.post("/auth/signup/", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@router.post("/signup/", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(UserModel).where(UserModel.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    org = OrganizationModel(name=payload.organization_name)
    db.add(org)
    await db.commit()
    await db.refresh(org)

    hashed_pwd = get_password_hash(payload.password)
    user = UserModel(
        organization_id=org.id,
        email=payload.email,
        password_hash=hashed_pwd,
        hashed_password=hashed_pwd,
        role=payload.role,
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id), "org_id": str(org.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role, "email": user.email}

# Support both /auth/login and /login (with and without trailing slashes)
@router.post("/auth/login", response_model=TokenResponse)
@router.post("/auth/login/", response_model=TokenResponse)
@router.post("/login", response_model=TokenResponse)
@router.post("/login/", response_model=TokenResponse)
async def login(
    payload: Optional[LoginRequest] = None,
    form_data: Optional[OAuth2PasswordRequestForm] = Depends(lambda: None), 
    db: AsyncSession = Depends(get_db)
):
    login_email = None
    login_password = None

    if payload and payload.email and payload.password:
        login_email = payload.email
        login_password = payload.password
    elif form_data and form_data.username and form_data.password:
        login_email = form_data.username
        login_password = form_data.password

    if not login_email or not login_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email and password are required."
        )

    result = await db.execute(select(UserModel).where(UserModel.email == login_email))
    user = result.scalar_one_or_none()

    stored_hash = getattr(user, "hashed_password", None) or getattr(user, "password_hash", None)
    if not user or not stored_hash or not verify_password(login_password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": str(user.id), "org_id": str(user.organization_id), "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role, "email": user.email}
