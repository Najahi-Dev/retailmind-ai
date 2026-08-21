from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import forecasting, pricing
import uvicorn

app = FastAPI(title="RetailMind AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecasting.router, prefix="/api/v1", tags=["forecasting"])
app.include_router(pricing.router, prefix="/api/v1", tags=["pricing"])

@app.get("/")
def root():
    return {"service": "RetailMind AI", "status": "running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)