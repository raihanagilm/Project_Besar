import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Undo, Redo, Save } from 'lucide-react';

import { NodeTabelERD } from '../CustomNodes/NodeTabelERD';
import { NodeMindmap } from '../CustomNodes/NodeMindmap';
import { NodeUseCase } from '../CustomNodes/NodeUseCase';
import { tokens } from '../../tokens/design_tokens';

/**
 * CanvasView (UX-01: Technical Component Name)
 * Wadah kanvas diagram interaktif React Flow dengan fitur Undo/Redo & filter diagram
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
  canRedo
}) => {
  const nodeTypes = useMemo(() => ({
    erdNode: NodeTabelERD,
    mindmapNode: NodeMindmap,
    useCaseNode: NodeUseCase,
  }), []);

  // Filter tampilan berdasarkan mode tab
  const filteredNodes = useMemo(() => {
    if (filterMode === 'semua') return nodes;
    if (filterMode === 'erd') return nodes.filter(n => n.type === 'erdNode');
    if (filterMode === 'mindmap') return nodes.filter(n => n.type === 'mindmapNode');
    if (filterMode === 'usecase') return nodes.filter(n => n.type === 'useCaseNode');
    return nodes;
  }, [nodes, filterMode]);

  return (
    <div style={{ flex: 1, height: '100%', position: 'relative', backgroundColor: tokens.warna.latar }}>
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
        {/* Filter Mode */}
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

        {/* Tombol Undo & Redo */}
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
    </div>
  );
};
