# import uuid
# from datetime import datetime

# from sqlalchemy import Column, String, Boolean, DateTime
# from sqlalchemy.dialects.postgresql import UUID

# from .database import Base


# class User(Base):
#     __tablename__ = "users"

#     id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     username = Column(String(50), unique=True, nullable=False, index=True)
#     email = Column(String(255), unique=True, nullable=False, index=True)

#     # Nullable because Google-signup users have no password of their own.
#     hashed_password = Column(String(255), nullable=True)

#     # Set only for accounts created/linked via "Sign in with Google".
#     google_id = Column(String(255), unique=True, nullable=True, index=True)

#     # Google's profile photo URL when available. Falls back to a colored
#     # initial circle in the UI when this is null.
#     picture_url = Column(String(500), nullable=True)

#     # "Racer PRO" tier flag. Defaults to free tier on signup.
#     is_pro = Column(Boolean, default=False, nullable=False)

#     # Hex color used for the fallback avatar circle when there's no photo.
#     avatar_color = Column(String(7), default="#E10600", nullable=False)

#     created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# from sqlalchemy import Column, Integer, String, Boolean
# from src.auth.database import Base

# class User(Base):
#     __tablename__ = "users"

#     id = Column(Integer, primary_key=True, index=True)
#     username = Column(String, unique=True, index=True)
#     email = Column(String, unique=True, index=True, nullable=True)
#     hashed_password = Column(String)
#     picture_url = Column(String, nullable=True)
#     is_pro = Column(Boolean, default=False)
    
#     # Profile preferences
#     favorite_driver = Column(String, default="VER", nullable=True)
#     favorite_team = Column(String, default="Red Bull Racing", nullable=True)
#     replays_watched = Column(Integer, default=24, nullable=True)
    
#     # Terminal settings & preferences (CRITICAL FOR UNITS)
#     telemetry_preferences = Column(String, default="speed,throttle,brake", nullable=True)
#     default_driver_comp = Column(String, default="VER", nullable=True)
#     units = Column(String, default="metric", nullable=True)  # <-- Ensures units is stored in DB
#     theme = Column(String, default="dark", nullable=True)
#     accent_color = Column(String, default="#e10600", nullable=True)
#     notifications_enabled = Column(Integer, default=1, nullable=True)





from sqlalchemy import Column, Integer, String, Boolean
from src.auth.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)
    google_id = Column(String, unique=True, index=True, nullable=True)   # <-- ADD THIS
    picture_url = Column(String, nullable=True)
    is_pro = Column(Boolean, default=False)

    favorite_driver = Column(String, default="VER", nullable=True)
    favorite_team = Column(String, default="Red Bull Racing", nullable=True)
    replays_watched = Column(Integer, default=24, nullable=True)

    telemetry_preferences = Column(String, default="speed,throttle,brake", nullable=True)
    default_driver_comp = Column(String, default="VER", nullable=True)
    units = Column(String, default="metric", nullable=True)
    theme = Column(String, default="dark", nullable=True)
    accent_color = Column(String, default="#e10600", nullable=True)
    notifications_enabled = Column(Integer, default=1, nullable=True)