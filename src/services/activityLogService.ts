import { loadActiveStaff } from '../data/headerData';
import { exportToExcel, downloadBlob } from '../utils/exportHelpers';

export type ActivityLogCategory =
  | 'Kupon Fee'
  | 'Kupon Fee Mohat'
  | 'Operan Shift'
  | 'SEP & BPJS'
  | 'Pengaturan'
  | 'Jadwal Dokter'
  | 'Operasi Elektif'
  | 'Khitan'
  | 'Jasa Raharja'
  | 'Broadcast WA'
  | 'Dokumen'
  | 'Sistem';

export interface SystemActivityLog {
  id: string;
  timestamp: string; // Precise RFC3339 timestamp (e.g. 2026-09-26T07:15:22.000Z)
  actionType: string; // e.g. COUPON_GENERATED, HANDOVER_SAVED, SEP_STATUS_UPDATED, SETTING_CHANGED
  category: ActivityLogCategory;
  staffName: string; // Hisyam, Alivia, Abi, Ady, Melinda, Agnia, Ismed, Syafik
  details: string;
  metadata?: Record<string, any>;
}

export const STORAGE_KEY_ACTIVITY_LOGS = 'rsumb_system_activity_logs';

/**
 * Infer activity category based on actionType or text
 */
export function inferLogCategory(actionType: string, details: string): ActivityLogCategory {
  const upperType = actionType.toUpperCase();
  const lowerDetails = details.toLowerCase();

  if (upperType.includes('COUPON') || upperType.includes('MOHAT') || lowerDetails.includes('kupon') || lowerDetails.includes('mohat')) {
    return 'Kupon Fee';
  }
  if (upperType.includes('HANDOVER') || lowerDetails.includes('operan') || lowerDetails.includes('handover') || lowerDetails.includes('shift')) {
    return 'Operan Shift';
  }
  if (upperType.includes('SEP') || upperType.includes('BPJS') || lowerDetails.includes('sep') || lowerDetails.includes('hfis') || lowerDetails.includes('bridging')) {
    return 'SEP & BPJS';
  }
  if (upperType.includes('SETTING') || upperType.includes('CONFIG') || lowerDetails.includes('pengaturan') || lowerDetails.includes('printer')) {
    return 'Pengaturan';
  }
  if (upperType.includes('SCHEDULE') || upperType.includes('LEAVE') || lowerDetails.includes('jadwal') || lowerDetails.includes('libur praktik') || lowerDetails.includes('dpjp')) {
    return 'Jadwal Dokter';
  }
  if (upperType.includes('SURGERY') || upperType.includes('OPERASI') || lowerDetails.includes('operasi') || lowerDetails.includes('kamar ok')) {
    return 'Operasi Elektif';
  }
  if (upperType.includes('KHITAN') || lowerDetails.includes('khitan')) {
    return 'Khitan';
  }
  if (upperType.includes('JASA_RAHARJA') || upperType.includes('JR') || lowerDetails.includes('jasa raharja') || lowerDetails.includes('kll') || lowerDetails.includes('plafon')) {
    return 'Jasa Raharja';
  }
  if (upperType.includes('BROADCAST') || upperType.includes('WA') || lowerDetails.includes('broadcast') || lowerDetails.includes('whatsapp')) {
    return 'Broadcast WA';
  }
  if (upperType.includes('DOCUMENT') || lowerDetails.includes('dokumen') || lowerDetails.includes('surat') || lowerDetails.includes('poster')) {
    return 'Dokumen';
  }
  return 'Sistem';
}

/**
 * Seed historical logs for the last 1 to 3 months
 * Covering June 2026, July 2026, August 2026, and September 2026
 */
const SEED_ACTIVITY_LOGS: SystemActivityLog[] = [
  // September 2026 (Recent)
  {
    id: 'log-2026-0925-01',
    timestamp: '2026-09-25T14:42:15.000Z',
    actionType: 'COUPON_GENERATED',
    category: 'Kupon Fee',
    staffName: 'Melinda',
    details: 'Menerbitkan Kupon Fee Mohat #MHT-2026-0925 (Tn. Bambang - Rujukan Desa Babat, Rp 25.000)'
  },
  {
    id: 'log-2026-0925-02',
    timestamp: '2026-09-25T13:20:00.000Z',
    actionType: 'HANDOVER_SAVED',
    category: 'Operan Shift',
    staffName: 'Ady',
    details: 'Menyimpan Catatan Operan Shift Siang: 4 pasien rawat inap terselesaikan verifikasi SEP'
  },
  {
    id: 'log-2026-0925-03',
    timestamp: '2026-09-25T11:05:42.000Z',
    actionType: 'SEP_STATUS_UPDATED',
    category: 'SEP & BPJS',
    staffName: 'Hisyam',
    details: 'Pembaruan status SEP Pasien Ny. Siti Aminah: Bridging HFIS vClaim Sukses Terbit SEP'
  },
  {
    id: 'log-2026-0925-04',
    timestamp: '2026-09-25T09:30:11.000Z',
    actionType: 'SETTING_CHANGED',
    category: 'Pengaturan',
    staffName: 'Alivia',
    details: 'Memperbarui Pengaturan Printer Thermal 58mm & Format Kertas Cetak Slip Mohat'
  },
  {
    id: 'log-2026-0924-01',
    timestamp: '2026-09-24T19:50:30.000Z',
    actionType: 'SURGERY_SAVED',
    category: 'Operasi Elektif',
    staffName: 'Ismed',
    details: 'Menjadwalkan Operasi Elektif Ny. Wahyuni (Laparoskopi Kholsistektomi, OK 2, dr. Bambang, Sp.B)'
  },
  {
    id: 'log-2026-09-24-02',
    timestamp: '2026-09-24T15:12:00.000Z',
    actionType: 'JASA_RAHARJA_UPDATED',
    category: 'Jasa Raharja',
    staffName: 'Agnia',
    details: 'Verifikasi berkas klaim Jasa Raharja Tn. Joko Santoso (Garansi Plafon Rp 20.000.000 terverifikasi)'
  },
  {
    id: 'log-2026-0923-01',
    timestamp: '2026-09-23T10:15:20.000Z',
    actionType: 'KHITAN_REGISTERED',
    category: 'Khitan',
    staffName: 'Abi',
    details: 'Mendaftarkan Peserta Khitan Jumat Barokah An. Raditya Pratama (#KH-094)'
  },
  {
    id: 'log-2026-0922-01',
    timestamp: '2026-09-22T08:30:00.000Z',
    actionType: 'SCHEDULE_ADDED',
    category: 'Jadwal Dokter',
    staffName: 'Syafik',
    details: 'Penyesuaian Jadwal Poliklinik Penyakit Dalam dr. H. Abdurrahman, Sp.PD (Shift Pagi)'
  },
  {
    id: 'log-2026-0921-01',
    timestamp: '2026-09-21T16:40:00.000Z',
    actionType: 'WA_BROADCAST_SENT',
    category: 'Broadcast WA',
    staffName: 'Melinda',
    details: 'Mengirimkan pesan siaran WhatsApp Pengingat Kontrol Poli Bedah ke 14 pasien'
  },
  {
    id: 'log-2026-0920-01',
    timestamp: '2026-09-20T11:25:00.000Z',
    actionType: 'SYSTEM_DRIVE_SYNC',
    category: 'Sistem',
    staffName: 'Hisyam',
    details: 'Sinkronisasi Basis Data Cloud Google Drive (rsumb_database.json) Berhasil'
  },

  // August 2026
  {
    id: 'log-2026-0830-01',
    timestamp: '2026-08-30T14:10:00.000Z',
    actionType: 'HANDOVER_SAVED',
    category: 'Operan Shift',
    staffName: 'Ady',
    details: 'Operan Shift Malam: Rekapitulasi kas loket pendaftaran dan berkas SEP rawat inap tervalidasi'
  },
  {
    id: 'log-2026-0828-01',
    timestamp: '2026-08-28T10:00:00.000Z',
    actionType: 'COUPON_GENERATED',
    category: 'Kupon Fee Mohat',
    staffName: 'Alivia',
    details: 'Penerbitan Kupon Fee Mohat #MHT-2026-0828 (Ny. Kholifah - Sopir Ambulans Desa, Rp 35.000)'
  },
  {
    id: 'log-2026-0825-01',
    timestamp: '2026-08-25T16:30:00.000Z',
    actionType: 'SEP_STATUS_UPDATED',
    category: 'SEP & BPJS',
    staffName: 'Melinda',
    details: 'Update kendala bridging finger print BPJS pasien Tn. Suwarno: Diotorisasi manual oleh Supervisor'
  },
  {
    id: 'log-2026-0820-01',
    timestamp: '2026-08-20T09:45:00.000Z',
    actionType: 'SETTING_CHANGED',
    category: 'Pengaturan',
    staffName: 'Syafik',
    details: 'Pembaruan tarif insentif dinas malam dan uang makan staf loket admisi rawat inap'
  },
  {
    id: 'log-2026-0818-01',
    timestamp: '2026-08-18T13:15:00.000Z',
    actionType: 'SURGERY_SAVED',
    category: 'Operasi Elektif',
    staffName: 'Ismed',
    details: 'Penyusunan Jadwal Operasi Elektif 5 Pasien OK 1 Bedah Ortopedi dr. Hendra, Sp.OT'
  },
  {
    id: 'log-2026-0815-01',
    timestamp: '2026-08-15T15:20:00.000Z',
    actionType: 'KHITAN_REGISTERED',
    category: 'Khitan',
    staffName: 'Abi',
    details: 'Pendaftaran 12 Anak Peserta Khitan Jumat Barokah Edisi Kemerdekaan RSUMB'
  },
  {
    id: 'log-2026-0810-01',
    timestamp: '2026-08-10T11:00:00.000Z',
    actionType: 'JASA_RAHARJA_UPDATED',
    category: 'Jasa Raharja',
    staffName: 'Agnia',
    details: 'Input data kasus KLL ganda jalur Pantura Babat: Penyerapan plafon Jasa Raharja Rp 18.500.000'
  },
  {
    id: 'log-2026-0805-01',
    timestamp: '2026-08-05T08:15:00.000Z',
    actionType: 'DOCTOR_LEAVE_SAVED',
    category: 'Jadwal Dokter',
    staffName: 'Hisyam',
    details: 'Penerbitan Pengumuman Libur Praktik dr. Hj. Nur Aini, Sp.A (Cuti Ilmiah IDI)'
  },
  {
    id: 'log-2026-0801-01',
    timestamp: '2026-08-01T17:00:00.000Z',
    actionType: 'SYSTEM_BACKUP',
    category: 'Sistem',
    staffName: 'Ady',
    details: 'Pencadangan snapshot bulanan SIMRS (rsumb_database_2026-08-01.json) ke Google Drive'
  },

  // July 2026
  {
    id: 'log-2026-0728-01',
    timestamp: '2026-07-28T14:30:00.000Z',
    actionType: 'COUPON_GENERATED',
    category: 'Kupon Fee Mohat',
    staffName: 'Melinda',
    details: 'Penerbitan 3 Kupon Fee Mohat Pasien Rujukan Desa Datinawong (#MHT-2026-0728A/B/C)'
  },
  {
    id: 'log-2026-0722-01',
    timestamp: '2026-07-22T12:00:00.000Z',
    actionType: 'HANDOVER_SAVED',
    category: 'Operan Shift',
    staffName: 'Alivia',
    details: 'Catatan Operan Shift: Pengecekan ketersediaan kamar VIP dan Kelas 1 terkoordinasi'
  },
  {
    id: 'log-2026-0717-01',
    timestamp: '2026-07-17T09:10:00.000Z',
    actionType: 'SEP_STATUS_UPDATED',
    category: 'SEP & BPJS',
    staffName: 'Abi',
    details: 'Penyelesaian kendala SEP Pasien Rujukan Antar RS tipe C ke RSU Muhammadiyah Babat'
  },
  {
    id: 'log-2026-0710-01',
    timestamp: '2026-07-10T16:45:00.000Z',
    actionType: 'WA_BROADCAST_SENT',
    category: 'Broadcast WA',
    staffName: 'Agnia',
    details: 'Broadcast WhatsApp sosialisasi pendaftaran online Mobile JKN ke 45 pasien poli gigi'
  },
  {
    id: 'log-2026-0705-01',
    timestamp: '2026-07-05T10:20:00.000Z',
    actionType: 'SETTING_CHANGED',
    category: 'Pengaturan',
    staffName: 'Ismed',
    details: 'Konfigurasi template pesan WhatsApp pengingat kontrol H-1 poliklinik rawat jalan'
  },

  // June 2026
  {
    id: 'log-2026-0628-01',
    timestamp: '2026-06-28T11:40:00.000Z',
    actionType: 'JASA_RAHARJA_UPDATED',
    category: 'Jasa Raharja',
    staffName: 'Syafik',
    details: 'Pencatatan kasus kecelakaan lalu lintas tunggal Babat-Pucuk, berkas kepolisian terlampir'
  },
  {
    id: 'log-2026-0620-01',
    timestamp: '2026-06-20T15:10:00.000Z',
    actionType: 'COUPON_GENERATED',
    category: 'Kupon Fee Mohat',
    staffName: 'Hisyam',
    details: 'Penerbitan Kupon Fee Mohat Pasien Rawat Inap Rujukan Bidan Desa Moropelang'
  },
  {
    id: 'log-2026-0615-01',
    timestamp: '2026-06-15T08:50:00.000Z',
    actionType: 'SCHEDULE_UPDATED',
    category: 'Jadwal Dokter',
    staffName: 'Ady',
    details: 'Sinkronisasi jadwal DPJP poli mata dan THT dengan HFIS BPJS Kesehatan Cabang Bojonegoro'
  },
  {
    id: 'log-2026-0605-01',
    timestamp: '2026-06-05T13:00:00.000Z',
    actionType: 'SYSTEM_DRIVE_SYNC',
    category: 'Sistem',
    staffName: 'Melinda',
    details: 'Inisialisasi sinkronisasi cloud Google Drive folder /RSUMB_Portal_Data/ pertama kali'
  }
];

/**
 * Load activity logs from localStorage, merging with seed data if fresh
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
    console.error('Failed to load activity logs from localStorage:', err);
  }

  // Initialize with seed logs
  saveActivityLogs(SEED_ACTIVITY_LOGS);
  return SEED_ACTIVITY_LOGS;
}

/**
 * Save activity logs to localStorage and dispatch events
 */
export function saveActivityLogs(logs: SystemActivityLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVITY_LOGS, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save activity logs to localStorage:', err);
  }
}

/**
 * Automated logging function: logSystemActivity
 * Records every operational event with precise RFC3339 timestamps into rsumb_database.json
 */
export function logSystemActivity(
  actionType: string,
  details: string,
  staffName?: string,
  category?: ActivityLogCategory,
  metadata?: Record<string, any>
): SystemActivityLog {
  const currentStaff = staffName || loadActiveStaff()?.name || 'Staf Admisi';
  const assignedCategory = category || inferLogCategory(actionType, details);
  const now = new Date();
  const timestamp = now.toISOString(); // RFC3339 compliant format

  const newLog: SystemActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    actionType,
    category: assignedCategory,
    staffName: currentStaff,
    details,
    metadata
  };

  try {
    const existing = loadActivityLogs();
    // Keep last 1,000 logs to ensure great performance while storing months of logs
    const updated = [newLog, ...existing].slice(0, 1000);
    saveActivityLogs(updated);

    // Notify listeners & cloud sync engine
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rsumb_activity_logged', { detail: newLog }));
      window.dispatchEvent(new CustomEvent('rsumb_data_changed'));
    }
  } catch (err) {
    console.error('Error logging system activity:', err);
  }

  return newLog;
}

/**
 * Filter logs by period
 */
export function filterLogsByPeriod(
  logs: SystemActivityLog[],
  period: '1_month' | '3_months' | 'custom',
  customStart?: string,
  customEnd?: string
): SystemActivityLog[] {
  const now = new Date();

  if (period === '1_month') {
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(now.getDate() - 30);
    return logs.filter((l) => new Date(l.timestamp) >= oneMonthAgo);
  }

  if (period === '3_months') {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(now.getDate() - 90);
    return logs.filter((l) => new Date(l.timestamp) >= threeMonthsAgo);
  }

  if (period === 'custom') {
    return logs.filter((l) => {
      const logDate = new Date(l.timestamp);
      if (customStart) {
        const start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        if (logDate < start) return false;
      }
      if (customEnd) {
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        if (logDate > end) return false;
      }
      return true;
    });
  }

  return logs;
}

/**
 * Export audit logs to Excel (.xlsx)
 */
export async function exportLogsToExcel(logs: SystemActivityLog[], periodLabel: string = '1-3 Bulan Terakhir'): Promise<void> {
  const headers = ['No', 'Waktu (RFC3339)', 'Tanggal & Jam', 'Petugas / Staf', 'Kategori', 'Tipe Aksi', 'Deskripsi Operasional'];

  const data = logs.map((log, index) => {
    const d = new Date(log.timestamp);
    const dateFormatted = d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timeFormatted = d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' WIB';

    return [
      index + 1,
      log.timestamp,
      `${dateFormatted} ${timeFormatted}`,
      log.staffName,
      log.category,
      log.actionType,
      log.details
    ];
  });

  const nowStr = new Date().toISOString().split('T')[0];
  await exportToExcel({
    filename: `RSUMB_Audit_Log_${nowStr}.xlsx`,
    sheetName: 'Audit Trail RSUMB',
    title: 'LAPORAN AUDIT TRAIL & LOG AKTIVITAS OPERASIONAL RSUMB',
    subtitle: `Periode: ${periodLabel} | Filtered Count: ${logs.length} Kejadian`,
    totalLabel: `Total Riwayat Tercatat: ${logs.length} Transaksi / Aksi`,
    headers,
    data,
    columnAlignments: ['center', 'left', 'left', 'left', 'center', 'left', 'left']
  });
}

/**
 * Export audit logs to JSON (.json)
 */
export function exportLogsToJson(logs: SystemActivityLog[]): void {
  const nowStr = new Date().toISOString().split('T')[0];
  const jsonContent = JSON.stringify(logs, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  downloadBlob(blob, `RSUMB_Audit_Log_${nowStr}.json`);
}
