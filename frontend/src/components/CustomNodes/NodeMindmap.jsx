import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Lightbulb } from 'lucide-react';
import { tokens } from '../../tokens/design_tokens';

export const NodeMindmap = memo(({ data }) => {
  const subPoin = data.sub_poin || [];
  const cardColor = data.warna_kustom ? `${data.warna_kustom}22` : tokens.warna.kartu;
  const borderColor = data.warna_kustom || tokens.warna.garis_batas;
  const accentColor = data.warna_kustom || tokens.warna.status.info;

  return (
    <div
      style={{
        backgroundColor: cardColor,
        border: `1px solid ${borderColor}`,
        borderRadius: tokens.radius.md,
        padding: tokens.spasi.md,
        width: '240px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        color: tokens.warna.teks.utama,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: accentColor }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spasi.sm, marginBottom: tokens.spasi.sm }}>
        <Lightbulb size={16} color={accentColor} />
        <div style={{ fontWeight: 600, fontSize: '13px' }}>{data.label}</div>
      </div>

      <div style={{ fontSize: '11px', color: tokens.warna.teks.sekunder, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: tokens.spasi.xs }}>
        Kategori: {data.kategori || 'Ide'}
      </div>

      {subPoin.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: tokens.warna.teks.utama }}>
          {subPoin.map((p, idx) => (
            <li key={idx} style={{ marginBottom: '2px' }}>{p}</li>
          ))}
        </ul>
      )}

      <Handle type="source" position={Position.Right} style={{ background: accentColor }} />
    </div>
  );
});

NodeMindmap.displayName = 'NodeMindmap';
