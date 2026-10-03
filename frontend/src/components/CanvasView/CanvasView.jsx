import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Undo, Redo, Save, Plus, Database, Lightbulb, UserCheck, Palette, Trash2 } from 'lucide-react';

import { NodeTabelERD } from '../CustomNodes/NodeTabelERD';
import { NodeMindmap } from '../CustomNodes/NodeMindmap';
import { NodeUseCase } from '../CustomNodes/NodeUseCase';
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
 * Wadah kanvas diagram interaktif React Flow dengan fitur Klik Kanan (Context Menu)
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
  onHapusNode
}) => {
  const [contextMenu, setContextMenu] = useState(null); // { x, y, node }

  const nodeTypes = useMemo(() => ({
    erdNode: NodeTabelERD,
    mindmapNode: NodeMindmap,
    useCaseNode: NodeUseCase,
  }), []);

  const filteredNodes = useMemo(() => {
    if (filterMode === 'semua') return nodes;
    if (filterMode === 'erd') return nodes.filter(n => n.type === 'erdNode');
    if (filterMode === 'mindmap') return nodes.filter(n => n.type === 'mindmapNode');
    if (filterMode === 'usecase') return nodes.filter(n => n.type === 'useCaseNode');
    return nodes;
  }, [nodes, filterMode]);

  // Handle Klik Kanan di Kanvas Kosong
  const handlePaneContextMenu = (event) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node: null
    });
  };

  // Handle Klik Kanan di Atas Kotak Node
  const handleNodeContextMenu = (event, node) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node: node
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
        {['semua', 'erd', 'mindmap', 'usecase'].map((mode) => (
          <button
            key={mode}
            onClick={() => setFilterMode(mode)}
            style={{
              backgroundColor: filterMode === mode ? tokens.warna.aksen.utama : 'transparent',
              color: filterMode === mode ? tokens.warna.teks.utama : tokens.warna.teks.sekunder,
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
            {mode === 'erd' ? 'ERD / DB' : mode}
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

      {/* Kanvas React Flow */}
      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
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
            if (n.type === 'mindmapNode') return tokens.warna.status.info;
            if (n.type === 'useCaseNode') return tokens.warna.status.sukses;
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
            /* Menu Saat Klik Kanan di Node */
            <div>
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
                  onTambahNodeManual('mindmapNode', contextMenu.x, contextMenu.y);
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
                <Lightbulb size={14} color={tokens.warna.status.info} />
                <span>+ Konsep Mindmap Baru</span>
              </button>

              <button
                onClick={() => {
                  onTambahNodeManual('useCaseNode', contextMenu.x, contextMenu.y);
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
                <span>+ Skenario Use Case Baru</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
