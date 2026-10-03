import requests
import json
from typing import Dict, Any, List, Optional
from ..config import GROQ_API_KEY, NVIDIA_API_KEY, COHERE_API_KEY

SYSTEM_EXTRACTOR_PROMPT = """Kamu adalah Jev Structural Engine yang bertugas menerjemahkan pemikiran rencana besar pengguna ke dalam arsitektur terstruktur lengkap:
1. ERD TABLES: Tabel-tabel relasional database dengan tipe data & Primary/Foreign Keys.
2. MINDMAP NODES: Konsep arsitektur, hierarki ide, breakdown modul rencana.
3. USE CASES: Aktor pengguna dan alur skenario sistem.
4. RELASI: Garis koneksi keterhubungan antar entitas.

ATURAN WAJIB (JANGAN SAMPAI KOSONG):
- Output WAJIB menghasilkan SEMUA bagian:
  - "erd_tables": daftar tabel terkait dengan kolom-kolomnya (nama tabel bahasa Indonesia snake_case, primary key _id).
  - "mindmap_nodes": minimal 2-4 konsep ide dengan sub_poin.
  - "use_cases": minimal 2-3 skenario aktor sistem.
  - "relasi": koneksi antar tabel atau node.
- Jika ada STATE DIAGRAM YANG SUDAH ADA, JAGA DAN PERTAHANKAN seluruh entitas lama, lalu TAMBAHKAN entitas baru/perbaikan.
- Output WAJIB JSON murni tanpa pembuka/penutup markdown backtick.

Format JSON yang DIHARUSKAN:
{
  "ringkasan_ide": "Ringkasan sistem secara komprehensif",
  "erd_tables": [
    {
      "nama_tabel": "nama_tabel_indonesia",
      "kolom": [
        {"nama": "tabel_id", "tipe": "TEXT", "is_pk": true, "is_fk": false, "fk_target": null},
        {"nama": "nama", "tipe": "TEXT", "is_pk": false, "is_fk": false, "fk_target": null}
      ]
    }
  ],
  "mindmap_nodes": [
    {"id": "konsep_1", "label": "Arsitektur Sistem", "kategori": "fondasi", "sub_poin": ["Modul A", "Modul B"]}
  ],
  "use_cases": [
    {"aktor": "Super Admin", "kasus": "Mengelola Tenant", "deskripsi": "Membuat dan mengonfigurasi tenant baru"}
  ],
  "relasi": [
    {"dari": "tabel_a", "ke": "tabel_b", "tipe": "1-N", "keterangan": "Relasi foreign key"}
  ]
}
"""

SYSTEM_THINKING_PROMPT = """Kamu adalah Jev System Co-Architect & Advisor (Thinking Mode).
Tugasmu adalah menganalisa arsitektur dan mendiskusikan pemikiran pengguna, menganalisa trade-off, dan memberikan 2-3 opsi rekomendasi konkret beserta kelebihan dan kekurangannya.

Format Output WAJIB JSON murni:
{
  "analisa_pemikiran": "Uraian pemikiran arsitektural dan pertimbangan teknis secara ringkas berbasis sistem yang ada",
  "opsi_rekomendasi": [
    {
      "id_opsi": "opsi_1",
      "judul": "Judul Opsi 1",
      "penjelasan": "Penjelasan pendekatan dan implementasinya terhadap diagram yang ada",
      "kelebihan": "Kelebihan pendekatan ini",
      "kekurangan": "Kekurangan/risiko pendekatan ini",
      "instruksi_diagram": "Ringkasan spesifikasi instruksi perubahan diagram"
    }
  ]
}
Output HANYA JSON tanpa markdown backtick.
"""

def bersihkan_json(teks: str) -> Dict[str, Any]:
    teks = teks.strip()
    if teks.startswith("```json"):
        teks = teks[7:]
    elif teks.startswith("```"):
        teks = teks[3:]
    if teks.endswith("```"):
        teks = teks[:-3]
    teks = teks.strip()
    
    awal = teks.find("{")
    akhir = teks.rfind("}")
    if awal != -1 and akhir != -1:
        teks = teks[awal:akhir+1]
    return json.loads(teks)

def panggil_llm_thinking(
    pesan_pengguna: str,
    riwayat_obrolan: Optional[List[str]] = None,
    state_diagram_saat_ini: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    messages = [{"role": "system", "content": SYSTEM_THINKING_PROMPT}]
    
    konteks = ""
    if state_diagram_saat_ini and (state_diagram_saat_ini.get("tabel") or state_diagram_saat_ini.get("mindmap")):
        konteks += "=== STRUKTUR DIAGRAM SAAT INI ===\n" + json.dumps(state_diagram_saat_ini, ensure_ascii=False) + "\n\n"
    if riwayat_obrolan:
        konteks += "=== RIWAYAT CHAT SEBELUMNYA ===\n"
        for idx, chat in enumerate(riwayat_obrolan):
            konteks += f"- {chat}\n"
        konteks += "\n"
    konteks += f"Pertanyaan/ide diskusi: \"{pesan_pengguna}\""
    messages.append({"role": "user", "content": konteks})

    # Groq openai/gpt-oss-120b
    if GROQ_API_KEY:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
            payload = {
                "model": "openai/gpt-oss-120b",
                "messages": messages,
                "temperature": 0.3,
                "response_format": {"type": "json_object"}
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=20)
            if resp.status_code == 200:
                return bersihkan_json(resp.json()["choices"][0]["message"]["content"])
        except Exception as e:
            print(f"[Thinking Groq Error]: {e}")

    # Fallback Cohere
    if COHERE_API_KEY:
        try:
            url = "https://api.cohere.com/v2/chat"
            headers = {"Authorization": f"Bearer {COHERE_API_KEY}", "Content-Type": "application/json"}
            payload = {
                "model": "command-r-plus-08-2024",
                "messages": [
                    {"role": "system", "content": SYSTEM_THINKING_PROMPT},
                    {"role": "user", "content": konteks}
                ],
                "response_format": {"type": "json_object"}
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=25)
            if resp.status_code == 200:
                konten = resp.json()["message"]["content"][0]["text"]
                return bersihkan_json(konten)
        except Exception as e:
            print(f"[Thinking Cohere Error]: {e}")

    return {
      "analisa_pemikiran": f"Analisis awal untuk: {pesan_pengguna}",
      "opsi_rekomendasi": [
        {
          "id_opsi": "opsi_1",
          "judul": "Pendekatan Relasional Terisolasi",
          "penjelasan": "Membangun tabel peran dan data dengan pemisahan identitas yang jelas.",
          "kelebihan": "Struktur data konsisten dan aman",
          "kekurangan": "Perlu manajemen foreign key lebih banyak",
          "instruksi_diagram": f"Rancang tabel, mindmap, dan usecase lengkap untuk {pesan_pengguna}"
        }
      ]
    }

def panggil_llm_ekstraksi(
    pesan_pengguna: str,
    riwayat_obrolan: Optional[List[str]] = None,
    state_diagram_saat_ini: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Ekstraksi AST Lengkap (ERD + Mindmap + Use Case + Relasi).
    Model utama: openai/gpt-oss-120b di Groq (kapasitas besar, tidak kena limit 1000 OTPM).
    Fallback: Cohere v2 command-r-plus-08-2024.
    """
    messages = [{"role": "system", "content": SYSTEM_EXTRACTOR_PROMPT}]
    
    konteks = ""
    if state_diagram_saat_ini and (state_diagram_saat_ini.get("tabel") or state_diagram_saat_ini.get("mindmap") or state_diagram_saat_ini.get("usecase")):
        konteks += "=== STATE DIAGRAM SAAT INI YANG WAJIB DIJAGA & DIKEMBANGKAN ===\n"
        konteks += json.dumps(state_diagram_saat_ini, ensure_ascii=False) + "\n\n"
        
    if riwayat_obrolan:
        konteks += "=== RIWAYAT PEMIKIRAN SEBELUMNYA ===\n"
        for idx, chat in enumerate(riwayat_obrolan):
            konteks += f"- Chat {idx+1}: {chat}\n"
        konteks += "\n"

    konteks += f"=== INSTRUKSI PENGGUNA ===\n\"{pesan_pengguna}\"\n\n"
    konteks += "TUGAS: Hasilkan JSON LENGKAP dengan SEMUA komponen (erd_tables, mindmap_nodes, use_cases, relasi). Pastikan ada tabel, konsep mindmap, dan use case!"
    messages.append({"role": "user", "content": konteks})

    # 1. Panggil openai/gpt-oss-120b di Groq (sangat cerdas & kuota token besar)
    if GROQ_API_KEY:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
            payload = {
                "model": "openai/gpt-oss-120b",
                "messages": messages,
                "temperature": 0.2,
                "response_format": {"type": "json_object"}
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=20)
            if resp.status_code == 200:
                konten = resp.json()["choices"][0]["message"]["content"]
                parsed = bersihkan_json(konten)
                if parsed.get("erd_tables") and parsed.get("mindmap_nodes"):
                    return parsed
        except Exception as e:
            print(f"[LLM Gateway Groq gpt-oss-120b error]: {e}")

    # 2. Fallback Cohere v2
    if COHERE_API_KEY:
        try:
            url = "https://api.cohere.com/v2/chat"
            headers = {
                "Authorization": f"Bearer {COHERE_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "command-r-plus-08-2024",
                "messages": [
                    {"role": "system", "content": SYSTEM_EXTRACTOR_PROMPT},
                    {"role": "user", "content": konteks}
                ],
                "response_format": {"type": "json_object"}
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=25)
            if resp.status_code == 200:
                konten = resp.json()["message"]["content"][0]["text"]
                parsed = bersihkan_json(konten)
                if parsed.get("erd_tables") and parsed.get("mindmap_nodes"):
                    return parsed
        except Exception as e:
            print(f"[LLM Gateway Cohere error]: {e}")

    # 3. Fallback Cerdas Penuh (jika koneksi API luar terputus)
    return {
        "ringkasan_ide": f"Arsitektur Sistem: {pesan_pengguna}",
        "erd_tables": [
            {
                "nama_tabel": "super_admin",
                "kolom": [
                    {"nama": "super_admin_id", "tipe": "TEXT", "is_pk": True},
                    {"nama": "nama", "tipe": "TEXT", "is_pk": False},
                    {"nama": "email", "tipe": "TEXT", "is_pk": False}
                ]
            },
            {
                "nama_tabel": "tenant",
                "kolom": [
                    {"nama": "tenant_id", "tipe": "TEXT", "is_pk": True},
                    {"nama": "nama_tenant", "tipe": "TEXT", "is_pk": False},
                    {"nama": "status_aktif", "tipe": "BOOLEAN", "is_pk": False}
                ]
            },
            {
                "nama_tabel": "admin_tenant",
                "kolom": [
                    {"nama": "admin_tenant_id", "tipe": "TEXT", "is_pk": True},
                    {"nama": "tenant_id", "tipe": "TEXT", "is_pk": False, "is_fk": True},
                    {"nama": "nama", "tipe": "TEXT", "is_pk": False}
                ]
            },
            {
                "nama_tabel": "pengguna_publik",
                "kolom": [
                    {"nama": "pengguna_id", "tipe": "TEXT", "is_pk": True},
                    {"nama": "tenant_id", "tipe": "TEXT", "is_pk": False, "is_fk": True},
                    {"nama": "nama_lengkap", "tipe": "TEXT", "is_pk": False}
                ]
            }
        ],
        "mindmap_nodes": [
            {"id": "mm_arsitektur", "label": "Arsitektur Multi-Tenant", "kategori": "fondasi", "sub_poin": ["Isolasi Data", "Autentikasi"]},
            {"id": "mm_fitur", "label": "Manajemen Pengguna", "kategori": "eksekusi", "sub_poin": ["Super Admin", "Client Admin", "Publik"]}
        ],
        "use_cases": [
            {"aktor": "Super Admin", "kasus": "Membuat Tenant Baru", "deskripsi": "Menginisialisasi tenant dan akun client"},
            {"aktor": "Admin Client", "kasus": "Mengelola Konten Tenant", "deskripsi": "Mengatur fitur yang ditampilkan ke publik"},
            {"aktor": "Pengguna Publik", "kasus": "Mengakses Halaman Publik", "deskripsi": "Melihat konten sesuai tenant terkait"}
        ],
        "relasi": [
            {"dari": "super_admin", "ke": "tenant", "tipe": "1-N", "keterangan": "mengelola"},
            {"dari": "tenant", "ke": "admin_tenant", "tipe": "1-N", "keterangan": "memiliki"},
            {"dari": "tenant", "ke": "pengguna_publik", "tipe": "1-N", "keterangan": "berelasi"}
        ]
    }
