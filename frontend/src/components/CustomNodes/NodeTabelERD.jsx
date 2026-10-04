import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Table2, Key, Link2 } from 'lucide-react';
import { tokens } from '../../tokens/design_tokens';

/**
 * NodeTabelERD (Sesuai referensi https://github.com/hadziqmtqn/erd-builder-pro)
 * Standar Desain Database Profesional:
 * - Header Table dengan icon table & badge jumlah kolom
 * - Field Row berpresisi tinggi dengan indikator PK (Primary Key - Badge Emas) & FK (Foreign Key - Badge Cyan)
 * - Tipe data monospaced dengan badge tipe (TEXT, INT, BOOLEAN, UUID, TIMESTAMP)
 * - Per-row handles (Sisi Kanan untuk Source PK, Sisi Kiri untuk Target FK)
 */
export const NodeTabelERD = memo(({ data }) => {
  const kolom = data.kolom || [];
  const headerColor = data.warna_kustom || '#4f46e5';

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        border: `1px solid ${data.warna_kustom ? data.warna_kustom : '#334155'}`,
        borderRadius: '8px',
        minWidth: '260px',
        maxWidth: '340px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Table Header ala ERD Builder Pro */}
      <div
        style={{
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155',
          borderTop: `3px solid ${headerColor}`,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Table2 size={16} color={headerColor} />
          <span style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc', letterSpacing: '0.02em' }}>
            {data.nama_tabel}
          </span>
        </div>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: '#334155',
            color: '#94a3b8',
          }}
        >
          {kolom.length} fields
        </span>
      </div>

      {/* Field Rows */}
      <div style={{ padding: '4px 0', backgroundColor: '#0f172a' }}>
        {kolom.map((col, idx) => {
          const isPk = Boolean(col.is_pk);
          const isFk = Boolean(col.is_fk);

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 14px',
                fontSize: '12px',
                borderBottom: idx < kolom.length - 1 ? '1px solid rgba(51, 65, 85, 0.4)' : 'none',
                position: 'relative',
                backgroundColor: isPk ? 'rgba(234, 179, 8, 0.04)' : isFk ? 'rgba(6, 182, 212, 0.04)' : 'transparent',
              }}
            >
              {/* Target Handle untuk FK (Sisi Kiri) */}
              {isFk && (
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`fk-${col.nama}`}
                  style={{
                    background: '#06b6d4',
                    width: '7px',
                    height: '7px',
                    border: '1px solid #0f172a',
                    left: '-4px',
                  }}
                />
              )}

              {/* Info Field & Key Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isPk && (
                  <span
                    title="Primary Key"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontSize: '9px',
                      fontWeight: 800,
                      backgroundColor: 'rgba(234, 179, 8, 0.2)',
                      color: '#facc15',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      border: '1px solid rgba(234, 179, 8, 0.4)',
                    }}
                  >
                    <Key size={9} />
                    PK
                  </span>
                )}

                {isFk && !isPk && (
                  <span
                    title={col.fk_referensi ? `Foreign Key: ${col.fk_referensi}` : "Foreign Key"}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontSize: '9px',
                      fontWeight: 800,
                      backgroundColor: 'rgba(6, 182, 212, 0.2)',
                      color: '#22d3ee',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      border: '1px solid rgba(6, 182, 212, 0.4)',
                    }}
                  >
                    <Link2 size={9} />
                    FK
                  </span>
                )}

                {col.is_unique && !isPk && (
                  <span
                    title="Unique Constraint"
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      backgroundColor: 'rgba(168, 85, 247, 0.2)',
                      color: '#c084fc',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                    }}
                  >
                    UQ
                  </span>
                )}

                {col.is_indexed && !isPk && !isFk && (
                  <span
                    title="Indexed Column"
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      backgroundColor: 'rgba(100, 116, 139, 0.2)',
                      color: '#94a3b8',
                      padding: '1px 3px',
                      borderRadius: '3px',
                    }}
                  >
                    IX
                  </span>
                )}

                {!isPk && !isFk && !col.is_unique && !col.is_indexed && <div style={{ width: '4px' }} />}

                <span
                  title={col.keterangan || col.nama}
                  style={{
                    fontWeight: isPk ? 700 : 500,
                    color: isPk ? '#f8fafc' : isFk ? '#e2e8f0' : '#cbd5e1',
                  }}
                >
                  {col.nama}
                </span>
              </div>

              {/* Data Type & Size Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    color: isPk ? '#facc15' : isFk ? '#22d3ee' : '#94a3b8',
                    backgroundColor: '#1e293b',
                    padding: '1px 6px',
                    borderRadius: '3px',
                    border: '1px solid #334155',
                  }}
                >
                  {col.size ? `${col.tipe || 'TEXT'}(${col.size})` : (col.tipe || 'TEXT')}
                </span>
                {col.is_nullable === false && !isPk && (
                  <span
                    title="Not Null"
                    style={{
                      fontSize: '9px',
                      color: '#ef4444',
                      fontWeight: 700,
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      padding: '1px 3px',
                      borderRadius: '2px',
                    }}
                  >
                    NN
                  </span>
                )}
              </div>

              {/* Source Handle untuk PK (Sisi Kanan) */}
              {isPk && (
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`pk-${col.nama}`}
                  style={{
                    background: '#eab308',
                    width: '7px',
                    height: '7px',
                    border: '1px solid #0f172a',
                    right: '-4px',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Default Top/Bottom handles untuk relasi bebas */}
      <Handle type="target" position={Position.Top} id="tbl-top" style={{ background: headerColor, width: '6px', height: '6px' }} />
      <Handle type="source" position={Position.Bottom} id="tbl-bottom" style={{ background: headerColor, width: '6px', height: '6px' }} />
    </div>
  );
});

NodeTabelERD.displayName = 'NodeTabelERD';
