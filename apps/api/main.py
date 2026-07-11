"""FastAPI application entry point."""
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.tasks import prune_old_jobs
from routes import register, admin_requests, student, institutional, platform_admin, profile, sessions, psychometric, opportunities


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
app.include_router(platform_admin.router)
app.include_router(profile.router)
app.include_router(sessions.router)
app.include_router(psychometric.router)
app.include_router(opportunities.router)
app.include_router(opportunities.admin_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "reto-ia-bolivar-api"}
