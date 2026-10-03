import React, { useState } from 'react';
import { FolderPlus, Layers, Calendar, ChevronRight, X } from 'lucide-react';
import { tokens } from '../../tokens/design_tokens';

/**
 * ModalProyekBaru (UX-01: Technical Component Name)
 * Tampilan awal untuk membuat atau memilih proyek rencana besar, dilengkapi tombol tutup (X)
 */
export const ModalProyekBaru = ({ daftarProyek, onPilihProyek, onBuatProyek, isOpen, onClose }) => {
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [mode, setMode] = useState(daftarProyek.length > 0 ? 'pilih' : 'buat');

  if (!isOpen) return null;

  const handleBuatSubmit = (e) => {
    e.preventDefault();
    if (!judul.trim()) return;
    onBuatProyek(judul.trim(), deskripsi.trim());
    setJudul('');
    setDeskripsi('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: tokens.spasi.lg,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: tokens.warna.kartu,
          border: `1px solid ${tokens.warna.garis_batas}`,
          borderRadius: tokens.radius.lg,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header Modal dengan Tombol Keluar (X) */}
        <div
          style={{
            padding: `${tokens.spasi.lg} ${tokens.spasi.xl}`,
            borderBottom: `1px solid ${tokens.warna.garis_batas}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spasi.sm }}>
            <Layers size={22} color={tokens.warna.aksen.utama} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: tokens.warna.teks.utama }}>
                Pilih atau Buat Proyek Rencana
              </div>
              <div style={{ fontSize: '12px', color: tokens.warna.teks.sekunder }}>
                Setiap rencana besar memiliki kanvas dan obrolan mandiri
              </div>
            </div>
          </div>

          {/* Tombol X untuk keluar / menutup modal jika ada proyek aktif */}
          {onClose && (
            <button
              onClick={onClose}
              title="Tutup dialog"
              style={{
                background: 'transparent',
                border: 'none',
                color: tokens.warna.teks.sekunder,
                cursor: 'pointer',
                padding: '4px',
                borderRadius: tokens.radius.sm,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = tokens.warna.teks.utama)}
              onMouseLeave={(e) => (e.currentTarget.style.color = tokens.warna.teks.sekunder)}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Tab Pilihan Mode */}
        <div
          style={{
            display: 'flex',
            borderBottom: `1px solid ${tokens.warna.garis_batas}`,
            backgroundColor: tokens.warna.latar,
          }}
        >
          <button
            onClick={() => setMode('pilih')}
            style={{
              flex: 1,
              padding: `${tokens.spasi.sm} ${tokens.spasi.md}`,
              backgroundColor: mode === 'pilih' ? tokens.warna.kartu : 'transparent',
              color: mode === 'pilih' ? tokens.warna.teks.utama : tokens.warna.teks.sekunder,
              border: 'none',
              borderBottom: mode === 'pilih' ? `2px solid ${tokens.warna.aksen.utama}` : 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Buka Proyek ({daftarProyek.length})
          </button>
          <button
            onClick={() => setMode('buat')}
            style={{
              flex: 1,
              padding: `${tokens.spasi.sm} ${tokens.spasi.md}`,
              backgroundColor: mode === 'buat' ? tokens.warna.kartu : 'transparent',
              color: mode === 'buat' ? tokens.warna.teks.utama : tokens.warna.teks.sekunder,
              border: 'none',
              borderBottom: mode === 'buat' ? `2px solid ${tokens.warna.aksen.utama}` : 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: tokens.spasi.xs,
            }}
          >
            <FolderPlus size={15} />
            <span>Buat Proyek Baru</span>
          </button>
        </div>

        {/* Isi Modal */}
        <div style={{ padding: tokens.spasi.xl, maxHeight: '360px', overflowY: 'auto' }}>
          {mode === 'pilih' ? (
            daftarProyek.length === 0 ? (
              <div style={{ textAlign: 'center', padding: tokens.spasi.xl, color: tokens.warna.teks.sekunder }}>
                Belum ada proyek tersimpan. Silakan buat proyek baru.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spasi.sm }}>
                {daftarProyek.map((p) => (
                  <div
                    key={p.rencana_id}
                    onClick={() => onPilihProyek(p.rencana_id)}
                    style={{
                      padding: tokens.spasi.md,
                      backgroundColor: tokens.warna.latar,
                      border: `1px solid ${tokens.warna.garis_batas}`,
                      borderRadius: tokens.radius.md,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: tokens.transisi,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = tokens.warna.aksen.utama)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = tokens.warna.garis_batas)}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: tokens.warna.teks.utama }}>
                        {p.judul}
                      </div>
                      {p.deskripsi && (
                        <div style={{ fontSize: '12px', color: tokens.warna.teks.sekunder, marginTop: '2px' }}>
                          {p.deskripsi}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: '11px',
                          color: tokens.warna.teks.redup,
                          marginTop: tokens.spasi.xs,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Calendar size={12} />
                        <span>{new Date(p.dibuat_pada).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} color={tokens.warna.teks.sekunder} />
                  </div>
                ))}
              </div>
            )
          ) : (
            <form onSubmit={handleBuatSubmit} style={{ display: 'flex', flexDirection: 'column', gap: tokens.spasi.md }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: tokens.warna.teks.sekunder, marginBottom: tokens.spasi.xs }}>
                  NAMA / JUDUL PROYEK BESAR *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Marketplace Ekspor Kerajinan Lokal"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: tokens.warna.latar,
                    border: `1px solid ${tokens.warna.garis_batas}`,
                    borderRadius: tokens.radius.md,
                    padding: `${tokens.spasi.sm} ${tokens.spasi.md}`,
                    color: tokens.warna.teks.utama,
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: tokens.warna.teks.sekunder, marginBottom: tokens.spasi.xs }}>
                  DESKRIPSI SINGKAT ATAU SASARAN
                </label>
                <textarea
                  rows={3}
                  placeholder="Ringkasan objektif atau gambaran umum ide..."
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: tokens.warna.latar,
                    border: `1px solid ${tokens.warna.garis_batas}`,
                    borderRadius: tokens.radius.md,
                    padding: `${tokens.spasi.sm} ${tokens.spasi.md}`,
                    color: tokens.warna.teks.utama,
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: tokens.spasi.sm,
                  backgroundColor: tokens.warna.aksen.utama,
                  color: tokens.warna.teks.utama,
                  border: 'none',
                  padding: `${tokens.spasi.sm} ${tokens.spasi.md}`,
                  borderRadius: tokens.radius.md,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Mulai Proyek Ini
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
