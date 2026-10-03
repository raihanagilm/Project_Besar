import React, { useState } from 'react';
import { Send, ShieldCheck, CheckCircle2, AlertTriangle, Layers, Edit2, Check, X, Clock } from 'lucide-react';
import { tokens } from '../../tokens/design_tokens';

/**
 * ChatPanel (UX-01: Technical Component Name)
 * Menampilkan riwayat obrolan tersimpan, kemampuan edit pesan, dan status Jev Log
 */
export const ChatPanel = ({
  daftarObrolan,
  onKirimIde,
  onEditPesan,
  sedangMemproses,
  logVerifikasi,
  ringkasanIde,
  namaProyek,
  onBukaGantiProyek
}) => {
  const [pesan, setPesan] = useState('');
  const [tabAktif, setTabAktif] = useState('chat'); // 'chat' atau 'jev_log'
  const [editingSesiId, setEditingSesiId] = useState(null);
  const [editPesanTeks, setEditPesanTeks] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pesan.trim() || sedangMemproses) return;
    onKirimIde(pesan);
    setPesan('');
  };

  const mulaiEdit = (sesi) => {
    setEditingSesiId(sesi.sesi_id);
    setEditPesanTeks(sesi.pesan_mentah);
  };

  const simpanEdit = (sesiId) => {
    if (!editPesanTeks.trim()) return;
    onEditPesan(sesiId, editPesanTeks);
    setEditingSesiId(null);
  };

  return (
    <div
      style={{
        width: '400px',
        height: '100%',
        backgroundColor: tokens.warna.kartu,
        borderRight: `1px solid ${tokens.warna.garis_batas}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header Panel dengan Nama Proyek */}
      <div
        style={{
          padding: `${tokens.spasi.md} ${tokens.spasi.lg}`,
          borderBottom: `1px solid ${tokens.warna.garis_batas}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spasi.sm, overflow: 'hidden' }}>
          <Layers size={18} color={tokens.warna.aksen.utama} style={{ flexShrink: 0 }} />
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: tokens.warna.teks.utama, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {namaProyek || 'Rencana Besar'}
            </div>
            <button
              onClick={onBukaGantiProyek}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: tokens.warna.aksen.muda,
                fontSize: '11px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Ganti / Buat Proyek
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: tokens.spasi.xs, flexShrink: 0 }}>
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
            Obrolan ({daftarObrolan.length})
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

      {/* Konten Area Riwayat Chat & Jev Log */}
      <div style={{ flex: 1, overflowY: 'auto', padding: tokens.spasi.md }}>
        {tabAktif === 'chat' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spasi.md }}>
            {ringkasanIde && (
              <div
                style={{
                  backgroundColor: tokens.warna.latar,
                  border: `1px solid ${tokens.warna.garis_batas}`,
                  borderRadius: tokens.radius.md,
                  padding: tokens.spasi.md,
                }}
              >
                <div style={{ fontSize: '11px', color: tokens.warna.status.info, fontWeight: 600, marginBottom: tokens.spasi.xs }}>
                  RINGKASAN STRUKTUR AKTIF
                </div>
                <div style={{ fontSize: '13px', color: tokens.warna.teks.utama, lineHeight: '1.4' }}>
                  {ringkasanIde}
                </div>
              </div>
            )}

            {/* Riwayat Chat Tersimpan */}
            {daftarObrolan.length === 0 ? (
              <div style={{ fontSize: '12px', color: tokens.warna.teks.sekunder, lineHeight: '1.5', textAlign: 'center', padding: tokens.spasi.lg }}>
                Belum ada pesan untuk proyek ini. Masukkan rencana atau konsep fitur di bawah!
              </div>
            ) : (
              daftarObrolan.map((sesi) => (
                <div
                  key={sesi.sesi_id}
                  style={{
                    backgroundColor: tokens.warna.latar,
                    border: `1px solid ${tokens.warna.garis_batas}`,
                    borderRadius: tokens.radius.md,
                    padding: tokens.spasi.md,
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spasi.xs }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: tokens.warna.teks.redup }}>
                      <Clock size={11} />
                      <span>{new Date(sesi.dibuat_pada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {editingSesiId !== sesi.sesi_id && (
                      <button
                        onClick={() => mulaiEdit(sesi)}
                        title="Edit pesan ini"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: tokens.warna.teks.sekunder,
                          padding: '2px',
                        }}
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>

                  {editingSesiId === sesi.sesi_id ? (
                    <div>
                      <textarea
                        rows={3}
                        value={editPesanTeks}
                        onChange={(e) => setEditPesanTeks(e.target.value)}
                        style={{
                          width: '100%',
                          backgroundColor: tokens.warna.kartu,
                          border: `1px solid ${tokens.warna.aksen.utama}`,
                          borderRadius: tokens.radius.sm,
                          color: tokens.warna.teks.utama,
                          padding: tokens.spasi.xs,
                          fontSize: '12px',
                          outline: 'none',
                          resize: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: tokens.spasi.xs, marginTop: tokens.spasi.xs }}>
                        <button
                          onClick={() => setEditingSesiId(null)}
                          style={{
                            background: 'transparent',
                            border: `1px solid ${tokens.warna.garis_batas}`,
                            color: tokens.warna.teks.sekunder,
                            borderRadius: tokens.radius.sm,
                            padding: '2px 8px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => simpanEdit(sesi.sesi_id)}
                          style={{
                            backgroundColor: tokens.warna.aksen.utama,
                            border: 'none',
                            color: tokens.warna.teks.utama,
                            borderRadius: tokens.radius.sm,
                            padding: '2px 8px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          <Check size={12} />
                          <span>Simpan & Re-verifikasi</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: tokens.warna.teks.utama, lineHeight: '1.4' }}>
                      {sesi.pesan_mentah}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: tokens.warna.teks.sekunder, marginBottom: tokens.spasi.sm }}>
              STATUS AUDIT JEV VERIFIER ENGINE
            </div>
            {logVerifikasi.length === 0 ? (
              <div style={{ fontSize: '12px', color: tokens.warna.teks.redup }}>
                Belum ada verifikasi yang dijalankan untuk proyek ini.
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

      {/* Form Input Obrolan */}
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
          placeholder={sedangMemproses ? 'Jev sedang menganalisis & memverifikasi...' : 'Ketik rencana / fitur baru...'}
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
