"""FastAPI application entry point."""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.config import settings
from core.tasks import prune_old_jobs
from routes import register, admin_requests, student, institutional, platform_admin, profile, psychometric, counselor, retention, opportunities

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async def _janitor():
        while True:
            prune_old_jobs()
            await asyncio.sleep(600)

    task = asyncio.create_task(_janitor())
    yield
    task.cancel()


app = FastAPI(title="UTB Te acompaña API", version="1.0.0", lifespan=lifespan)

origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(register.router)
app.include_router(admin_requests.router)
app.include_router(student.router)
app.include_router(institutional.router)
app.include_router(counselor.router)
app.include_router(retention.router)
app.include_router(platform_admin.router)
app.include_router(profile.router)
app.include_router(psychometric.router)
app.include_router(opportunities.router)
app.include_router(opportunities.admin_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Soft-degrade unexpected errors so portals/chats stay usable (401/403/404 stay via HTTPException)."""
    logger.exception("Unhandled API error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=200,
        content={
            "detail": "Servicio temporalmente limitado. Intente de nuevo en unos segundos.",
            "code": "internal_degraded",
            "degraded": True,
        },
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "reto-ia-bolivar-api"}
