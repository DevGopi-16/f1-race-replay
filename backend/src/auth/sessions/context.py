"""
Carries the current request's user agent and client IP to code that has no
request object handy (like issue_refresh_token), via context variables.
"""

from contextvars import ContextVar

_user_agent: ContextVar[str | None] = ContextVar("user_agent", default=None)
_ip_address: ContextVar[str | None] = ContextVar("ip_address", default=None)


def get_user_agent() -> str | None:
    return _user_agent.get()


def get_ip_address() -> str | None:
    return _ip_address.get()


class RequestContextMiddleware:
    """Pure ASGI middleware. Runs before the route handler, so sync
    handlers (which run in a threadpool with a copy of the context) see it."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope["headers"])
        ua = headers.get(b"user-agent", b"").decode("latin-1")[:255] or None

        forwarded = headers.get(b"x-forwarded-for", b"").decode("latin-1")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            client = scope.get("client")
            ip = client[0] if client else None

        ua_token = _user_agent.set(ua)
        ip_token = _ip_address.set(ip[:64] if ip else None)
        try:
            await self.app(scope, receive, send)
        finally:
            _user_agent.reset(ua_token)
            _ip_address.reset(ip_token)