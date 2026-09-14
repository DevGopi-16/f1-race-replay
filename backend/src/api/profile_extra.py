from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.auth.database import get_db, SessionLocal
from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.auth.replay_history import ReplayHistory
from src.auth.routes import get_current_active_user


router = APIRouter(
    tags=["Profile Extras"],
)


# ============================================================
# PROFILE SEASON SUMMARY
# ============================================================

@router.get(
    "/auth/profile/season-summary",
    summary="Get 2026 Season Summary",
)
def get_profile_season_summary(
    current_user: User = Depends(get_current_active_user),
):
    db = SessionLocal()

    try:
        histories = (
            db.query(ReplayHistory)
            .filter(
                ReplayHistory.user_id == current_user.id,
                ReplayHistory.year == 2026,
            )
            .order_by(ReplayHistory.last_watched_at.desc())
            .all()
        )

        total_sessions = len(histories)

        completed_sessions = sum(
            1
            for history in histories
            if history.completed_at is not None
            or float(history.progress or 0.0) >= 0.999
        )

        unique_races = len({
            (history.year, history.round)
            for history in histories
        })

        watch_time_seconds = sum(
            float(history.duration_seconds or 0.0)
            for history in histories
        )

        completion_rate = (
            (completed_sessions / total_sessions) * 100
            if total_sessions
            else 0.0
        )

        # 2026 currently has 24 scheduled Grands Prix.
        season_progress = min(
            (unique_races / 24) * 100,
            100.0,
        )

        race_watch_times = {}

        for history in histories:
            race_key = (history.year, history.round)

            race_watch_times[race_key] = (
                race_watch_times.get(race_key, 0.0)
                + float(history.duration_seconds or 0.0)
            )

        most_watched = None

        if race_watch_times:
            race_key = max(
                race_watch_times,
                key=race_watch_times.get,
            )

            most_watched = {
                "year": race_key[0],
                "round": race_key[1],
                "watch_time_seconds": race_watch_times[race_key],
            }

        latest_replay = None

        if histories:
            latest = histories[0]

            latest_replay = {
                "year": latest.year,
                "round": latest.round,
                "session_type": latest.session_type,
                "progress": float(latest.progress or 0.0),
                "last_watched_at": latest.last_watched_at,
            }

        return {
            "year": 2026,
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "unique_races": unique_races,
            "watch_time_seconds": watch_time_seconds,
            "completion_rate": round(completion_rate, 1),
            "season_progress": round(season_progress, 1),
            "most_watched": most_watched,
            "latest_replay": latest_replay,
        }

    finally:
        db.close()


# ============================================================
# ACHIEVEMENTS
# Derived entirely from ReplayHistory — no separate table.
# ============================================================

@router.get("/auth/achievements")
def get_achievements(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    histories = (
        db.query(ReplayHistory)
        .filter(ReplayHistory.user_id == current_user.id)
        .all()
    )

    def is_completed(history):
        return (
            history.completed_at is not None
            or float(history.progress or 0.0) >= 0.999
        )

    completed = [
        history
        for history in histories
        if is_completed(history)
    ]

    distinct_races = {
        (history.year, history.round)
        for history in histories
    }

    race_session_types = {}

    for history in histories:
        race_key = (history.year, history.round)

        race_session_types.setdefault(
            race_key,
            set(),
        ).add(history.session_type)

    race_weekends = sum(
        1
        for session_types in race_session_types.values()
        if len(session_types) >= 2
    )

    watch_time_seconds = sum(
        float(history.duration_seconds or 0.0)
        for history in histories
    )

    achievements = [
        {
            "key": "first_replay",
            "title": "FIRST REPLAY",
            "description": "Start your first replay session.",
            "icon": "play",
            "progress": min(len(histories), 1),
            "target": 1,
            "unlocked": len(histories) >= 1,
            "progress_label": f"{min(len(histories), 1)} / 1",
        },
        {
            "key": "first_finish",
            "title": "FIRST FINISH",
            "description": "Complete your first replay from start to finish.",
            "icon": "trophy",
            "progress": min(len(completed), 1),
            "target": 1,
            "unlocked": len(completed) >= 1,
            "progress_label": f"{min(len(completed), 1)} / 1",
        },
        {
            "key": "three_finishes",
            "title": "THREE FINISHES",
            "description": "Complete three replay sessions.",
            "icon": "medal",
            "progress": min(len(completed), 3),
            "target": 3,
            "unlocked": len(completed) >= 3,
            "progress_label": f"{min(len(completed), 3)} / 3",
        },
        {
            "key": "race_explorer",
            "title": "RACE EXPLORER",
            "description": "Watch five different races.",
            "icon": "flag",
            "progress": min(len(distinct_races), 5),
            "target": 5,
            "unlocked": len(distinct_races) >= 5,
            "progress_label": f"{min(len(distinct_races), 5)} / 5",
        },
        {
            "key": "time_served",
            "title": "TIME SERVED",
            "description": "Spend one hour watching F1 replays.",
            "icon": "clock",
            "progress": min(watch_time_seconds, 3600),
            "target": 3600,
            "unlocked": watch_time_seconds >= 3600,
            "progress_label": (
                f"{int(min(watch_time_seconds, 3600) // 60)} / 60 min"
            ),
        },
        {
            "key": "replay_addict",
            "title": "REPLAY ADDICT",
            "description": "Spend five hours watching F1 replays.",
            "icon": "flame",
            "progress": min(watch_time_seconds, 18000),
            "target": 18000,
            "unlocked": watch_time_seconds >= 18000,
            "progress_label": (
                f"{int(min(watch_time_seconds, 18000) // 60)} / 300 min"
            ),
        },
        {
            "key": "race_weekend",
            "title": "RACE WEEKEND",
            "description": "Watch at least two session types from one race weekend.",
            "icon": "calendar",
            "progress": min(race_weekends, 1),
            "target": 1,
            "unlocked": race_weekends >= 1,
            "progress_label": f"{min(race_weekends, 1)} / 1",
        },
        {
            "key": "completionist",
            "title": "COMPLETIONIST",
            "description": "Complete ten replay sessions.",
            "icon": "crown",
            "progress": min(len(completed), 10),
            "target": 10,
            "unlocked": len(completed) >= 10,
            "progress_label": f"{min(len(completed), 10)} / 10",
        },
    ]

    return achievements


# ============================================================
# EXTENDED PROFILE
# ============================================================

@router.get(
    "/profile/extended",
    summary="Get Extended Tier 2 Profile Data",
)
def get_extended_profile(
    current_user: User = Depends(get_current_active_user),
):
    return {
        "xp": getattr(current_user, "xp", 1250),
        "level": getattr(current_user, "level", 4),
        "next_milestone_xp": 2000,
        "circuits_visited": getattr(current_user, "circuits_visited", 12),
        "most_watched_circuit": getattr(
            current_user,
            "most_watched_circuit",
            "Silverstone",
        ),
        "circuit_completion": getattr(
            current_user,
            "circuit_completion_rate",
            86.0,
        ),
        "season_stats": {
            "sessions": getattr(
                current_user,
                "replays_watched",
                24,
            ),
            "laps": 128,
            "watch_time": (
                f"{getattr(current_user, 'watch_time_hours', 18.5)} hrs"
            ),
        },
        "achievements": [
            {
                "id": "first_lap",
                "name": "First Lap",
                "unlocked": True,
            },
            {
                "id": "telemetry_eng",
                "name": "Telemetry Engineer",
                "unlocked": True,
            },
            {
                "id": "hot_lap",
                "name": "Hot Lap Hunter",
                "unlocked": True,
            },
            {
                "id": "race_eng",
                "name": "Race Engineer",
                "unlocked": False,
            },
            {
                "id": "speed_demon",
                "name": "Speed Demon",
                "unlocked": True,
            },
            {
                "id": "paddock_reg",
                "name": "Paddock Regular",
                "unlocked": True,
            },
        ],
    }
