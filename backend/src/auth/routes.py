import os
import secrets
import hashlib
import base64

from urllib.parse import urlencode

import requests

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from firebase_admin import auth as firebase_auth

from .firebase_admin import firebase_app
from . import models, schemas, security
from src.auth.refresh_tokens.service import issue_refresh_token
from src.auth.refresh_tokens.routes import set_refresh_cookie
from .database import get_db
from src.auth.rate_limit.dependency import check_rate_limit, record_failed_attempt, clear_rate_limit, get_client_ip
from src.auth.security_log.logger import log_event
from fastapi import BackgroundTasks
from src.auth.email_verification.service import send_verification_email_task
from src.auth.refresh_tokens.service import revoke_one
from src.auth.refresh_tokens.routes import REFRESH_COOKIE_NAME, clear_refresh_cookie
from .dependencies import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


# =========================================================
# DISCORD
# =========================================================

DISCORD_CLIENT_ID = os.getenv(
    "DISCORD_CLIENT_ID"
)

DISCORD_CLIENT_SECRET = os.getenv(
    "DISCORD_CLIENT_SECRET"
)

DISCORD_REDIRECT_URI = os.getenv(
    "DISCORD_REDIRECT_URI",
    "http://localhost:8000/auth/discord/callback",
)

FRONTEND_DISCORD_CALLBACK = os.getenv(
    "FRONTEND_DISCORD_CALLBACK",
    "http://localhost:5173/auth/discord/callback",
)

# Used when Discord is being connected from the Profile page.
FRONTEND_PROFILE_URL = os.getenv(
    "FRONTEND_PROFILE_URL",
    "http://localhost:5173/profile",
)


# =========================================================
# X
# =========================================================

X_CLIENT_ID = os.getenv(
    "X_CLIENT_ID"
)

X_CLIENT_SECRET = os.getenv(
    "X_CLIENT_SECRET"
)

X_REDIRECT_URI = os.getenv(
    "X_REDIRECT_URI",
    "http://localhost:8000/auth/x/callback",
)

FRONTEND_X_CALLBACK = os.getenv(
    "FRONTEND_X_CALLBACK",
    "http://localhost:5173/auth/x/callback",
)


# =========================================================
# OAUTH STATE
# =========================================================

# Discord normal login states.
_DISCORD_OAUTH_STATES: set[str] = set()

# Discord account-linking OAuth states.
# Each state is tied to the already-authenticated F1 user.
_DISCORD_CONNECT_OAUTH_STATES: dict[str, int] = {}

# X OAuth states.
# Each state maps to its PKCE code verifier.
_X_OAUTH_STATES: dict[str, str] = {}


# =========================================================
# SIGN UP
# =========================================================

@router.post(
    "/signup",
    response_model=schemas.Token,
    status_code=status.HTTP_201_CREATED,
)
def signup(
    payload: schemas.UserCreate,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    client_ip = get_client_ip(request)
    check_rate_limit("signup", client_ip, max_attempts=5, window_seconds=3600)
    record_failed_attempt("signup", client_ip)

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

    log_event("signup", user_id=user.id, email=user.email)
    background_tasks.add_task(send_verification_email_task, user.id, user.email)

    refresh_token = issue_refresh_token(db, user.id)
    token = security.create_access_token(
        {"sub": str(user.id), "sid": refresh_token.id}
    )
    security.set_auth_cookie(response, token)
    set_refresh_cookie(response, refresh_token.token)

    return schemas.Token(
        access_token=token,
        user=user,
    )


# =========================================================
# LOGIN
# =========================================================

@router.post(
    "/login",
    response_model=schemas.Token,
)
def login(
    payload: schemas.UserLogin,
    response: Response,
    db: Session = Depends(get_db),
):
    check_rate_limit("login", payload.email, max_attempts=5, window_seconds=900)

    user = (
        db.query(models.User)
        .filter(models.User.email == payload.email)
        .first()
    )

    if not user or not user.hashed_password:
        record_failed_attempt("login", payload.email)
        log_event("login_failed", email=payload.email, reason="no_account")
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
        )

    if not security.verify_password(
        payload.password,
        user.hashed_password,
    ):
        record_failed_attempt("login", payload.email)
        log_event("login_failed", email=payload.email, reason="wrong_password")
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
        )

    clear_rate_limit("login", payload.email)

    refresh_token = issue_refresh_token(db, user.id)
    token = security.create_access_token(
        {"sub": str(user.id), "sid": refresh_token.id}
    )
    security.set_auth_cookie(response, token)
    set_refresh_cookie(response, refresh_token.token)

    return schemas.Token(
        access_token=token,
        user=user,
    )


# =========================================================
# GOOGLE LOGIN
# =========================================================

@router.post(
    "/google",
    response_model=schemas.Token,
)
def google_login(
    payload: schemas.GoogleAuthPayload,
    response: Response,
    db: Session = Depends(get_db),
):
    try:
        decoded_token = firebase_auth.verify_id_token(
            payload.id_token,
            app=firebase_app,
        )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid Firebase ID token",
        )

    google_id = decoded_token.get("uid")

    if not google_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid Firebase user",
        )

    email = decoded_token.get("email")
    name = decoded_token.get("name")

    if not name:
        name = (
            email.split("@")[0]
            if email
            else "racer"
        )

    picture = decoded_token.get("picture")
    google_email_verified = bool(decoded_token.get("email_verified"))

    user = (
        db.query(models.User)
        .filter(
            models.User.google_id == google_id
        )
        .first()
    )

    if user is None and email:
        existing = (
            db.query(models.User)
            .filter(
                models.User.email == email
            )
            .first()
        )

        if existing is not None:
            # Only merge into an existing email account if both sides are
            # verified: Google vouches for the address, and the existing
            # account's address was proven by its owner. Otherwise someone
            # could pre-register a victim's email and inherit their login.
            if not (google_email_verified and existing.email_verified):
                log_event(
                    "google_link_refused",
                    email=email,
                    reason="email_not_verified",
                )
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "An account with this email already exists. "
                        "Log in with your password and verify your email, "
                        "or use a different sign-in method."
                    ),
                )
            user = existing

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
            email_verified=google_email_verified,
        )

        db.add(user)

    else:
        user.google_id = google_id

        if picture:
            user.picture_url = picture

        if google_email_verified and email and user.email == email:
            user.email_verified = True

    db.commit()
    db.refresh(user)

    refresh_token = issue_refresh_token(db, user.id)
    token = security.create_access_token(
        {"sub": str(user.id), "sid": refresh_token.id}
    )
    security.set_auth_cookie(response, token)
    set_refresh_cookie(response, refresh_token.token)

    return schemas.Token(
        access_token=token,
        user=user,
    )


# =========================================================
# CONNECT GOOGLE ACCOUNT
# =========================================================

@router.post("/profile/connections/google")
def connect_google_account(
    payload: schemas.GoogleAuthPayload,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        decoded_token = firebase_auth.verify_id_token(
            payload.id_token,
            app=firebase_app,
        )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid Firebase ID token",
        )

    google_id = decoded_token.get("uid")

    if not google_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid Firebase user",
        )

    existing_user = (
        db.query(models.User)
        .filter(
            models.User.google_id == google_id
        )
        .first()
    )

    if (
        existing_user is not None
        and existing_user.id != current_user.id
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "This Google account is already connected "
                "to another F1 Race Replay account"
            ),
        )

    current_user.google_id = google_id

    picture = decoded_token.get("picture")

    if picture and not current_user.picture_url:
        current_user.picture_url = picture

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Google account connected",
        "provider": "google",
        "connected": True,
    }


# =========================================================
# GET PROFILE CONNECTIONS
# =========================================================

@router.get("/profile/connections")
def get_profile_connections(
    current_user: models.User = Depends(get_current_user),
):
    return {
        "email": bool(
            current_user.email
            and current_user.hashed_password
        ),
        "google": current_user.google_id is not None,
        "discord": current_user.discord_id is not None,
        "x": current_user.x_id is not None,
    }


# =========================================================
# DISCONNECT PROFILE CONNECTION
# =========================================================

@router.delete("/profile/connections/{provider}")
def disconnect_profile_connection(
    provider: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    provider = provider.lower().strip()

    supported = {
        "google",
        "discord",
        "x",
    }

    if provider not in supported:
        raise HTTPException(
            status_code=400,
            detail="Unsupported connection provider",
        )

    connected_methods = sum(
        [
            bool(
                current_user.email
                and current_user.hashed_password
            ),
            current_user.google_id is not None,
            current_user.discord_id is not None,
            current_user.x_id is not None,
        ]
    )

    if connected_methods <= 1:
        raise HTTPException(
            status_code=400,
            detail="You cannot disconnect your only login method",
        )

    if provider == "google":
        if current_user.google_id is None:
            raise HTTPException(
                status_code=404,
                detail="Google is not connected",
            )

        current_user.google_id = None

    elif provider == "discord":
        if current_user.discord_id is None:
            raise HTTPException(
                status_code=404,
                detail="Discord is not connected",
            )

        current_user.discord_id = None

    elif provider == "x":
        if current_user.x_id is None:
            raise HTTPException(
                status_code=404,
                detail="X is not connected",
            )

        current_user.x_id = None

    db.commit()

    return {
        "message": f"{provider.capitalize()} disconnected",
        "provider": provider,
        "connected": False,
    }


# =========================================================
# X LOGIN
# =========================================================

@router.get("/x/login")
def x_login():
    if not X_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="X sign-in is not configured on the server",
        )

    code_verifier = secrets.token_urlsafe(64)

    state = secrets.token_urlsafe(32)

    digest = hashlib.sha256(
        code_verifier.encode("ascii")
    ).digest()

    code_challenge = (
        base64.urlsafe_b64encode(digest)
        .rstrip(b"=")
        .decode("ascii")
    )

    _X_OAUTH_STATES[state] = code_verifier

    params = {
        "response_type": "code",
        "client_id": X_CLIENT_ID,
        "redirect_uri": X_REDIRECT_URI,
        "scope": "users.read tweet.read offline.access",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }

    authorization_url = (
        "https://twitter.com/i/oauth2/authorize?"
        + urlencode(params)
    )

    return RedirectResponse(
        url=authorization_url,
        status_code=302,
    )


# =========================================================
# X CALLBACK
# =========================================================

@router.get("/x/callback")
def x_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    if error:
        return RedirectResponse(
            url=(
                f"{FRONTEND_X_CALLBACK}"
                f"?error={error}"
            ),
            status_code=302,
        )

    if not code:
        return RedirectResponse(
            url=(
                f"{FRONTEND_X_CALLBACK}"
                "?error=missing_x_code"
            ),
            status_code=302,
        )

    if not state:
        return RedirectResponse(
            url=(
                f"{FRONTEND_X_CALLBACK}"
                "?error=missing_x_state"
            ),
            status_code=302,
        )

    code_verifier = _X_OAUTH_STATES.pop(
        state,
        None,
    )

    if not code_verifier:
        return RedirectResponse(
            url=(
                f"{FRONTEND_X_CALLBACK}"
                "?error=invalid_x_state"
            ),
            status_code=302,
        )

    if not X_CLIENT_ID:
        return RedirectResponse(
            url=(
                f"{FRONTEND_X_CALLBACK}"
                "?error=x_not_configured"
            ),
            status_code=302,
        )

    try:
        token_response = requests.post(
            "https://api.x.com/2/oauth2/token",
            data={
                "code": code,
                "grant_type": "authorization_code",
                "client_id": X_CLIENT_ID,
                "redirect_uri": X_REDIRECT_URI,
                "code_verifier": code_verifier,
            },
            auth=(
                X_CLIENT_ID,
                X_CLIENT_SECRET,
            ) if X_CLIENT_SECRET else None,
            headers={
                "Content-Type":
                    "application/x-www-form-urlencoded",
            },
            timeout=10,
        )

    except requests.RequestException:
        return RedirectResponse(
            url=(
                f"{FRONTEND_X_CALLBACK}"
                "?error=x_token_request_failed"
            ),
            status_code=302,
        )

    if not token_response.ok:
        return RedirectResponse(
            url=(
                f"{FRONTEND_X_CALLBACK}"
                "?error=x_token_exchange_failed"
            ),
            status_code=302,
        )

    try:
        token_data = token_response.json()

    except ValueError:
        return RedirectResponse(
            url=(
                f"{FRONTEND_X_CALLBACK}"
                "?error=invalid_x_token_response"
            ),
            status_code=302,
        )

    x_access_token = token_data.get(
        "access_token"
    )

    if not x_access_token:
        return RedirectResponse(
            url=(
                f"{FRONTEND_X_CALLBACK}"
                "?error=missing_x_access_token"
            ),
            status_code=302,
        )

    try:
        x_user_response = requests.get(
            "https://api.x.com/2/users/me",
            headers={
                "Authorization":
                    f"Bearer {x_access_token}",
            },
            timeout=10,
        )

    except requests.RequestException:
        return RedirectResponse(
            url=(
                f"{FRONTEND_X_CALLBACK}"
                "?error=x_user_request_failed"
            ),
            status_code=302,
        )

    if not x_user_response.ok:
        return RedirectResponse(
            url=(
                f"{FRONTEND_X_CALLBACK}"
                "?error=x_user_fetch_failed"
            ),
            status_code=302,
        )

    try:
        x_response_data = x_user_response.json()

    except ValueError:
        return RedirectResponse(
            url=(
                f"{FRONTEND_X_CALLBACK}"
                "?error=invalid_x_user_response"
            ),
            status_code=302,
        )

    x_user = x_response_data.get("data") or {}

    x_id = x_user.get("id")

    if not x_id:
        return RedirectResponse(
            url=(
                f"{FRONTEND_X_CALLBACK}"
                "?error=missing_x_id"
            ),
            status_code=302,
        )

    username = (
        x_user.get("username")
        or "racer"
    )

    name = (
        x_user.get("name")
        or username
        or "racer"
    )

    user = (
        db.query(models.User)
        .filter(
            models.User.x_id == x_id
        )
        .first()
    )

    if user is None:
        user = models.User(
            username=_unique_username(
                db,
                name,
            ),
            email=None,
            hashed_password=None,
            x_id=x_id,
        )

        db.add(user)

    else:
        user.x_id = x_id

    db.commit()
    db.refresh(user)

    refresh_token = issue_refresh_token(db, user.id)
    access_token = security.create_access_token(
        {"sub": str(user.id), "sid": refresh_token.id}
    )

    redirect_response = RedirectResponse(
        url=FRONTEND_X_CALLBACK,
        status_code=302,
    )
    security.set_auth_cookie(
        redirect_response,
        access_token,
    )
    set_refresh_cookie(redirect_response, refresh_token.token)
    return redirect_response


# =========================================================
# START DISCORD ACCOUNT CONNECTION
# =========================================================

@router.get(
    "/profile/connections/discord/start"
)
def start_discord_connection(
    current_user: models.User = Depends(get_current_user),
):
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

    if current_user.discord_id is not None:
        raise HTTPException(
            status_code=400,
            detail="Discord is already connected",
        )

    state = secrets.token_urlsafe(32)

    _DISCORD_CONNECT_OAUTH_STATES[state] = current_user.id

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

    return {
        "authorization_url": authorization_url,
    }


# =========================================================
# DISCORD LOGIN
# =========================================================

@router.get("/discord/login")
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


# =========================================================
# DISCORD CALLBACK
# =========================================================

@router.get("/discord/callback")
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

    # ---------------------------------------------------------
    # Discord account linking flow
    # ---------------------------------------------------------
    #
    # A connect state is tied to the F1 user who started the
    # linking flow. It must be handled before the normal
    # Discord login state validation below.
    #

    if state in _DISCORD_CONNECT_OAUTH_STATES:
        user_id = _DISCORD_CONNECT_OAUTH_STATES.pop(
            state
        )

        if error:
            return RedirectResponse(
                url=(
                    f"{FRONTEND_PROFILE_URL}"
                    f"?discord_error={error}"
                ),
                status_code=302,
            )

        if not code:
            return RedirectResponse(
                url=(
                    f"{FRONTEND_PROFILE_URL}"
                    "?discord_error=missing_code"
                ),
                status_code=302,
            )

        if not DISCORD_CLIENT_ID:
            return RedirectResponse(
                url=(
                    f"{FRONTEND_PROFILE_URL}"
                    "?discord_error=discord_not_configured"
                ),
                status_code=302,
            )

        if not DISCORD_CLIENT_SECRET:
            return RedirectResponse(
                url=(
                    f"{FRONTEND_PROFILE_URL}"
                    "?discord_error=discord_secret_not_configured"
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
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                },
                timeout=10,
            )

        except requests.RequestException:
            return RedirectResponse(
                url=(
                    f"{FRONTEND_PROFILE_URL}"
                    "?discord_error=discord_token_request_failed"
                ),
                status_code=302,
            )

        if not token_response.ok:
            return RedirectResponse(
                url=(
                    f"{FRONTEND_PROFILE_URL}"
                    "?discord_error=discord_token_exchange_failed"
                ),
                status_code=302,
            )

        try:
            token_data = token_response.json()

        except ValueError:
            return RedirectResponse(
                url=(
                    f"{FRONTEND_PROFILE_URL}"
                    "?discord_error=invalid_discord_token_response"
                ),
                status_code=302,
            )

        discord_access_token = token_data.get(
            "access_token"
        )

        if not discord_access_token:
            return RedirectResponse(
                url=(
                    f"{FRONTEND_PROFILE_URL}"
                    "?discord_error=missing_discord_access_token"
                ),
                status_code=302,
            )

        try:
            discord_user_response = requests.get(
                "https://discord.com/api/users/@me",
                headers={
                    "Authorization":
                        f"Bearer {discord_access_token}"
                },
                timeout=10,
            )

        except requests.RequestException:
            return RedirectResponse(
                url=(
                    f"{FRONTEND_PROFILE_URL}"
                    "?discord_error=discord_user_request_failed"
                ),
                status_code=302,
            )

        if not discord_user_response.ok:
            return RedirectResponse(
                url=(
                    f"{FRONTEND_PROFILE_URL}"
                    "?discord_error=discord_user_fetch_failed"
                ),
                status_code=302,
            )

        try:
            discord_user = (
                discord_user_response.json()
            )

        except ValueError:
            return RedirectResponse(
                url=(
                    f"{FRONTEND_PROFILE_URL}"
                    "?discord_error=invalid_discord_user_response"
                ),
                status_code=302,
            )

        discord_id = discord_user.get("id")

        if not discord_id:
            return RedirectResponse(
                url=(
                    f"{FRONTEND_PROFILE_URL}"
                    "?discord_error=missing_discord_id"
                ),
                status_code=302,
            )

        target_user = (
            db.query(models.User)
            .filter(
                models.User.id == user_id
            )
            .first()
        )

        if target_user is None:
            return RedirectResponse(
                url=(
                    f"{FRONTEND_PROFILE_URL}"
                    "?discord_error=user_not_found"
                ),
                status_code=302,
            )

        existing_discord_user = (
            db.query(models.User)
            .filter(
                models.User.discord_id == discord_id
            )
            .first()
        )

        if (
            existing_discord_user is not None
            and existing_discord_user.id != target_user.id
        ):
            return RedirectResponse(
                url=(
                    f"{FRONTEND_PROFILE_URL}"
                    "?discord_error=discord_already_connected"
                ),
                status_code=302,
            )

        avatar_hash = discord_user.get(
            "avatar"
        )

        if avatar_hash:
            target_user.picture_url = (
                "https://cdn.discordapp.com/"
                f"avatars/{discord_id}/"
                f"{avatar_hash}.png"
            )

        target_user.discord_id = discord_id

        db.commit()

        return RedirectResponse(
            url=(
                f"{FRONTEND_PROFILE_URL}"
                "?discord_connected=1"
            ),
            status_code=302,
        )

    # ---------------------------------------------------------
    # Normal Discord login flow
    # ---------------------------------------------------------

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
                "Content-Type":
                    "application/x-www-form-urlencoded",
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
                "Authorization":
                    f"Bearer {discord_access_token}"
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
        discord_user = (
            discord_user_response.json()
        )

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
    discord_email_verified = bool(discord_user.get("verified"))

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
        existing = (
            db.query(models.User)
            .filter(
                models.User.email == email
            )
            .first()
        )

        if existing is not None:
            # Same rule as Google: only merge when both sides are verified.
            if not (discord_email_verified and existing.email_verified):
                log_event(
                    "discord_link_refused",
                    email=email,
                    reason="email_not_verified",
                )
                return RedirectResponse(
                    url=(
                        f"{FRONTEND_DISCORD_CALLBACK}"
                        "?error=email_already_registered"
                    ),
                    status_code=302,
                )
            user = existing

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
            email_verified=bool(email) and discord_email_verified,
        )

        db.add(user)

    else:
        user.discord_id = discord_id

        if picture_url:
            user.picture_url = picture_url

        if email and not user.email:
            user.email = email
            user.email_verified = discord_email_verified
        elif email and user.email == email and discord_email_verified:
            user.email_verified = True

    db.commit()
    db.refresh(user)

    refresh_token = issue_refresh_token(db, user.id)
    access_token = security.create_access_token(
        {"sub": str(user.id), "sid": refresh_token.id}
    )

    redirect_response = RedirectResponse(
        url=FRONTEND_DISCORD_CALLBACK,
        status_code=302,
    )
    security.set_auth_cookie(
        redirect_response,
        access_token,
    )
    set_refresh_cookie(redirect_response, refresh_token.token)
    return redirect_response


# =========================================================
# UNIQUE USERNAME
# =========================================================

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


# =========================================================
# CURRENT USER
# =========================================================

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


# =========================================================
# LOGOUT
# =========================================================

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if refresh_token:
        revoke_one(db, refresh_token)

    security.clear_auth_cookie(response)
    clear_refresh_cookie(response)

    return {
        "detail": "Logged out"
    }

# =========================================================
# CURRENT ACTIVE USER
# =========================================================

def get_current_active_user(
    current_user: models.User = Depends(
        get_current_user
    ),
):
    return current_user
