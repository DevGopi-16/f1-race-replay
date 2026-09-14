from fastapi import APIRouter

from src.live.state import live_state


router = APIRouter(prefix="/api", tags=["Live"])


@router.get("/live/status")
def live_status():
    return live_state.snapshot()
