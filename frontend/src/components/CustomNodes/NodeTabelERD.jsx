import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Database, Key } from 'lucide-react';
import { tokens } from '../../tokens/design_tokens';

export const NodeTabelERD = memo(({ data }) => {
  const kolom = data.kolom || [];

  return (
    <div
      style={{
        backgroundColor: tokens.warna.kartu,
        border: `1px solid ${tokens.warna.garis_batas}`,
        borderRadius: tokens.radius.md,
        minWidth: '240px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: tokens.warna.aksen.utama }} />
      
      {/* Header Tabel */}
      <div
        style={{
          backgroundColor: tokens.warna.aksen.utama,
          color: tokens.warna.teks.utama,
          padding: `${tokens.spasi.sm} ${tokens.spasi.md}`,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spasi.sm,
          fontWeight: 600,
          fontSize: '13px',
          letterSpacing: '0.02em',
        }}
      >
        <Database size={15} />
        <span>{data.nama_tabel}</span>
      </div>

      {/* Daftar Field Kolom */}
      <div style={{ padding: `${tokens.spasi.sm} 0` }}>
        {kolom.map((col, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${tokens.spasi.xs} ${tokens.spasi.md}`,
              fontSize: '12px',
              borderBottom: idx < kolom.length - 1 ? `1px solid ${tokens.warna.garis_batas}` : 'none',
              color: tokens.warna.teks.utama,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spasi.xs }}>
              {col.is_pk ? (
                <Key size={12} color={tokens.warna.status.peringatan} title="Primary Key" />
              ) : (
                <div style={{ width: '12px' }} />
              )}
              <span style={{ fontWeight: col.is_pk ? 600 : 400 }}>{col.nama}</span>
            </div>
            <span style={{ color: tokens.warna.teks.sekunder, fontSize: '11px', fontFamily: 'monospace' }}>
              {col.tipe}
            </span>
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: tokens.warna.aksen.utama }} />
    </div>
  );
});

NodeTabelERD.displayName = 'NodeTabelERD';
