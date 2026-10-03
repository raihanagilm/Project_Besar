import requests
import json
from typing import Dict, Any, List, Optional
from ..config import GROQ_API_KEY, NVIDIA_API_KEY

SYSTEM_EXTRACTOR_PROMPT = """Kamu adalah Jev Structural Engine yang bertugas mengelola arsitektur rencana besar pengguna (ERD Database, Mindmap, Use Case, dan Relasi).

PRINSIP UTAMA: ARSITEKTUR KUMULATIF & KONSISTEN (TIDAK BOLEH MENGHAPUS ATAU MEMBUAT ULANG DARI NOL SECARA SEMBARANGAN).
1. Kamu akan diberikan STATE DIAGRAM YANG SUDAH ADA SAAT INI (tabel ERD yang sudah ada, field yang sudah ada, node mindmap, use case, dan relasi).
2. Jika pengguna mengirim chat baru atau koreksi/perbaikan:
   - JAGA DAN PERTAHANKAN seluruh entitas/tabel yang sudah ada sebelumnya.
   - TAMBAHKAN tabel baru, kolom baru, relasi baru, atau konsep baru yang diminta ke dalam struktur yang sudah ada.
   - JIKA pengguna meminta revisi/koreksi tertentu (misal: "tambah foreign key tenant_id di tabel admin"), UPDATE tabel tersebut tanpa merusak tabel lainnya!
3. DILARANG KERAS merespons hanya dengan entitas potongan kecil yang menghilangkan tabel-tabel penting sebelumnya.
4. Output WAJIB JSON murni yang memuat KESELURUHAN DIAGRAM LENGKAP (gabungan entitas lama yang dipertahankan + entitas baru/perbaikan).

Format JSON yang DIHARUSKAN:
{
  "ringkasan_ide": "Ringkasan kumulatif seluruh sistem dan apa yang baru saja ditambahkan/diperbaiki",
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
      "kasus": "Nama Kasus Penggunaan",
      "deskripsi": "Deskripsi alur aksi"
    }
  ],
  "relasi": [
    {
      "dari": "nama_tabel_atau_node",
      "ke": "target_tabel_atau_node",
      "tipe": "1-N",
      "keterangan": "Relasi foreign key atau ketergantungan"
    }
  ]
}

Aturan Ketat:
- Semua nama tabel & kolom wajib Bahasa Indonesia snake_case.
- Output HANYA JSON murni tanpa pembuka/penutup markdown backtick.
"""

SYSTEM_THINKING_PROMPT = """Kamu adalah Jev System Co-Architect & Advisor (Thinking Mode).
Tugasmu adalah menganalisa arsitektur yang sudah ada dan mendiskusikan pemikiran pengguna, menganalisa trade-off, dan memberikan 2-3 opsi rekomendasi konkret yang mempertimbangkan struktur sistem yang sudah terbangun.

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
    },
    {
      "id_opsi": "opsi_2",
      "judul": "Judul Opsi 2",
      "penjelasan": "Penjelasan alternatif kedua",
      "kelebihan": "Kelebihan pendekatan ini",
      "kekurangan": "Kekurangan pendekatan ini",
      "instruksi_diagram": "Ringkasan spesifikasi instruksi perubahan diagram"
    }
  ]
}
Output HANYA JSON tanpa markdown backtick.
"""

def panggil_llm_thinking(
    pesan_pengguna: str,
    riwayat_obrolan: Optional[List[str]] = None,
    state_diagram_saat_ini: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Thinking Mode dengan konteks riwayat chat dan state diagram saat ini.
    """
    messages = [{"role": "system", "content": SYSTEM_THINKING_PROMPT}]
    
    konteks = ""
    if state_diagram_saat_ini and (state_diagram_saat_ini.get("tabel") or state_diagram_saat_ini.get("mindmap")):
        konteks += "=== STRUKTUR DIAGRAM YANG SUDAH TERBANGUN SAAT INI ===\n"
        konteks += json.dumps(state_diagram_saat_ini, indent=2, ensure_ascii=False) + "\n\n"
        
    if riwayat_obrolan and len(riwayat_obrolan) > 0:
        konteks += "=== RIWAYAT OBROLAN PROYEK SEBELUMNYA ===\n"
        for idx, chat in enumerate(riwayat_obrolan):
            konteks += f"- Pesan {idx+1}: {chat}\n"
        konteks += "\n"
        
    konteks += f"Pertanyaan/ide diskusi pengguna: \"{pesan_pengguna}\""
    messages.append({"role": "user", "content": konteks})

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

    return {
      "analisa_pemikiran": f"Analisis awal untuk: {pesan_pengguna}",
      "opsi_rekomendasi": [
        {
          "id_opsi": "opsi_1",
          "judul": "Integrasikan dengan Tabel yang Ada",
          "penjelasan": "Menghubungkan fitur baru ke entitas utama yang sudah tercatat.",
          "kelebihan": "Menjaga konsistensi data relasional",
          "kekurangan": "Menambah relasi foreign key baru",
          "instruksi_diagram": f"Perluas diagram dengan menambahkan fitur: {pesan_pengguna}"
        }
      ]
    }

def panggil_llm_ekstraksi(
    pesan_pengguna: str,
    riwayat_obrolan: Optional[List[str]] = None,
    state_diagram_saat_ini: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Ekstraksi AST Kumulatif:
    Wajib membaca STATE DIAGRAM SAAT INI dan RIWAYAT OBROLAN agar tidak pernah membuat ulang dari nol secara sembarangan.
    """
    messages = [{"role": "system", "content": SYSTEM_EXTRACTOR_PROMPT}]
    
    konteks = ""
    # Sertakan state diagram saat ini jika ada
    if state_diagram_saat_ini and (state_diagram_saat_ini.get("tabel") or state_diagram_saat_ini.get("mindmap") or state_diagram_saat_ini.get("usecase")):
        konteks += "=== DATA DIAGRAM SAAT INI YANG WAJIB DIJAGA & DIKEMBANGKAN ===\n"
        konteks += json.dumps(state_diagram_saat_ini, indent=2, ensure_ascii=False) + "\n\n"
        
    # Sertakan riwayat pesan
    if riwayat_obrolan and len(riwayat_obrolan) > 0:
        konteks += "=== RIWAYAT OBROLAN PEMIKIRAN SEBELUMNYA ===\n"
        for idx, chat in enumerate(riwayat_obrolan):
            konteks += f"- Chat {idx+1}: {chat}\n"
        konteks += "\n"

    konteks += f"=== INSTRUKSI CHAT / PERBAIKAN BARU DARI PENGGUNA ===\n\"{pesan_pengguna}\"\n\n"
    konteks += "TUGAS: Hasilkan struktur JSON LENGKAP yang menggabungkan seluruh tabel/diagram yang sudah ada di atas DITAMBAH perubahan/perluasan dari chat baru ini. JANGAN HILANGKAN TABEL LAMA!"
    messages.append({"role": "user", "content": konteks})

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

    # Fallback aman
    return {
        "ringkasan_ide": f"Analisis lokal: {pesan_pengguna[:100]}...",
        "erd_tables": [
            {
                "nama_tabel": "rencana_kegiatan",
                "kolom": [
                    {"nama": "rencana_kegiatan_id", "tipe": "TEXT", "is_pk": True, "is_fk": False, "fk_target": None},
                    {"nama": "nama_kegiatan", "tipe": "TEXT", "is_pk": False, "is_fk": False, "fk_target": None}
                ]
            }
        ],
        "mindmap_nodes": [],
        "use_cases": [],
        "relasi": []
    }
