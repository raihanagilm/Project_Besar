import React, { useState } from 'react';
import { Send, ShieldCheck, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { tokens } from '../../tokens/design_tokens';

export const ChatPanel = ({ onKirimIde, sedangMemproses, logVerifikasi, ringkasanIde }) => {
  const [pesan, setPesan] = useState('');
  const [tabAktif, setTabAktif] = useState('chat');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pesan.trim() || sedangMemproses) return;
    onKirimIde(pesan);
    setPesan('');
  };

  return (
    <div
      style={{
        width: '380px',
        height: '100%',
        backgroundColor: tokens.warna.kartu,
        borderRight: `1px solid ${tokens.warna.garis_batas}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header Panel */}
      <div
        style={{
          padding: `${tokens.spasi.md} ${tokens.spasi.lg}`,
          borderBottom: `1px solid ${tokens.warna.garis_batas}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spasi.sm }}>
          <Layers size={18} color={tokens.warna.aksen.utama} />
          <span style={{ fontWeight: 700, fontSize: '14px', color: tokens.warna.teks.utama }}>
            Pencatat Rencana Besar
          </span>
        </div>
        <div style={{ display: 'flex', gap: tokens.spasi.xs }}>
          <button
            onClick={() => setTabAktif('chat')}
            style={{
              padding: `${tokens.spasi.xs} ${tokens.spasi.sm}`,
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: tabAktif === 'chat' ? tokens.warna.aksen.utama : 'transparent',
              color: tabAktif === 'chat' ? tokens.warna.teks.utama : tokens.warna.teks.sekunder,
              border: 'none',
              borderRadius: tokens.radius.sm,
              cursor: 'pointer',
            }}
          >
            Ide
          </button>
          <button
            onClick={() => setTabAktif('jev_log')}
            style={{
              padding: `${tokens.spasi.xs} ${tokens.spasi.sm}`,
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: tabAktif === 'jev_log' ? tokens.warna.aksen.utama : 'transparent',
              color: tabAktif === 'jev_log' ? tokens.warna.teks.utama : tokens.warna.teks.sekunder,
              border: 'none',
              borderRadius: tokens.radius.sm,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ShieldCheck size={13} />
            <span>Jev Log</span>
          </button>
        </div>
      </div>

      {/* Konten Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: tokens.spasi.md }}>
        {tabAktif === 'chat' ? (
          <div>
            {ringkasanIde && (
              <div
                style={{
                  backgroundColor: tokens.warna.latar,
                  border: `1px solid ${tokens.warna.garis_batas}`,
                  borderRadius: tokens.radius.md,
                  padding: tokens.spasi.md,
                  marginBottom: tokens.spasi.md,
                }}
              >
                <div style={{ fontSize: '11px', color: tokens.warna.status.info, fontWeight: 600, marginBottom: tokens.spasi.xs }}>
                  RINGKASAN STRUKTUR TERBARU
                </div>
                <div style={{ fontSize: '13px', color: tokens.warna.teks.utama, lineHeight: '1.4' }}>
                  {ringkasanIde}
                </div>
              </div>
            )}
            <div style={{ fontSize: '12px', color: tokens.warna.teks.sekunder, lineHeight: '1.5' }}>
              Ketikkan ide, fitur, alur proses, atau model data rencana besarmu di bawah. Mesin verifikasi Jev akan menterjemahkan ke kanvas secara deterministik.
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: tokens.warna.teks.sekunder, marginBottom: tokens.spasi.sm }}>
              STATUS AUDIT JEV VERIFIER ENGINE
            </div>
            {logVerifikasi.length === 0 ? (
              <div style={{ fontSize: '12px', color: tokens.warna.teks.redup }}>
                Belum ada verifikasi yang dijalankan. Kirimkan ide untuk memulai.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spasi.xs }}>
                {logVerifikasi.map((log, idx) => {
                  const isSuccess = log.includes('Berhasil') || log.includes('valid');
                  const isWarn = log.includes('Peringatan') || log.includes('Gagal');
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: tokens.spasi.sm,
                        borderRadius: tokens.radius.sm,
                        backgroundColor: tokens.warna.latar,
                        border: `1px solid ${isWarn ? tokens.warna.status.peringatan : tokens.warna.garis_batas}`,
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: tokens.spasi.sm,
                        color: tokens.warna.teks.utama,
                        fontFamily: 'monospace',
                      }}
                    >
                      {isSuccess ? (
                        <CheckCircle2 size={14} color={tokens.warna.status.sukses} style={{ flexShrink: 0, marginTop: '2px' }} />
                      ) : isWarn ? (
                        <AlertTriangle size={14} color={tokens.warna.status.peringatan} style={{ flexShrink: 0, marginTop: '2px' }} />
                      ) : (
                        <ShieldCheck size={14} color={tokens.warna.status.info} style={{ flexShrink: 0, marginTop: '2px' }} />
                      )}
                      <span>{log}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form Input Pesan */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: tokens.spasi.md,
          borderTop: `1px solid ${tokens.warna.garis_batas}`,
          display: 'flex',
          gap: tokens.spasi.sm,
        }}
      >
        <input
          type="text"
          value={pesan}
          onChange={(e) => setPesan(e.target.value)}
          placeholder={sedangMemproses ? 'Jev sedang memverifikasi...' : 'Jelaskan rencana besarmu...'}
          disabled={sedangMemproses}
          style={{
            flex: 1,
            backgroundColor: tokens.warna.latar,
            border: `1px solid ${tokens.warna.garis_batas}`,
            borderRadius: tokens.radius.md,
            padding: `${tokens.spasi.sm} ${tokens.spasi.md}`,
            color: tokens.warna.teks.utama,
            fontSize: '13px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={sedangMemproses || !pesan.trim()}
          style={{
            backgroundColor: tokens.warna.aksen.utama,
            border: 'none',
            borderRadius: tokens.radius.md,
            padding: `${tokens.spasi.sm} ${tokens.spasi.md}`,
            color: tokens.warna.teks.utama,
            cursor: sedangMemproses || !pesan.trim() ? 'not-allowed' : 'pointer',
            opacity: sedangMemproses || !pesan.trim() ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};
