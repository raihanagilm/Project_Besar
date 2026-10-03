import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { UserCheck } from 'lucide-react';
import { tokens } from '../../tokens/design_tokens';

export const NodeUseCase = memo(({ data }) => {
  return (
    <div
      style={{
        backgroundColor: tokens.warna.kartu,
        border: `1px solid ${tokens.warna.garis_batas}`,
        borderRadius: tokens.radius.md,
        padding: tokens.spasi.md,
        width: '240px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        color: tokens.warna.teks.utama,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: tokens.warna.status.sukses }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spasi.sm, marginBottom: tokens.spasi.xs }}>
        <UserCheck size={16} color={tokens.warna.status.sukses} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: tokens.warna.status.sukses, textTransform: 'uppercase' }}>
          {data.aktor || 'Aktor'}
        </span>
      </div>

      <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: tokens.spasi.xs }}>
        {data.kasus}
      </div>

      {data.deskripsi && (
        <div style={{ fontSize: '11px', color: tokens.warna.teks.sekunder, lineHeight: '1.4' }}>
          {data.deskripsi}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: tokens.warna.status.sukses }} />
    </div>
  );
});

NodeUseCase.displayName = 'NodeUseCase';
