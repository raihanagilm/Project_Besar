import React, { useState, useEffect, useCallback } from 'react';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge
} from '@xyflow/react';

import { CanvasView } from './components/CanvasView/CanvasView';
import { ChatPanel } from './components/ChatPanel/ChatPanel';
import { tokens } from './tokens/design_tokens';

const BACKEND_URL = 'http://localhost:8000/api';

/**
 * App (FE-01: Main Content Render Order)
 * Mengatur prioritas render konten utama kanvas & chat
 */
export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [rencanaId, setRencanaId] = useState(null);
  const [logVerifikasi, setLogVerifikasi] = useState([]);
  const [ringkasanIde, setRingkasanIde] = useState('');
  const [sedangMemproses, setSedangMemproses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterMode, setFilterMode] = useState('semua');

  // Callback perubahan posisi node saat digeser di React Flow
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    []
  );

  // Mengirim ide pemikiran ke Backend Jev
  const handleKirimIde = async (pesan) => {
    setSedangMemproses(true);
    try {
      const resp = await fetch(`${BACKEND_URL}/chat/translate-ide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rencana_id: rencanaId,
          pesan: pesan,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Server status: ${resp.status}`);
      }

      const data = await resp.json();
      setRencanaId(data.rencana_id);
      setLogVerifikasi(data.log_verifikasi || []);
      setRingkasanIde(data.hasil_terstruktur?.ringkasan_ide || '');

      if (data.hasil_terstruktur?.nodes) {
        setNodes(data.hasil_terstruktur.nodes);
      }
      if (data.hasil_terstruktur?.edges) {
        setEdges(data.hasil_terstruktur.edges);
      }
    } catch (err) {
      console.error('Gagal mengirim ide ke Jev Verifier:', err);
      setLogVerifikasi((prev) => [
        ...prev,
        `[Error Lokal] Gagal terhubung ke backend: ${err.message}`,
      ]);
    } finally {
      setSedangMemproses(false);
    }
  };

  // Menyimpan posisi kanvas yang sudah disesuaikan pengguna
  const handleSimpanCanvas = async () => {
    if (!rencanaId) return;
    setIsSaving(true);
    try {
      await fetch(`${BACKEND_URL}/canvas/simpan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rencana_id: rencanaId,
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
      {/* Sisi Kiri: Chat Panel & Jev Audit Log */}
      <ChatPanel
        onKirimIde={handleKirimIde}
        sedangMemproses={sedangMemproses}
        logVerifikasi={logVerifikasi}
        ringkasanIde={ringkasanIde}
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
      />
    </div>
  );
}
