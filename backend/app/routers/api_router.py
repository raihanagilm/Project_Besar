from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from datetime import datetime
import json

from ..database import get_db_connection
from ..utils.id_generator import buat_id_terstruktur
from ..models.schemas import RencanaBuatDTO, ChatInputDTO, EditChatDTO, SimpanNodeDTO
from ..services.llm_gateway import panggil_llm_ekstraksi
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
        "nodes": nodes,
        "edges": edges,
        "obrolan": obrolan
    }

@router.post("/chat/translate-ide")
def translate_ide_dengan_jev(dto: ChatInputDTO):
    """
    Core Jev Pipeline:
    Menerima pemikiran pengguna -> LLM Ekstraksi -> Jev Deterministic Verifier -> Persistensi lokal
    """
    rencana_id = dto.rencana_id
    waktu_skrg = datetime.now().isoformat()
    
    # Pastikan proyek rencana memang ada
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM rencana WHERE rencana_id = ?;", (rencana_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Proyek rencana tidak ditemukan")

    # 1. Panggil LLM Gateway untuk merumuskan AST
    raw_ast = panggil_llm_ekstraksi(dto.pesan)

    # 2. Eksekusi Jev Deterministic Verifier
    is_valid, log_verifikasi, hasil_terstruktur = verifier.verifikasi_dan_eksekusi(raw_ast)

    # 3. Simpan pesan chat baru ke sesi_obrolan
    sesi_id = buat_id_terstruktur("ses")
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO sesi_obrolan (sesi_id, rencana_id, peran, pesan_mentah, hasil_verifikasi_json, dibuat_pada) VALUES (?, ?, ?, ?, ?, ?);",
            (sesi_id, rencana_id, "pengguna", dto.pesan, json.dumps(log_verifikasi), waktu_skrg)
        )
        conn.commit()

    return {
        "sesi_id": sesi_id,
        "rencana_id": rencana_id,
        "is_valid": is_valid,
        "log_verifikasi": log_verifikasi,
        "hasil_terstruktur": hasil_terstruktur
    }

@router.put("/chat/edit")
def edit_chat_dan_reverifikasi(dto: EditChatDTO):
    """
    Mengedit pesan chat sebelumnya dan memicu ulang verifikasi Jev
    """
    waktu_skrg = datetime.now().isoformat()
    # 1. Perbarui teks pesan di SQLite
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM sesi_obrolan WHERE sesi_id = ? AND rencana_id = ?;",
            (dto.sesi_id, dto.rencana_id)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Pesan obrolan tidak ditemukan")

    # 2. Panggil LLM dan Jev verifier ulang
    raw_ast = panggil_llm_ekstraksi(dto.pesan_baru)
    is_valid, log_verifikasi, hasil_terstruktur = verifier.verifikasi_dan_eksekusi(raw_ast)

    # 3. Update sesi_obrolan
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """UPDATE sesi_obrolan 
               SET pesan_mentah = ?, hasil_verifikasi_json = ?, dibuat_pada = ?
               WHERE sesi_id = ? AND rencana_id = ?;""",
            (dto.pesan_baru, json.dumps(log_verifikasi), waktu_skrg, dto.sesi_id, dto.rencana_id)
        )
        conn.commit()

    return {
        "sesi_id": dto.sesi_id,
        "rencana_id": dto.rencana_id,
        "is_valid": is_valid,
        "log_verifikasi": log_verifikasi,
        "hasil_terstruktur": hasil_terstruktur
    }

@router.post("/canvas/simpan")
def simpan_posisi_canvas(dto: SimpanNodeDTO):
    """Menyimpan posisi node dan relasi terkini hasil drag pengguna di React Flow"""
    waktu_skrg = datetime.now().isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Hapus data node lama untuk rencana ini
        cursor.execute("DELETE FROM node_diagram WHERE rencana_id = ?;", (dto.rencana_id,))
        cursor.execute("DELETE FROM relasi_diagram WHERE rencana_id = ?;", (dto.rencana_id,))
        
        # Masukkan nodes
        for node in dto.nodes:
            node_id = node.get("id") or buat_id_terstruktur("nod")
            pos = node.get("position", {})
            cursor.execute(
                """INSERT INTO node_diagram (node_id, rencana_id, tipe_node, label, posisi_x, posisi_y, data_json, dibuat_pada)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?);""",
                (
                    node_id,
                    dto.rencana_id,
                    node.get("type", "default"),
                    node.get("data", {}).get("label", node.get("data", {}).get("nama_tabel", "Node")),
                    pos.get("x", 0.0),
                    pos.get("y", 0.0),
                    json.dumps(node.get("data", {})),
                    waktu_skrg
                )
            )
            
        # Masukkan edges
        for edge in dto.edges:
            relasi_id = edge.get("id") or buat_id_terstruktur("rel")
            cursor.execute(
                """INSERT INTO relasi_diagram (relasi_id, rencana_id, node_asal_id, node_tujuan_id, label_relasi, tipe_garis, dibuat_pada)
                   VALUES (?, ?, ?, ?, ?, ?, ?);""",
                (
                    relasi_id,
                    dto.rencana_id,
                    edge.get("source"),
                    edge.get("target"),
                    edge.get("label", ""),
                    "smoothstep",
                    waktu_skrg
                )
            )
        conn.commit()
        
    return {"status": "sukses", "pesan": "Canvas tersimpan di SQLite lokal"}
