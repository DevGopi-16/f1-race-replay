import uuid
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        if not (3 <= len(v) <= 50):
            raise ValueError("Username must be 3-50 characters")
        if not v.replace("_", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, underscores")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    email: EmailStr
    is_pro: bool
    avatar_color: str
    picture_url: Optional[str] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class GoogleAuthPayload(BaseModel):
    credential: str  # the ID token JWT returned by Google Identity Services
