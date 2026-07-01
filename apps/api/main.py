"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from routes import register, admin_requests, student, institutional, platform_admin, profile, sessions

app = FastAPI(title="Reto IA Bolivar API", version="1.0.0")

origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
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


@app.get("/health")
async def health():
    return {"status": "ok", "service": "reto-ia-bolivar-api"}
