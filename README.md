# Pencatat & Pengingat Rencana Besar (Local Engine with Jev Reasoning)

Website lokal untuk menangkap, mengorganisasi, dan mengingat rencana besar dengan menterjemahkan pemikiran abstrak menjadi representasi terstruktur (ERD, Mindmap, Use Case, Database Schema) secara deterministik menggunakan arsitektur verifikasi **Jev**.

---

## 1. Peta Struktur Folder (Aturan WF-09)
```text
D:\Project_Besar/
├── README.md                     # Dokumentasi arsitektur & panduan sistem (WF-07)
├── db/
│   ├── schema.md                 # Dokumentasi ERD, DDL & konvensi DB (DB-03, DB-04, DB-05)
│   └── rencana.db                # SQLite lokal (otomatis dibuat saat backend aktif)
├── backend/                      # Python FastAPI + Jev Verifier Engine
│   ├── app/
│   │   ├── main.py               # Entrypoint FastAPI (CORS, Rate Limiter BE-01, Exception Handling)
│   │   ├── config.py             # Konfigurasi Environment & Token API
│   │   ├── database.py           # Inisialisasi SQLite & Prepared Statements (BE-02)
│   │   ├── models/               # Model schema & Pydantic DTO (Bahasa Indonesia)
│   │   ├── routers/              # API Endpoints (rencana, obrolan, diagram, jev)
│   │   ├── services/
│   │   │   ├── llm_gateway.py    # Integrasi provider Groq, Nvidia NIM, & Cohere
│   │   │   └── jev_verifier.py   # Core Jev: In-memory SQLite dry-run & DAG loop validator
│   │   └── utils/
│   │       └── id_generator.py   # Generator ID: <prefix><YYYYMMDD><4digits> (DB-05)
│   └── requirements.txt
└── frontend/                     # React + Vite + React Flow Canvas
    ├── package.json
    ├── src/
    │   ├── tokens/design_tokens.js # Token desain terpusat (FE-03, UX-07, UX-08)
    │   ├── components/
    │   │   ├── ChatPanel/        # Antarmuka input ide & log visual verifikasi Jev
    │   │   ├── CanvasView/       # Kanvas interaktif React Flow (drag, pan, zoom)
    │   │   └── CustomNodes/      # Node khusus (ERD Table, Mindmap Card, Use Case)
    │   ├── App.jsx               # Prioritas render konten utama (FE-01)
    │   └── main.jsx
```

---

## 2. Fitur Utama & Pendekatan "Jev"
- **Reasoning Berbasis Eksekusi (Jev)**: Mencegah halusinasi relasi basis data dengan melakukan *dry-run* eksekusi SQL pada SQLite in-memory sebelum ditampilkan.
- **Deteksi Ketergantungan Siklis**: Memastikan dependensi antar tugas/alur rencana bebas dari siklus buntu (*infinite loops*).
- **Kanvas Interaktif**: Node dapat digeser manual, dihubungkan, atau ditata ulang secara otomatis menggunakan auto-layout.
- **Ekspor Mandiri**: Hasil perancangan dapat diekspor langsung ke DDL SQL atau JSON struktural.
- **Kepatuhan Antislop**: Memenuhi seluruh kaidah baku backend (keamanan, rate limiting), basis data (entitas bahasa Indonesia, ID terstruktur), dan UI/UX (tanpa efek generik/slop, rasio proporsional, skala kelipatan 4).

---

## 3. Cara Menjalankan Sistem Lokal

### Backend (Python FastAPI)
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Akses antarmuka melalui peramban di `http://localhost:5173`.