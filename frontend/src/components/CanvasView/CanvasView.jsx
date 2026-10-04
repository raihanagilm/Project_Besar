import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Undo, Redo, Save, Plus, Database, UserCheck, Palette, Trash2, Edit3, Sparkles } from 'lucide-react';

import { NodeTabelERD } from '../CustomNodes/NodeTabelERD';
import { NodeWorkflow } from '../CustomNodes/NodeWorkflow';
import { tokens } from '../../tokens/design_tokens';

// Palet warna terkurasi (Antislop UX-08: Tidak ada warna silau)
export const PALET_WARNA = [
  { nama: 'Slate Default', hex: '#4f46e5' },
  { nama: 'Emerald', hex: '#059669' },
  { nama: 'Amber', hex: '#d97706' },
  { nama: 'Rose', hex: '#e11d48' },
  { nama: 'Purple', hex: '#7c3aed' },
  { nama: 'Sky Blue', hex: '#0284c7' },
];

/**
 * CanvasView (UX-01: Technical Component Name)
 * Wadah kanvas diagram interaktif React Flow khusus untuk ERD dan Workflow (DFD)
 */
export const CanvasView = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSimpanCanvas,
  filterMode,
  setFilterMode,
  isSaving,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onTambahNodeManual,
  onUbahWarnaNode,
  onEditNodeManual,
  onEditByAI,
  onHapusNode,
  onHapusRelasi
}) => {
  const [nodeSedangDiedit, setNodeSedangDiedit] = useState(null); // Custom modal edit dialog
  const [formEditData, setFormEditData] = useState({});
  const [contextMenu, setContextMenu] = useState(null); // { x, y, node, edge }

  const nodeTypes = useMemo(() => ({
    erdNode: NodeTabelERD,
    workflowNode: NodeWorkflow,
    useCaseNode: NodeWorkflow,
  }), []);

  const filteredNodes = useMemo(() => {
    if (filterMode === 'erd') return nodes.filter(n => n.type === 'erdNode');
    if (filterMode === 'workflow' || filterMode === 'usecase') return nodes.filter(n => n.type === 'workflowNode' || n.type === 'useCaseNode');
    return nodes.filter(n => n.type === 'erdNode');
  }, [nodes, filterMode]);

  // Saring garis relasi hanya untuk simpul-simpul yang sedang aktif di tampilan (tidak campur aduk)
  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    return edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [filteredNodes, edges]);

  // Handle Klik Kanan di Kanvas Kosong
  const handlePaneContextMenu = (event) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node: null,
      edge: null
    });
  };

  // Handle Klik Kanan di Atas Kotak Node
  const handleNodeContextMenu = (event, node) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node: node,
      edge: null
    });
  };

  // Handle Klik Kanan di Atas Garis Relasi / Edge
  const handleEdgeContextMenu = (event, edge) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node: null,
      edge: edge
    });
  };

  // Tutup Context Menu saat klik sembarang
  const handleCloseMenu = () => {
    if (contextMenu) setContextMenu(null);
  };

  return (
    <div
      onClick={handleCloseMenu}
      style={{ flex: 1, height: '100%', position: 'relative', backgroundColor: tokens.warna.latar }}
    >
      {/* Bar Navigasi Filter & Aksi Undo/Redo/Simpan */}
      <div
        style={{
          position: 'absolute',
          top: tokens.spasi.md,
          left: tokens.spasi.md,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spasi.sm,
          backgroundColor: tokens.warna.kartu,
          padding: `${tokens.spasi.xs} ${tokens.spasi.sm}`,
          borderRadius: tokens.radius.md,
          border: `1px solid ${tokens.warna.garis_batas}`,
        }}
      >
        {[
          { key: 'erd', label: 'ERD / DB' },
          { key: 'workflow', label: 'WORKFLOW (BPMN)' }
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilterMode(item.key)}
            style={{
              backgroundColor: filterMode === item.key ? tokens.warna.aksen.utama : 'transparent',
              color: filterMode === item.key ? tokens.warna.teks.utama : tokens.warna.teks.sekunder,
              border: 'none',
              padding: `${tokens.spasi.xs} ${tokens.spasi.sm}`,
              borderRadius: tokens.radius.sm,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              transition: tokens.transisi,
            }}
          >
            {item.label}
          </button>
        ))}

        <div style={{ width: '1px', height: '18px', backgroundColor: tokens.warna.garis_batas, margin: `0 ${tokens.spasi.xs}` }} />

        {/* Undo & Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          style={{
            backgroundColor: 'transparent',
            color: canUndo ? tokens.warna.teks.utama : tokens.warna.teks.redup,
            border: 'none',
            padding: tokens.spasi.xs,
            borderRadius: tokens.radius.sm,
            cursor: canUndo ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Undo size={15} />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          style={{
            backgroundColor: 'transparent',
            color: canRedo ? tokens.warna.teks.utama : tokens.warna.teks.redup,
            border: 'none',
            padding: tokens.spasi.xs,
            borderRadius: tokens.radius.sm,
            cursor: canRedo ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Redo size={15} />
        </button>

        <div style={{ width: '1px', height: '18px', backgroundColor: tokens.warna.garis_batas, margin: `0 ${tokens.spasi.xs}` }} />

        {/* Tombol Simpan */}
        <button
          onClick={onSimpanCanvas}
          disabled={isSaving}
          style={{
            backgroundColor: tokens.warna.aksen.utama,
            color: tokens.warna.teks.utama,
            border: 'none',
            padding: `${tokens.spasi.xs} ${tokens.spasi.md}`,
            borderRadius: tokens.radius.sm,
            fontSize: '12px',
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Save size={13} />
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Posisi'}</span>
        </button>
      </div>

      {/* Kanvas React Flow untuk ERD dan Workflow / DFD */}
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
        <Controls
          style={{
            backgroundColor: tokens.warna.kartu,
            borderColor: tokens.warna.garis_batas,
            borderRadius: tokens.radius.md,
          }}
        />
        <MiniMap
          nodeColor={(n) => {
            if (n.data?.warna_kustom) return n.data.warna_kustom;
            if (n.type === 'erdNode') return tokens.warna.aksen.utama;
            if (n.type === 'workflowNode') return tokens.warna.status.info;
            return '#fff';
          }}
          style={{
            backgroundColor: tokens.warna.kartu,
            borderColor: tokens.warna.garis_batas,
            borderRadius: tokens.radius.md,
          }}
        />
      </ReactFlow>

      {/* Popover Menu Klik Kanan (Context Menu) */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: tokens.warna.kartu,
            border: `1px solid ${tokens.warna.garis_batas}`,
            borderRadius: tokens.radius.md,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            minWidth: '200px',
            padding: tokens.spasi.xs,
          }}
        >
          {contextMenu.node ? (
            /* Menu Saat Klik Kanan di Node (Edit by AI, Edit Konten, Warna, Hapus) */
            <div>
              <button
                onClick={() => {
                  if (onEditByAI) onEditByAI(contextMenu.node);
                  setContextMenu(null);
                }}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: `${tokens.spasi.xs} ${tokens.spasi.sm}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spasi.sm,
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderRadius: tokens.radius.sm,
                  backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  marginBottom: '4px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.18)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.08)')}
              >
                <Sparkles size={14} color="#38bdf8" />
                <span>Edit by AI (/{contextMenu.node.type === 'erdNode' ? contextMenu.node.data?.nama_tabel : (contextMenu.node.data?.aktor || contextMenu.node.data?.label || 'bagianini')})</span>
              </button>

              <button
                onClick={() => {
                  const node = contextMenu.node;
                  setNodeSedangDiedit(node);
                  if (node.type === 'erdNode') {
                    setFormEditData({
                      nama_tabel: node.data?.nama_tabel || '',
                      daftarKolom: (node.data?.kolom || []).map(c => ({
                        nama: c.nama || 'field',
                        tipe: c.tipe || 'VARCHAR',
                        size: c.size ?? (c.tipe === 'VARCHAR' ? 255 : ''),
                        is_pk: Boolean(c.is_pk),
                        is_fk: Boolean(c.is_fk),
                        is_unique: Boolean(c.is_unique),
                        is_indexed: Boolean(c.is_indexed),
                        is_nullable: c.is_nullable !== false,
                        fk_referensi: c.fk_referensi || c.fk_target || '',
                        keterangan: c.keterangan || '',
                      }))
                    });
                  } else {
                    setFormEditData({
                      tipe_simbol: node.data?.tipe_simbol || 'proses',
                      no_proses: node.data?.no_proses || '',
                      aktor: node.data?.aktor || node.data?.penanggung_jawab || '',
                      langkah: node.data?.langkah || node.data?.label || '',
                      deskripsi: node.data?.deskripsi || '',
                      lanjut_ke: node.data?.lanjut_ke || '',
                      cabang_ya: node.data?.cabang_ya || '',
                      cabang_tidak: node.data?.cabang_tidak || '',
                    });
                  }
                  setContextMenu(null);
                }}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: `${tokens.spasi.xs} ${tokens.spasi.sm}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spasi.sm,
                  color: tokens.warna.teks.utama,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: tokens.radius.sm,
                  marginBottom: '2px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.warna.latar)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Edit3 size={14} color="#a5b4fc" />
                <span>Edit Tulisan Box (Kustom)</span>
              </button>

              <div style={{ height: '1px', backgroundColor: tokens.warna.garis_batas, margin: `${tokens.spasi.xs} 0` }} />

              <div style={{ padding: `${tokens.spasi.xs} ${tokens.spasi.sm}`, fontSize: '11px', color: tokens.warna.teks.redup, fontWeight: 600 }}>
                PILIH WARNA KARTU
              </div>
              <div style={{ display: 'flex', gap: '6px', padding: `${tokens.spasi.xs} ${tokens.spasi.sm}` }}>
                {PALET_WARNA.map((c) => (
                  <div
                    key={c.hex}
                    onClick={() => {
                      onUbahWarnaNode(contextMenu.node.id, c.hex);
                      setContextMenu(null);
                    }}
                    title={c.nama}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: tokens.radius.sm,
                      backgroundColor: c.hex,
                      cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  />
                ))}
              </div>

              <div style={{ height: '1px', backgroundColor: tokens.warna.garis_batas, margin: `${tokens.spasi.xs} 0` }} />

              <button
                onClick={() => {
                  onHapusNode(contextMenu.node.id);
                  setContextMenu(null);
                }}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: `${tokens.spasi.xs} ${tokens.spasi.sm}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spasi.sm,
                  color: tokens.warna.status.bahaya,
                  fontSize: '12px',
                  cursor: 'pointer',
                  borderRadius: tokens.radius.sm,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.warna.latar)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Trash2 size={14} />
                <span>Hapus Kotak Ini</span>
              </button>
            </div>
          ) : contextMenu.edge ? (
            /* Menu Saat Klik Kanan di Garis Relasi / Edge */
            <div>
              <div style={{ padding: `${tokens.spasi.xs} ${tokens.spasi.sm}`, fontSize: '11px', color: tokens.warna.teks.redup, fontWeight: 600 }}>
                RELASI / DATA FLOW
              </div>
              <button
                onClick={() => {
                  onHapusRelasi(contextMenu.edge.id);
                  setContextMenu(null);
                }}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: `${tokens.spasi.xs} ${tokens.spasi.sm}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spasi.sm,
                  color: tokens.warna.status.bahaya,
                  fontSize: '12px',
                  cursor: 'pointer',
                  borderRadius: tokens.radius.sm,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.warna.latar)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Trash2 size={14} />
                <span>Hapus Garis Relasi Ini</span>
              </button>
            </div>
          ) : (
            /* Menu Saat Klik Kanan di Kanvas Kosong */
            <div>
              <div style={{ padding: `${tokens.spasi.xs} ${tokens.spasi.sm}`, fontSize: '11px', color: tokens.warna.teks.redup, fontWeight: 600 }}>
                TAMBAH ENTITAS BARU
              </div>
              <button
                onClick={() => {
                  onTambahNodeManual('erdNode', contextMenu.x, contextMenu.y);
                  setContextMenu(null);
                }}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: `${tokens.spasi.xs} ${tokens.spasi.sm}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spasi.sm,
                  color: tokens.warna.teks.utama,
                  fontSize: '12px',
                  cursor: 'pointer',
                  borderRadius: tokens.radius.sm,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.warna.latar)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Database size={14} color={tokens.warna.aksen.utama} />
                <span>+ Tabel ERD Baru</span>
              </button>

              <button
                onClick={() => {
                  onTambahNodeManual('workflowNode', contextMenu.x, contextMenu.y);
                  setContextMenu(null);
                }}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: `${tokens.spasi.xs} ${tokens.spasi.sm}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spasi.sm,
                  color: tokens.warna.teks.utama,
                  fontSize: '12px',
                  cursor: 'pointer',
                  borderRadius: tokens.radius.sm,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.warna.latar)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <UserCheck size={14} color={tokens.warna.status.sukses} />
                <span>+ Proses Workflow (DFD) Baru</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL KUSTOM: Edit Tulisan Box (Bebas dari Popup Browser Prompt) */}
      {nodeSedangDiedit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: tokens.spasi.md,
          }}
          onClick={() => setNodeSedangDiedit(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: tokens.warna.kartu,
              border: `1px solid ${tokens.warna.garis_batas}`,
              borderRadius: tokens.radius.lg,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
              padding: tokens.spasi.lg,
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spasi.md,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${tokens.warna.garis_batas}`, paddingBottom: tokens.spasi.sm }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={16} color={tokens.warna.aksen.utama} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: tokens.warna.teks.utama }}>
                  {nodeSedangDiedit.type === 'erdNode' ? 'Edit Tabel Database' : 'Edit Entitas Workflow / DFD'}
                </span>
              </div>
              <button
                onClick={() => setNodeSedangDiedit(null)}
                style={{ background: 'none', border: 'none', color: tokens.warna.teks.redup, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {nodeSedangDiedit.type === 'erdNode' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spasi.sm }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: tokens.warna.teks.sekunder, display: 'block', marginBottom: '4px' }}>
                    Nama Tabel (snake_case):
                  </label>
                  <input
                    type="text"
                    value={formEditData.nama_tabel || ''}
                    onChange={(e) => setFormEditData({ ...formEditData, nama_tabel: e.target.value })}
                    style={{
                      width: '100%',
                      padding: `${tokens.spasi.sm} ${tokens.spasi.md}`,
                      backgroundColor: tokens.warna.latar,
                      border: `1px solid ${tokens.warna.garis_batas}`,
                      borderRadius: tokens.radius.sm,
                      color: tokens.warna.teks.utama,
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: tokens.warna.teks.sekunder }}>
                      Daftar Kolom / Field (Terpisah Per Inputan):
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const listBaru = [...(formEditData.daftarKolom || [])];
                        listBaru.push({
                          nama: `kolom_${listBaru.length + 1}`,
                          tipe: 'VARCHAR',
                          size: 255,
                          is_pk: false,
                          is_fk: false,
                          is_nullable: true,
                        });
                        setFormEditData({ ...formEditData, daftarKolom: listBaru });
                      }}
                      style={{
                        padding: '2px 8px',
                        backgroundColor: 'rgba(79, 70, 229, 0.2)',
                        border: '1px solid #4f46e5',
                        color: '#a5b4fc',
                        borderRadius: tokens.radius.sm,
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      + Tambah Kolom
                    </button>
                  </div>

                  {/* Header Kolom */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 65px 75px 30px', gap: '6px', padding: '4px 6px', backgroundColor: tokens.warna.latar, borderRadius: '4px', fontSize: '10px', color: tokens.warna.teks.redup, fontWeight: 700 }}>
                    <span>NAMA FIELD</span>
                    <span>TIPE DATA</span>
                    <span>SIZE</span>
                    <span>KEY / NN</span>
                    <span></span>
                  </div>

                  {/* Baris Kolom Interaktif Terpisah */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto', marginTop: '4px' }}>
                    {(formEditData.daftarKolom || []).map((col, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.4fr 1fr 65px 75px 30px',
                          gap: '6px',
                          alignItems: 'center',
                          backgroundColor: col.is_pk ? 'rgba(234, 179, 8, 0.05)' : 'rgba(255,255,255,0.02)',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          border: `1px solid ${col.is_pk ? 'rgba(234, 179, 8, 0.3)' : tokens.warna.garis_batas}`,
                        }}
                      >
                        {/* 1. Nama Kolom */}
                        <input
                          type="text"
                          value={col.nama}
                          placeholder="nama_field"
                          onChange={(e) => {
                            const list = [...formEditData.daftarKolom];
                            list[idx].nama = e.target.value;
                            setFormEditData({ ...formEditData, daftarKolom: list });
                          }}
                          style={{
                            padding: '4px 6px',
                            backgroundColor: tokens.warna.latar,
                            border: `1px solid ${tokens.warna.garis_batas}`,
                            borderRadius: '3px',
                            color: tokens.warna.teks.utama,
                            fontSize: '11px',
                          }}
                        />

                        {/* 2. Tipe Data (Dropdown) */}
                        <select
                          value={col.tipe}
                          onChange={(e) => {
                            const list = [...formEditData.daftarKolom];
                            list[idx].tipe = e.target.value;
                            setFormEditData({ ...formEditData, daftarKolom: list });
                          }}
                          style={{
                            padding: '4px 6px',
                            backgroundColor: tokens.warna.latar,
                            border: `1px solid ${tokens.warna.garis_batas}`,
                            borderRadius: '3px',
                            color: tokens.warna.teks.utama,
                            fontSize: '11px',
                          }}
                        >
                          {['VARCHAR', 'TEXT', 'INT', 'BIGINT', 'BOOLEAN', 'DECIMAL', 'TIMESTAMP', 'UUID', 'DATE'].map((t) => (
                            <option key={t} value={t} style={{ backgroundColor: '#0f172a' }}>{t}</option>
                          ))}
                        </select>

                        {/* 3. Ukuran / Size */}
                        <input
                          type="number"
                          placeholder="size"
                          value={col.size ?? ''}
                          onChange={(e) => {
                            const list = [...formEditData.daftarKolom];
                            list[idx].size = e.target.value ? parseInt(e.target.value, 10) : null;
                            setFormEditData({ ...formEditData, daftarKolom: list });
                          }}
                          style={{
                            padding: '4px 6px',
                            backgroundColor: tokens.warna.latar,
                            border: `1px solid ${tokens.warna.garis_batas}`,
                            borderRadius: '3px',
                            color: tokens.warna.teks.utama,
                            fontSize: '11px',
                          }}
                        />

                        {/* 4. Selector Flag (PK, FK, Normal) */}
                        <select
                          value={col.is_pk ? 'PK' : col.is_fk ? 'FK' : 'REG'}
                          onChange={(e) => {
                            const list = [...formEditData.daftarKolom];
                            const val = e.target.value;
                            list[idx].is_pk = val === 'PK';
                            list[idx].is_fk = val === 'FK';
                            setFormEditData({ ...formEditData, daftarKolom: list });
                          }}
                          style={{
                            padding: '4px 4px',
                            backgroundColor: tokens.warna.latar,
                            border: `1px solid ${tokens.warna.garis_batas}`,
                            borderRadius: '3px',
                            color: col.is_pk ? '#facc15' : col.is_fk ? '#22d3ee' : tokens.warna.teks.sekunder,
                            fontSize: '10px',
                            fontWeight: 700,
                          }}
                        >
                          <option value="REG" style={{ backgroundColor: '#0f172a' }}>REG</option>
                          <option value="PK" style={{ backgroundColor: '#0f172a' }}>🔑 PK</option>
                          <option value="FK" style={{ backgroundColor: '#0f172a' }}>🔗 FK</option>
                        </select>

                        {/* 5. Tombol Hapus Baris */}
                        <button
                          type="button"
                          onClick={() => {
                            const list = formEditData.daftarKolom.filter((_, i) => i !== idx);
                            setFormEditData({ ...formEditData, daftarKolom: list });
                          }}
                          title="Hapus Kolom"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: tokens.warna.status.bahaya,
                            cursor: 'pointer',
                            fontSize: '13px',
                            padding: '2px',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spasi.sm }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spasi.sm }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: tokens.warna.teks.sekunder, display: 'block', marginBottom: '4px' }}>
                      Tipe Simbol BPMN:
                    </label>
                    <select
                      value={formEditData.tipe_simbol || 'proses'}
                      onChange={(e) => setFormEditData({ ...formEditData, tipe_simbol: e.target.value })}
                      style={{
                        width: '100%',
                        padding: `${tokens.spasi.sm} ${tokens.spasi.md}`,
                        backgroundColor: tokens.warna.latar,
                        border: `1px solid ${tokens.warna.garis_batas}`,
                        borderRadius: tokens.radius.sm,
                        color: tokens.warna.teks.utama,
                        fontSize: '12px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="mulai">Mulai (Start Event)</option>
                      <option value="proses">Proses (Task / Activity)</option>
                      <option value="keputusan">Keputusan (Gateway XOR)</option>
                      <option value="selesai">Selesai (End Event)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: tokens.warna.teks.sekunder, display: 'block', marginBottom: '4px' }}>
                      No. Proses:
                    </label>
                    <input
                      type="text"
                      value={formEditData.no_proses || ''}
                      placeholder="1.0"
                      onChange={(e) => setFormEditData({ ...formEditData, no_proses: e.target.value })}
                      style={{
                        width: '100%',
                        padding: `${tokens.spasi.sm} ${tokens.spasi.md}`,
                        backgroundColor: tokens.warna.latar,
                        border: `1px solid ${tokens.warna.garis_batas}`,
                        borderRadius: tokens.radius.sm,
                        color: tokens.warna.teks.utama,
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: tokens.warna.teks.sekunder, display: 'block', marginBottom: '4px' }}>
                    Aktor / Penanggung Jawab:
                  </label>
                  <input
                    type="text"
                    value={formEditData.aktor || ''}
                    placeholder="misal: Pelanggan, Kasir, Sistem Pembayaran"
                    onChange={(e) => setFormEditData({ ...formEditData, aktor: e.target.value })}
                    style={{
                      width: '100%',
                      padding: `${tokens.spasi.sm} ${tokens.spasi.md}`,
                      backgroundColor: tokens.warna.latar,
                      border: `1px solid ${tokens.warna.garis_batas}`,
                      borderRadius: tokens.radius.sm,
                      color: tokens.warna.teks.utama,
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: tokens.warna.teks.sekunder, display: 'block', marginBottom: '4px' }}>
                    Nama Langkah / Pertanyaan:
                  </label>
                  <input
                    type="text"
                    value={formEditData.langkah || ''}
                    onChange={(e) => setFormEditData({ ...formEditData, langkah: e.target.value })}
                    style={{
                      width: '100%',
                      padding: `${tokens.spasi.sm} ${tokens.spasi.md}`,
                      backgroundColor: tokens.warna.latar,
                      border: `1px solid ${tokens.warna.garis_batas}`,
                      borderRadius: tokens.radius.sm,
                      color: tokens.warna.teks.utama,
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: tokens.warna.teks.sekunder, display: 'block', marginBottom: '4px' }}>
                    Deskripsi Alur:
                  </label>
                  <textarea
                    rows={2}
                    value={formEditData.deskripsi || ''}
                    onChange={(e) => setFormEditData({ ...formEditData, deskripsi: e.target.value })}
                    style={{
                      width: '100%',
                      padding: `${tokens.spasi.sm} ${tokens.spasi.md}`,
                      backgroundColor: tokens.warna.latar,
                      border: `1px solid ${tokens.warna.garis_batas}`,
                      borderRadius: tokens.radius.sm,
                      color: tokens.warna.teks.utama,
                      fontSize: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: tokens.spasi.sm, marginTop: tokens.spasi.xs }}>
              <button
                onClick={() => setNodeSedangDiedit(null)}
                style={{
                  padding: `${tokens.spasi.xs} ${tokens.spasi.md}`,
                  backgroundColor: 'transparent',
                  border: `1px solid ${tokens.warna.garis_batas}`,
                  borderRadius: tokens.radius.sm,
                  color: tokens.warna.teks.sekunder,
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (nodeSedangDiedit.type === 'erdNode') {
                    const kolomFinal = (formEditData.daftarKolom || []).map(c => ({
                      nama: (c.nama || 'field').trim().toLowerCase(),
                      tipe: (c.tipe || 'VARCHAR').trim().toUpperCase(),
                      size: c.size ? (isNaN(c.size) ? c.size : parseInt(c.size, 10)) : null,
                      is_pk: Boolean(c.is_pk),
                      is_fk: Boolean(c.is_fk),
                      is_unique: Boolean(c.is_unique),
                      is_indexed: Boolean(c.is_indexed),
                      is_nullable: c.is_nullable !== false,
                      fk_referensi: c.fk_referensi ? c.fk_referensi.trim() : undefined,
                      keterangan: c.keterangan ? c.keterangan.trim() : undefined,
                    }));
                    onEditNodeManual(nodeSedangDiedit.id, {
                      nama_tabel: (formEditData.nama_tabel || '').trim(),
                      kolom: kolomFinal,
                    });
                  } else {
                    onEditNodeManual(nodeSedangDiedit.id, {
                      tipe_simbol: formEditData.tipe_simbol || 'proses',
                      no_proses: formEditData.no_proses ? formEditData.no_proses.trim() : undefined,
                      aktor: (formEditData.aktor || '').trim(),
                      langkah: (formEditData.langkah || '').trim(),
                      deskripsi: (formEditData.deskripsi || '').trim(),
                      lanjut_ke: formEditData.lanjut_ke || undefined,
                      cabang_ya: formEditData.cabang_ya || undefined,
                      cabang_tidak: formEditData.cabang_tidak || undefined,
                    });
                  }
                  setNodeSedangDiedit(null);
                }}
                style={{
                  padding: `${tokens.spasi.xs} ${tokens.spasi.md}`,
                  backgroundColor: tokens.warna.aksen.utama,
                  border: 'none',
                  borderRadius: tokens.radius.sm,
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
