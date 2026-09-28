import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  User,
  Tag,
  Download,
  FileSpreadsheet,
  FileJson,
  RefreshCw,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  SystemActivityLog,
  ActivityLogCategory,
  loadActivityLogs,
  filterLogsByPeriod,
  exportLogsToExcel,
  exportLogsToJson
} from '../../services/activityLogService';

const STAFF_NAMES = [
  'Hisyam',
  'Alivia',
  'Abi',
  'Ady',
  'Melinda',
  'Agnia',
  'Ismed',
  'Syafik'
];

const CATEGORIES: ActivityLogCategory[] = [
  'Kupon Fee',
  'Operan Shift',
  'SEP & BPJS',
  'Pengaturan',
  'Jadwal Dokter',
  'Operasi Elektif',
  'Khitan',
  'Jasa Raharja',
  'Broadcast WA',
  'Dokumen',
  'Sistem'
];

interface ActivityLogAuditTrailProps {
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ActivityLogAuditTrail: React.FC<ActivityLogAuditTrailProps> = ({ showToast }) => {
  const [logs, setLogs] = useState<SystemActivityLog[]>(() => loadActivityLogs());
  const [period, setPeriod] = useState<'1_month' | '3_months' | 'custom'>('1_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Refresh logs when storage changes or on mount
  useEffect(() => {
    const handleLogUpdate = () => {
      setLogs(loadActivityLogs());
    };
    window.addEventListener('rsumb_activity_logged', handleLogUpdate);
    window.addEventListener('rsumb_data_changed', handleLogUpdate);
    return () => {
      window.removeEventListener('rsumb_activity_logged', handleLogUpdate);
      window.removeEventListener('rsumb_data_changed', handleLogUpdate);
    };
  }, []);

  // Filter logs
  const filteredLogs = useMemo(() => {
    // 1. Filter by period
    let result = filterLogsByPeriod(logs, period, customStartDate, customEndDate);

    // 2. Filter by staff
    if (selectedStaff !== 'ALL') {
      result = result.filter(
        (l) => l.staffName.toLowerCase() === selectedStaff.toLowerCase()
      );
    }

    // 3. Filter by category
    if (selectedCategory !== 'ALL') {
      result = result.filter((l) => l.category === selectedCategory);
    }

    // 4. Free text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.details.toLowerCase().includes(q) ||
          l.staffName.toLowerCase().includes(q) ||
          l.actionType.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    return result.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [logs, period, customStartDate, customEndDate, selectedStaff, selectedCategory, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [period, customStartDate, customEndDate, selectedStaff, selectedCategory, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Export handlers
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const periodLabel =
        period === '1_month'
          ? '1 Bulan Terakhir'
          : period === '3_months'
          ? '3 Bulan Terakhir'
          : `Kustom (${customStartDate || 'Awal'} s.d ${customEndDate || 'Sekarang'})`;

      await exportLogsToExcel(filteredLogs, periodLabel);
      showToast?.('Audit log berhasil diekspor ke file Excel (.XLSX)', 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Gagal mengekspor audit log ke Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJson = () => {
    try {
      exportLogsToJson(filteredLogs);
      showToast?.('Audit log berhasil diunduh dalam format .JSON', 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Gagal mengunduh audit log JSON', 'error');
    }
  };

  const handleRefresh = () => {
    setLogs(loadActivityLogs());
    showToast?.('Riwayat audit log disegarkan', 'info');
  };

  // Badge coloring helper
  const getCategoryBadgeClass = (cat: ActivityLogCategory) => {
    switch (cat) {
      case 'Kupon Fee':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Operan Shift':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'SEP & BPJS':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Pengaturan':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'Jadwal Dokter':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Operasi Elektif':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Khitan':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'Jasa Raharja':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Broadcast WA':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Dokumen':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-700 to-[#005d42] text-white rounded-xl shadow-xs shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <h4 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <span>Activity Log & Audit Trail Sistem</span>
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                1-3 Bulan Terakhir
              </span>
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Pencatatan otomatis setiap aksi operasional (Kupon Fee Mohat, Operan Shift, Bridging SEP BPJS, dan Pengaturan) dengan cap waktu presisi RFC3339 tersinkron ke <code className="text-emerald-700 font-mono font-semibold">rsumb_database.json</code>.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
            title="Segarkan Log"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting || filteredLogs.length === 0}
            className="py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-60"
            title="Unduh Audit Log dalam format Microsoft Excel (.XLSX)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
            <span>Ekspor Excel (.XLSX)</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            disabled={filteredLogs.length === 0}
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300 shadow-2xs transition cursor-pointer disabled:opacity-60"
            title="Unduh Audit Log dalam format JSON (.JSON)"
          >
            <FileJson className="w-3.5 h-3.5 text-slate-600" />
            <span>Unduh JSON</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>Periode:</span>
          </span>

          <button
            type="button"
            onClick={() => setPeriod('1_month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              period === '1_month'
                ? 'bg-[#005d42] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            1 Bulan Terakhir
          </button>

          <button
            type="button"
            onClick={() => setPeriod('3_months')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              period === '3_months'
                ? 'bg-[#005d42] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            3 Bulan Terakhir
          </button>

          <button
            type="button"
            onClick={() => setPeriod('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              period === 'custom'
                ? 'bg-[#005d42] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Kustom Rentang Tanggal
          </button>

          {/* Custom Date Inputs */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 pl-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-emerald-600"
                placeholder="Dari Tanggal"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-emerald-600"
                placeholder="Sampai Tanggal"
              />
            </div>
          )}
        </div>

        {/* Staff & Category Selectors + Free Text Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Staff Filter */}
          <div className="relative">
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Petugas / Staf Admisi
            </label>
            <div className="relative">
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                aria-label="Filter berdasarkan Petugas atau Staf Admisi"
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:outline-emerald-600 cursor-pointer"
              >
                <option value="ALL">Semua Staf Admisi</option>
                {STAFF_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Kategori Operasional
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter berdasarkan Kategori Operasional"
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:outline-emerald-600 cursor-pointer"
              >
                <option value="ALL">Semua Kategori Aksi</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Pencarian Cepat
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari deskripsi, no kupon, pasien..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-emerald-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats & Result Count */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 px-1">
        <div className="flex items-center gap-2">
          <span>Menampilkan <b>{filteredLogs.length}</b> riwayat audit</span>
          {(selectedStaff !== 'ALL' || selectedCategory !== 'ALL' || searchQuery) && (
            <span className="text-emerald-700 font-semibold">(difilter)</span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Format Cap Waktu: ISO 8601 / RFC 3339 (WIB)
        </div>
      </div>

      {/* Structured Table View */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-200">
            <thead className="bg-slate-100/80 font-bold text-slate-800">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3 min-w-[170px]">Tanggal & Waktu</th>
                <th className="py-2.5 px-3 min-w-[120px]">Petugas</th>
                <th className="py-2.5 px-3 min-w-[130px]">Kategori</th>
                <th className="py-2.5 px-3 min-w-[160px]">Tipe Aksi</th>
                <th className="py-2.5 px-3 min-w-[280px]">Deskripsi Operasional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">Tidak ada riwayat aktivitas yang cocok</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Coba ubah filter periode, staf, atau kata kunci pencarian.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log, index) => {
                  const itemIndex = (currentPage - 1) * pageSize + index + 1;
                  const dateObj = new Date(log.timestamp);
                  const dateStr = dateObj.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                  const timeStr = dateObj.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {itemIndex}
                      </td>

                      {/* Date & Time with RFC3339 hover tooltip */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div
                          className="flex flex-col cursor-help"
                          title={`RFC3339 Timestamp: ${log.timestamp}`}
                        >
                          <span className="font-bold text-slate-900 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{dateStr}</span>
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {timeStr} WIB
                          </span>
                        </div>
                      </td>

                      {/* Staff Name with Initial Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0 border border-emerald-300">
                            {log.staffName.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800">{log.staffName}</span>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(
                            log.category
                          )}`}
                        >
                          {log.category}
                        </span>
                      </td>

                      {/* Action Type Code */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <code className="text-[11px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {log.actionType}
                        </code>
                      </td>

                      {/* Details */}
                      <td className="py-2.5 px-3">
                        <p className="text-slate-800 text-xs leading-relaxed font-normal">
                          {log.details}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">
              Halaman <b>{currentPage}</b> dari <b>{totalPages}</b>
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
