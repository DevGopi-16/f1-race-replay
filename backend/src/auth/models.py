from sqlalchemy import Column, Integer, String, Boolean

from src.auth.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    username = Column(
        String,
        unique=True,
        index=True,
    )

    email = Column(
        String,
        unique=True,
        index=True,
        nullable=True,
    )

    hashed_password = Column(
        String,
        nullable=True,
    )

    google_id = Column(
        String,
        unique=True,
        index=True,
        nullable=True,
    )

    discord_id = Column(
        String,
        unique=True,
        index=True,
        nullable=True,
    )
    
    x_id = Column(
        String,
        unique=True,
        index=True,
        nullable=True,
    )

    picture_url = Column(
        String,
        nullable=True,
    )

    is_pro = Column(
        Boolean,
        default=False,
    )

    email_verified = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    favorite_driver = Column(
        String,
        default="VER",
        nullable=True,
    )

    favorite_team = Column(
        String,
        default="Red Bull Racing",
        nullable=True,
    )

    replays_watched = Column(
        Integer,
        default=0,
        nullable=True,
    )

    telemetry_preferences = Column(
        String,
        default="speed,throttle,brake",
        nullable=True,
    )

    default_driver_comp = Column(
        String,
        default="VER",
        nullable=True,
    )

    units = Column(
        String,
        default="metric",
        nullable=True,
    )

    theme = Column(
        String,
        default="dark",
        nullable=True,
    )

    accent_color = Column(
        String,
        default="#e10600",
        nullable=True,
    )

    notifications_enabled = Column(
        Integer,
        default=1,
        nullable=True,
    )