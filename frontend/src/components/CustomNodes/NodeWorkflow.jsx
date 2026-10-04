import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, CheckCircle2, HelpCircle, Activity, User, ArrowRight } from 'lucide-react';
import { tokens } from '../../tokens/design_tokens';

/**
 * NodeWorkflow / Flowchart Alur Kerja Bisnis (Standar Miro Flowchart)
 * Sesuai referensi visual Miro:
 * 1. Simbol Mulai / Selesai (Start / End: Kapsul Oval Pill Berwarna Tegas)
 * 2. Simbol Proses / Tindakan (Process: Kotak Persegi Panjang Hangat / Kuning Emas dengan Penanggung Jawab)
 * 3. Simbol Keputusan (Decision: Belah Ketupat / Diamond Hitam Bercabang Ya / Tidak)
 * 4. Badge Penanggung Jawab (Aktor / Pemilik Langkah)
 */
export const NodeWorkflow = memo(({ data }) => {
  const tipe = data.tipe_simbol || (data.tipe_dfd === 'entity' ? 'mulai' : data.tipe_dfd === 'store' ? 'selesai' : 'proses');
  const label = data.langkah || data.label || data.kasus || 'Langkah Alur Kerja';
  const aktor = data.aktor || data.penanggung_jawab || '';
  const deskripsi = data.deskripsi || '';

  // 1. SIMBOL MULAI (START - Pill Oval Hijau Lembut ala Miro)
  if (tipe === 'mulai' || tipe === 'start') {
    const isEnglish = (data.bahasa === 'en') || (label && /^[A-Za-z\s]+$/.test(label) && (label.toLowerCase().includes('start') || label.toLowerCase().includes('initiate') || label.toLowerCase().includes('submit') || label.toLowerCase().includes('user')));
    const badgeText = isEnglish ? 'START' : 'MULAI';
    return (
      <div
        style={{
          minWidth: '160px',
          maxWidth: '220px',
          padding: '12px 20px',
          backgroundColor: '#064e3b',
          border: '2px solid #10b981',
          borderRadius: '9999px',
          boxShadow: '0 8px 16px -2px rgba(0, 0, 0, 0.5), 0 0 12px rgba(16, 185, 129, 0.25)',
          color: '#ecfdf5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <Handle type="target" position={Position.Top} id="start-top" style={{ background: '#10b981', width: '8px', height: '8px' }} />
        <Handle type="target" position={Position.Left} id="start-left" style={{ background: '#10b981', width: '8px', height: '8px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <Play size={13} color="#34d399" fill="#34d399" />
          <span style={{ fontSize: '10px', color: '#6ee7b7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {badgeText}
          </span>
        </div>

        <div style={{ fontWeight: 700, fontSize: '13px', lineHeight: '1.3' }}>
          {label}
        </div>

        {aktor && (
          <div style={{ fontSize: '10px', color: '#a7f3d0', marginTop: '4px', opacity: 0.9 }}>
            👤 {aktor}
          </div>
        )}

        <Handle type="source" position={Position.Right} id="start-right" style={{ background: '#10b981', width: '8px', height: '8px' }} />
        <Handle type="source" position={Position.Bottom} id="start-bottom" style={{ background: '#10b981', width: '8px', height: '8px' }} />
      </div>
    );
  }

  // 2. SIMBOL SELESAI (END - Pill Oval Merah / Abu ala Miro)
  if (tipe === 'selesai' || tipe === 'end') {
    const isEnglish = (data.bahasa === 'en') || (label && /^[A-Za-z\s]+$/.test(label) && (label.toLowerCase().includes('end') || label.toLowerCase().includes('finish') || label.toLowerCase().includes('completed') || label.toLowerCase().includes('success')));
    const badgeText = isEnglish ? 'END' : 'SELESAI';
    return (
      <div
        style={{
          minWidth: '160px',
          maxWidth: '220px',
          padding: '12px 20px',
          backgroundColor: '#451a1a',
          border: '2px solid #ef4444',
          borderRadius: '9999px',
          boxShadow: '0 8px 16px -2px rgba(0, 0, 0, 0.5), 0 0 12px rgba(239, 68, 68, 0.25)',
          color: '#fef2f2',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <Handle type="target" position={Position.Top} id="end-top" style={{ background: '#ef4444', width: '8px', height: '8px' }} />
        <Handle type="target" position={Position.Left} id="end-left" style={{ background: '#ef4444', width: '8px', height: '8px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <CheckCircle2 size={13} color="#f87171" />
          <span style={{ fontSize: '10px', color: '#fca5a5', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {badgeText}
          </span>
        </div>

        <div style={{ fontWeight: 700, fontSize: '13px', lineHeight: '1.3' }}>
          {label}
        </div>

        <Handle type="source" position={Position.Right} id="end-right" style={{ background: '#ef4444', width: '8px', height: '8px' }} />
        <Handle type="source" position={Position.Bottom} id="end-bottom" style={{ background: '#ef4444', width: '8px', height: '8px' }} />
      </div>
    );
  }

  // 3. SIMBOL KEPUTUSAN (DECISION - Belah Ketupat / Diamond Hitam Bercabang Ya/Tidak ala Miro)
  if (tipe === 'keputusan' || tipe === 'decision') {
    const isEnglish = (data.bahasa === 'en') || (label && /^[A-Za-z0-9\s\?]+$/.test(label) && (label.toLowerCase().includes('is') || label.toLowerCase().includes('valid') || label.toLowerCase().includes('check') || label.toLowerCase().includes('available')));
    const textYes = isEnglish ? 'Yes' : 'Ya';
    const textNo = isEnglish ? 'No' : 'Tidak';

    return (
      <div
        style={{
          width: '150px',
          height: '150px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Handle pada keempat sudut belah ketupat */}
        <Handle type="target" position={Position.Top} id="dec-top" style={{ background: '#f59e0b', width: '9px', height: '9px', top: '0px' }} />
        <Handle type="target" position={Position.Left} id="dec-left" style={{ background: '#f59e0b', width: '9px', height: '9px', left: '0px' }} />
        <Handle type="source" position={Position.Right} id="dec-right" style={{ background: '#10b981', width: '9px', height: '9px', right: '0px' }} />
        <Handle type="source" position={Position.Bottom} id="dec-bottom" style={{ background: '#ef4444', width: '9px', height: '9px', bottom: '0px' }} />

        {/* Bentuk Diamond Rotasi 45 Derajat */}
        <div
          style={{
            position: 'absolute',
            width: '106px',
            height: '106px',
            backgroundColor: '#18181b',
            border: '2px solid #eab308',
            transform: 'rotate(45deg)',
            boxShadow: '0 8px 20px -2px rgba(0, 0, 0, 0.7), 0 0 10px rgba(234, 179, 8, 0.25)',
            zIndex: 1,
          }}
        />

        {/* Teks di tengah Diamond */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            padding: '8px',
            maxWidth: '120px',
            color: '#fef08a',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px' }}>
            <HelpCircle size={14} color="#facc15" />
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, lineHeight: '1.25', color: '#fef08a' }}>
            {label}
          </div>
        </div>

        {/* Label Indikator Cabang Cabang Kanan (Ya / Yes) & Bawah (Tidak / No) */}
        <div
          style={{
            position: 'absolute',
            right: '-28px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '10px',
            fontWeight: 800,
            color: '#34d399',
            backgroundColor: '#064e3b',
            padding: '2px 5px',
            borderRadius: '4px',
            border: '1px solid #10b981',
            zIndex: 3,
          }}
        >
          {textYes}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '10px',
            fontWeight: 800,
            color: '#f87171',
            backgroundColor: '#451a1a',
            padding: '2px 5px',
            borderRadius: '4px',
            border: '1px solid #ef4444',
            zIndex: 3,
          }}
        >
          {textNo}
        </div>
      </div>
    );
  }

  // 4. SIMBOL PROSES / TAHAPAN (PROCESS - Kotak Persegi Panjang Emas Hangat ala Miro)
  return (
    <div
      style={{
        width: '230px',
        backgroundColor: '#1c1917',
        border: '2px solid #eab308',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 8px 18px -2px rgba(0, 0, 0, 0.6), 0 0 10px rgba(234, 179, 8, 0.2)',
        color: tokens.warna.teks.utama,
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left} id="proc-left" style={{ background: '#eab308', width: '8px', height: '8px' }} />
      <Handle type="target" position={Position.Top} id="proc-top" style={{ background: '#eab308', width: '8px', height: '8px' }} />

      {/* Header Proses dengan Badge Aktor / Penanggung Jawab ala Miro */}
      <div
        style={{
          backgroundColor: '#292524',
          borderBottom: '1px solid #44403c',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Activity size={12} color="#eab308" />
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#fef08a', letterSpacing: '0.04em' }}>
            {data.no_proses ? `LANGKAH ${data.no_proses}` : 'PROSES KERJA'}
          </span>
        </div>

        {aktor && (
          <div
            style={{
              backgroundColor: '#451a03',
              border: '1px solid #b45309',
              borderRadius: '9999px',
              padding: '2px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <User size={10} color="#fbbf24" />
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#fde68a' }}>
              {aktor}
            </span>
          </div>
        )}
      </div>

      {/* Teks Instruksi Proses */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', lineHeight: '1.35', color: '#fef9c3' }}>
          {label}
        </div>
        {deskripsi && (
          <div style={{ fontSize: '11px', color: '#a8a29e', marginTop: '6px', lineHeight: '1.4' }}>
            {deskripsi}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="proc-right" style={{ background: '#eab308', width: '8px', height: '8px' }} />
      <Handle type="source" position={Position.Bottom} id="proc-bottom" style={{ background: '#eab308', width: '8px', height: '8px' }} />
    </div>
  );
});

NodeWorkflow.displayName = 'NodeWorkflow';
export const NodeUseCase = NodeWorkflow;

