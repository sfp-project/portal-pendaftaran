import { notifyDataModified } from '../services/dualSyncStorage';
import { loadActiveStaff } from './headerData';
import { exportToExcel } from '../utils/exportHelpers';

export type ActivityLogCategory =
  | 'Kupon Mohat'
  | 'Handover Shift'
  | 'SEP BPJS'
  | 'Pengaturan Sistem'
  | 'Jadwal DPJP'
  | 'Operasi Elektif'
  | 'Khitan Jumat'
  | 'Plafon Jasa Raharja'
  | 'Dokumen Master'
  | 'Cloud Sync';

export interface SystemActivityLog {
  id: string;
  timestamp: string; // RFC3339 format, e.g. 2026-09-26T08:30:15+07:00
  actionType: string;
  category: ActivityLogCategory;
  details: string;
  staffName: string;
  ipOrDevice?: string;
}

export const STORAGE_KEY_ACTIVITY_LOGS = 'rsumb_activity_logs_v1';

/**
 * Format date to precise RFC3339 / ISO 8601 string with WIB (+07:00) timezone offset
 */
export function formatRfc3339Timestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}+07:00`;
}

/**
 * Format RFC3339 string to human-friendly Indonesian date & time
 */
export function formatLogDisplayTime(rfcTimestamp: string): { dateStr: string; timeStr: string } {
  try {
    const d = new Date(rfcTimestamp);
    if (isNaN(d.getTime())) {
      return { dateStr: rfcTimestamp.slice(0, 10), timeStr: rfcTimestamp.slice(11, 19) };
    }
    const dateStr = d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' WIB';
    return { dateStr, timeStr };
  } catch {
    return { dateStr: rfcTimestamp.slice(0, 10), timeStr: rfcTimestamp.slice(11, 19) };
  }
}

/**
 * Seed historical logs spanning the last 1 to 3 months (July, August, September 2026)
 */
export const SEED_ACTIVITY_LOGS: SystemActivityLog[] = [
  // --- September 2026 (Bulan Ini) ---
  {
    id: 'log-20260925-01',
    timestamp: '2026-09-25T21:40:12+07:00',
    actionType: 'Operan Shift Disimpan',
    category: 'Handover Shift',
    details: 'Mencatat operan shift malam kasir: 3 pasien ranap BPJS menunggu konfirmasi surat rujukan faskes 1.',
    staffName: 'Ismed',
    ipOrDevice: 'Loket Admisi 1 (POS-01)'
  },
  {
    id: 'log-20260925-02',
    timestamp: '2026-09-25T19:15:44+07:00',
    actionType: 'Penerbitan Kupon Mohat',
    category: 'Kupon Mohat',
    details: 'Menerbitkan kupon nomor KPN-202609-0018 untuk pasien Ny. Sulastri (Pav. Mina). Fee Rp 35.000 (Pasien UMUM).',
    staffName: 'Melinda',
    ipOrDevice: 'Terminal Kasir Ranap (POS-03)'
  },
  {
    id: 'log-20260925-03',
    timestamp: '2026-09-25T14:22:05+07:00',
    actionType: 'Update Status SEP BPJS',
    category: 'SEP BPJS',
    details: 'Verifikasi sukses surat elegibilitas peserta (SEP) No. 0184R0010926V000845 setelah bridging VClaim.',
    staffName: 'Ady',
    ipOrDevice: 'Admisi BPJS Rawat Jalan'
  },
  {
    id: 'log-20260925-04',
    timestamp: '2026-09-25T10:05:30+07:00',
    actionType: 'Perubahan Jadwal DPJP',
    category: 'Jadwal DPJP',
    details: 'Sinkronisasi jam praktik HFIS BPJS dr. Ilma Alifa, Sp.JP (Jadwal maju ke pukul 08.00 WIB).',
    staffName: 'Hisyam',
    ipOrDevice: 'Pusat Informasi Pendaftaran'
  },
  {
    id: 'log-20260924-01',
    timestamp: '2026-09-24T16:30:00+07:00',
    actionType: 'Sinkronisasi Google Drive',
    category: 'Cloud Sync',
    details: 'Auto-sync database rsumb_database.json berhasil diunggah ke Google Drive (/RSUMB_Portal_Data/).',
    staffName: 'Agnia',
    ipOrDevice: 'SIMRS Cloud Worker'
  },
  {
    id: 'log-20260924-02',
    timestamp: '2026-09-24T11:45:22+07:00',
    actionType: 'Jadwal Operasi Elektif Ditambahkan',
    category: 'Operasi Elektif',
    details: 'Menjadwalkan operasi Ny. Siti Aminah (Lap. Cholecystectomy) di OK 1 Major bersama dr. Rieski Widhanar, Sp.B.',
    staffName: 'Alivia',
    ipOrDevice: 'Koordinator IBS & Admisi'
  },
  {
    id: 'log-20260923-01',
    timestamp: '2026-09-23T15:10:18+07:00',
    actionType: 'Plafon Jasa Raharja Diperbarui',
    category: 'Plafon Jasa Raharja',
    details: 'Update tagihan KLL pasien Tn. Rudi Hartono: Plafon terpakai Rp 18.250.000 / Rp 20.000.000 (Sisa: Rp 1.750.000).',
    staffName: 'Abi',
    ipOrDevice: 'Loket Klaim Jasa Raharja'
  },
  {
    id: 'log-20260922-01',
    timestamp: '2026-09-22T08:50:11+07:00',
    actionType: 'Pendaftaran Khitan Jumat',
    category: 'Khitan Jumat',
    details: 'Mendaftarkan peserta An. Muhammad Fajar (10 thn) untuk Khitan Jumat Berkah kuota ke-3.',
    staffName: 'Hisyam',
    ipOrDevice: 'Loket Registrasi Poli'
  },
  {
    id: 'log-20260921-01',
    timestamp: '2026-09-21T22:10:04+07:00',
    actionType: 'Pengaturan Printer Thermal',
    category: 'Pengaturan Sistem',
    details: 'Uji cetak struk thermal 58mm berhasil dan toggle auto-print kupon setelah simpan data diaktifkan.',
    staffName: 'Syafik',
    ipOrDevice: 'Kasir Shift Malam'
  },
  {
    id: 'log-20260920-01',
    timestamp: '2026-09-20T14:15:33+07:00',
    actionType: 'Surat Resmi Diterbitkan (Auto-Nomor)',
    category: 'Dokumen Master',
    details: 'Menerbitkan Surat Keterangan Bebas Narkoba (SKBN) No. 042/RSUMB/SKBN/IX/2026 untuk Sdr. Ahmad Fauzi.',
    staffName: 'Melinda',
    ipOrDevice: 'Admisi Umum & Surat'
  },

  // --- Agustus 2026 (1 Bulan Lalu) ---
  {
    id: 'log-20260830-01',
    timestamp: '2026-08-30T17:40:00+07:00',
    actionType: 'Kunci Rekap Insentif Bulanan',
    category: 'Pengaturan Sistem',
    details: 'Mengunci arsip rekapitulasi insentif dinas & uang makan periode Agustus 2026 (10 Staf, Total Rp 1.150.000).',
    staffName: 'Hisyam',
    ipOrDevice: 'PJ Pendaftaran & Kasir'
  },
  {
    id: 'log-20260828-01',
    timestamp: '2026-08-28T09:20:15+07:00',
    actionType: 'Pelaksanaan Khitan Jumat',
    category: 'Khitan Jumat',
    details: 'Menandai 5 peserta Khitan Jumat Berkah selesai tindakan dan menerbitkan sertifikat resmi.',
    staffName: 'Alivia',
    ipOrDevice: 'Poli Bedah RSUMB'
  },
  {
    id: 'log-20260825-01',
    timestamp: '2026-08-25T13:10:45+07:00',
    actionType: 'Penerbitan Kupon Mohat',
    category: 'Kupon Mohat',
    details: 'Menerbitkan kupon nomor KPN-202608-0012 untuk rujukan desa armada Mohat Baureno (Fee Rp 25.000).',
    staffName: 'Ady',
    ipOrDevice: 'Loket Admisi Ranap'
  },
  {
    id: 'log-20260822-01',
    timestamp: '2026-08-22T20:30:10+07:00',
    actionType: 'Operan Shift Disimpan',
    category: 'Handover Shift',
    details: 'Catatan operan shift sore ke malam: Pasien KLL Ny. Wulandari limit plafon habis Rp 20 Jt dialihkan ke BPJS.',
    staffName: 'Agnia',
    ipOrDevice: 'Loket Kasir Sore'
  },
  {
    id: 'log-20260818-01',
    timestamp: '2026-08-18T11:05:20+07:00',
    actionType: 'Plafon Jasa Raharja Habis (COB)',
    category: 'Plafon Jasa Raharja',
    details: 'Pasien Tn. Bambang Subagyo mencapai batas plafon maksimal Rp 20.000.000, koordinasi manfaat ke BPJS aktif.',
    staffName: 'Abi',
    ipOrDevice: 'Loket Penjaminan KLL'
  },
  {
    id: 'log-20260815-01',
    timestamp: '2026-08-15T15:45:00+07:00',
    actionType: 'Pembaruan Tarif Kamar Inap',
    category: 'Pengaturan Sistem',
    details: 'Verifikasi otorisasi PIN sukses: Penyesuaian informasi fasilitas promo kamar ber-AC Paviliun Shafa.',
    staffName: 'Melinda',
    ipOrDevice: 'Admin Portal SIMRS'
  },
  {
    id: 'log-20260810-01',
    timestamp: '2026-08-10T08:15:30+07:00',
    actionType: 'Update Status SEP BPJS',
    category: 'SEP BPJS',
    details: 'Penyelesaian kendala fingerprint gagal: Terbit surat keterangan bypass sidik jari disetujui dokter.',
    staffName: 'Hisyam',
    ipOrDevice: 'Loket BPJS 1'
  },
  {
    id: 'log-20260805-01',
    timestamp: '2026-08-05T23:05:12+07:00',
    actionType: 'Sinkronisasi Google Drive',
    category: 'Cloud Sync',
    details: 'Pencadangan rutin otomatis snapshot basis data rsumb_database.json ke cloud storage.',
    staffName: 'Ismed',
    ipOrDevice: 'SIMRS Cloud Service'
  },

  // --- Juli 2026 (2-3 Bulan Lalu) ---
  {
    id: 'log-20260728-01',
    timestamp: '2026-07-28T16:20:00+07:00',
    actionType: 'Penerbitan Kupon Mohat',
    category: 'Kupon Mohat',
    details: 'Penerbitan kupon KPN-202607-0009 rujukan PKM Sekaran (Perujuk: Rp 15.000, Sopir: Rp 5.000, Total Rp 20.000).',
    staffName: 'Ady',
    ipOrDevice: 'Terminal Kasir Ranap'
  },
  {
    id: 'log-20260722-01',
    timestamp: '2026-07-22T10:40:15+07:00',
    actionType: 'Konfigurasi Tarif Mohat',
    category: 'Pengaturan Sistem',
    details: 'Pembaruan ketentuan resmi tarif Mohat: Desa Rp 25k, PKM BPJS Rp 20k, PKM UMUM Rp 35k berlabel "Pasien UMUM".',
    staffName: 'Hisyam',
    ipOrDevice: 'Admin Setting Portal'
  },
  {
    id: 'log-20260715-01',
    timestamp: '2026-07-15T09:15:00+07:00',
    actionType: 'Pengunggahan Dokumen Master',
    category: 'Dokumen Master',
    details: 'Mengunggah formulir baku SPO Pelayanan Rujukan Mohat & Klaim Jasa Raharja ke Google Drive.',
    staffName: 'Alivia',
    ipOrDevice: 'Pusat Dokumen SIMRS'
  },
  {
    id: 'log-20260708-01',
    timestamp: '2026-07-08T14:30:20+07:00',
    actionType: 'Update Status SEP BPJS',
    category: 'SEP BPJS',
    details: 'Pembaruan data rujukan faskes 1 kadaluarsa pasien poli penyakit dalam, bridging SEP sukses.',
    staffName: 'Abi',
    ipOrDevice: 'Loket VClaim Admisi'
  },
  {
    id: 'log-20260702-01',
    timestamp: '2026-07-02T21:10:00+07:00',
    actionType: 'Operan Shift Disimpan',
    category: 'Handover Shift',
    details: 'Handover shift malam: Verifikasi berkas kelengkapan klaim asuransi swasta AdMedika dan Sinarmas.',
    staffName: 'Syafik',
    ipOrDevice: 'Loket Kasir Malam'
  }
];

/**
 * Load system activity logs from LocalStorage with seed fallback
 */
export function loadActivityLogs(): SystemActivityLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVITY_LOGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load activity logs from storage:', err);
  }

  // Fallback to initial seed logs and persist
  saveActivityLogs(SEED_ACTIVITY_LOGS);
  return SEED_ACTIVITY_LOGS;
}

/**
 * Save system activity logs into LocalStorage
 */
export function saveActivityLogs(logs: SystemActivityLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVITY_LOGS, JSON.stringify(logs));
  } catch (err) {
    console.warn('Failed to save activity logs to storage:', err);
  }
}

/**
 * Automatically determine action category from actionType or details
 */
export function detectCategory(actionType: string, details: string): ActivityLogCategory {
  const combined = `${actionType} ${details}`.toLowerCase();
  if (combined.includes('kupon') || combined.includes('mohat') || combined.includes('fee')) return 'Kupon Mohat';
  if (combined.includes('handover') || combined.includes('operan') || combined.includes('catatan shift')) return 'Handover Shift';
  if (combined.includes('sep') || combined.includes('bpjs') || combined.includes('vclaim') || combined.includes('fingerprint')) return 'SEP BPJS';
  if (combined.includes('printer') || combined.includes('pengaturan') || combined.includes('tarif') || combined.includes('setting')) return 'Pengaturan Sistem';
  if (combined.includes('operasi') || combined.includes('ibs') || combined.includes('bedah')) return 'Operasi Elektif';
  if (combined.includes('khitan') || combined.includes('sunat')) return 'Khitan Jumat';
  if (combined.includes('jasa raharja') || combined.includes('kll') || combined.includes('plafon')) return 'Plafon Jasa Raharja';
  if (combined.includes('dokumen') || combined.includes('surat') || combined.includes('skbn')) return 'Dokumen Master';
  if (combined.includes('drive') || combined.includes('sync') || combined.includes('sinkronisasi') || combined.includes('cloud')) return 'Cloud Sync';
  if (combined.includes('jadwal') || combined.includes('dpjp') || combined.includes('dokter')) return 'Jadwal DPJP';
  return 'Pengaturan Sistem';
}

/**
 * Core logging function that records every operational event with precise RFC3339 timestamps
 */
export function logSystemActivity(
  actionType: string,
  details: string,
  staffName?: string,
  category?: ActivityLogCategory
): SystemActivityLog {
  const activeStaff = loadActiveStaff();
  const resolvedStaff = staffName || activeStaff.name || 'Admin Pendaftaran';
  const resolvedCategory = category || detectCategory(actionType, details);
  const nowRfc3339 = formatRfc3339Timestamp(new Date());

  const newLog: SystemActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: nowRfc3339,
    actionType,
    category: resolvedCategory,
    details,
    staffName: resolvedStaff,
    ipOrDevice: `SIMRS Portal (${activeStaff.shift || 'Online'})`
  };

  try {
    const existing = loadActivityLogs();
    // Prepend new log, cap at 500 items for optimal storage
    const updated = [newLog, ...existing].slice(0, 500);
    saveActivityLogs(updated);

    // Notify listeners and trigger silent Google Drive auto-sync
    notifyDataModified('rsumb_activity_logged');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rsumb_activity_logged', { detail: newLog }));
    }
  } catch (err) {
    console.error('Failed to log system activity:', err);
  }

  return newLog;
}

/**
 * Export activity logs to Excel (.xlsx) file
 */
export async function exportActivityLogsToExcel(logs: SystemActivityLog[], filenamePrefix?: string): Promise<void> {
  const now = new Date();
  const dateFormatted = now.toISOString().slice(0, 10);
  const filename = `${filenamePrefix || 'Audit_Trail_SIMRS_RSUMB'}_${dateFormatted}`;

  const headers = [
    'NO',
    'TANGGAL & WAKTU (RFC3339)',
    'WAKTU LOKAL (WIB)',
    'PETUGAS / STAF',
    'KATEGORI',
    'TIPE AKSI',
    'RINCIAN AKTIVITAS OPERASIONAL',
    'TERMINAL / PERANGKAT'
  ];

  const data = logs.map((log, index) => {
    const { dateStr, timeStr } = formatLogDisplayTime(log.timestamp);
    return [
      index + 1,
      log.timestamp,
      `${dateStr} ${timeStr}`,
      log.staffName,
      log.category,
      log.actionType,
      log.details,
      log.ipOrDevice || 'SIMRS Web Portal'
    ];
  });

  await exportToExcel({
    filename,
    title: 'AUDIT TRAIL & LOG AKTIVITAS OPERASIONAL SIMRS',
    subtitle: `RSU Muhammadiyah Babat | Total: ${logs.length} Rekaman Aktivitas Operasional`,
    headers,
    data
  });
}

/**
 * Export activity logs to JSON file
 */
export function exportActivityLogsToJson(logs: SystemActivityLog[], filenamePrefix?: string): void {
  const now = new Date();
  const dateFormatted = now.toISOString().slice(0, 10);
  const filename = `${filenamePrefix || 'Audit_Trail_SIMRS_RSUMB'}_${dateFormatted}.json`;

  const payload = {
    appName: 'SIMRS RSU Muhammadiyah Babat',
    exportedAt: formatRfc3339Timestamp(now),
    totalLogs: logs.length,
    logs
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
