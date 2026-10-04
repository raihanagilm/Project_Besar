import React, { useState } from 'react';
import {
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Edit2,
  Check,
  X,
  Clock,
  Zap,
  BrainCircuit,
  Loader2,
  ArrowRight,
  Database,
  MessageSquare,
  FileText,
  Sparkles
} from 'lucide-react';
import { tokens } from '../../tokens/design_tokens';

/**
 * ChatPanel (UX-01: Technical Component Name)
 * Memisahkan secara tegas:
 * 1. Riwayat Chat: Pemikiran & instruksi teks pengguna (bisa diedit).
 * 2. Riwayat ERD / Arsitektur: Rekaman struktur tabel, kolom, & diagram terkini.
 * 3. Jev Log: Hasil audit formal engine.
 */
export const ChatPanel = ({
  daftarObrolan,
  onKirimIde,
  onEditPesan,
  sedangMemproses,
  logVerifikasi,
  ringkasanIde,
  namaProyek,
  onBukaGantiProyek,
  modeChat,
  setModeChat,
  onTerapkanOpsi,
  nodesTerkini,
  teksPesanTerfokus,
  setTeksPesanTerfokus
}) => {
  const [pesan, setPesan] = useState('');
  const [tabAktif, setTabAktif] = useState('chat'); // 'chat' | 'rangkuman' | 'jev_log'
  const [editingSesiId, setEditingSesiId] = useState(null);
  const [editPesanTeks, setEditPesanTeks] = useState('');

  // Sinkronisasi teks input jika ada trigger fokus dari klik kanan node
  React.useEffect(() => {
    if (teksPesanTerfokus) {
      setPesan(teksPesanTerfokus);
      setTabAktif('chat');
    }
  }, [teksPesanTerfokus]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pesan.trim() || sedangMemproses) return;
    onKirimIde(pesan);
    setPesan('');
    if (setTeksPesanTerfokus) setTeksPesanTerfokus('');
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
        width: '430px',
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

        {/* Tab: Riwayat Chat | Rangkuman Sistem | Jev Log */}
        <div style={{ display: 'flex', gap: tokens.spasi.xs, flexShrink: 0 }}>
          <button
            onClick={() => setTabAktif('chat')}
            title="Riwayat pesan pemikiran pengguna"
            style={{
              padding: `${tokens.spasi.xs} 7px`,
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: tabAktif === 'chat' ? tokens.warna.aksen.utama : 'transparent',
              color: tabAktif === 'chat' ? tokens.warna.teks.utama : tokens.warna.teks.sekunder,
              border: 'none',
              borderRadius: tokens.radius.sm,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <MessageSquare size={12} />
            <span>Chat ({daftarObrolan.length})</span>
          </button>

          <button
            onClick={() => setTabAktif('rangkuman')}
            title="Rangkuman arsitektur sistem proyek ini"
            style={{
              padding: `${tokens.spasi.xs} 7px`,
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: tabAktif === 'rangkuman' ? tokens.warna.status.info : 'transparent',
              color: tabAktif === 'rangkuman' ? tokens.warna.teks.utama : tokens.warna.teks.sekunder,
              border: 'none',
              borderRadius: tokens.radius.sm,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <FileText size={12} />
            <span>Rangkuman</span>
          </button>

          <button
            onClick={() => setTabAktif('jev_log')}
            title="Log audit verifikasi Jev"
            style={{
              padding: `${tokens.spasi.xs} 7px`,
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
            <ShieldCheck size={12} />
            <span>Jev</span>
          </button>
        </div>
      </div>

      {/* Konten Area Tab */}
      <div style={{ flex: 1, overflowY: 'auto', padding: tokens.spasi.md }}>
        {/* TAB 1: RIWAYAT CHAT */}
        {tabAktif === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spasi.md }}>
            <div style={{ fontSize: '11px', color: tokens.warna.teks.redup, fontWeight: 600, textTransform: 'uppercase' }}>
              Riwayat Obrolan & Pemikiran Ide
            </div>

            {daftarObrolan.length === 0 ? (
              <div style={{ fontSize: '12px', color: tokens.warna.teks.sekunder, lineHeight: '1.5', textAlign: 'center', padding: tokens.spasi.lg }}>
                Belum ada pesan obrolan untuk proyek ini. Masukkan ide atau instruksi di bawah!
              </div>
            ) : (
              daftarObrolan.map((sesi, index) => {
                const thinkingData = sesi.hasil_verifikasi?.mode === 'thinking' ? sesi.hasil_verifikasi.hasil_thinking : null;
                const isPesanTerakhir = index === daftarObrolan.length - 1;

                return (
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
                      {/* Hanya chat terakhir yang dapat diedit */}
                      {isPesanTerakhir && editingSesiId !== sesi.sesi_id && (
                        <button
                          onClick={() => mulaiEdit(sesi)}
                          title="Edit pesan terakhir ini"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: tokens.warna.aksen.muda,
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                          }}
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
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
                            <span>Simpan</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '13px', color: tokens.warna.teks.utama, lineHeight: '1.4' }}>
                          {sesi.pesan_mentah}
                        </div>

                        {/* Rekomendasi Opsi Thinking */}
                        {thinkingData && (
                          <div style={{ marginTop: tokens.spasi.sm, borderTop: `1px dashed ${tokens.warna.garis_batas}`, paddingTop: tokens.spasi.sm }}>
                            <div style={{ fontSize: '12px', color: tokens.warna.teks.sekunder, fontStyle: 'italic', marginBottom: tokens.spasi.sm }}>
                              {thinkingData.analisa_pemikiran}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spasi.sm }}>
                              {(thinkingData.opsi_rekomendasi || []).map((opsi, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    backgroundColor: tokens.warna.kartu,
                                    border: `1px solid ${tokens.warna.garis_batas}`,
                                    borderRadius: tokens.radius.sm,
                                    padding: tokens.spasi.sm,
                                  }}
                                >
                                  <div style={{ fontWeight: 600, fontSize: '12px', color: tokens.warna.status.info }}>
                                    {opsi.judul}
                                  </div>
                                  <div style={{ fontSize: '11px', color: tokens.warna.teks.utama, marginTop: '2px' }}>
                                    {opsi.penjelasan}
                                  </div>
                                  <button
                                    onClick={() => onTerapkanOpsi(opsi.instruksi_diagram || opsi.judul)}
                                    style={{
                                      marginTop: tokens.spasi.xs,
                                      backgroundColor: tokens.warna.aksen.utama,
                                      border: 'none',
                                      borderRadius: tokens.radius.sm,
                                      color: tokens.warna.teks.utama,
                                      padding: '3px 8px',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <span>Terapkan Opsi Ini</span>
                                    <ArrowRight size={11} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Animasi Loading Transparan */}
            {sedangMemproses && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spasi.sm,
                  padding: tokens.spasi.md,
                  backgroundColor: tokens.warna.latar,
                  border: `1px dashed ${tokens.warna.aksen.utama}`,
                  borderRadius: tokens.radius.md,
                  color: tokens.warna.teks.utama,
                  fontSize: '12px',
                }}
              >
                <Loader2 size={16} className="spin-animation" color={tokens.warna.aksen.utama} />
                <span>
                  {modeChat === 'fast'
                    ? 'Sedang mengekstrak dan memverifikasi diagram...'
                    : 'Sedang menganalisa arsitektur dan opsi alternatif...'}
                </span>
              </div>
            )}
          </div>
        )}



        {/* TAB 2: RANGKUMAN ARSITEKTUR & SISTEM */}
        {tabAktif === 'rangkuman' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spasi.md }}>
            <div style={{ fontSize: '11px', color: tokens.warna.teks.redup, fontWeight: 600, textTransform: 'uppercase' }}>
              Rangkuman Komprehensif Arsitektur Sistem
            </div>

            <div
              style={{
                backgroundColor: tokens.warna.latar,
                border: `1px solid ${tokens.warna.garis_batas}`,
                borderRadius: tokens.radius.md,
                padding: tokens.spasi.md,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: tokens.spasi.xs }}>
                <FileText size={15} color={tokens.warna.status.info} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: tokens.warna.teks.utama }}>
                  Overview Ide Proyek
                </span>
              </div>
              <p style={{ fontSize: '12px', color: tokens.warna.teks.utama, lineHeight: '1.6', margin: 0 }}>
                {ringkasanIde || (
                  <span style={{ color: tokens.warna.teks.sekunder, fontStyle: 'italic' }}>
                    Belum ada rangkuman sistem yang digenerate. Kirimkan ide atau instruksi pertama Anda melalui chat untuk membentuk arsitektur lengkap!
                  </span>
                )}
              </p>
            </div>

            {/* Statistik Entitas Tersimpan */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: tokens.spasi.sm,
              }}
            >
              <div
                style={{
                  backgroundColor: tokens.warna.latar,
                  border: `1px solid ${tokens.warna.garis_batas}`,
                  borderRadius: tokens.radius.sm,
                  padding: tokens.spasi.sm,
                }}
              >
                <div style={{ fontSize: '10px', color: tokens.warna.teks.redup, textTransform: 'uppercase', fontWeight: 700 }}>
                  TABEL ERD
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: tokens.warna.aksen.utama, marginTop: '2px' }}>
                  {(nodesTerkini || []).filter((n) => n.type === 'erdNode').length}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: tokens.warna.latar,
                  border: `1px solid ${tokens.warna.garis_batas}`,
                  borderRadius: tokens.radius.sm,
                  padding: tokens.spasi.sm,
                }}
              >
                <div style={{ fontSize: '10px', color: tokens.warna.teks.redup, textTransform: 'uppercase', fontWeight: 700 }}>
                  SIMPUL WORKFLOW
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: tokens.warna.status.info, marginTop: '2px' }}>
                  {(nodesTerkini || []).filter((n) => n.type === 'workflowNode' || n.type === 'useCaseNode').length}
                </div>
              </div>
            </div>

            {/* Rekap Struktur Tabel & Workflow Terkini */}
            <div
              style={{
                backgroundColor: tokens.warna.latar,
                border: `1px solid ${tokens.warna.garis_batas}`,
                borderRadius: tokens.radius.md,
                padding: tokens.spasi.md,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: tokens.spasi.xs }}>
                <Database size={14} color={tokens.warna.aksen.utama} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: tokens.warna.teks.utama }}>
                  Daftar Entitas Sistem Terkini
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(nodesTerkini || []).map((n) => {
                  const label = n.type === 'erdNode' ? `[Tabel] ${n.data?.nama_tabel}` : `[Workflow] ${n.data?.aktor || n.data?.label || n.data?.langkah}`;
                  const isErd = n.type === 'erdNode';
                  return (
                    <span
                      key={n.id}
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: tokens.radius.sm,
                        backgroundColor: isErd ? 'rgba(79, 70, 229, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        border: `1px solid ${isErd ? '#4f46e5' : '#38bdf8'}`,
                        color: isErd ? '#a5b4fc' : '#7dd3fc',
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                padding: tokens.spasi.sm,
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                border: '1px dashed #38bdf8',
                borderRadius: tokens.radius.sm,
                fontSize: '11px',
                color: '#cbd5e1',
                lineHeight: '1.5',
              }}
            >
              💡 Seluruh riwayat chat di atas dan struktur entitas terkini dibaca utuh oleh AI engine setiap instruksi baru, sehingga respon tidak sepotong-potong melainkan menyempurnakan arsitektur proyek secara berkelanjutan.
            </div>
          </div>
        )}
        {tabAktif === 'jev_log' && (
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

      {/* Switch Mode Chat: Fast vs Thinking */}
      <div
        style={{
          padding: `6px ${tokens.spasi.md}`,
          backgroundColor: tokens.warna.latar,
          borderTop: `1px solid ${tokens.warna.garis_batas}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '11px', color: tokens.warna.teks.redup, fontWeight: 600 }}>MODE:</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setModeChat('fast')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: tokens.radius.sm,
              fontSize: '11px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: modeChat === 'fast' ? tokens.warna.aksen.utama : 'transparent',
              color: modeChat === 'fast' ? tokens.warna.teks.utama : tokens.warna.teks.sekunder,
            }}
          >
            <Zap size={12} />
            <span>Fast</span>
          </button>
          <button
            type="button"
            onClick={() => setModeChat('thinking')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: tokens.radius.sm,
              fontSize: '11px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: modeChat === 'thinking' ? tokens.warna.status.info : 'transparent',
              color: modeChat === 'thinking' ? tokens.warna.teks.utama : tokens.warna.teks.sekunder,
            }}
          >
            <BrainCircuit size={12} />
            <span>Thinking</span>
          </button>
        </div>
      </div>

      {/* Indikator Mode Scoped AI /bagianini */}
      {pesan.trim().startsWith('/') && (
        <div
          style={{
            padding: `4px ${tokens.spasi.md}`,
            backgroundColor: 'rgba(56, 189, 248, 0.12)',
            borderTop: '1px solid #0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#38bdf8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={13} color="#38bdf8" />
            <span style={{ fontWeight: 600 }}>Mode Edit Terfokus:</span>
            <span>AI hanya akan merombak bagian <code>{pesan.trim().split(' ')[0]}</code></span>
          </div>
          <button
            type="button"
            onClick={() => {
              setPesan('');
              if (setTeksPesanTerfokus) setTeksPesanTerfokus('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: tokens.warna.teks.sekunder,
              cursor: 'pointer',
              fontSize: '11px',
              padding: '2px 4px',
            }}
          >
            Batal
          </button>
        </div>
      )}

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
          placeholder={
            sedangMemproses
              ? 'Sedang memproses...'
              : modeChat === 'fast'
              ? 'Tulis ide untuk langsung dibuatkan diagram...'
              : 'Tanyakan arsitektur atau diskusikan ide...'
          }
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
          {sedangMemproses ? <Loader2 size={15} className="spin-animation" /> : <Send size={15} />}
        </button>
      </form>
    </div>
  );
};
