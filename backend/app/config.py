import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_backend = os.path.join(BASE_DIR, ".env")
env_root = os.path.join(os.path.dirname(BASE_DIR), ".env")

if os.path.exists(env_backend):
    load_dotenv(env_backend)
elif os.path.exists(env_root):
    load_dotenv(env_root)
else:
    load_dotenv()

# Kunci API dibaca HANYA dari environment variable (.env) sesuai aturan keamanan OT-02
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
COHERE_API_KEY = os.getenv("COHERE_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OVH_BASE_URL = os.getenv("OVH_BASE_URL", "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "")


# Batas Rate Limit Sesuai Aturan BE-01 (60 req/menit per user)
BATAS_PERMINTAAN_PER_MENIT = int(os.getenv("RATE_LIMIT_PER_USER", 60))

# Lokasi File Database SQLite (Lokal)
DATABASE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "db", "rencana.db")
