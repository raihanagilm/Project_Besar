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
 * Mengatur proyek rencana aktif, state diagram, undo/redo history, dan integrasi backend
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
  const [filterMode, setFilterMode] = useState('semua');

  // History State untuk Undo / Redo
  const [riwayatUndo, setRiwayatUndo] = useState([]);
  const [riwayatRedo, setRiwayatRedo] = useState([]);

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
          // Buka proyek pertama secara default
          pilihProyek(data[0].rencana_id);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil daftar proyek:', err);
    }
  }, [proyekAktif]);

  useEffect(() => {
    fetchDaftarProyek();
  }, [fetchDaftarProyek]);

  // Membuka proyek yang dipilih
  const pilihProyek = async (rencanaId) => {
    try {
      const resp = await fetch(`${BACKEND_URL}/rencana/${rencanaId}`);
      if (resp.ok) {
        const data = await resp.json();
        setProyekAktif(data.rencana);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        setDaftarObrolan(data.obrolan || []);
        setRiwayatUndo([]);
        setRiwayatRedo([]);
        
        // Ambil log verifikasi terakhir jika ada
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
  };

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

  // Rekam snapshot kanvas untuk Undo
  const catatSnapshot = useCallback(() => {
    setRiwayatUndo((prev) => [...prev, { nodes, edges }]);
    setRiwayatRedo([]); // Reset redo jika ada perubahan baru
  }, [nodes, edges]);

  // Handler Perubahan Posisi Node
  const onNodesChange = useCallback(
    (changes) => {
      // Catat snapshot saat user selesai drag node
      const isDragStop = changes.some((c) => c.type === 'position' && c.dragging === false);
      if (isDragStop) {
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
      setEdges((eds) => addEdge(connection, eds));
    },
    [catatSnapshot]
  );

  // Aksi Undo
  const handleUndo = useCallback(() => {
    if (riwayatUndo.length === 0) return;
    const snapshotSebelumnya = riwayatUndo[riwayatUndo.length - 1];
    setRiwayatRedo((prev) => [...prev, { nodes, edges }]);
    setNodes(snapshotSebelumnya.nodes);
    setEdges(snapshotSebelumnya.edges);
    setRiwayatUndo((prev) => prev.slice(0, prev.length - 1));
  }, [riwayatUndo, nodes, edges]);

  // Aksi Redo
  const handleRedo = useCallback(() => {
    if (riwayatRedo.length === 0) return;
    const snapshotBerikutnya = riwayatRedo[riwayatRedo.length - 1];
    setRiwayatUndo((prev) => [...prev, { nodes, edges }]);
    setNodes(snapshotBerikutnya.nodes);
    setEdges(snapshotBerikutnya.edges);
    setRiwayatRedo((prev) => prev.slice(0, prev.length - 1));
  }, [riwayatRedo, nodes, edges]);

  // Keyboard shortcut Undo (Ctrl+Z) dan Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Mengirim Ide Baru ke Backend Jev
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
        }),
      });

      if (!resp.ok) {
        throw new Error(`Server status: ${resp.status}`);
      }

      const data = await resp.json();
      setLogVerifikasi(data.log_verifikasi || []);
      setRingkasanIde(data.hasil_terstruktur?.ringkasan_ide || '');

      // Tambahkan ke daftar obrolan lokal
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

      // Update node & edge hasil verifikasi Jev
      if (data.hasil_terstruktur?.nodes && data.hasil_terstruktur.nodes.length > 0) {
        setNodes(data.hasil_terstruktur.nodes);
      }
      if (data.hasil_terstruktur?.edges) {
        setEdges(data.hasil_terstruktur.edges);
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

  // Mengedit Pesan Sebelumnya dan Menjalankan Re-Verifikasi
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
        }),
      });

      if (!resp.ok) {
        throw new Error(`Gagal update chat: ${resp.status}`);
      }

      const data = await resp.json();
      setLogVerifikasi(data.log_verifikasi || []);
      setRingkasanIde(data.hasil_terstruktur?.ringkasan_ide || '');

      // Perbarui state daftar obrolan
      setDaftarObrolan((prev) =>
        prev.map((item) =>
          item.sesi_id === sesiId
            ? { ...item, pesan_mentah: pesanBaru, hasil_verifikasi: data.log_verifikasi }
            : item
        )
      );

      if (data.hasil_terstruktur?.nodes && data.hasil_terstruktur.nodes.length > 0) {
        setNodes(data.hasil_terstruktur.nodes);
      }
      if (data.hasil_terstruktur?.edges) {
        setEdges(data.hasil_terstruktur.edges);
      }
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
      />

      {/* Sisi Kanan: Canvas Interaktif React Flow dengan Undo / Redo */}
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
      />
    </div>
  );
}
