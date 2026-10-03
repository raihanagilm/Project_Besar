import time
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from collections import defaultdict

from .config import BATAS_PERMINTAAN_PER_MENIT
from .database import init_db
from .routers.api_router import router

app = FastAPI(
    title="Pencatat & Pengingat Rencana Besar API",
    description="Backend lokal bertenaga Jev Deterministic Verifier untuk merancang dan mengingat rencana besar.",
    version="1.0.0"
)

# 1. CORS Middleware untuk mengizinkan akses dari frontend Vite lokal (port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Rate Limiting Sederhana Per-IP/User sesuai aturan BE-01 (Mencegah flood/abuse)
request_history = defaultdict(list)

@app.middleware("http")
async def rate_limiting_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    
    # Bersihkan riwayat lama (> 60 detik yang lalu)
    request_history[client_ip] = [t for t in request_history[client_ip] if now - t < 60]
    
    if len(request_history[client_ip]) >= BATAS_PERMINTAAN_PER_MENIT:
        return JSONResponse(
            status_code=429,
            content={"detail": "Batas permintaan per menit terlampaui. Silakan tunggu beberapa detik."},
            headers={"Retry-After": "60"}
        )
        
    request_history[client_ip].append(now)
    response = await call_next(request)
    return response

# 3. Lifecycle Inisialisasi Basis Data Lokal
@app.on_event("startup")
def startup_event():
    init_db()

# 4. Registrasi Router
app.include_router(router)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "pesan": "Backend Jev Verifier aktif dan berjalan di lokal."}
