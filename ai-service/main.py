from fastapi import FastAPI
from routers import pricing

app = FastAPI(
    title="RetailMind AI Service",
    version="1.0.0"
)

app.include_router(
    pricing.router,
    prefix="/api",
    tags=["pricing"]
)

@app.get("/health")
async def health():
    return { "status": "ok", "service": "RetailMind AI" }