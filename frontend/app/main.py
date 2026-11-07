from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from app.api.router import api_router
from app.core.logging import setup_logging, logger
import time
import uuid

setup_logging()

app = FastAPI(
    title="FinOS Financial Verification API",
    version="1.0.0",
    docs_url=None,
    redoc_url=None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_request_id_and_logging(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    logger.info(f"Incoming request: {request.method} {request.url.path} [ID: {request_id}]")
    
    response = await call_next(request)
    
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Request-ID"] = request_id
    
    logger.info(f"Completed request: {request.method} {request.url.path} - Status: {response.status_code} [Time: {process_time:.2f}ms] [ID: {request_id}]")
    return response

# Pointing to FastAPI root openapi.json schema path
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(openapi_url="/openapi.json", title="FinOS API Docs")

@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    return get_redoc_html(openapi_url="/openapi.json", title="FinOS ReDoc")

app.include_router(api_router, prefix="/api/v1")

@app.get("/healthz")
async def health_check():
    return {"status": "healthy", "service": "FinOS Financial Brain"}
