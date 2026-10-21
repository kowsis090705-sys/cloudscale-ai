from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
from analyzer import analyze_metrics

app = FastAPI(title="CloudScale AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "CloudScale AI is running",
        "status": "success"
    }

@app.get("/health")
def health():
    return {"status": "UP"}

    
@app.get("/metrics")
async def get_metrics():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "http://127.0.0.1:8080/api/metrics"
            )
            response.raise_for_status()

        return response.json()

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Java Spring Boot backend unavailable"
        )

    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="Java metrics API returned an error"
        )

        
@app.get("/analyze")
async def analyze():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "http://127.0.0.1:8080/api/metrics"
            )
            response.raise_for_status()

        metrics = response.json()
        return analyze_metrics(metrics)

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Java Spring Boot backend unavailable"
        )

    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="Java metrics API returned an error"
        )


