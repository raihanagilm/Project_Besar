import requests
import json
from typing import Dict, Any, List, Optional
from ..config import GROQ_API_KEY, NVIDIA_API_KEY

SYSTEM_EXTRACTOR_PROMPT = """Kamu adalah Jev Structural Engine.
Tugasmu adalah menganalisis ide/pemikiran pengguna mengenai rencana besar, sistem, atau aplikasi, lalu mengubahnya menjadi AST (Abstract Syntax Tree) berformat JSON murni tanpa pembuka/penutup markdown.

PENTING TENTANG UPDATE INKREMENTAL:
Jika diberikan riwayat konteks sebelumnya atau diagram yang sudah ada, JANGAN membuang atau menghapus entitas lama kecuali secara eksplisit diminta oleh pengguna!
TUGASMU ADALAH MENGGABUNGKAN (MERGE & ENRICH) ide baru ke dalam diagram yang sudah ada, memperluas tabel, menambah relasi baru, menambah node mindmap baru, atau use case baru.

Format JSON yang DIHARUSKAN:
{
  "ringkasan_ide": "Ringkasan kumulatif seluruh sistem dan ide terbaru pengguna",
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
    {"id": "tahap_1", "label": "Konsep Inti", "kategori": "fondasi", "sub_poin": ["Riset", "Validasi"]}
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
      "keterangan": "Relasi foreign key atau alur sistem"
    }
  ]
}

Aturan Ketat:
1. Nama tabel dan kolom WAJIB dalam Bahasa Indonesia snake_case (misal: pengguna, transaksi, rencana_tugas).
2. Primary key wajib berakhiran _id.
3. Foreign key harus menunjuk nama tabel_id yang benar-benar ada dalam daftar tabel.
4. Output HANYA JSON murni tanpa ```json ... ```.
"""

SYSTEM_THINKING_PROMPT = """Kamu adalah Jev System Co-Architect & Advisor (Thinking Mode).
Tugasmu adalah mendiskusikan pemikiran dan arsitektur rencana pengguna, menganalisa trade-off, dan memberikan 2-3 opsi rekomendasi konkret beserta kelebihan dan kekurangannya.

Format Output WAJIB JSON murni:
{
  "analisa_pemikiran": "Uraian pemikiran arsitektural dan pertimbangan teknis secara ringkas",
  "opsi_rekomendasi": [
    {
      "id_opsi": "opsi_1",
      "judul": "Judul Opsi 1",
      "penjelasan": "Penjelasan pendekatan dan implementasinya",
      "kelebihan": "Kelebihan pendekatan ini",
      "kekurangan": "Kekurangan/risiko pendekatan ini",
      "instruksi_diagram": "Ringkasan spesifikasi instruksi jika opsi ini diterapkan ke diagram"
    },
    {
      "id_opsi": "opsi_2",
      "judul": "Judul Opsi 2",
      "penjelasan": "Penjelasan alternatif pendekatan kedua",
      "kelebihan": "Kelebihan pendekatan ini",
      "kekurangan": "Kekurangan pendekatan ini",
      "instruksi_diagram": "Ringkasan spesifikasi instruksi jika opsi ini diterapkan ke diagram"
    }
  ]
}
Output HANYA JSON tanpa markdown backtick.
"""

def panggil_llm_thinking(pesan_pengguna: str, riwayat_obrolan: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Memanggil LLM dalam Thinking / Discussion Mode untuk memberikan analisis mendalam & kartu rekomendasi opsi.
    """
    messages = [{"role": "system", "content": SYSTEM_THINKING_PROMPT}]
    if riwayat_obrolan and len(riwayat_obrolan) > 0:
        konteks = "Riwayat percakapan proyek sebelumnya:\n"
        for idx, chat in enumerate(riwayat_obrolan):
            konteks += f"- {chat}\n"
        konteks += f"\nPertanyaan/ide diskusi pengguna: \"{pesan_pengguna}\""
        messages.append({"role": "user", "content": konteks})
    else:
        messages.append({"role": "user", "content": pesan_pengguna})

    if GROQ_API_KEY:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "qwen/qwen3.8-27b",
                "messages": messages,
                "temperature": 0.4,
                "response_format": {"type": "json_object"}
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=25)
            if resp.status_code == 200:
                konten = resp.json()["choices"][0]["message"]["content"]
                return json.loads(konten)
        except Exception as e:
            print(f"[LLM Gateway Thinking] Groq error: {e}")

    # Fallback Thinking
    return {
      "analisa_pemikiran": f"Analisis awal untuk: {pesan_pengguna}",
      "opsi_rekomendasi": [
        {
          "id_opsi": "opsi_1",
          "judul": "Pendekatan Modular Standar",
          "penjelasan": "Membangun entitas inti dengan relasi langsung.",
          "kelebihan": "Cepat diimplementasikan dan mudah dipahami",
          "kekurangan": "Perlu refaktor jika sistem membesar",
          "instruksi_diagram": f"Implementasikan tabel dan usecase standar untuk {pesan_pengguna}"
        },
        {
          "id_opsi": "opsi_2",
          "judul": "Pendekatan Skalabel / Terisolasi",
          "penjelasan": "Memisahkan layer data dan konfigurasi peran secara ketat.",
          "kelebihan": "Sangat aman dan terisolasi",
          "kekurangan": "Memerlukan konfigurasi relasi lebih banyak",
          "instruksi_diagram": f"Implementasikan arsitektur enterprise untuk {pesan_pengguna}"
        }
      ]
    }

def panggil_llm_ekstraksi(pesan_pengguna: str, riwayat_obrolan: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Memanggil LLM dengan menyertakan riwayat obrolan proyek agar diagram bersifat akumulatif (tidak hilang).
    """
    messages = [{"role": "system", "content": SYSTEM_EXTRACTOR_PROMPT}]
    
    if riwayat_obrolan and len(riwayat_obrolan) > 0:
        konteks = "Berikut adalah riwayat ide/rencana sebelumnya yang sudah ada di proyek ini:\n"
        for idx, chat in enumerate(riwayat_obrolan):
            konteks += f"- Ide {idx+1}: {chat}\n"
        konteks += f"\nSekarang, pengguna menambahkan/memperbarui ide berikut: \"{pesan_pengguna}\"\n"
        konteks += "Tolong hasilkan skema LENGKAP (gabungan seluruh ide sebelumnya + ide baru yang diperluas)."
        messages.append({"role": "user", "content": konteks})
    else:
        messages.append({"role": "user", "content": pesan_pengguna})

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
                "messages": messages,
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
                "messages": messages,
                "temperature": 0.2
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=30)
            if resp.status_code == 200:
                konten = resp.json()["choices"][0]["message"]["content"]
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
