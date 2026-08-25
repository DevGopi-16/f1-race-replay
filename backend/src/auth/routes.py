import os
import secrets
from urllib.parse import urlencode

import requests

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from . import models, schemas, security
from .database import get_db
from .dependencies import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID"
)

DISCORD_CLIENT_ID = os.getenv(
    "DISCORD_CLIENT_ID"
)

DISCORD_CLIENT_SECRET = os.getenv(
    "DISCORD_CLIENT_SECRET"
)

DISCORD_REDIRECT_URI = os.getenv(
    "DISCORD_REDIRECT_URI",
    "http://127.0.0.1:8000/auth/discord/callback",
)

FRONTEND_DISCORD_CALLBACK = os.getenv(
    "FRONTEND_DISCORD_CALLBACK",
    "http://localhost:5173/auth/discord/callback",
)


_DISCORD_OAUTH_STATES: set[str] = set()


@router.post(
    "/signup",
    response_model=schemas.Token,
    status_code=status.HTTP_201_CREATED,
)
def signup(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    if (
        db.query(models.User)
        .filter(models.User.email == payload.email)
        .first()
    ):
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    if (
        db.query(models.User)
        .filter(
            models.User.username == payload.username
        )
        .first()
    ):
        raise HTTPException(
            status_code=400,
            detail="Username already taken",
        )

    user = models.User(
        username=payload.username,
        email=payload.email,
        hashed_password=security.hash_password(
            payload.password
        ),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = security.create_access_token(
        {"sub": str(user.id)}
    )

    return schemas.Token(
        access_token=token,
        user=user,
    )


@router.post(
    "/login",
    response_model=schemas.Token,
)
def login(
    payload: schemas.UserLogin,
    db: Session = Depends(get_db),
):
    user = (
        db.query(models.User)
        .filter(models.User.email == payload.email)
        .first()
    )

    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
        )

    if not security.verify_password(
        payload.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
        )

    token = security.create_access_token(
        {"sub": str(user.id)}
    )

    return schemas.Token(
        access_token=token,
        user=user,
    )


@router.post(
    "/google",
    response_model=schemas.Token,
)
def google_login(
    payload: schemas.GoogleAuthPayload,
    db: Session = Depends(get_db),
):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google sign-in is not configured on the server",
        )

    try:
        idinfo = google_id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid Google token",
        )

    google_id = idinfo["sub"]

    email = idinfo.get("email")

    name = idinfo.get("name")

    if not name:
        name = (
            email.split("@")[0]
            if email
            else "racer"
        )

    picture = idinfo.get("picture")

    user = (
        db.query(models.User)
        .filter(
            models.User.google_id == google_id
        )
        .first()
    )

    if user is None and email:
        user = (
            db.query(models.User)
            .filter(
                models.User.email == email
            )
            .first()
        )

    if user is None:
        user = models.User(
            username=_unique_username(
                db,
                name,
            ),
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

    token = security.create_access_token(
        {"sub": str(user.id)}
    )

    return schemas.Token(
        access_token=token,
        user=user,
    )


@router.get(
    "/discord/login"
)
def discord_login():
    if not DISCORD_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Discord sign-in is not configured on the server",
        )

    if not DISCORD_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Discord client secret is not configured on the server",
        )

    state = secrets.token_urlsafe(32)

    _DISCORD_OAUTH_STATES.add(state)

    params = {
        "client_id": DISCORD_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": DISCORD_REDIRECT_URI,
        "scope": "identify email",
        "state": state,
    }

    authorization_url = (
        "https://discord.com/oauth2/authorize?"
        + urlencode(params)
    )

    return RedirectResponse(
        url=authorization_url,
        status_code=302,
    )


@router.get(
    "/discord/callback"
)
def discord_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    if error:
        return RedirectResponse(
            url=(
                f"{FRONTEND_DISCORD_CALLBACK}"
                f"?error={error}"
            ),
            status_code=302,
        )

    if not code:
        return RedirectResponse(
            url=(
                f"{FRONTEND_DISCORD_CALLBACK}"
                "?error=missing_code"
            ),
            status_code=302,
        )

    if not state:
        return RedirectResponse(
            url=(
                f"{FRONTEND_DISCORD_CALLBACK}"
                "?error=missing_state"
            ),
            status_code=302,
        )

    if state not in _DISCORD_OAUTH_STATES:
        return RedirectResponse(
            url=(
                f"{FRONTEND_DISCORD_CALLBACK}"
                "?error=invalid_state"
            ),
            status_code=302,
        )

    _DISCORD_OAUTH_STATES.discard(state)

    if not DISCORD_CLIENT_ID:
        return RedirectResponse(
            url=(
                f"{FRONTEND_DISCORD_CALLBACK}"
                "?error=discord_not_configured"
            ),
            status_code=302,
        )

    if not DISCORD_CLIENT_SECRET:
        return RedirectResponse(
            url=(
                f"{FRONTEND_DISCORD_CALLBACK}"
                "?error=discord_secret_not_configured"
            ),
            status_code=302,
        )

    try:
        token_response = requests.post(
            "https://discord.com/api/oauth2/token",
            data={
                "client_id": DISCORD_CLIENT_ID,
                "client_secret": DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": DISCORD_REDIRECT_URI,
            },
            headers={
                "Content-Type": (
                    "application/x-www-form-urlencoded"
                ),
            },
            timeout=10,
        )
    except requests.RequestException:
        return RedirectResponse(
            url=(
                f"{FRONTEND_DISCORD_CALLBACK}"
                "?error=discord_token_request_failed"
            ),
            status_code=302,
        )

    if not token_response.ok:
        return RedirectResponse(
            url=(
                f"{FRONTEND_DISCORD_CALLBACK}"
                "?error=discord_token_exchange_failed"
            ),
            status_code=302,
        )

    try:
        token_data = token_response.json()
    except ValueError:
        return RedirectResponse(
            url=(
                f"{FRONTEND_DISCORD_CALLBACK}"
                "?error=invalid_discord_token_response"
            ),
            status_code=302,
        )

    discord_access_token = token_data.get(
        "access_token"
    )

    if not discord_access_token:
        return RedirectResponse(
            url=(
                f"{FRONTEND_DISCORD_CALLBACK}"
                "?error=missing_discord_access_token"
            ),
            status_code=302,
        )

    try:
        discord_user_response = requests.get(
            "https://discord.com/api/users/@me",
            headers={
                "Authorization": (
                    f"Bearer {discord_access_token}"
                )
            },
            timeout=10,
        )
    except requests.RequestException:
        return RedirectResponse(
            url=(
                f"{FRONTEND_DISCORD_CALLBACK}"
                "?error=discord_user_request_failed"
            ),
            status_code=302,
        )

    if not discord_user_response.ok:
        return RedirectResponse(
            url=(
                f"{FRONTEND_DISCORD_CALLBACK}"
                "?error=discord_user_fetch_failed"
            ),
            status_code=302,
        )

    try:
        discord_user = discord_user_response.json()
    except ValueError:
        return RedirectResponse(
            url=(
                f"{FRONTEND_DISCORD_CALLBACK}"
                "?error=invalid_discord_user_response"
            ),
            status_code=302,
        )

    discord_id = discord_user.get("id")

    if not discord_id:
        return RedirectResponse(
            url=(
                f"{FRONTEND_DISCORD_CALLBACK}"
                "?error=missing_discord_id"
            ),
            status_code=302,
        )

    email = discord_user.get("email")

    username = (
        discord_user.get("global_name")
        or discord_user.get("username")
        or "racer"
    )

    avatar_hash = discord_user.get(
        "avatar"
    )

    picture_url = None

    if avatar_hash:
        picture_url = (
            "https://cdn.discordapp.com/"
            f"avatars/{discord_id}/"
            f"{avatar_hash}.png"
        )

    user = (
        db.query(models.User)
        .filter(
            models.User.discord_id == discord_id
        )
        .first()
    )

    if user is None and email:
        user = (
            db.query(models.User)
            .filter(
                models.User.email == email
            )
            .first()
        )

    if user is None:
        user = models.User(
            username=_unique_username(
                db,
                username,
            ),
            email=email,
            hashed_password=None,
            discord_id=discord_id,
            picture_url=picture_url,
        )

        db.add(user)

    else:
        user.discord_id = discord_id

        if picture_url:
            user.picture_url = picture_url

        if email and not user.email:
            user.email = email

    db.commit()
    db.refresh(user)

    access_token = security.create_access_token(
        {"sub": str(user.id)}
    )

    redirect_url = (
        f"{FRONTEND_DISCORD_CALLBACK}"
        f"#access_token={access_token}"
    )

    return RedirectResponse(
        url=redirect_url,
        status_code=302,
    )


def _unique_username(
    db: Session,
    base_name: str,
) -> str:
    base = "".join(
        c
        for c in base_name
        if c.isalnum() or c == "_"
    ) or "racer"

    base = base[:45]

    candidate = base

    suffix = 1

    while (
        db.query(models.User)
        .filter(
            models.User.username == candidate
        )
        .first()
    ):
        suffix += 1
        candidate = (
            f"{base}{suffix}"
        )

    return candidate


@router.get(
    "/me",
    response_model=schemas.UserOut,
)
def read_current_user(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    return current_user


@router.post("/logout")
def logout():
    return {
        "detail": "Logged out"
    }


def get_current_active_user(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    return current_user