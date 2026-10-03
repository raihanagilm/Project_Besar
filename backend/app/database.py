import sqlite3
import os
from .config import DATABASE_PATH

def init_db():
    """
    Inisialisasi tabel SQLite lokal dan indeks relasional sesuai db/schema.md
    """
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    with sqlite3.connect(DATABASE_PATH) as conn:
        cursor = conn.cursor()
        
        # Tabel rencana
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS rencana (
            rencana_id TEXT PRIMARY KEY,
            judul TEXT NOT NULL,
            deskripsi TEXT,
            status TEXT NOT NULL DEFAULT 'aktif',
            dibuat_pada TEXT NOT NULL,
            diperbarui_pada TEXT NOT NULL
        );
        """)
        
        # Tabel sesi_obrolan
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sesi_obrolan (
            sesi_id TEXT PRIMARY KEY,
            rencana_id TEXT NOT NULL,
            peran TEXT NOT NULL,
            pesan_mentah TEXT NOT NULL,
            hasil_verifikasi_json TEXT,
            dibuat_pada TEXT NOT NULL,
            FOREIGN KEY (rencana_id) REFERENCES rencana (rencana_id) ON DELETE CASCADE
        );
        """)
        
        # Tabel node_diagram
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS node_diagram (
            node_id TEXT PRIMARY KEY,
            rencana_id TEXT NOT NULL,
            tipe_node TEXT NOT NULL,
            label TEXT NOT NULL,
            posisi_x REAL NOT NULL DEFAULT 0.0,
            posisi_y REAL NOT NULL DEFAULT 0.0,
            data_json TEXT NOT NULL DEFAULT '{}',
            dibuat_pada TEXT NOT NULL,
            FOREIGN KEY (rencana_id) REFERENCES rencana (rencana_id) ON DELETE CASCADE
        );
        """)
        
        # Tabel relasi_diagram
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS relasi_diagram (
            relasi_id TEXT PRIMARY KEY,
            rencana_id TEXT NOT NULL,
            node_asal_id TEXT NOT NULL,
            node_tujuan_id TEXT NOT NULL,
            label_relasi TEXT,
            tipe_garis TEXT NOT NULL DEFAULT 'smoothstep',
            dibuat_pada TEXT NOT NULL,
            FOREIGN KEY (rencana_id) REFERENCES rencana (rencana_id) ON DELETE CASCADE,
            FOREIGN KEY (node_asal_id) REFERENCES node_diagram (node_id) ON DELETE CASCADE,
            FOREIGN KEY (node_tujuan_id) REFERENCES node_diagram (node_id) ON DELETE CASCADE
        );
        """)
        
        # Indeks sesuai aturan DB-06
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sesi_rencana ON sesi_obrolan (rencana_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_node_rencana ON node_diagram (rencana_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_relasi_rencana ON relasi_diagram (rencana_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_relasi_asal ON relasi_diagram (node_asal_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_relasi_tujuan ON relasi_diagram (node_tujuan_id);")
        
        conn.commit()

def get_db_connection():
    """Mengembalikan koneksi SQLite dengan row_factory dictionary untuk sanitasi data aman (BE-02)"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn
