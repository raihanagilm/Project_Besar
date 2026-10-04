import requests
import json
import time
from typing import Dict, Any, List, Optional
from ..config import (
    GROQ_API_KEY,
    NVIDIA_API_KEY,
    COHERE_API_KEY,
    OPENROUTER_API_KEY,
    OVH_BASE_URL,
    OLLAMA_API_KEY,
)

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

def _kirim_request_single_candidate(provider_name: str, url: str, headers: dict, payload: dict, timeout: int = 8) -> Optional[dict]:
    """Helper 1x tembak cepat tanpa retry bertingkat. Jika gagal, langsung lanjut ke kandidat berikutnya."""
    try:
        print(f"[LLM Gateway] Menghubungi {provider_name}...")
        resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
        if resp.status_code == 200:
            print(f"[LLM Gateway] ✅ Berhasil terhubung dengan {provider_name}!")
            return resp.json()
        else:
            print(f"[LLM Gateway] ⏩ {provider_name} HTTP {resp.status_code} ({resp.text[:80]}...), beralih seketika...")
    except requests.exceptions.Timeout:
        print(f"[LLM Gateway] ⏩ {provider_name} timeout ({timeout}s), beralih seketika...")
    except Exception as e:
        print(f"[LLM Gateway] ⏩ {provider_name} error ({e}), beralih seketika...")
    return None

def panggil_llm_thinking(
    pesan_pengguna: str,
    riwayat_obrolan: Optional[List[str]] = None,
    state_diagram_saat_ini: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    messages = [{"role": "system", "content": SYSTEM_THINKING_PROMPT}]
    
    konteks = ""
    if state_diagram_saat_ini and (state_diagram_saat_ini.get("tabel") or state_diagram_saat_ini.get("workflows")):
        konteks += "=== STRUKTUR DIAGRAM SAAT INI ===\n" + json.dumps(state_diagram_saat_ini, ensure_ascii=False) + "\n\n"
    if riwayat_obrolan:
        konteks += "=== RIWAYAT CHAT SEBELUMNYA ===\n"
        for idx, chat in enumerate(riwayat_obrolan):
            konteks += f"- {chat}\n"
        konteks += "\n"
    konteks += f"Pertanyaan/ide diskusi: \"{pesan_pengguna}\""
    messages.append({"role": "user", "content": konteks})

    # DAFTAR PROVIDER & MODEL (Langsung beralih ke kandidat berikutnya jika ada yang gagal)
    kandidat_list = []

    # 1. OpenRouter (DeepSeek V3, Qwen 2.5 72B, Llama 3.3 70B)
    if OPENROUTER_API_KEY:
        for model_id, model_label in [
            ("deepseek/deepseek-chat", "OpenRouter (DeepSeek-V3)"),
            ("qwen/qwen-2.5-72b-instruct", "OpenRouter (Qwen-2.5-72B)"),
            ("meta-llama/llama-3.3-70b-instruct", "OpenRouter (Llama-3.3-70B)")
        ]:
            kandidat_list.append({
                "nama": model_label,
                "url": "https://openrouter.ai/api/v1/chat/completions",
                "headers": {
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "Project Besar"
                },
                "payload": {
                    "model": model_id,
                    "messages": messages,
                    "temperature": 0.3,
                    "response_format": {"type": "json_object"}
                },
                "parse_type": "openai",
                "timeout": 8
            })

    # 2. Cohere v2 (Command R)
    if COHERE_API_KEY:
        kandidat_list.append({
            "nama": "Cohere (Command-R)",
            "url": "https://api.cohere.com/v2/chat",
            "headers": {"Authorization": f"Bearer {COHERE_API_KEY}", "Content-Type": "application/json"},
            "payload": {
                "model": "command-r-08-2024",
                "messages": [
                    {"role": "system", "content": SYSTEM_THINKING_PROMPT},
                    {"role": "user", "content": konteks}
                ],
                "response_format": {"type": "json_object"}
            },
            "parse_type": "cohere",
            "timeout": 8
        })

    # 3. Groq (qwen3.8-27b / gpt-oss-20b)
    if GROQ_API_KEY:
        for model_id in ["qwen/qwen3.8-27b", "openai/gpt-oss-20b"]:
            kandidat_list.append({
                "nama": f"Groq ({model_id})",
                "url": "https://api.groq.com/openai/v1/chat/completions",
                "headers": {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                "payload": {
                    "model": model_id,
                    "messages": messages,
                    "temperature": 0.3,
                    "response_format": {"type": "json_object"}
                },
                "parse_type": "openai",
                "timeout": 6
            })

    # 4. OVHcloud
    if OVH_BASE_URL:
        kandidat_list.append({
            "nama": "OVHcloud",
            "url": f"{OVH_BASE_URL.rstrip('/')}/chat/completions",
            "headers": {"Content-Type": "application/json"},
            "payload": {
                "model": "meta-llama/Meta-Llama-3-70B-Instruct",
                "messages": messages,
                "temperature": 0.3
            },
            "parse_type": "openai",
            "timeout": 8
        })

    # 5. Ollama Lokal
    if OLLAMA_API_KEY:
        kandidat_list.append({
            "nama": "Ollama (Lokal)",
            "url": "http://localhost:11434/api/chat",
            "headers": {"Content-Type": "application/json", "Authorization": f"Bearer {OLLAMA_API_KEY}"},
            "payload": {
                "model": "llama3:latest",
                "messages": messages,
                "format": "json",
                "stream": False
            },
            "parse_type": "ollama",
            "timeout": 8
        })

    # Eksekusi berurutan: jika satu kandidat gagal, langsung lanjut ke yang berikutnya
    for k in kandidat_list:
        res = _kirim_request_single_candidate(
            provider_name=k["nama"],
            url=k["url"],
            headers=k["headers"],
            payload=k["payload"],
            timeout=k["timeout"]
        )
        if res:
            try:
                if k["parse_type"] == "openai" and "choices" in res:
                    return bersihkan_json(res["choices"][0]["message"]["content"])
                elif k["parse_type"] == "cohere" and "message" in res:
                    return bersihkan_json(res["message"]["content"][0]["text"])
                elif k["parse_type"] == "ollama" and "message" in res:
                    return bersihkan_json(res["message"]["content"])
            except Exception as parse_err:
                print(f"[LLM Gateway Parse Error] {k['nama']}: {parse_err}")

    return {
      "analisa_pemikiran": f"Analisis awal untuk: {pesan_pengguna}",
      "opsi_rekomendasi": [
        {
          "id_opsi": "opsi_1",
          "judul": "Pendekatan Relasional Terisolasi",
          "penjelasan": "Membangun tabel peran dan data dengan pemisahan identitas yang jelas.",
          "kelebihan": "Struktur data konsisten dan aman",
          "kekurangan": "Perlu manajemen foreign key lebih banyak",
          "instruksi_diagram": f"Rancang tabel dan workflow lengkap untuk {pesan_pengguna}"
        }
      ]
    }

def panggil_llm_ekstraksi(
    pesan_pengguna: str,
    riwayat_obrolan: Optional[List[str]] = None,
    state_diagram_saat_ini: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Ekstraksi AST Lengkap (ERD + Workflow + Relasi) dengan rantai provider instan tanpa retry bertingkat.
    """
    messages = [{"role": "system", "content": SYSTEM_EXTRACTOR_PROMPT}]
    
    konteks = ""
    if state_diagram_saat_ini and (state_diagram_saat_ini.get("tabel") or state_diagram_saat_ini.get("workflows")):
        konteks += "=== STATE DIAGRAM SAAT INI YANG WAJIB DIJAGA & DIKEMBANGKAN ===\n"
        konteks += json.dumps(state_diagram_saat_ini, ensure_ascii=False) + "\n\n"
        
    if riwayat_obrolan:
        konteks += "=== RIWAYAT PEMIKIRAN SEBELUMNYA ===\n"
        for idx, chat in enumerate(riwayat_obrolan):
            konteks += f"- Chat {idx+1}: {chat}\n"
        konteks += "\n"

    konteks += f"=== INSTRUKSI PENGGUNA TERKINI ===\n\"{pesan_pengguna}\"\n\n"
    konteks += (
        "TUGAS UTAMA: Hasilkan JSON LENGKAP (ringkasan_ide, erd_tables, workflows, relasi) sesuai standar internasional "
        "(ISO/IEC 9075 SQL, 1NF-3NF normalisasi ketat, BPMN 2.0 ISO 19510). "
        "ATURAN RANGKUMAN (ringkasan_ide): Wajib merangkum dan mensintesis SELURUH RIWAYAT OBROLAN dari chat pertama hingga terakhir secara komprehensif, mendalam, dan terstruktur (bukan hanya kalimat pendek sepenggal dari chat terakhir). "
        "ATURAN WORKFLOW LENGKAP: Hasilkan diagram alur kerja bisnis KOMPREHENSIF (minimal 8 - 15 langkah lengkap) yang memodelkan interaksi SELURUH aktor (Superadmin, Admin Client, Pengguna Publik) dari inisialisasi, setup fitur jenis usaha, percabangan keputusan validasi XOR, pengisian konten, hingga interaksi portal publik dan hasil akhir. DILARANG membuat workflow dangkal/hanya 3-4 langkah! "
        "ATURAN NORMALISASI & RELASI: Selalu terapkan normalisasi (1NF, 2NF, 3NF) untuk mencegah duplikasi data atau entitas/tabel berlebihan. "
        "SETIAP TABEL DI ERD WAJIB MEMILIKI RELASI (FOREIGN KEY) TERHUBUNG KE TABEL LAIN. DILARANG MEMBUAT TABEL ISOLASI/BERDIRI SENDIRI! "
        "Penamaan tabel dan kolom DIPERBOLEHKAN menggunakan BAHASA INGGRIS atau BAHASA INDONESIA snake_case (sesuaikan dengan konteks/instruksi pengguna). "
        "DILARANG mengarang entitas yang tidak relevan dengan konteks pengguna. "
        "Jika ada tag slash /{nama_bagian}, perbarui HANYA bagian tersebut dan pertahankan seluruh entitas lain persis seperti pada STATE DIAGRAM SAAT INI!"
    )
    messages.append({"role": "user", "content": konteks})

    # DAFTAR PROVIDER & MODEL UNTUK EKSTRAKSI DIAGRAM
    kandidat_list = []

    # 1. OpenRouter (DeepSeek V3, Qwen 2.5 72B, Llama 3.3 70B)
    if OPENROUTER_API_KEY:
        for model_id, model_label in [
            ("deepseek/deepseek-chat", "OpenRouter (DeepSeek-V3)"),
            ("qwen/qwen-2.5-72b-instruct", "OpenRouter (Qwen-2.5-72B)"),
            ("meta-llama/llama-3.3-70b-instruct", "OpenRouter (Llama-3.3-70B)")
        ]:
            kandidat_list.append({
                "nama": model_label,
                "url": "https://openrouter.ai/api/v1/chat/completions",
                "headers": {
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "Project Besar"
                },
                "payload": {
                    "model": model_id,
                    "messages": messages,
                    "temperature": 0.15,
                    "response_format": {"type": "json_object"}
                },
                "parse_type": "openai",
                "timeout": 10
            })

    # 2. Cohere v2 (Command R)
    if COHERE_API_KEY:
        kandidat_list.append({
            "nama": "Cohere (Command-R)",
            "url": "https://api.cohere.com/v2/chat",
            "headers": {"Authorization": f"Bearer {COHERE_API_KEY}", "Content-Type": "application/json"},
            "payload": {
                "model": "command-r-08-2024",
                "messages": [
                    {"role": "system", "content": SYSTEM_EXTRACTOR_PROMPT},
                    {"role": "user", "content": konteks}
                ],
                "response_format": {"type": "json_object"}
            },
            "parse_type": "cohere",
            "timeout": 10
        })

    # 3. Groq (qwen3.8-27b / gpt-oss-20b)
    if GROQ_API_KEY:
        for model_id in ["qwen/qwen3.8-27b", "openai/gpt-oss-20b"]:
            kandidat_list.append({
                "nama": f"Groq ({model_id})",
                "url": "https://api.groq.com/openai/v1/chat/completions",
                "headers": {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                "payload": {
                    "model": model_id,
                    "messages": messages,
                    "temperature": 0.15,
                    "response_format": {"type": "json_object"}
                },
                "parse_type": "openai",
                "timeout": 6
            })

    # 4. OVHcloud
    if OVH_BASE_URL:
        kandidat_list.append({
            "nama": "OVHcloud",
            "url": f"{OVH_BASE_URL.rstrip('/')}/chat/completions",
            "headers": {"Content-Type": "application/json"},
            "payload": {
                "model": "meta-llama/Meta-Llama-3-70B-Instruct",
                "messages": messages,
                "temperature": 0.15
            },
            "parse_type": "openai",
            "timeout": 8
        })

    # 5. Ollama Lokal
    if OLLAMA_API_KEY:
        kandidat_list.append({
            "nama": "Ollama (Lokal)",
            "url": "http://localhost:11434/api/chat",
            "headers": {"Content-Type": "application/json", "Authorization": f"Bearer {OLLAMA_API_KEY}"},
            "payload": {
                "model": "llama3:latest",
                "messages": messages,
                "format": "json",
                "stream": False
            },
            "parse_type": "ollama",
            "timeout": 8
        })

    daftar_gagal = []
    # Eksekusi berurutan: jika satu kandidat gagal, seketika pindah ke kandidat berikutnya
    for k in kandidat_list:
        res = _kirim_request_single_candidate(
            provider_name=k["nama"],
            url=k["url"],
            headers=k["headers"],
            payload=k["payload"],
            timeout=k["timeout"]
        )
        if res:
            try:
                parsed = None
                if k["parse_type"] == "openai" and "choices" in res:
                    parsed = bersihkan_json(res["choices"][0]["message"]["content"])
                elif k["parse_type"] == "cohere" and "message" in res:
                    parsed = bersihkan_json(res["message"]["content"][0]["text"])
                elif k["parse_type"] == "ollama" and "message" in res:
                    parsed = bersihkan_json(res["message"]["content"])

                if parsed and (parsed.get("erd_tables") or parsed.get("workflows")):
                    return parsed
            except Exception as e:
                print(f"[LLM Gateway Parse Error] {k['nama']}: {e}")

        daftar_gagal.append(k["nama"])

    gagal_str = ", ".join(daftar_gagal) if daftar_gagal else "Semua provider LLM"
    raise RuntimeError(
        f"Gagal menghubungkan ke AI setelah mencoba seluruh kandidat provider ({gagal_str}). "
        "Pesan Anda telah tersimpan dan silakan coba sesaat lagi ketika koneksi tersambung."
    )


SYSTEM_EXTRACTOR_PROMPT = """Kamu adalah Jev Structural Engine: perancang basis data dan alur kerja bisnis yang KETAT mengikuti standar internasional.

═══════════════════════════════════════════════════════
BAGIAN 0: PRINSIP ANTI-ASAL (ANTI-HALLUCINATION)
═══════════════════════════════════════════════════════
0.1. DILARANG KERAS mengarang tabel, kolom, atau langkah alur yang TIDAK DIMINTA atau TIDAK TERSIRAT dari konteks pengguna.
0.2. Setiap tabel yang dihasilkan HARUS bisa dijustifikasi dari deskripsi sistem pengguna.
     - Jika pengguna bilang "sistem kasir", tabel yang relevan: transaksi, produk, pelanggan, pembayaran, dsb.
     - DILARANG menambahkan tabel yang tidak ada kaitannya (misal: tabel "karyawan" jika pengguna hanya minta sistem blog).
0.3. Jika konteks tidak cukup untuk menentukan kolom, TANYAKAN kepada pengguna melalui field "pertanyaan_klarifikasi" di JSON output.
0.4. Setiap workflow step HARUS relevan dengan proses bisnis yang dideskripsikan. DILARANG membuat langkah generik tanpa kaitan dengan konteks.
0.5. Jika STATE DIAGRAM SAAT INI sudah ada, PERTAHANKAN semua entitas yang ada kecuali pengguna secara eksplisit minta hapus atau ubah.

═══════════════════════════════════════════════════════
BAGIAN 1: STANDAR ERD (Entity-Relationship Diagram)
Referensi: ISO/IEC 9075 (SQL Standard), Notasi Crow's Foot (IE Notation), Normalisasi Codd (1NF-3NF)
═══════════════════════════════════════════════════════

1.1. NORMALISASI DATABASE WAJIB (1NF, 2NF, 3NF) - MENCEGAH DUPLIKASI & ENTITAS BERLEBIHAN:
  - ATURAN ZERO-REDUNDANCY (PRINSIP ANTI-DUPLIKASI):
    * DILARANG mengulang data non-key yang sama di beberapa tabel. Setiap data hanya boleh memiliki SATU sumber kebenaran (Single Source of Truth).
    * DILARANG membuat entitas berlebihan yang fungsinya serupa (misal: jangan buat tabel terpisah untuk setiap status/tipe jika cukup 1 kolom status/tipe).

  [1NF - First Normal Form (Atomik & Unik)]
  - Setiap kolom hanya berisi SATU NILAI ATOMIK (tidak boleh array, list, JSON mentah, atau CSV dalam satu sel).
  - Setiap baris harus unik, teridentifikasi oleh Primary Key.
  - DILARANG: kolom berulang "telepon_1, telepon_2, telepon_3" -> WAJIB: 1 kolom atau relasi yang tepat.

  [2NF - Second Normal Form (Ketergantungan Penuh pada PK)]
  - Memenuhi 1NF + setiap kolom non-key HARUS bergantung PENUH pada PRIMARY KEY.
  - Jika PK komposit (gabungan 2+ kolom), kolom non-key tidak boleh hanya bergantung pada sebagian PK.
  - DILARANG redundansi master data di tabel transaksi:
    * Contoh SALAH: tabel "pesanan" menyimpan "nama_pelanggan", "alamat_pelanggan", "email_pelanggan".
    * Contoh BENAR: tabel "pesanan" CUKUP menyimpan "pelanggan_id" (FK). Data nama, alamat, email ada di tabel "pelanggan".

  [3NF - Third Normal Form (Bebas Dependensi Transitif)]
  - Memenuhi 2NF + TIDAK ADA dependensi transitif (kolom non-key tidak boleh bergantung pada kolom non-key lain).
  - DILARANG menyimpan hasil kalkulasi yang dapat dihitung dari baris lain (misal: jangan simpan "total_pembayaran" di setiap baris item jika itu hasil sum).
  - DILARANG menduplikasi data hierarki:
    * Contoh SALAH: tabel "produk" menyimpan "nama_kategori", "deskripsi_kategori".
    * Contoh BENAR: tabel "produk" menyimpan "kategori_id" (FK) yang merujuk ke tabel "kategori".

1.2. TIPE DATA SQL STANDAR (ISO/IEC 9075):
  - Primary Key: UUID/VARCHAR(36) atau BIGINT AUTO_INCREMENT (pilih berdasarkan skala sistem).
  - Teks pendek (nama, label, kode): VARCHAR(n) dengan n yang REALISTIS (bukan selalu 255).
    * Nama orang: VARCHAR(100)
    * Alamat surel: VARCHAR(254) (standar RFC 5321)
    * Kode pendek: VARCHAR(20)
    * Nomor telepon: VARCHAR(20) (standar E.164)
    * URL: VARCHAR(2048) (standar browser)
  - Teks panjang (deskripsi, catatan, konten): TEXT
  - Angka bulat: INT (hingga 2.1 miliar), BIGINT (lebih besar), SMALLINT (hingga 32767), TINYINT (0-255).
  - Angka desimal (uang, harga): DECIMAL(presisi, skala) misal DECIMAL(15,2) untuk mata uang.
    * DILARANG KERAS menyimpan uang dalam FLOAT atau DOUBLE (masalah presisi floating point).
  - Boolean: BOOLEAN (true/false).
  - Waktu: TIMESTAMP (dengan zona waktu), DATE (tanggal saja), TIME (jam saja).
  - Binary/File: BLOB atau simpan path VARCHAR(512) (file di storage terpisah).
  - DILARANG menggunakan tipe generik "TEXT" untuk semua kolom. Pilih tipe paling spesifik dan tepat.

1.3. ATURAN PRIMARY KEY (PK):
  - Setiap tabel WAJIB punya tepat SATU Primary Key.
  - PK harus immutable (tidak berubah sepanjang hidup record).
  - Nama PK: "{nama_tabel}_id" (misal: penyewa_id, pesanan_id, produk_id).
  - PK surrogate (auto-increment/UUID) LEBIH DIUTAMAKAN daripada PK natural (nomor KTP, email) untuk stabilitas.

1.4. ATURAN FOREIGN KEY (FK) & RELASI (Notasi Crow's Foot / IE Notation) - WAJIB TERHUBUNG:
  - ATURAN MUTLAK: SETIAP TABEL ERD WAJIB BERELASI (Memiliki minimal satu Foreign Key masuk atau keluar).
  - DILARANG KERAS menghasilkan tabel terisolasi (orphaned/isolated table) yang berdiri sendiri tanpa relasi ke tabel lain dalam skema!
  - Setiap FK HARUS merujuk ke PK tabel induk yang valid.
  - Nama FK: "{tabel_induk}_id" di tabel anak.
  - Kardinalitas WAJIB dinyatakan eksplisit di daftar "relasi":
    * "1-1" (One-to-One): Misal: pengguna <-> profil_pengguna.
    * "1-N" (One-to-Many): Paling umum (misal: 1 pengguna memiliki N pesanan, 1 pesanan memiliki N detail_pesanan).
    * "N-M" (Many-to-Many): WAJIB menggunakan tabel perantara/junction dengan 2 FK (misal: produk <-> produk_kategori <-> kategori).
  - Keterangan relasi WAJIB deskriptif: "memiliki", "membuat", "termasuk dalam", "membayar", dsb.
  - Pastikan SEMUA relasi tabel dicatat di array "relasi" pada JSON output!

1.5. KOLOM AUDIT WAJIB (untuk setiap tabel utama):
  - "dibuat_pada" (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
  - "diperbarui_pada" (TIMESTAMP, nullable, ON UPDATE CURRENT_TIMESTAMP)

1.6. ATURAN PENAMAAN (Bahasa Inggris atau Bahasa Indonesia snake_case):
  - Nama tabel dan kolom DIPERBOLEHKAN menggunakan BAHASA INGGRIS atau BAHASA INDONESIA snake_case.
  - PENTING: Gunakan penamaan yang KONSISTEN di seluruh diagram dan sesuaikan dengan preferensi/bahasa instruksi pengguna.
    * Jika pengguna menggunakan istilah Inggris (misal: "users", "orders", "payments", "tenant_id", "created_at"), gunakan penamaan Inggris snake_case standar industri.
    * Jika pengguna menggunakan istilah Indonesia (misal: "pengguna", "pesanan", "pembayaran", "dibuat_pada"), gunakan penamaan Indonesia snake_case.
  - Nama tabel: kata benda tunggal atau jamak snake_case (misal: `users` / `user` atau `pengguna`, `orders` / `order` atau `pesanan`).
  - Kolom audit standar:
    * Inggris: `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP)
    * Indonesia: `dibuat_pada` (TIMESTAMP), `diperbarui_pada` (TIMESTAMP)
  - Kolom status boolean standar:
    * Inggris: `is_active` (BOOLEAN) atau `status` (VARCHAR)
    * Indonesia: `status_aktif` (BOOLEAN) atau `status` (VARCHAR)

═══════════════════════════════════════════════════════
BAGIAN 2: STANDAR WORKFLOW (BPMN 2.0 - ISO 19510:2013)
Referensi: Business Process Model and Notation 2.0
═══════════════════════════════════════════════════════

2.1. SIMBOL BPMN 2.0 YANG DIGUNAKAN (dipetakan ke tipe_simbol):

  [Start Event -> tipe_simbol: "mulai"]
  - Lingkaran/oval hijau. Menandai TITIK AWAL proses.
  - Setiap diagram WAJIB punya TEPAT SATU start event.
  - Label: deskripsi pemicu proses (misal: "Pelanggan Mengajukan Pesanan", "Formulir Diterima").

  [Task/Activity -> tipe_simbol: "proses"]
  - Persegi panjang emas. Menandai AKTIVITAS KERJA yang dilakukan oleh aktor.
  - Label HARUS berupa kata kerja + objek (misal: "Verifikasi Data Pelanggan", "Hitung Total Pembayaran").
  - DILARANG label ambigu: "Proses Data" (data apa?), "Lakukan Pengecekan" (cek apa?).
  - Setiap task WAJIB punya "aktor" (siapa yang mengerjakan).

  [Exclusive Gateway (XOR) -> tipe_simbol: "keputusan"]
  - Belah ketupat (diamond). Menandai titik PERCABANGAN berdasarkan kondisi.
  - Label HARUS berupa pertanyaan Ya/Tidak (misal: "Stok Tersedia?", "Pembayaran Valid?", "Dokumen Lengkap?").
  - WAJIB punya "cabang_ya" (ID langkah jika kondisi benar) dan "cabang_tidak" (ID langkah jika kondisi salah).
  - DILARANG gateway tanpa kedua cabang. Setiap cabang HARUS mengarah ke langkah yang valid.

  [End Event -> tipe_simbol: "selesai"]
  - Lingkaran/oval merah. Menandai TITIK AKHIR proses.
  - Boleh ada lebih dari satu end event (misal: "Layanan Tenant Sukses Terpublikasi" dan "Registrasi/Publikasi Dibatalkan").
  - Label: hasil akhir proses.

2.2. ATURAN KEDALAMAN & KELENGKAPAN WORKFLOW (WAJIB KOMPREHENSIF 8 - 15 LANGKAH):
  - DILARANG KERAS membuat alur dangkal atau seadanya (hanya 3-5 langkah linier pendek)!
  - Workflow HARUS merepresentasikan siklus hidup bisnis secara komprehensif, mencakup:
    1. Fase Setup & Provisioning oleh Superadmin (Inisialisasi tenant, alokasi database, konfigurasi fitur spesifik jenis usaha).
    2. Titik Validasi & Keputusan XOR (misal: "Verifikasi Kelayakan Tenant?", "Apakah Jenis Usaha Memerlukan Modul Transaksi?").
    3. Fase Manajemen Konten oleh Admin/Client (Pengisian data master, modul spesifik usaha seperti menu/jadwal/layanan, konfigurasi halaman publik).
    4. Titik Validasi/Review Publikasi (misal: "Konten Siap Dipublikasikan?").
    5. Fase Interaksi Pengguna Publik (Akses portal publik, navigasi sub-menu, interaksi/transaksi pengguna).
    6. Pemrosesan Data & Notifikasi Akhir.
    7. Hasil Akhir Sukses (Selesai) dan Hasil Akhir Gagal/Revisi (Selesai Batal).

2.3. ATURAN MULTI-AKTOR (BPMN Pools & Lanes):
  - Jika pengguna menyebutkan beberapa aktor (misal: Superadmin, Admin Client, Pengguna Publik, Sistem), SELURUH aktor tersebut WAJIB memiliki peran dan langkah aktif dalam diagram alur!
  - Setiap langkah WAJIB menetapkan field "aktor" secara spesifik dan akurat sesuai konteks.

2.4. ATURAN KONEKTIVITAS & PERCABANGAN BPMN:
  - Setiap langkah (kecuali "selesai") WAJIB punya "lanjut_ke" atau "cabang_ya"/"cabang_tidak".
  - Alur WAJIB memiliki minimal 1–3 titik keputusan ("keputusan") dengan percabangan Ya dan Tidak yang bermakna.
  - DILARANG ada langkah yang menggantung tanpa koneksi ke langkah lain.
  - Setiap jalur dari start HARUS berakhir di end event (tidak boleh deadlock/infinite loop).

2.5. ATURAN PENOMORAN PROSES:
  - Nomor proses hierarkis: "1.0", "2.0", "2.1", "3.0", "4.0", dsb.
  - Nomor harus berurutan dan terstruktur.

2.6. RELEVANSI ERD-WORKFLOW:
  - Setiap tabel transaksi/operasional di ERD HARUS ada langkah workflow yang terkait.
  - Setiap langkah workflow yang menyimpan data HARUS memiliki tabel penampung di ERD.

═══════════════════════════════════════════════════════
BAGIAN 3: KEMAMPUAN INTELIJEN ARSITEKTUR
═══════════════════════════════════════════════════════

A. DETEKSI INTENT PERBAIKAN:
   - Perubahan terkait database/tabel/kolom: fokus perbaiki ERD, pertahankan workflow.
   - Perubahan alur kerja/tahapan/proses: fokus perbaiki Workflow, pertahankan ERD.
   - Perubahan keduanya: selaraskan keduanya.

B. SCOPED EDIT (/{nama_bagian}):
   - Tag `/{nama_bagian}` (misal: `/penyewa`, `/wf_2`):
     * HANYA perbaiki bagian tersebut, pertahankan semua entitas lain PERSIS seperti state saat ini.

C. PENERJEMAHAN DUA ARAH:
   - ERD -> Workflow: tabel transaksi baru -> buat langkah workflow terkait.
   - Workflow -> ERD: langkah menyimpan data -> pastikan tabel penampung ada.

═══════════════════════════════════════════════════════
BAGIAN 4: FORMAT OUTPUT JSON
═══════════════════════════════════════════════════════

Output WAJIB JSON murni tanpa markdown backtick. Struktur:
{
  "ringkasan_ide": "RANGKUMAN KOMPREHENSIF & MENYELURUH (3-5 PARAGRAF LENGKAP): Wajib mensintesis SELURUH riwayat obrolan dari awal chat sampai akhir secara mendalam. Uraikan: (1) Konsep inti arsitektur dan model sistem (misal: multi-tenant, hierarki peran, isolasi basis data), (2) Matriks variasi entitas dan pembagian hak akses (superadmin, client admin, user publik), (3) Fitur spesifik per domain usaha (sekolah SMK/SMA, perusahaan, cafe, RS, UMKM), dan (4) Keterkaitan alur bisnis menyeluruh. DILARANG membuat rangkuman pendek 1 kalimat!",
  "pertanyaan_klarifikasi": [],
  "erd_tables": [
    {
      "nama_tabel": "pesanan",
      "kolom": [
        {"nama": "pesanan_id", "tipe": "BIGINT", "size": null, "is_pk": true, "is_fk": false, "is_nullable": false, "is_unique": true, "is_indexed": true, "keterangan": "ID unik auto-increment"},
        {"nama": "pelanggan_id", "tipe": "BIGINT", "size": null, "is_pk": false, "is_fk": true, "fk_referensi": "pelanggan.pelanggan_id", "is_nullable": false, "is_unique": false, "is_indexed": true, "keterangan": "FK ke tabel pelanggan"},
        {"nama": "total_harga", "tipe": "DECIMAL", "size": "15,2", "is_pk": false, "is_fk": false, "is_nullable": false, "is_unique": false, "is_indexed": false, "keterangan": "Total harga dalam Rupiah"},
        {"nama": "status_pesanan", "tipe": "VARCHAR", "size": 30, "is_pk": false, "is_fk": false, "is_nullable": false, "is_unique": false, "is_indexed": true, "keterangan": "menunggu/diproses/dikirim/selesai/dibatalkan"},
        {"nama": "dibuat_pada", "tipe": "TIMESTAMP", "size": null, "is_pk": false, "is_fk": false, "is_nullable": false, "is_unique": false, "is_indexed": false, "keterangan": "Waktu pembuatan record"},
        {"nama": "diperbarui_pada", "tipe": "TIMESTAMP", "size": null, "is_pk": false, "is_fk": false, "is_nullable": true, "is_unique": false, "is_indexed": false, "keterangan": "Waktu pembaruan terakhir"}
      ]
    }
  ],
  "workflows": [
    {
      "id": "wf_1",
      "tipe_simbol": "mulai",
      "no_proses": "1.0",
      "aktor": "Superadmin",
      "langkah": "Inisialisasi & Daftarkan Tenant Baru",
      "deskripsi": "Superadmin mendaftarkan identitas tenant, memilih kategori usaha (SMK, Cafe, RS, UMKM), dan mengalokasikan schema database",
      "lanjut_ke": "wf_2"
    },
    {
      "id": "wf_2",
      "tipe_simbol": "proses",
      "no_proses": "2.0",
      "aktor": "Superadmin",
      "langkah": "Konfigurasi Paket Modul & Hak Akses",
      "deskripsi": "Superadmin menetapkan fitur aktif yang dapat diakses oleh Admin Tenant sesuai profil usaha",
      "lanjut_ke": "wf_3"
    },
    {
      "id": "wf_3",
      "tipe_simbol": "keputusan",
      "no_proses": "3.0",
      "aktor": "Sistem Provisioning",
      "langkah": "Alokasi Database & Akun Tenant Berhasil?",
      "deskripsi": "Verifikasi koneksi isolasi database tenant dan penerbitan kredensial admin client",
      "cabang_ya": "wf_4",
      "cabang_tidak": "wf_11"
    },
    {
      "id": "wf_4",
      "tipe_simbol": "proses",
      "no_proses": "4.0",
      "aktor": "Admin Client",
      "langkah": "Autentikasi & Setup Konten Halaman Publik",
      "deskripsi": "Admin tenant login ke portal manajemen dan mengisi konten dinamis, menu, serta profil instansi/bisnis",
      "lanjut_ke": "wf_5"
    },
    {
      "id": "wf_5",
      "tipe_simbol": "proses",
      "no_proses": "5.0",
      "aktor": "Admin Client",
      "langkah": "Kelola Data Operasional Spesifik Usaha",
      "deskripsi": "Admin menginput master data khusus (misal: kurikulum/jurusan untuk SMK, menu/meja untuk Cafe, antrean/poli untuk RS, katalog produk untuk UMKM)",
      "lanjut_ke": "wf_6"
    },
    {
      "id": "wf_6",
      "tipe_simbol": "keputusan",
      "no_proses": "6.0",
      "aktor": "Admin Client",
      "langkah": "Konten & Navigasi Publik Siap Rilis?",
      "deskripsi": "Pemeriksaan kelengkapan halaman dan status publikasi website tenant",
      "cabang_ya": "wf_7",
      "cabang_tidak": "wf_4"
    },
    {
      "id": "wf_7",
      "tipe_simbol": "proses",
      "no_proses": "7.0",
      "aktor": "Pengguna Publik",
      "langkah": "Akses Portal Publik & Navigasi Halaman",
      "deskripsi": "Pengguna/publik membuka website tenant melalui domain/subdomain khusus dan menjelajahi informasi",
      "lanjut_ke": "wf_8"
    },
    {
      "id": "wf_8",
      "tipe_simbol": "proses",
      "no_proses": "8.0",
      "aktor": "Pengguna Publik",
      "langkah": "Kirim Formulir Interaksi / Transaksi",
      "deskripsi": "Pengguna melakukan aksi interaktif (pendaftaran siswa, booking meja/layanan, atau pengajuan pesanan)",
      "lanjut_ke": "wf_9"
    },
    {
      "id": "wf_9",
      "tipe_simbol": "proses",
      "no_proses": "9.0",
      "aktor": "Sistem & Admin Client",
      "langkah": "Simpan Transaksi & Notifikasi Admin",
      "deskripsi": "Sistem mencatat data transaksi ke database tenant dan mengirimkan notifikasi real-time ke admin",
      "lanjut_ke": "wf_10"
    },
    {
      "id": "wf_10",
      "tipe_simbol": "selesai",
      "no_proses": "10.0",
      "aktor": "Sistem",
      "langkah": "Layanan Tenant Aktif & Transaksi Sukses",
      "deskripsi": "Alur operasional tenant berjalan lancar dan status dicatat secara permanen"
    },
    {
      "id": "wf_11",
      "tipe_simbol": "selesai",
      "no_proses": "3.1",
      "aktor": "Superadmin",
      "langkah": "Provisioning Tenant Gagal / Dibatalkan",
      "deskripsi": "Proses pembuatan tenant dihentikan karena kegagalan alokasi resource atau pembatalan"
    }
  ],
  "relasi": [
    {"dari": "tenant", "ke": "user", "tipe": "1-N", "keterangan": "memiliki"},
    {"dari": "tenant", "ke": "halaman_publik", "tipe": "1-N", "keterangan": "mengatur"},
    {"dari": "jenis_usaha", "ke": "tenant", "tipe": "1-N", "keterangan": "mengklasifikasikan"}
  ]
}
"""

SYSTEM_THINKING_PROMPT = """Kamu adalah Jev System Co-Architect & Advisor (Thinking & Discussion Mode).
Tugasmu adalah:
1. Menjawab pertanyaan arsitektur dan teknis pengguna secara komprehensif, logis, dan mendalam (contoh: "kenapa user dan role dipisah?", "kapan memakai 1-N vs N-M?", "mengapa pakai UUID bukan auto increment?").
2. Menganalisa trade-off arsitektur berdasarkan state diagram saat ini.
3. Memberikan 2-3 opsi rekomendasi konkret beserta kelebihan, kekurangan, dan instruksi perubahan diagram jika pengguna ingin menerapkannya.

Format Output WAJIB JSON murni:
{
  "analisa_pemikiran": "Jawaban lengkap atas pertanyaan pengguna beserta uraian pemikiran arsitektural dan pertimbangan teknis secara mendalam berbasis sistem yang ada",
  "opsi_rekomendasi": [
    {
      "id_opsi": "opsi_1",
      "judul": "Judul Pendekatan / Rekomendasi 1",
      "penjelasan": "Penjelasan pendekatan dan implementasinya terhadap diagram yang ada",
      "kelebihan": "Kelebihan pendekatan ini",
      "kekurangan": "Kekurangan/risiko pendekatan ini",
      "instruksi_diagram": "Ringkasan instruksi tindakan pada diagram jika opsi ini dipilih"
    }
  ]
}
Output HANYA JSON tanpa markdown backtick.
"""


