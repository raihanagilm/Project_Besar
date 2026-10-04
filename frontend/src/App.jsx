import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge
} from '@xyflow/react';

import { CanvasView } from './components/CanvasView/CanvasView';
import { ChatPanel } from './components/ChatPanel/ChatPanel';
import { ModalProyekBaru } from './components/ProjectModal/ModalProyekBaru';
import { tokens } from './tokens/design_tokens';

const BACKEND_URL = 'http://localhost:8000/api';

/**
 * App (FE-01: Main Content Render Order)
 * Mengatur proyek rencana aktif, state diagram, undo/redo history, mode chat, dan operasi kanvas manual
 */
export default function App() {
  const [daftarProyek, setDaftarProyek] = useState([]);
  const [proyekAktif, setProyekAktif] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [daftarObrolan, setDaftarObrolan] = useState([]);
  const [logVerifikasi, setLogVerifikasi] = useState([]);
  const [ringkasanIde, setRingkasanIde] = useState('');
  const [sedangMemproses, setSedangMemproses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterMode, setFilterMode] = useState('erd');
  const [modeChat, setModeChat] = useState('fast'); // 'fast' atau 'thinking'
  const [teksPesanTerfokus, setTeksPesanTerfokus] = useState('');

  // History State untuk Undo / Redo
  const [riwayatUndo, setRiwayatUndo] = useState([]);
  const [riwayatRedo, setRiwayatRedo] = useState([]);

  // Membuka proyek yang dipilih
  const pilihProyek = useCallback(async (rencanaId) => {
    try {
      const resp = await fetch(`${BACKEND_URL}/rencana/${rencanaId}`);
      if (resp.ok) {
        const data = await resp.json();
        setProyekAktif(data.rencana);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        setDaftarObrolan(data.obrolan || []);
        setRingkasanIde(data.ringkasan_ide || data.rencana?.deskripsi || '');
        setRiwayatUndo([]);
        setRiwayatRedo([]);
        
        if (data.obrolan && data.obrolan.length > 0) {
          const obrolanTerakhir = data.obrolan[data.obrolan.length - 1];
          setLogVerifikasi(obrolanTerakhir.hasil_verifikasi || []);
        } else {
          setLogVerifikasi([]);
        }
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Gagal memuat detail proyek:', err);
    }
  }, []);

  // Muat daftar proyek saat awal aplikasi dibuka
  const fetchDaftarProyek = useCallback(async () => {
    try {
      const resp = await fetch(`${BACKEND_URL}/rencana`);
      if (resp.ok) {
        const data = await resp.json();
        setDaftarProyek(data);
        if (data.length === 0) {
          setIsModalOpen(true);
        } else if (!proyekAktif) {
          pilihProyek(data[0].rencana_id);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil daftar proyek:', err);
    }
  }, [proyekAktif, pilihProyek]);

  useEffect(() => {
    fetchDaftarProyek();
  }, [fetchDaftarProyek]);

  // Membuat proyek baru
  const handleBuatProyek = async (judul, deskripsi) => {
    try {
      const resp = await fetch(`${BACKEND_URL}/rencana`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ judul, deskripsi }),
      });
      if (resp.ok) {
        const baru = await resp.json();
        await fetchDaftarProyek();
        await pilihProyek(baru.rencana_id);
      }
    } catch (err) {
      console.error('Gagal membuat proyek baru:', err);
    }
  };

  // Menghapus proyek
  const handleHapusProyek = async (rencanaId) => {
    try {
      const resp = await fetch(`${BACKEND_URL}/rencana/${rencanaId}`, {
        method: 'DELETE',
      });
      if (resp.ok) {
        if (proyekAktif?.rencana_id === rencanaId) {
          setProyekAktif(null);
          setNodes([]);
          setEdges([]);
          setDaftarObrolan([]);
          setLogVerifikasi([]);
          setIsModalOpen(true);
        }
        await fetchDaftarProyek();
      }
    } catch (err) {
      console.error('Gagal menghapus proyek:', err);
    }
  };

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Rekam snapshot kanvas untuk Undo
  const catatSnapshot = useCallback(() => {
    if (!nodesRef.current || nodesRef.current.length === 0) return;
    try {
      const snapNodes = JSON.parse(JSON.stringify(nodesRef.current));
      const snapEdges = JSON.parse(JSON.stringify(edgesRef.current));
      setRiwayatUndo((prev) => [...prev.slice(-30), { nodes: snapNodes, edges: snapEdges }]);
      setRiwayatRedo([]);
    } catch (err) {
      console.warn('Gagal mencatat snapshot undo:', err);
    }
  }, []);

  // Handler Perubahan Posisi Node
  const onNodesChange = useCallback(
    (changes) => {
      const isDragStart = changes.some((c) => c.type === 'position' && c.dragging === true);
      const isDragStop = changes.some((c) => c.type === 'position' && c.dragging === false);
      if (isDragStart) {
        catatSnapshot();
      }
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [catatSnapshot]
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection) => {
      catatSnapshot();
      setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#4f46e5', strokeWidth: 2 } }, eds));
    },
    [catatSnapshot]
  );

  // Aksi Undo
  const handleUndo = useCallback(() => {
    setRiwayatUndo((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const snapshotSebelumnya = prevUndo[prevUndo.length - 1];
      const newUndo = prevUndo.slice(0, prevUndo.length - 1);

      try {
        const curNodes = JSON.parse(JSON.stringify(nodesRef.current));
        const curEdges = JSON.parse(JSON.stringify(edgesRef.current));
        setRiwayatRedo((prevRedo) => [...prevRedo.slice(-30), { nodes: curNodes, edges: curEdges }]);
      } catch (e) {
        // ignore
      }

      setNodes(snapshotSebelumnya.nodes);
      setEdges(snapshotSebelumnya.edges);
      return newUndo;
    });
  }, []);

  // Aksi Redo
  const handleRedo = useCallback(() => {
    setRiwayatRedo((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const snapshotBerikutnya = prevRedo[prevRedo.length - 1];
      const newRedo = prevRedo.slice(0, prevRedo.length - 1);

      try {
        const curNodes = JSON.parse(JSON.stringify(nodesRef.current));
        const curEdges = JSON.parse(JSON.stringify(edgesRef.current));
        setRiwayatUndo((prevUndo) => [...prevUndo.slice(-30), { nodes: curNodes, edges: curEdges }]);
      } catch (e) {
        // ignore
      }

      setNodes(snapshotBerikutnya.nodes);
      setEdges(snapshotBerikutnya.edges);
      return newRedo;
    });
  }, []);

  // Keyboard shortcut Undo (Ctrl+Z) dan Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isZ = e.key === 'z' || e.key === 'Z';
      const isY = e.key === 'y' || e.key === 'Y';
      if ((e.ctrlKey || e.metaKey) && isZ) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && isY) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Operasi Tambah Node Manual via Klik Kanan
  const handleTambahNodeManual = (tipe, x, y) => {
    catatSnapshot();
    const timestampId = `nod_${Date.now()}`;
    let dataBaru = {};

    if (tipe === 'erdNode') {
      const idx = (nodes.filter((n) => n.type === 'erdNode').length || 0) + 1;
      const namaTabel = `tabel_${idx}`;
      dataBaru = {
        nama_tabel: namaTabel,
        kolom: [
          { nama: `${namaTabel}_id`, tipe: 'BIGINT', size: null, is_pk: true, is_fk: false, is_unique: true, is_indexed: true, is_nullable: false, keterangan: 'Primary Key' },
          { nama: 'nama', tipe: 'VARCHAR', size: 100, is_pk: false, is_fk: false, is_unique: false, is_indexed: false, is_nullable: false, keterangan: 'Nama' },
          { nama: 'dibuat_pada', tipe: 'TIMESTAMP', size: null, is_pk: false, is_fk: false, is_unique: false, is_indexed: false, is_nullable: false, keterangan: 'Audit waktu pembuatan' }
        ]
      };
    } else if (tipe === 'workflowNode' || tipe === 'useCaseNode') {
      const idx = (nodes.filter((n) => n.type === 'workflowNode').length || 0) + 1;
      dataBaru = {
        tipe_simbol: 'proses',
        no_proses: `${idx}.0`,
        aktor: 'Pengguna',
        langkah: `Langkah Proses ${idx}`,
        deskripsi: 'Deskripsi aktivitas alur kerja'
      };
    }

    const nodeBaru = {
      id: timestampId,
      type: tipe,
      position: { x: x - 450, y: y - 50 }, // penyesuaian offset kanvas
      data: dataBaru
    };

    setNodes((prev) => [...prev, nodeBaru]);
  };

  // Ubah Warna Node Manual
  const handleUbahWarnaNode = (nodeId, hexWarna) => {
    catatSnapshot();
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              warna_kustom: hexWarna
            }
          };
        }
        return n;
      })
    );
  };

  // Edit Konten Node Manual via Custom Modal (Bukan Browser Prompt)
  const handleEditNodeManual = (nodeId, dataBaru) => {
    catatSnapshot();
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              ...dataBaru,
            },
          };
        }
        return n;
      })
    );
  };

  // Hapus Garis Relasi Manual
  const handleHapusRelasi = (edgeId) => {
    catatSnapshot();
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
  };

  // Hapus Node Manual
  const handleHapusNode = (nodeId) => {
    catatSnapshot();
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  };

  // Mengirim Ide Baru ke Backend Jev (Fast vs Thinking)
  const handleKirimIde = async (pesan) => {
    if (!proyekAktif) {
      setIsModalOpen(true);
      return;
    }

    setSedangMemproses(true);
    catatSnapshot();

    try {
      const resp = await fetch(`${BACKEND_URL}/chat/translate-ide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rencana_id: proyekAktif.rencana_id,
          pesan: pesan,
          mode: modeChat,
          posisi_nodes_terkini: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
        }),
      });

      if (!resp.ok) {
        throw new Error(`Server status: ${resp.status}`);
      }

      const data = await resp.json();
      setLogVerifikasi(data.log_verifikasi || []);

      if (data.mode === 'thinking') {
        // Catat pesan mode thinking
        setDaftarObrolan((prev) => [
          ...prev,
          {
            sesi_id: data.sesi_id,
            rencana_id: proyekAktif.rencana_id,
            peran: 'pengguna',
            pesan_mentah: pesan,
            hasil_verifikasi: {
              mode: 'thinking',
              hasil_thinking: data.hasil_thinking
            },
            dibuat_pada: new Date().toISOString(),
          },
        ]);
      } else {
        // Mode Fast: update diagram langsung
        setRingkasanIde(data.hasil_terstruktur?.ringkasan_ide || '');
        setDaftarObrolan((prev) => [
          ...prev,
          {
            sesi_id: data.sesi_id,
            rencana_id: proyekAktif.rencana_id,
            peran: 'pengguna',
            pesan_mentah: pesan,
            hasil_verifikasi: data.log_verifikasi,
            dibuat_pada: new Date().toISOString(),
          },
        ]);

        if (data.hasil_terstruktur?.nodes && data.hasil_terstruktur.nodes.length > 0) {
          setNodes(data.hasil_terstruktur.nodes);
        }
        if (data.hasil_terstruktur?.edges) {
          setEdges(data.hasil_terstruktur.edges);
        }
      }
    } catch (err) {
      console.error('Gagal memproses ide:', err);
      setLogVerifikasi((prev) => [
        ...prev,
        `[Error Lokal] Gagal terhubung ke backend: ${err.message}`,
      ]);
    } finally {
      setSedangMemproses(false);
    }
  };

  // Menerapkan Opsi dari Hasil Diskusi Thinking Mode
  const handleTerapkanOpsi = (instruksiOpsi) => {
    // Jalankan dalam mode fast untuk langsung merefleksikan ke diagram kanvas
    setModeChat('fast');
    handleKirimIde(`Terapkan arsitektur berikut ke diagram: ${instruksiOpsi}`);
  };

  // Mengedit Pesan Sebelumnya
  const handleEditPesan = async (sesiId, pesanBaru) => {
    if (!proyekAktif) return;
    setSedangMemproses(true);
    catatSnapshot();

    try {
      const resp = await fetch(`${BACKEND_URL}/chat/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sesi_id: sesiId,
          rencana_id: proyekAktif.rencana_id,
          pesan_baru: pesanBaru,
          mode: modeChat,
          posisi_nodes_terkini: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
        }),
      });

      if (!resp.ok) {
        throw new Error(`Gagal update chat: ${resp.status}`);
      }

      const data = await resp.json();
      setLogVerifikasi(data.log_verifikasi || []);

      if (data.mode !== 'thinking') {
        setRingkasanIde(data.hasil_terstruktur?.ringkasan_ide || '');
        if (data.hasil_terstruktur?.nodes && data.hasil_terstruktur.nodes.length > 0) {
          setNodes(data.hasil_terstruktur.nodes);
        }
        if (data.hasil_terstruktur?.edges) {
          setEdges(data.hasil_terstruktur.edges);
        }
      }

      setDaftarObrolan((prev) =>
        prev.map((item) =>
          item.sesi_id === sesiId
            ? {
                ...item,
                pesan_mentah: pesanBaru,
                hasil_verifikasi: data.mode === 'thinking' ? { mode: 'thinking', hasil_thinking: data.hasil_thinking } : data.log_verifikasi
              }
            : item
        )
      );
    } catch (err) {
      console.error('Gagal mengedit chat:', err);
    } finally {
      setSedangMemproses(false);
    }
  };

  // Menyimpan Posisi Kanvas ke SQLite
  const handleSimpanCanvas = async () => {
    if (!proyekAktif) return;
    setIsSaving(true);
    try {
      await fetch(`${BACKEND_URL}/canvas/simpan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rencana_id: proyekAktif.rencana_id,
          nodes: nodes,
          edges: edges,
        }),
      });
    } catch (e) {
      console.error('Gagal menyimpan posisi canvas:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler Edit by AI dari Box Context Menu
  const handleEditByAI = (node) => {
    let tag = '';
    if (node.type === 'erdNode') {
      tag = node.data?.nama_tabel || node.id || 'tabel';
    } else {
      tag = node.data?.aktor || node.data?.label || node.data?.langkah || node.id || 'proses';
    }
    // Bersihkan karakter spasi atau spesial jika ada
    const cleanTag = tag.trim().replace(/\s+/g, '_');
    setTeksPesanTerfokus(`/${cleanTag} `);
  };

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: tokens.warna.latar,
      }}
    >
      {/* Modal Pembuatan & Pemilihan Proyek */}
      <ModalProyekBaru
        isOpen={isModalOpen}
        daftarProyek={daftarProyek}
        onPilihProyek={pilihProyek}
        onBuatProyek={handleBuatProyek}
        onHapusProyek={handleHapusProyek}
        onClose={proyekAktif ? () => setIsModalOpen(false) : null}
      />

      {/* Sisi Kiri: Chat Panel & Riwayat Obrolan */}
      <ChatPanel
        daftarObrolan={daftarObrolan}
        onKirimIde={handleKirimIde}
        onEditPesan={handleEditPesan}
        sedangMemproses={sedangMemproses}
        logVerifikasi={logVerifikasi}
        ringkasanIde={ringkasanIde}
        namaProyek={proyekAktif?.judul}
        onBukaGantiProyek={() => setIsModalOpen(true)}
        modeChat={modeChat}
        setModeChat={setModeChat}
        onTerapkanOpsi={handleTerapkanOpsi}
        nodesTerkini={nodes}
        teksPesanTerfokus={teksPesanTerfokus}
        setTeksPesanTerfokus={setTeksPesanTerfokus}
      />

      {/* Sisi Kanan: Canvas Interaktif React Flow */}
      <CanvasView
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSimpanCanvas={handleSimpanCanvas}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        isSaving={isSaving}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={riwayatUndo.length > 0}
        canRedo={riwayatRedo.length > 0}
        onTambahNodeManual={handleTambahNodeManual}
        onUbahWarnaNode={handleUbahWarnaNode}
        onEditNodeManual={handleEditNodeManual}
        onHapusNode={handleHapusNode}
        onHapusRelasi={handleHapusRelasi}
        onEditByAI={handleEditByAI}
      />
    </div>
  );
}
