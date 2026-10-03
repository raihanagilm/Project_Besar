import requests
import json
from typing import Dict, Any, List
from ..config import GROQ_API_KEY, NVIDIA_API_KEY

SYSTEM_EXTRACTOR_PROMPT = """Kamu adalah Jev Structural Engine.
Tugasmu adalah menganalisis ide/pemikiran pengguna mengenai rencana besar, sistem, atau aplikasi, lalu mengubahnya menjadi AST (Abstract Syntax Tree) berformat JSON murni tanpa pembuka/penutup markdown.

Format JSON yang DIHARUSKAN:
{
  "ringkasan_ide": "Ringkasan pemikiran pengguna",
  "erd_tables": [
    {
      "nama_tabel": "nama_tabel_indonesia",
      "kolom": [
        {"nama": "kolom_id", "tipe": "TEXT", "is_pk": true, "is_fk": false, "fk_target": null},
        {"nama": "nama_field", "tipe": "TEXT", "is_pk": false, "is_fk": false, "fk_target": null}
      ]
    }
  ],
  "mindmap_nodes": [
    {"id": "tahap_1", "label": "Konsep Inti", "kategori": "fondasi", "sub_poin": ["Riset", "Validasi"]},
    {"id": "tahap_2", "label": "Implementasi MVP", "kategori": "eksekusi", "sub_poin": ["Backend", "Frontend"]}
  ],
  "use_cases": [
    {
      "aktor": "Pengguna",
      "kasus": "Mencatat Rencana Baru",
      "deskripsi": "Menginput ide secara bebas dan melihat hasil terverifikasi"
    }
  ],
  "relasi": [
    {
      "dari": "nama_tabel_atau_node",
      "ke": "target_tabel_atau_node",
      "tipe": "1-N",
      "keterangan": "Relasi foreign key atau hierarki alur"
    }
  ]
}

Aturan Ketat:
1. Nama tabel dan kolom WAJIB dalam Bahasa Indonesia snake_case (misal: pengguna, transaksi, rencana_tugas).
2. Primary key wajib berakhiran _id.
3. Foreign key harus menunjuk nama tabel_id yang benar-benar ada dalam daftar tabel.
4. Output HANYA JSON murni tanpa ```json ... ```.
"""

def panggil_llm_ekstraksi(pesan_pengguna: str) -> Dict[str, Any]:
    """
    Memanggil LLM (Groq dengan fallback ke Nvidia NIM) untuk ekstraksi struktur.
    """
    # 1. Coba via Groq
    if GROQ_API_KEY:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "qwen/qwen3.8-27b",
                "messages": [
                    {"role": "system", "content": SYSTEM_EXTRACTOR_PROMPT},
                    {"role": "user", "content": pesan_pengguna}
                ],
                "temperature": 0.2,
                "response_format": {"type": "json_object"}
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=25)
            if resp.status_code == 200:
                konten = resp.json()["choices"][0]["message"]["content"]
                return json.loads(konten)
        except Exception as e:
            print(f"[LLM Gateway] Groq error, mencoba Nvidia NIM fallback: {e}")

    # 2. Fallback via Nvidia NIM
    if NVIDIA_API_KEY:
        try:
            url = "https://integrate.api.nvidia.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {NVIDIA_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "moonshotai/kimi-k3",
                "messages": [
                    {"role": "system", "content": SYSTEM_EXTRACTOR_PROMPT},
                    {"role": "user", "content": pesan_pengguna}
                ],
                "temperature": 0.2
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=30)
            if resp.status_code == 200:
                konten = resp.json()["choices"][0]["message"]["content"]
                # Bersihkan potensi markdown backticks jika ada
                konten_bersih = konten.strip()
                if konten_bersih.startswith("```json"):
                    konten_bersih = konten_bersih[7:]
                if konten_bersih.startswith("```"):
                    konten_bersih = konten_bersih[3:]
                if konten_bersih.endswith("```"):
                    konten_bersih = konten_bersih[:-3]
                return json.loads(konten_bersih.strip())
        except Exception as e:
            print(f"[LLM Gateway] Nvidia NIM error: {e}")

    # Fallback deterministik lokal jika kedua API kendala koneksi
    return {
        "ringkasan_ide": f"Analisis lokal: {pesan_pengguna[:100]}...",
        "erd_tables": [
            {
                "nama_tabel": "rencana_kegiatan",
                "kolom": [
                    {"nama": "rencana_kegiatan_id", "tipe": "TEXT", "is_pk": True, "is_fk": False, "fk_target": None},
                    {"nama": "nama_kegiatan", "tipe": "TEXT", "is_pk": False, "is_fk": False, "fk_target": None},
                    {"nama": "status_kegiatan", "tipe": "TEXT", "is_pk": False, "is_fk": False, "fk_target": None}
                ]
            }
        ],
        "mindmap_nodes": [
            {"id": "fokus_utama", "label": "Gagasan Utama", "kategori": "tujuan", "sub_poin": ["Riset Awal", "Validasi Kebutuhan"]}
        ],
        "use_cases": [
            {"aktor": "Pengguna", "kasus": "Eksplorasi Ide", "deskripsi": "Mengurai sasaran jangka panjang"}
        ],
        "relasi": []
    }
