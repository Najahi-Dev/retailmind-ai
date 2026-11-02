import hmac
import logging
import os

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from routers import forecasting, pricing

logger = logging.getLogger("retailmind.ai")

API_KEY_ENV = "AI_SERVICE_API_KEY"


def require_api_key(x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> None:
    """Constant-time check of the X-API-Key header against AI_SERVICE_API_KEY.

    If the key is not configured the service refuses all API calls (503) rather
    than running unauthenticated.
    """
    expected = os.environ.get(API_KEY_ENV, "")
    if not expected:
        raise HTTPException(status_code=503, detail="Service not configured")
    if not x_api_key or not hmac.compare_digest(
        x_api_key.encode("utf-8"), expected.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="Unauthorized")


def _allowed_origins() -> list[str]:
    raw = os.environ.get("ALLOWED_ORIGINS", "")
    return [o.strip() for o in raw.split(",") if o.strip() and o.strip() != "*"]


_docs_enabled = os.environ.get("ENABLE_API_DOCS", "").lower() in ("1", "true", "yes")

app = FastAPI(
    title="RetailMind AI Service",
    version="1.0.0",
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)

if not os.environ.get(API_KEY_ENV):
    logger.warning("%s is not set: all /api/v1 endpoints will return 503.", API_KEY_ENV)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)

_auth = [Depends(require_api_key)]
app.include_router(forecasting.router, prefix="/api/v1", tags=["forecasting"], dependencies=_auth)
app.include_router(pricing.router, prefix="/api/v1", tags=["pricing"], dependencies=_auth)


@app.get("/")
def root():
    # Unauthenticated liveness probe; reveals nothing sensitive.
    return {"service": "RetailMind AI", "status": "running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000)
