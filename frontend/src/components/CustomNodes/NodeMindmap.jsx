import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

/**
 * NodeMindmap (Standar Radial Bubbles & Curved Branches Sesuai Gambar Referensi)
 * - Level 0: Topik Sentral (Lingkaran/Kotak Rounded Besar di Tengah, warna Biru/Ungu)
 * - Level 1: Cabang Utama (Lingkaran Hijau/Coral/Oranye mengitari pusat)
 * - Level 2: Sub-Cabang Daun (Lingkaran Kuning/Pastel lebih kecil)
 */
export const NodeMindmap = memo(({ data }) => {
  const level = data.level !== undefined ? data.level : (data.parent_id ? 1 : 0);
  const label = data.label || 'Ide';

  // 1. LEVEL 0: TOPIK SENTRAL (Central Topic - Lingkaran/Oval Besar di Pusat)
  if (level === 0) {
    const bgPusat = data.warna_kustom || '#93c5fd'; // Biru lembut seperti gambar 1
    const textPusat = '#1e3a8a';
    return (
      <div
        style={{
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          backgroundColor: bgPusat,
          border: '2px solid #1e293b',
          boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '12px',
          color: textPusat,
          fontWeight: 700,
          fontSize: '15px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        <span>{label}</span>

        {/* 4 Handles penjuru mata angin untuk garis radial */}
        <Handle type="source" position={Position.Top} id="top" style={{ background: '#1e293b', width: '6px', height: '6px' }} />
        <Handle type="source" position={Position.Right} id="right" style={{ background: '#1e293b', width: '6px', height: '6px' }} />
        <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#1e293b', width: '6px', height: '6px' }} />
        <Handle type="source" position={Position.Left} id="left" style={{ background: '#1e293b', width: '6px', height: '6px' }} />
      </div>
    );
  }

  // 2. LEVEL 1: CABANG UTAMA (Main Branches - Lingkaran Sedang Hijau Pastel)
  if (level === 1) {
    const bgCabang = data.warna_kustom || '#86efac'; // Hijau pastel seperti gambar 1
    const textCabang = '#064e3b';
    return (
      <div
        style={{
          width: '110px',
          height: '110px',
          borderRadius: '50%',
          backgroundColor: bgCabang,
          border: '2px solid #1e293b',
          boxShadow: '0 6px 14px -3px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '10px',
          color: textCabang,
          fontWeight: 600,
          fontSize: '12px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Handles di semua sisi untuk koneksi radial */}
        <Handle type="target" position={Position.Left} id="target-left" style={{ background: '#1e293b', width: '6px', height: '6px' }} />
        <Handle type="target" position={Position.Right} id="target-right" style={{ background: '#1e293b', width: '6px', height: '6px' }} />
        <Handle type="target" position={Position.Top} id="target-top" style={{ background: '#1e293b', width: '6px', height: '6px' }} />
        <Handle type="target" position={Position.Bottom} id="target-bottom" style={{ background: '#1e293b', width: '6px', height: '6px' }} />

        <span>{label}</span>

        <Handle type="source" position={Position.Right} id="source-right" style={{ background: '#1e293b', width: '6px', height: '6px' }} />
        <Handle type="source" position={Position.Left} id="source-left" style={{ background: '#1e293b', width: '6px', height: '6px' }} />
        <Handle type="source" position={Position.Top} id="source-top" style={{ background: '#1e293b', width: '6px', height: '6px' }} />
        <Handle type="source" position={Position.Bottom} id="source-bottom" style={{ background: '#1e293b', width: '6px', height: '6px' }} />
      </div>
    );
  }

  // 3. LEVEL 2: SUB-CABANG / DAUN (Subtopic Twigs - Lingkaran Kuning / Krem Pastel)
  const bgSub = data.warna_kustom || '#fde047'; // Kuning pastel seperti gambar 1
  const textSub = '#713f12';
  return (
    <div
      style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: bgSub,
        border: '1.5px solid #1e293b',
        boxShadow: '0 4px 8px -2px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '6px',
        color: textSub,
        fontWeight: 600,
        fontSize: '11px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        lineHeight: '1.2',
      }}
    >
      <Handle type="target" position={Position.Left} id="target-left" style={{ background: '#1e293b', width: '5px', height: '5px' }} />
      <Handle type="target" position={Position.Right} id="target-right" style={{ background: '#1e293b', width: '5px', height: '5px' }} />
      <Handle type="target" position={Position.Top} id="target-top" style={{ background: '#1e293b', width: '5px', height: '5px' }} />
      <Handle type="target" position={Position.Bottom} id="target-bottom" style={{ background: '#1e293b', width: '5px', height: '5px' }} />

      <span>{label}</span>
    </div>
  );
});

NodeMindmap.displayName = 'NodeMindmap';
