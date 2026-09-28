import os
from datetime import datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
from jose import jwt, JWTError
from passlib.context import CryptContext

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET must be set before starting the server"
    )

AUTH_COOKIE_NAME = "f1_access_token"
AUTH_COOKIE_SECURE = (
    os.getenv("AUTH_COOKIE_SECURE", "true").lower()
    == "true"
)
AUTH_COOKIE_SAMESITE = os.getenv(
    "AUTH_COOKIE_SAMESITE",
    "lax",
).lower()
if AUTH_COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    raise RuntimeError(
        "AUTH_COOKIE_SAMESITE must be one of: lax, strict, none"
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # short-lived; refresh tokens extend the session

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def set_auth_cookie(response, token: str) -> None:
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


def clear_auth_cookie(response) -> None:
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite=AUTH_COOKIE_SAMESITE,
        path="/",
    )


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
