from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from datetime import datetime
import json

from ..database import get_db_connection
from ..utils.id_generator import buat_id_terstruktur
from ..models.schemas import RencanaBuatDTO, ChatInputDTO, EditChatDTO, SimpanNodeDTO
from ..services.llm_gateway import panggil_llm_ekstraksi, panggil_llm_thinking
from ..services.jev_verifier import JevVerifierEngine

router = APIRouter(prefix="/api", tags=["Rencana & Jev Reasoning"])
verifier = JevVerifierEngine()

@router.get("/rencana")
def daftar_rencana():
    """Mengambil daftar seluruh proyek/rencana pengguna"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM rencana ORDER BY dibuat_pada DESC;")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

@router.post("/rencana")
def buat_rencana(dto: RencanaBuatDTO):
    """Membuat wadah rencana besar / proyek baru sebelum memulai eksplorasi"""
    rencana_id = buat_id_terstruktur("rcn")
    waktu_skrg = datetime.now().isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO rencana (rencana_id, judul, deskripsi, status, dibuat_pada, diperbarui_pada) VALUES (?, ?, ?, ?, ?, ?);",
            (rencana_id, dto.judul.strip(), (dto.deskripsi or "").strip(), "aktif", waktu_skrg, waktu_skrg)
        )
        conn.commit()
    return {"rencana_id": rencana_id, "judul": dto.judul.strip(), "status": "aktif"}

@router.get("/rencana/{rencana_id}")
def detail_rencana(rencana_id: str):
    """Mengambil detail proyek rencana, daftar chat riwayat, serta node canvas & relasi"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM rencana WHERE rencana_id = ?;", (rencana_id,))
        rencana = cursor.fetchone()
        if not rencana:
            raise HTTPException(status_code=404, detail="Proyek rencana tidak ditemukan")
        
        cursor.execute("SELECT * FROM node_diagram WHERE rencana_id = ?;", (rencana_id,))
        raw_nodes = cursor.fetchall()
        nodes = []
        for r in raw_nodes:
            d = dict(r)
            try:
                data_parsed = json.loads(d.get("data_json", "{}"))
            except Exception:
                data_parsed = {}
            nodes.append({
                "id": d["node_id"],
                "type": d["tipe_node"],
                "position": {"x": d["posisi_x"], "y": d["posisi_y"]},
                "data": data_parsed
            })
        
        cursor.execute("SELECT * FROM relasi_diagram WHERE rencana_id = ?;", (rencana_id,))
        raw_relasi = cursor.fetchall()
        edges = []
        for r in raw_relasi:
            d = dict(r)
            edges.append({
                "id": d["relasi_id"],
                "source": d["node_asal_id"],
                "target": d["node_tujuan_id"],
                "label": d["label_relasi"] or "",
                "animated": True,
                "style": {"stroke": "#4f46e5", "strokeWidth": 2}
            })
        
        cursor.execute("SELECT * FROM sesi_obrolan WHERE rencana_id = ? ORDER BY dibuat_pada ASC;", (rencana_id,))
        obrolan = []
        for r in cursor.fetchall():
            d = dict(r)
            try:
                verif_parsed = json.loads(d.get("hasil_verifikasi_json", "[]"))
            except Exception:
                verif_parsed = []
            d["hasil_verifikasi"] = verif_parsed
            obrolan.append(d)

    return {
        "rencana": dict(rencana),
        "ringkasan_ide": rencana["deskripsi"] or "",
        "nodes": nodes,
        "edges": edges,
        "obrolan": obrolan
    }

@router.delete("/rencana/{rencana_id}")
def hapus_rencana(rencana_id: str):
    """Menghapus sebuah proyek rencana beserta seluruh obrolan, node, dan relasinya"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM rencana WHERE rencana_id = ?;", (rencana_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Proyek rencana tidak ditemukan")
        
        cursor.execute("DELETE FROM node_diagram WHERE rencana_id = ?;", (rencana_id,))
        cursor.execute("DELETE FROM relasi_diagram WHERE rencana_id = ?;", (rencana_id,))
        cursor.execute("DELETE FROM sesi_obrolan WHERE rencana_id = ?;", (rencana_id,))
        cursor.execute("DELETE FROM rencana WHERE rencana_id = ?;", (rencana_id,))
        conn.commit()
    return {"status": "sukses", "pesan": f"Proyek {rencana_id} berhasil dihapus"}

def ambil_state_diagram_internal(conn, rencana_id: str) -> Dict[str, Any]:
    """Mengambil representasi terstruktur dari diagram yang sudah ada di database saat ini"""
    cursor = conn.cursor()
    cursor.execute("SELECT node_id, tipe_node, data_json FROM node_diagram WHERE rencana_id = ?;", (rencana_id,))
    nodes = cursor.fetchall()
    
    tabel_list = []
    mindmap_list = []
    usecase_list = []
    
    for n in nodes:
        tipe = n["tipe_node"]
        nid = n["node_id"]
        try:
            d = json.loads(n["data_json"])
        except Exception:
            d = {}
            
        if tipe == "erdNode":
            tabel_list.append({
                "nama_tabel": d.get("nama_tabel"),
                "kolom": d.get("kolom", [])
            })
        elif tipe == "mindmapNode":
            mindmap_list.append({
                "id": nid,
                "parent_id": d.get("parent_id"),
                "label": d.get("label"),
                "kategori": d.get("kategori"),
                "sub_poin": d.get("sub_poin", [])
            })
        elif tipe in ("workflowNode", "useCaseNode"):
            usecase_list.append({
                "id": nid,
                "tipe_simbol": d.get("tipe_simbol", "proses"),
                "no_proses": d.get("no_proses"),
                "aktor": d.get("aktor", d.get("penanggung_jawab")),
                "langkah": d.get("langkah", d.get("label", d.get("kasus"))),
                "deskripsi": d.get("deskripsi"),
                "lanjut_ke": d.get("lanjut_ke"),
                "cabang_ya": d.get("cabang_ya"),
                "cabang_tidak": d.get("cabang_tidak"),
                "data_store": d.get("data_store")
            })

    cursor.execute("SELECT node_asal_id, node_tujuan_id, label_relasi FROM relasi_diagram WHERE rencana_id = ?;", (rencana_id,))
    relasi_list = [{"dari": r["node_asal_id"], "ke": r["node_tujuan_id"], "label": r["label_relasi"]} for r in cursor.fetchall()]

    # Ambil ringkasan / deskripsi proyek jika ada
    cursor.execute("SELECT judul, deskripsi FROM rencana WHERE rencana_id = ?;", (rencana_id,))
    rec_ren = cursor.fetchone()
    deskripsi_proyek = f"{rec_ren['judul']}: {rec_ren['deskripsi']}" if rec_ren else ""

    return {
        "deskripsi_proyek": deskripsi_proyek,
        "tabel": tabel_list,
        "workflows": usecase_list,
        "relasi": relasi_list
    }

def ambil_posisi_map_internal(conn, rencana_id: str, posisi_nodes_terkini: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Dict[str, float]]:
    """Mengambil pemetaan koordinat posisi node yang sudah ada / di-drag oleh user agar tidak ter-reset"""
    posisi_map = {}
    cursor = conn.cursor()
    cursor.execute("SELECT node_id, tipe_node, label, posisi_x, posisi_y, data_json FROM node_diagram WHERE rencana_id = ?;", (rencana_id,))
    for r in cursor.fetchall():
        posisi_map[r["node_id"]] = {"x": r["posisi_x"], "y": r["posisi_y"]}
        try:
            dj = json.loads(r["data_json"])
            if dj.get("nama_tabel"):
                posisi_map[f"erd_{dj['nama_tabel']}"] = {"x": r["posisi_x"], "y": r["posisi_y"]}
                posisi_map[dj["nama_tabel"]] = {"x": r["posisi_x"], "y": r["posisi_y"]}
            if dj.get("langkah"):
                posisi_map[dj["langkah"]] = {"x": r["posisi_x"], "y": r["posisi_y"]}
        except Exception:
            pass

    if posisi_nodes_terkini:
        for item in posisi_nodes_terkini:
            nid = item.get("id")
            pos = item.get("position")
            if nid and pos and isinstance(pos, dict):
                posisi_map[nid] = {"x": float(pos.get("x", 0)), "y": float(pos.get("y", 0))}
                d = item.get("data") or {}
                if d.get("nama_tabel"):
                    posisi_map[f"erd_{d['nama_tabel']}"] = {"x": float(pos.get("x", 0)), "y": float(pos.get("y", 0))}
                    posisi_map[d["nama_tabel"]] = {"x": float(pos.get("x", 0)), "y": float(pos.get("y", 0))}
                if d.get("langkah"):
                    posisi_map[d["langkah"]] = {"x": float(pos.get("x", 0)), "y": float(pos.get("y", 0))}

    return posisi_map

def simpan_node_dan_edge_internal(conn, rencana_id: str, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]], waktu: str):
    """Helper untuk otomatis meng-update node dan relasi di SQLite saat chat masuk tanpa duplikasi node_id"""
    cursor = conn.cursor()
    
    # Ambil posisi lama dan warna kustom jika ada, agar pergeseran manual pengguna tidak hilang
    cursor.execute("SELECT node_id, posisi_x, posisi_y, data_json FROM node_diagram WHERE rencana_id = ?;", (rencana_id,))
    existing_map = {}
    for r in cursor.fetchall():
        try:
            d_json = json.loads(r["data_json"])
        except Exception:
            d_json = {}
        existing_map[r["node_id"]] = {
            "x": r["posisi_x"],
            "y": r["posisi_y"],
            "warna_kustom": d_json.get("warna_kustom")
        }

    cursor.execute("DELETE FROM node_diagram WHERE rencana_id = ?;", (rencana_id,))
    cursor.execute("DELETE FROM relasi_diagram WHERE rencana_id = ?;", (rencana_id,))
    
    seen_node_ids = set()
    for idx, node in enumerate(nodes):
        raw_node_id = str(node.get("id") or "").strip()
        if not raw_node_id:
            raw_node_id = buat_id_terstruktur("nod")
        if raw_node_id in seen_node_ids:
            node_id = f"{raw_node_id}_{idx+1}"
        else:
            node_id = raw_node_id
        seen_node_ids.add(node_id)

        pos = node.get("position", {})
        node_data = node.get("data", {})

        # Ambil posisi yang dikirimkan (hasil drag pengguna terkini)
        # Jika node_data belum punya warna_kustom dan ada di existing_map, pertahankan warna kustom lama
        if node_id in existing_map and existing_map[node_id].get("warna_kustom") and not node_data.get("warna_kustom"):
            node_data["warna_kustom"] = existing_map[node_id]["warna_kustom"]

        label_node = node_data.get("label") or node_data.get("langkah") or node_data.get("nama_tabel") or "Node"

        cursor.execute(
            """INSERT OR REPLACE INTO node_diagram (node_id, rencana_id, tipe_node, label, posisi_x, posisi_y, data_json, dibuat_pada)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?);""",
            (
                node_id,
                rencana_id,
                node.get("type", "default"),
                label_node,
                pos.get("x", 0.0),
                pos.get("y", 0.0),
                json.dumps(node_data),
                waktu
            )
        )
        
    seen_edge_ids = set()
    for idx, edge in enumerate(edges):
        raw_rel_id = str(edge.get("id") or "").strip()
        if not raw_rel_id:
            raw_rel_id = buat_id_terstruktur("rel")
        if raw_rel_id in seen_edge_ids:
            relasi_id = f"{raw_rel_id}_{idx+1}"
        else:
            relasi_id = raw_rel_id
        seen_edge_ids.add(relasi_id)

        cursor.execute(
            """INSERT OR REPLACE INTO relasi_diagram (relasi_id, rencana_id, node_asal_id, node_tujuan_id, label_relasi, tipe_garis, dibuat_pada)
               VALUES (?, ?, ?, ?, ?, ?, ?);""",
            (
                relasi_id,
                rencana_id,
                edge.get("source"),
                edge.get("target"),
                edge.get("label", ""),
                "smoothstep",
                waktu
            )
        )

def gabungkan_ast_dengan_state_lama(raw_ast: Dict[str, Any], state_diagram_saat_ini: Dict[str, Any], pesan_pengguna: str) -> Dict[str, Any]:
    """
    Memastikan state ERD dan Workflow lama tidak hilang saat pengguna mengirim instruksi/chat baru,
    melakukan merge cerdas dan akumulasi tanpa duplikasi.
    """
    if not state_diagram_saat_ini:
        return raw_ast

    pesan_lower = pesan_pengguna.lower()
    minta_hapus_semua = "hapus semua" in pesan_lower or "reset diagram" in pesan_lower or "mulai dari awal" in pesan_lower

    if minta_hapus_semua:
        return raw_ast

    # 1. AKUMULASI TABEL ERD (Pertahankan semua tabel yang sudah dibuat sebelumnya tanpa duplikasi nama)
    tabel_lama = state_diagram_saat_ini.get("tabel", [])
    tabel_baru = raw_ast.get("erd_tables", [])
    
    # Deteksi tabel spesifik yang diminta dihapus
    tabel_dihapus = set()
    for t in tabel_lama:
        nama_t = str(t.get("nama_tabel", "")).strip().lower()
        if f"hapus tabel {nama_t}" in pesan_lower or f"drop table {nama_t}" in pesan_lower or f"buang tabel {nama_t}" in pesan_lower:
            tabel_dihapus.add(nama_t)

    seen_table_names = set()
    tabel_final = []
    # Prioritaskan tabel_baru dari LLM terlebih dahulu
    for t in tabel_baru:
        nama_t = str(t.get("nama_tabel", "")).strip().lower()
        if nama_t and nama_t not in seen_table_names and nama_t not in tabel_dihapus:
            seen_table_names.add(nama_t)
            tabel_final.append(t)
    # Tambahkan tabel_lama yang belum ada di tabel_baru
    for t in tabel_lama:
        nama_t = str(t.get("nama_tabel", "")).strip().lower()
        if nama_t and nama_t not in seen_table_names and nama_t not in tabel_dihapus:
            seen_table_names.add(nama_t)
            tabel_final.append(t)

    raw_ast["erd_tables"] = tabel_final

    # 2. AKUMULASI WORKFLOWS (Jika AI menghasilkan workflow baru, gunakan yang baru; jika kosong, pertahankan lama)
    workflows_baru = raw_ast.get("workflows", [])
    workflows_lama = state_diagram_saat_ini.get("workflows", [])
    wf_source = workflows_baru if workflows_baru else workflows_lama
    
    seen_wf_ids = set()
    workflows_final = []
    for idx, wf in enumerate(wf_source):
        wf_id = str(wf.get("id", f"wf_{idx+1}")).strip()
        wf_id_lower = wf_id.lower()
        if wf_id_lower not in seen_wf_ids:
            seen_wf_ids.add(wf_id_lower)
            workflows_final.append(wf)
        else:
            wf_copy = dict(wf)
            wf_copy["id"] = f"{wf_id}_{idx+1}"
            seen_wf_ids.add(wf_copy["id"].lower())
            workflows_final.append(wf_copy)

    raw_ast["workflows"] = workflows_final

    # 3. AKUMULASI RELASI
    relasi_baru = raw_ast.get("relasi", [])
    relasi_lama = state_diagram_saat_ini.get("relasi", [])
    semua_tabel_set = set([str(t.get("nama_tabel", "")).strip().lower() for t in tabel_final if t.get("nama_tabel")])

    relasi_final_map = {}
    for r in relasi_lama:
        dari = str(r.get("dari", "")).strip().lower()
        ke = str(r.get("ke", "")).strip().lower()
        if dari in semua_tabel_set and ke in semua_tabel_set:
            relasi_final_map[f"{dari}->{ke}"] = r

    for r in relasi_baru:
        dari = str(r.get("dari", "")).strip().lower()
        ke = str(r.get("ke", "")).strip().lower()
        relasi_final_map[f"{dari}->{ke}"] = r

    raw_ast["relasi"] = list(relasi_final_map.values())

    return raw_ast

@router.post("/chat/translate-ide")
def translate_ide_dengan_jev(dto: ChatInputDTO):
    """
    Core Jev Pipeline:
    Membaca STATE DIAGRAM SAAT INI + RIWAYAT CHAT agar tidak membuat ulang secara sembarangan.
    """
    rencana_id = dto.rencana_id
    waktu_skrg = datetime.now().isoformat()
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM rencana WHERE rencana_id = ?;", (rencana_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Proyek rencana tidak ditemukan")
        
        cursor.execute("SELECT pesan_mentah FROM sesi_obrolan WHERE rencana_id = ? ORDER BY dibuat_pada ASC;", (rencana_id,))
        riwayat_pesan = [r["pesan_mentah"] for r in cursor.fetchall()]
        
        state_diagram_saat_ini = ambil_state_diagram_internal(conn, rencana_id)
        posisi_map = ambil_posisi_map_internal(conn, rencana_id, dto.posisi_nodes_terkini)

    mode = dto.mode or "fast"
    sesi_id = buat_id_terstruktur("ses")

    # Deteksi Otomatis: Jika pesan adalah pertanyaan arsitektural/teknis (mengandung kata tanya atau tanda tanya)
    teks_lower = dto.pesan.strip().lower()
    kata_tanya = ["kenapa", "mengapa", "kenapa kok", "kenapa ya", "apa bedanya", "bagaimana", "kapan", "jelaskan", "apakah", "why", "how", "what is"]
    adalah_pertanyaan = any(teks_lower.startswith(k) or f" {k} " in f" {teks_lower} " for k in kata_tanya) or ("?" in teks_lower and not ("tambah" in teks_lower or "buat" in teks_lower or "ubah" in teks_lower))

    # JIKA MODE THINKING ATAU PERTANYAAN DISKUSI:
    if mode == "thinking" or adalah_pertanyaan:
        hasil_thinking = panggil_llm_thinking(
            dto.pesan,
            riwayat_obrolan=riwayat_pesan,
            state_diagram_saat_ini=state_diagram_saat_ini
        )
        payload_simpan = {
            "mode": "thinking",
            "hasil_thinking": hasil_thinking
        }
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO sesi_obrolan (sesi_id, rencana_id, peran, pesan_mentah, hasil_verifikasi_json, dibuat_pada) VALUES (?, ?, ?, ?, ?, ?);",
                (sesi_id, rencana_id, "pengguna", dto.pesan, json.dumps(payload_simpan), waktu_skrg)
            )
            conn.commit()
            
        return {
            "sesi_id": sesi_id,
            "rencana_id": rencana_id,
            "mode": "thinking",
            "hasil_thinking": hasil_thinking,
            "is_valid": True,
            "log_verifikasi": ["[Jev Advisor] Analisa & Jawaban Arsitektur selesai berbasis data terkini."],
            "hasil_terstruktur": None
        }

    # JIKA MODE FAST:
    try:
        raw_ast = panggil_llm_ekstraksi(
            dto.pesan,
            riwayat_obrolan=riwayat_pesan,
            state_diagram_saat_ini=state_diagram_saat_ini
        )
        # Gabungkan secara cerdas dengan state ERD & Workflow yang sudah ada
        raw_ast = gabungkan_ast_dengan_state_lama(raw_ast, state_diagram_saat_ini, dto.pesan)
        
        is_valid, log_verifikasi, hasil_terstruktur = verifier.verifikasi_dan_eksekusi(raw_ast, posisi_terkini=posisi_map)
        ringkasan_ide_final = hasil_terstruktur.get("ringkasan_ide", "")
        
        payload_simpan = {
            "mode": "fast",
            "log_verifikasi": log_verifikasi,
            "ringkasan_ide": ringkasan_ide_final
        }
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # 1. Simpan sesi obrolan dengan log verifikasi dan ringkasan ide
            cursor.execute(
                "INSERT INTO sesi_obrolan (sesi_id, rencana_id, peran, pesan_mentah, hasil_verifikasi_json, dibuat_pada) VALUES (?, ?, ?, ?, ?, ?);",
                (sesi_id, rencana_id, "pengguna", dto.pesan, json.dumps(payload_simpan), waktu_skrg)
            )
            # 2. Update deskripsi proyek rencana dengan ringkasan komprehensif terbaru
            if ringkasan_ide_final:
                cursor.execute(
                    "UPDATE rencana SET deskripsi = ?, diperbarui_pada = ? WHERE rencana_id = ?;",
                    (ringkasan_ide_final, waktu_skrg, rencana_id)
                )
            # 3. Simpan node dan edge diagram
            nodes = hasil_terstruktur.get("nodes", [])
            edges = hasil_terstruktur.get("edges", [])
            simpan_node_dan_edge_internal(conn, rencana_id, nodes, edges, waktu_skrg)
            conn.commit()

        return {
            "sesi_id": sesi_id,
            "rencana_id": rencana_id,
            "mode": "fast",
            "is_valid": is_valid,
            "log_verifikasi": log_verifikasi,
            "ringkasan_ide": ringkasan_ide_final,
            "hasil_terstruktur": hasil_terstruktur
        }
    except Exception as e:
        pesan_error = f"[Kendala Koneksi AI]: {str(e)}"
        log_gagal = [pesan_error, "Chat Anda telah berhasil disimpan di riwayat. Silakan kirim ulang atau refresh ketika koneksi AI telah aktif kembali."]
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO sesi_obrolan (sesi_id, rencana_id, peran, pesan_mentah, hasil_verifikasi_json, dibuat_pada) VALUES (?, ?, ?, ?, ?, ?);",
                (sesi_id, rencana_id, "pengguna", dto.pesan, json.dumps(log_gagal), waktu_skrg)
            )
            conn.commit()
            
        return {
            "sesi_id": sesi_id,
            "rencana_id": rencana_id,
            "mode": "fast",
            "is_valid": False,
            "log_verifikasi": log_gagal,
            "hasil_terstruktur": {
                "ringkasan_ide": "Sedang ada kendala koneksi ke server AI. Riwayat pesan Anda tetap tersimpan utuh di sistem.",
                "nodes": [],
                "edges": [],
                "log_verifikasi": log_gagal
            }
        }

@router.put("/chat/edit")
def edit_chat_dan_reverifikasi(dto: EditChatDTO):
    """
    Mengedit pesan chat sebelumnya dan memicu ulang verifikasi dengan tetap membaca state diagram
    """
    waktu_skrg = datetime.now().isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM sesi_obrolan WHERE sesi_id = ? AND rencana_id = ?;",
            (dto.sesi_id, dto.rencana_id)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Pesan obrolan tidak ditemukan")

        cursor.execute("SELECT sesi_id, pesan_mentah FROM sesi_obrolan WHERE rencana_id = ? ORDER BY dibuat_pada ASC;", (dto.rencana_id,))
        semua_chat = []
        for r in cursor.fetchall():
            if r["sesi_id"] == dto.sesi_id:
                semua_chat.append(dto.pesan_baru)
            else:
                semua_chat.append(r["pesan_mentah"])
                
        state_diagram_saat_ini = ambil_state_diagram_internal(conn, dto.rencana_id)
        posisi_map = ambil_posisi_map_internal(conn, dto.rencana_id, dto.posisi_nodes_terkini)

    mode = dto.mode or "fast"
    if mode == "thinking":
        hasil_thinking = panggil_llm_thinking(
            dto.pesan_baru,
            riwayat_obrolan=semua_chat[:-1],
            state_diagram_saat_ini=state_diagram_saat_ini
        )
        payload_simpan = {"mode": "thinking", "hasil_thinking": hasil_thinking}
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """UPDATE sesi_obrolan 
                   SET pesan_mentah = ?, hasil_verifikasi_json = ?, dibuat_pada = ?
                   WHERE sesi_id = ? AND rencana_id = ?;""",
                (dto.pesan_baru, json.dumps(payload_simpan), waktu_skrg, dto.sesi_id, dto.rencana_id)
            )
            conn.commit()
        return {
            "sesi_id": dto.sesi_id,
            "rencana_id": dto.rencana_id,
            "mode": "thinking",
            "hasil_thinking": hasil_thinking,
            "is_valid": True,
            "log_verifikasi": ["[Jev Advisor] Analisa thinking diperbarui."],
            "hasil_terstruktur": None
        }

    raw_ast = panggil_llm_ekstraksi(
        dto.pesan_baru,
        riwayat_obrolan=semua_chat[:-1],
        state_diagram_saat_ini=state_diagram_saat_ini
    )
    raw_ast = gabungkan_ast_dengan_state_lama(raw_ast, state_diagram_saat_ini, dto.pesan_baru)
    is_valid, log_verifikasi, hasil_terstruktur = verifier.verifikasi_dan_eksekusi(raw_ast, posisi_terkini=posisi_map)
    ringkasan_ide_final = hasil_terstruktur.get("ringkasan_ide", "")

    payload_simpan = {
        "mode": "fast",
        "log_verifikasi": log_verifikasi,
        "ringkasan_ide": ringkasan_ide_final
    }

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """UPDATE sesi_obrolan 
               SET pesan_mentah = ?, hasil_verifikasi_json = ?, dibuat_pada = ?
               WHERE sesi_id = ? AND rencana_id = ?;""",
            (dto.pesan_baru, json.dumps(payload_simpan), waktu_skrg, dto.sesi_id, dto.rencana_id)
        )
        if ringkasan_ide_final:
            cursor.execute(
                "UPDATE rencana SET deskripsi = ?, diperbarui_pada = ? WHERE rencana_id = ?;",
                (ringkasan_ide_final, waktu_skrg, dto.rencana_id)
            )
        nodes = hasil_terstruktur.get("nodes", [])
        edges = hasil_terstruktur.get("edges", [])
        simpan_node_dan_edge_internal(conn, dto.rencana_id, nodes, edges, waktu_skrg)
        conn.commit()

    return {
        "sesi_id": dto.sesi_id,
        "rencana_id": dto.rencana_id,
        "mode": "fast",
        "is_valid": is_valid,
        "log_verifikasi": log_verifikasi,
        "ringkasan_ide": ringkasan_ide_final,
        "hasil_terstruktur": hasil_terstruktur
    }

@router.post("/canvas/simpan")
def simpan_posisi_canvas(dto: SimpanNodeDTO):
    """Menyimpan posisi node dan relasi terkini hasil drag pengguna di React Flow"""
    waktu_skrg = datetime.now().isoformat()
    with get_db_connection() as conn:
        simpan_node_dan_edge_internal(conn, dto.rencana_id, dto.nodes, dto.edges, waktu_skrg)
        conn.commit()
        
    return {"status": "sukses", "pesan": "Canvas tersimpan di SQLite lokal"}
