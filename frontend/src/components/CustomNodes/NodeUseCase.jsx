import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { tokens } from '../../tokens/design_tokens';

/**
 * NodeUseCase (Standar UML Use Case Resmi Sesuai Diagram Buku & Gambar Referensi)
 * 1. Simbol Aktor: Real Stickman SVG (Kepala bulat, badan lurus, tangan merentang, kaki menyilang)
 * 2. Simbol Use Case: Elips / Oval sejati bergaris tepi tegas dengan teks aksi di tengah
 * 3. System Boundary: Kotak pembatas lingkup sistem di tengah
 */

// Komponen SVG Stick Figure Aktor Standar UML
const StickmanSvg = ({ color = '#0f172a' }) => (
  <svg
    width="48"
    height="72"
    viewBox="0 0 48 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ overflow: 'visible' }}
  >
    {/* Kepala Lingkaran */}
    <circle cx="24" cy="12" r="10" stroke={color} strokeWidth="2.5" fill="#f8fafc" />
    {/* Garis Badan */}
    <line x1="24" y1="22" x2="24" y2="46" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    {/* Garis Lengan Merentang */}
    <line x1="6" y1="30" x2="42" y2="30" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    {/* Kaki Kiri */}
    <line x1="24" y1="46" x2="10" y2="68" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    {/* Kaki Kanan */}
    <line x1="24" y1="46" x2="38" y2="68" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const NodeUseCase = memo(({ data }) => {
  const isAktor = Boolean(data.is_aktor);
  const isBoundary = Boolean(data.is_boundary);
  const accentColor = data.warna_kustom || '#0284c7';

  // 1. BOUNDARY KOTAK SISTEM (System Boundary Rectangle)
  if (isBoundary) {
    return (
      <div
        style={{
          width: `${data.lebar || 500}px`,
          height: `${data.tinggi || 600}px`,
          border: '2px solid #64748b',
          borderRadius: '4px',
          backgroundColor: 'rgba(248, 250, 252, 0.03)',
          boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.2)',
          position: 'relative',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: 700,
            color: '#94a3b8',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {data.judul || 'Sistem Batas (System Boundary)'}
        </div>
      </div>
    );
  }

  // 2. SIMBOL AKTOR UML (Stick Figure Sesuai Gambar Buku)
  if (isAktor) {
    const posisiSide = data.posisi_side || 'kiri'; // 'kiri' atau 'kanan'
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '4px',
          minWidth: '80px',
          position: 'relative',
        }}
      >
        {/* Handle Asosiasi ke Use Case (Sisi Kanan jika aktor di kiri, sisi Kiri jika aktor di kanan) */}
        {posisiSide === 'kiri' ? (
          <Handle
            type="source"
            position={Position.Right}
            id="actor-right"
            style={{ background: '#334155', width: '8px', height: '8px', border: '1.5px solid #fff' }}
          />
        ) : (
          <Handle
            type="source"
            position={Position.Left}
            id="actor-left"
            style={{ background: '#334155', width: '8px', height: '8px', border: '1.5px solid #fff' }}
          />
        )}

        {/* Stickman SVG */}
        <div style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
          <StickmanSvg color="#f8fafc" />
        </div>

        {/* Nama Aktor di Bawah Stickman */}
        <div
          style={{
            marginTop: '8px',
            fontWeight: 700,
            fontSize: '13px',
            color: tokens.warna.teks.utama,
            textAlign: 'center',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            maxWidth: '120px',
            lineHeight: '1.2',
          }}
        >
          {data.aktor || data.label || 'Aktor'}
        </div>
      </div>
    );
  }

  // 3. SIMBOL USE CASE UML (Bentuk Oval / Elips Sejati Sesuai Gambar Referensi)
  return (
    <div
      style={{
        width: '210px',
        minHeight: '68px',
        borderRadius: '50%', // Elips Horisontal
        backgroundColor: '#f8fafc', // Putih terang bersih seperti diagram UML standar
        border: '2px solid #0f172a',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 22px',
        textAlign: 'center',
        position: 'relative',
        color: '#0f172a', // Teks hitam terbaca jelas di atas elips putih
      }}
    >
      {/* Handle Target dari Aktor Kiri */}
      <Handle
        type="target"
        position={Position.Left}
        id="uc-target-left"
        style={{ background: '#0f172a', width: '7px', height: '7px' }}
      />

      {/* Handle Target dari Aktor Kanan */}
      <Handle
        type="target"
        position={Position.Right}
        id="uc-target-right"
        style={{ background: '#0f172a', width: '7px', height: '7px' }}
      />

      {/* Handle Source untuk relasi <<include>> / <<extend>> ke usecase lain */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="uc-source-bottom"
        style={{ background: '#0284c7', width: '7px', height: '7px' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="uc-target-top"
        style={{ background: '#0284c7', width: '7px', height: '7px' }}
      />

      <div style={{ fontWeight: 700, fontSize: '13px', lineHeight: '1.25', color: '#0f172a' }}>
        {data.kasus || data.langkah || data.label || 'Kasus Penggunaan'}
      </div>
    </div>
  );
});

NodeUseCase.displayName = 'NodeUseCase';
export const NodeWorkflow = NodeUseCase;
