
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx

from analyzer import analyze_metrics
from predictor import predict_traffic


app = FastAPI(title="CloudScale AI")


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Spring Boot backend
JAVA_METRICS_URL = "http://127.0.0.1:8081/api/metrics"


# Request format for ML prediction
class PredictionRequest(BaseModel):
    recent_loads: list[float] = Field(min_length=5)


# Home API
@app.get("/")
def home():
    return {
        "message": "CloudScale AI is running",
        "status": "success",
    }


# Health API
@app.get("/health")
def health():
    return {"status": "UP"}


# Helper: Fetch real metrics from Spring Boot
async def fetch_java_metrics():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(JAVA_METRICS_URL)
            response.raise_for_status()

        return response.json()

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Java Spring Boot backend unavailable",
        )

    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="Java metrics API returned an error",
        )


# Real Metrics API
@app.get("/metrics")
async def get_metrics():
    return await fetch_java_metrics()


# Existing CPU, memory, error and latency analysis
@app.get("/analyze")
async def analyze():
    metrics = await fetch_java_metrics()
    return analyze_metrics(metrics)


# Random Forest Machine Learning Prediction API
@app.post("/predict")
def predict(request: PredictionRequest):
    try:
        return predict_traffic(request.recent_loads)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )
