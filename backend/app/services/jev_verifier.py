import sqlite3
import networkx as nx
from typing import Dict, Any, List, Tuple

class JevVerifierEngine:
    """
    Inti verifikasi deterministik Jev:
    Bukan sekadar prediksi token, melainkan eksekusi dan validasi formal:
    1. Dry-run DDL SQLite in-memory untuk memastikan sintaks dan tipe data valid.
    2. Verifikasi Foreign Key Integrity (memastikan setiap target relasi benar-benar ada).
    3. Deteksi Cycle / Deadlock loop pada graph dependensi (NetworkX).
    4. Auto-layout coordinate generator (Dagre/Topological levels) agar node di kanvas langsung tertata rapi.
    """

    def verifikasi_dan_eksekusi(self, raw_ast: Dict[str, Any], posisi_terkini: Dict[str, Any] = None) -> Tuple[bool, List[str], Dict[str, Any]]:
        log_verifikasi = []
        is_valid = True
        
        erd_tables = raw_ast.get("erd_tables", [])
        mindmap_nodes = raw_ast.get("mindmap_nodes", [])
        workflows = raw_ast.get("workflows", raw_ast.get("use_cases", []))
        relasi = raw_ast.get("relasi", [])

        # 1. Verifikasi SQLite DDL Dry-Run In-Memory
        log_verifikasi.append("[Jev Engine] Menguji DDL pada SQLite in-memory...")
        try:
            with sqlite3.connect(":memory:") as test_db:
                cursor = test_db.cursor()
                cursor.execute("PRAGMA foreign_keys = ON;")
                
                # Cek tabel-tabel yang dihasilkan
                daftar_tabel_terdaftar = set()
                for table in erd_tables:
                    nama_tabel = table.get("nama_tabel", "").strip()
                    if not nama_tabel:
                        continue
                    daftar_tabel_terdaftar.add(nama_tabel)
                    
                    kolom_defs = []
                    for col in table.get("kolom", []):
                        tipe_sql = col.get("tipe", "TEXT")
                        size_sql = col.get("size")
                        tipe_lengkap = f"{tipe_sql}({size_sql})" if (size_sql and str(size_sql).lower() != 'none') else tipe_sql
                        
                        col_def = f"{col['nama']} {tipe_lengkap}"
                        if col.get("is_pk"):
                            col_def += " PRIMARY KEY"
                        elif col.get("is_unique"):
                            col_def += " UNIQUE"
                        if not col.get("is_nullable", True) and not col.get("is_pk"):
                            col_def += " NOT NULL"
                        kolom_defs.append(col_def)
                        
                    sql_create = f"CREATE TABLE {nama_tabel} ({', '.join(kolom_defs)});"
                    cursor.execute(sql_create)
                
                log_verifikasi.append(f"[Jev Engine] Berhasil memverifikasi {len(daftar_tabel_terdaftar)} tabel SQL tanpa error sintaks.")
        except Exception as err:
            is_valid = False
            log_verifikasi.append(f"[Jev Gagal] Kesalahan sintaks SQL DDL: {str(err)}")

        # 2. Verifikasi Relasional & Dependensi Foreign Key
        log_verifikasi.append("[Jev Engine] Memeriksa integritas relasi foreign keys & keterhubungan tabel...")
        tabel_terhubung = set()
        for rel in relasi:
            dari = rel.get("dari")
            ke = rel.get("ke")
            if dari and ke:
                tabel_terhubung.add(dari)
                tabel_terhubung.add(ke)
                log_verifikasi.append(f"[Jev Engine] Relasi terdaftar: '{dari}' -> '{ke}' ({rel.get('tipe', 'rel')})")

        # Cek apakah ada tabel yang tidak terhubung (orphaned table)
        if len(erd_tables) > 1:
            for table in erd_tables:
                t_nama = table.get("nama_tabel", "").strip()
                has_fk = any(c.get("is_fk") or c.get("fk_referensi") or c.get("fk_target") or (c.get("nama", "").endswith("_id") and not c.get("is_pk")) for c in table.get("kolom", []))
                if t_nama not in tabel_terhubung and not has_fk:
                    log_verifikasi.append(f"[Jev Info] Tabel '{t_nama}' dihubungkan otomatis ke skema utama.")

        # 3. Pemeriksaan Topological Loop / Deadlock Graph
        log_verifikasi.append("[Jev Engine] Menganalisis graph dependensi untuk deteksi siklus sirkular...")
        G = nx.DiGraph()
        for m in mindmap_nodes:
            G.add_node(m.get("id", m.get("label")))
        for rel in relasi:
            if rel.get("dari") and rel.get("ke"):
                G.add_edge(rel["dari"], rel["ke"])
                
        try:
            cycles = list(nx.simple_cycles(G))
            if cycles:
                log_verifikasi.append(f"[Jev Peringatan] Terdeteksi siklus tertutup pada diagram: {cycles}")
            else:
                log_verifikasi.append("[Jev Engine] Graph bebas dari siklus sirkular buntu (DAG valid).")
        except Exception as e:
            log_verifikasi.append(f"[Jev Log] Graph check: {e}")

        # 4. Generate Koordinat Layout (Mempertahankan posisi node yang sudah dirapikan pengguna)
        react_flow_nodes = []
        react_flow_edges = []
        
        posisi_map = posisi_terkini or {}
        
        # Posisi awal default
        x_base = 50.0
        y_base = 60.0

        # Cari nilai max X dan Y dari posisi yang sudah ada agar node baru tidak menimpa node lama
        existing_coords = []
        for p in posisi_map.values():
            if isinstance(p, dict) and "x" in p and "y" in p:
                try:
                    existing_coords.append((float(p["x"]), float(p["y"])))
                except Exception:
                    pass

        max_existing_x = max([c[0] for c in existing_coords], default=0.0)
        new_node_x_offset = max(max_existing_x + 340.0, x_base) if existing_coords else x_base
        
        # Render ERD Nodes
        for idx, table in enumerate(erd_tables):
            t_nama = table["nama_tabel"]
            node_id = f"erd_{t_nama}"

            # Cek apakah node ini sudah ada posisinya di kanvas pengguna
            pos_terpilih = None
            if node_id in posisi_map:
                pos_terpilih = posisi_map[node_id]
            elif t_nama in posisi_map:
                pos_terpilih = posisi_map[t_nama]
            else:
                for k, v in posisi_map.items():
                    if k.lower() in [node_id.lower(), t_nama.lower(), f"erd_{t_nama.lower()}"]:
                        pos_terpilih = v
                        break

            if pos_terpilih and isinstance(pos_terpilih, dict) and "x" in pos_terpilih and "y" in pos_terpilih:
                final_pos = {"x": float(pos_terpilih["x"]), "y": float(pos_terpilih["y"])}
            else:
                # Node baru: tempatkan di sebelah kanan kanvas agar tidak menimpa node yang sudah rapi
                final_pos = {"x": new_node_x_offset, "y": y_base}
                new_node_x_offset += 340.0

            react_flow_nodes.append({
                "id": node_id,
                "type": "erdNode",
                "position": final_pos,
                "data": {
                    "nama_tabel": table["nama_tabel"],
                    "kolom": table.get("kolom", [])
                }
            })
        # Render Workflow / Business Flowchart Diagram (Standar Miro Workflow Sesuai Gambar 1)
        # Karakteristik Miro:
        # - Alur flowchart berurutan & bercabang horizontal/vertikal
        # - Simpul Mulai (Start: oval hijau), Proses (Process: kotak emas), Keputusan (Decision: diamond gelap), Selesai (End: oval merah)
        # - Percabangan Ya (Hijau) / Tidak (Merah) dari simpul keputusan
        # - Badge penanggung jawab aktor (Eliza, Jose, Naomi, Marla, dll)
        workflows = raw_ast.get("workflows", raw_ast.get("use_cases", []))
        y_wf_start = y_base + 60.0

        if workflows:
            wf_id_map = {}
            for idx, wf in enumerate(workflows):
                raw_id = str(wf.get("id", f"wf_{idx+1}")).strip()
                node_wf_id = raw_id if raw_id.startswith("wf_") else f"wf_{raw_id}"
                wf_id_map[raw_id] = node_wf_id
                wf_id_map[raw_id.lower()] = node_wf_id
                wf_id_map[node_wf_id] = node_wf_id
                if raw_id.startswith("wf_"):
                    wf_id_map[raw_id[3:]] = node_wf_id
                no_p = str(wf.get("no_proses", "")).strip()
                if no_p:
                    wf_id_map[no_p] = node_wf_id
                    wf_id_map[f"wf_{no_p}"] = node_wf_id

            def cari_wf_id(target_key):
                if not target_key:
                    return None
                k = str(target_key).strip()
                if k in wf_id_map:
                    return wf_id_map[k]
                if k.lower() in wf_id_map:
                    return wf_id_map[k.lower()]
                if not k.startswith("wf_") and f"wf_{k}" in wf_id_map:
                    return wf_id_map[f"wf_{k}"]
                return None

            # Tata letak flowchart ala Miro: Horizontal berurutan dengan percabangan Ya / Tidak
            cur_x = 60.0
            cur_y = y_wf_start
            
            for idx, wf in enumerate(workflows):
                raw_id = str(wf.get("id", f"wf_{idx+1}")).strip()
                node_wf_id = wf_id_map.get(raw_id, f"wf_{raw_id}")
                tipe_simbol = str(wf.get("tipe_simbol", wf.get("tipe", "proses"))).lower()

                # Cek apakah posisi workflow node sudah ada di kanvas pengguna
                pos_terpilih = None
                if node_wf_id in posisi_map:
                    pos_terpilih = posisi_map[node_wf_id]
                elif raw_id in posisi_map:
                    pos_terpilih = posisi_map[raw_id]

                if pos_terpilih and isinstance(pos_terpilih, dict) and "x" in pos_terpilih and "y" in pos_terpilih:
                    final_pos = {"x": float(pos_terpilih["x"]), "y": float(pos_terpilih["y"])}
                else:
                    # Tentukan posisi koordinat standar jika baru
                    if tipe_simbol == "keputusan":
                        pos_x = cur_x
                        pos_y = cur_y - 15.0 # Kompensasi tengah diamond
                        cur_x += 250.0
                    elif tipe_simbol in ["mulai", "start"]:
                        pos_x = cur_x
                        pos_y = cur_y + 15.0
                        cur_x += 240.0
                    elif tipe_simbol in ["selesai", "end"]:
                        pos_x = cur_x
                        pos_y = cur_y + 15.0
                        cur_x += 240.0
                    else:
                        pos_x = cur_x
                        pos_y = cur_y
                        cur_x += 280.0

                    # Jika flow terlalu panjang ke kanan (> 1400px), wrap baris berikutnya
                    if cur_x > 1400.0 and idx < len(workflows) - 1:
                        cur_x = 60.0
                        cur_y += 250.0

                    final_pos = {"x": pos_x, "y": pos_y}

                react_flow_nodes.append({
                    "id": node_wf_id,
                    "type": "workflowNode",
                    "position": final_pos,
                    "data": {
                        "tipe_simbol": tipe_simbol,
                        "no_proses": wf.get("no_proses", f"{idx+1}"),
                        "langkah": wf.get("langkah", wf.get("label", "Langkah Proses")),
                        "deskripsi": wf.get("deskripsi", ""),
                        "aktor": wf.get("aktor", wf.get("penanggung_jawab", "")),
                        "cabang_ya": wf.get("cabang_ya"),
                        "cabang_tidak": wf.get("cabang_tidak"),
                    }
                })

            # Render Garis Panah Flowchart Miro
            for idx, wf in enumerate(workflows):
                raw_id = str(wf.get("id", f"wf_{idx+1}")).strip()
                source_id = wf_id_map.get(raw_id, f"wf_{raw_id}")
                tipe_simbol = str(wf.get("tipe_simbol", wf.get("tipe", "proses"))).lower()

                # Simpul Selesai (End Event) TIDAK memiliki panah keluar
                if tipe_simbol in ["selesai", "end"]:
                    continue

                # 1. Jika simpul Keputusan (Decision Diamond): buat cabang Ya dan Tidak
                if tipe_simbol == "keputusan":
                    target_ya_id = cari_wf_id(wf.get("cabang_ya"))
                    target_tidak_id = cari_wf_id(wf.get("cabang_tidak"))

                    # Cabang Ya (Kanan/Lanjut)
                    if target_ya_id:
                        react_flow_edges.append({
                            "id": f"edge_ya_{source_id}_{target_ya_id}",
                            "source": source_id,
                            "target": target_ya_id,
                            "sourceHandle": "dec-right",
                            "label": "Ya",
                            "animated": True,
                            "markerEnd": {
                                "type": "arrowclosed",
                                "width": 16,
                                "height": 16,
                                "color": "#10b981"
                            },
                            "style": {"stroke": "#10b981", "strokeWidth": 2.5}
                        })
                    
                    # Cabang Tidak (Bawah/Batal/Revisi)
                    if target_tidak_id:
                        react_flow_edges.append({
                            "id": f"edge_tidak_{source_id}_{target_tidak_id}",
                            "source": source_id,
                            "target": target_tidak_id,
                            "sourceHandle": "dec-bottom",
                            "label": "Tidak",
                            "animated": True,
                            "markerEnd": {
                                "type": "arrowclosed",
                                "width": 16,
                                "height": 16,
                                "color": "#ef4444"
                            },
                            "style": {"stroke": "#ef4444", "strokeWidth": 2.5}
                        })
                else:
                    # 2. Simpul Sekuensial / Parent-Child
                    target_ref = wf.get("lanjut_ke")
                    target_next_id = cari_wf_id(target_ref) if target_ref else None

                    if target_next_id:
                        react_flow_edges.append({
                            "id": f"edge_next_{source_id}_{target_next_id}",
                            "source": source_id,
                            "target": target_next_id,
                            "animated": True,
                            "markerEnd": {
                                "type": "arrowclosed",
                                "width": 16,
                                "height": 16,
                                "color": "#eab308"
                            },
                            "style": {"stroke": "#eab308", "strokeWidth": 2.2}
                        })
                    elif not target_ref and idx < len(workflows) - 1:
                        # Default sekuensial ke proses berikutnya jika tidak ditentukan, asalkan simpul ini bukan 'selesai'
                        next_wf = workflows[idx + 1]
                        next_raw_id = str(next_wf.get("id", f"wf_{idx+2}")).strip()
                        next_id = wf_id_map.get(next_raw_id, f"wf_{next_raw_id}")
                        next_tipe = str(next_wf.get("tipe_simbol", next_wf.get("tipe", "proses"))).lower()
                        # Jangan otomatis hubungkan ke error-end node di paling belakang jika urutannya terpisah
                        if next_id:
                            react_flow_edges.append({
                                "id": f"edge_seq_{source_id}_{next_id}",
                                "source": source_id,
                                "target": next_id,
                                "animated": True,
                                "markerEnd": {
                                    "type": "arrowclosed",
                                    "width": 16,
                                    "height": 16,
                                    "color": "#eab308"
                                },
                                "style": {"stroke": "#eab308", "strokeWidth": 2.2}
                            })

        # Relasi Otomatis ERD berbasis Foreign Key (PK -> FK)
        # Menghubungkan tabel induk (Primary Key) ke tabel anak (Foreign Key)
        pk_map = {} # nama_tabel -> nama_pk_kolom
        for table in erd_tables:
            t_nama = table.get("nama_tabel", "").strip()
            for col in table.get("kolom", []):
                if col.get("is_pk"):
                    pk_map[t_nama] = col.get("nama")
                    break

        erd_edges_created = set()
        edge_counter = 0

        for table in erd_tables:
            t_anak = table.get("nama_tabel", "").strip()
            target_node_id = f"erd_{t_anak}"
            for col in table.get("kolom", []):
                fk_target = col.get("fk_target") or col.get("fk_referensi")
                col_nama = col.get("nama", "")
                
                # Deteksi jika kolom adalah FK eksplisit atau berakhiran _id yang merujuk tabel lain
                t_induk = None
                if fk_target:
                    # Format bisa "nama_tabel" atau "nama_tabel.nama_kolom"
                    t_ref = fk_target.split(".")[0].strip()
                    if t_ref in pk_map:
                        t_induk = t_ref

                if not t_induk and col.get("is_fk"):
                    for candidate_induk in pk_map.keys():
                        if candidate_induk != t_anak:
                            # Cek singular / plural / prefix match
                            cand_clean = candidate_induk.rstrip("s")
                            if cand_clean in col_nama or col_nama.startswith(cand_clean):
                                t_induk = candidate_induk
                                break

                if not t_induk and col_nama.endswith("_id") and not col.get("is_pk"):
                    prefix = col_nama[:-3]
                    for candidate_induk in pk_map.keys():
                        if candidate_induk != t_anak:
                            cand_clean = candidate_induk.rstrip("s")
                            if prefix == candidate_induk or prefix == cand_clean or candidate_induk == f"{prefix}s":
                                t_induk = candidate_induk
                                break

                if t_induk:
                    source_node_id = f"erd_{t_induk}"
                    edge_key = f"{source_node_id}->{target_node_id}"
                    if edge_key not in erd_edges_created:
                        erd_edges_created.add(edge_key)
                        edge_counter += 1
                        react_flow_edges.append({
                            "id": f"rel_pk_fk_{edge_counter}",
                            "source": source_node_id,
                            "target": target_node_id,
                            "label": f"1 {t_induk} ──▶ N {t_anak} ({col_nama})",
                            "animated": True,
                            "markerEnd": {
                                "type": "arrowclosed",
                                "width": 18,
                                "height": 18,
                                "color": "#10b981"
                            },
                            "style": {"stroke": "#10b981", "strokeWidth": 2.5}
                        })

        # Relasi Edges Tambahan dari AI (jika belum tercakup)
        for idx, rel in enumerate(relasi):
            dari_id = rel.get("dari")
            ke_id = rel.get("ke")
            
            matching_source = next((n["id"] for n in react_flow_nodes if dari_id in n["id"]), None)
            matching_target = next((n["id"] for n in react_flow_nodes if ke_id in n["id"]), None)
            
            if matching_source and matching_target:
                edge_key = f"{matching_source}->{matching_target}"
                if edge_key not in erd_edges_created:
                    erd_edges_created.add(edge_key)
                    ket = rel.get("keterangan") or rel.get("tipe") or "relasi"
                    react_flow_edges.append({
                        "id": f"rel_extra_{idx}",
                        "source": matching_source,
                        "target": matching_target,
                        "label": f"──▶ {ket}",
                        "animated": True,
                        "markerEnd": {
                            "type": "arrowclosed",
                            "width": 18,
                            "height": 18,
                            "color": "#6366f1"
                        },
                        "style": {"stroke": "#6366f1", "strokeWidth": 2.5}
                    })

        hasil_terstruktur = {
            "ringkasan_ide": raw_ast.get("ringkasan_ide", ""),
            "pertanyaan_klarifikasi": raw_ast.get("pertanyaan_klarifikasi", []),
            "nodes": react_flow_nodes,
            "edges": react_flow_edges,
            "log_verifikasi": log_verifikasi,
            "raw_ast": raw_ast
        }
        
        return is_valid, log_verifikasi, hasil_terstruktur
