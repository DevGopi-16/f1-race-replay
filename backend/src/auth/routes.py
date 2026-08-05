import os

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from . import models, schemas, security
from .database import get_db
from .dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")


@router.post("/signup", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def signup(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = models.User(
        username=payload.username,
        email=payload.email,
        hashed_password=security.hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = security.create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=user)


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not security.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = security.create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=user)


@router.post("/google", response_model=schemas.Token)
def google_login(payload: schemas.GoogleAuthPayload, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google sign-in is not configured on the server")

    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.credential, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    google_id = idinfo["sub"]
    email = idinfo.get("email")
    name = idinfo.get("name") or (email.split("@")[0] if email else "racer")
    picture = idinfo.get("picture")

    user = db.query(models.User).filter(models.User.google_id == google_id).first()
    if user is None and email:
        user = db.query(models.User).filter(models.User.email == email).first()

    if user is None:
        user = models.User(
            username=_unique_username(db, name),
            email=email,
            hashed_password=None,
            google_id=google_id,
            picture_url=picture,
        )
        db.add(user)
    else:
        user.google_id = google_id
        if picture:
            user.picture_url = picture

    db.commit()
    db.refresh(user)

    token = security.create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=user)


def _unique_username(db: Session, base_name: str) -> str:
    """Turns a Google display name into a valid, unique username."""
    base = "".join(c for c in base_name if c.isalnum() or c == "_") or "racer"
    base = base[:45]
    candidate = base
    suffix = 1
    while db.query(models.User).filter(models.User.username == candidate).first():
        suffix += 1
        candidate = f"{base}{suffix}"
    return candidate


@router.get("/me", response_model=schemas.UserOut)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout():
    return {"detail": "Logged out"}
