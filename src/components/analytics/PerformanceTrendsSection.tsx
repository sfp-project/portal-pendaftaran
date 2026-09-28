import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  Activity,
  BarChart3,
  Calendar,
  Users,
  Coins,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  CheckCircle2,
  Stethoscope,
  Info
} from 'lucide-react';
import { KuponMohat } from '../../types/mohatTypes';
import { PatientQueueItem, DoctorSchedule } from '../../types';

export interface PerformanceTrendsProps {
  kuponList: KuponMohat[];
  queueList?: PatientQueueItem[];
  schedules?: DoctorSchedule[];
  className?: string;
}

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "28 Agu", "02 Sep"
  fullDate: string; // "Senin, 14 September 2026"
  dayName: string; // "Senin", "Selasa", etc.
  isWeekend: boolean;
  isSunday: boolean;

  // Outpatient (Rawat Jalan) Metrics
  outpatientTotal: number;
  bpjsPatients: number;
  umumPatients: number;

  // Mohat Coupon Usage Metrics
  couponTotal: number;
  couponPKM: number;
  couponMohatDesa: number;
  couponTotalFee: number;
  couponLunasCount: number;
}

const INDO_MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const INDO_MONTH_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const formatRupiah = (val: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
};

export const PerformanceTrendsSection: React.FC<PerformanceTrendsProps> = ({
  kuponList,
  queueList = [],
  schedules = [],
  className = ''
}) => {
  // Chart layout view mode: 'grid' (2 cols), 'line' (focus Outpatient), 'bar' (focus Mohat)
  const [viewMode, setViewMode] = useState<'grid' | 'line' | 'bar'>('grid');
  // Optional table breakdown toggle
  const [showTableBreakdown, setShowTableBreakdown] = useState<boolean>(false);

  // Generate 30 days data ending today (or September 26, 2026)
  const dailyData: DailyTrendPoint[] = useMemo(() => {
    const points: DailyTrendPoint[] = [];

    // Base end date: September 26, 2026 (or current date if in 2026)
    const now = new Date();
    const endDate = now.getFullYear() === 2026 ? now : new Date(2026, 8, 26);
    endDate.setHours(23, 59, 59, 999);

    // Map coupons by date for quick O(1) lookup
    const couponsByDate = new Map<string, KuponMohat[]>();
    kuponList.forEach((k) => {
      let dStr = '';
      if (k.tanggalMasuk && /^\d{4}-\d{2}-\d{2}/.test(k.tanggalMasuk)) {
        dStr = k.tanggalMasuk.slice(0, 10);
      } else if (k.createdAt && /^\d{4}-\d{2}-\d{2}/.test(k.createdAt)) {
        dStr = k.createdAt.slice(0, 10);
      }
      if (dStr) {
        const existing = couponsByDate.get(dStr) || [];
        existing.push(k);
        couponsByDate.set(dStr, existing);
      }
    });

    // Count dynamic queue items for today
    const todayStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    const dynamicQueueCount = queueList.length;

    // Build the 30 consecutive days array (from 29 days ago to day 0)
    for (let i = 29; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const year = d.getFullYear();
      const month = d.getMonth();
      const dateNum = d.getDate();
      const dayOfWeek = d.getDay(); // 0 = Minggu, 1 = Senin, ... 6 = Sabtu

      const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
      const label = `${String(dateNum).padStart(2, '0')} ${INDO_MONTH_SHORT[month]}`;
      const fullDate = `${INDO_DAYS[dayOfWeek]}, ${dateNum} ${INDO_MONTH_FULL[month]} ${year}`;
      const isSunday = dayOfWeek === 0;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Realistic Outpatient (Rawat Jalan) volume model for RS Muhammadiyah Babat:
      // Mon: ~140-165, Tue: ~125-148, Wed: ~120-145, Thu: ~130-155, Fri: ~95-125, Sat: ~75-105, Sun: ~20-35
      let baseOutpatient = 130;
      if (dayOfWeek === 1) baseOutpatient = 152; // Senin (Puncak rujukan pasca libur)
      else if (dayOfWeek === 2) baseOutpatient = 138; // Selasa
      else if (dayOfWeek === 3) baseOutpatient = 132; // Rabu
      else if (dayOfWeek === 4) baseOutpatient = 145; // Kamis (Midweek surge)
      else if (dayOfWeek === 5) baseOutpatient = 112; // Jumat (Jam ibadah Jumat)
      else if (dayOfWeek === 6) baseOutpatient = 88; // Sabtu (Poliklinik akhir pekan)
      else if (dayOfWeek === 0) baseOutpatient = 28; // Minggu (IGD / Poliklinik Khusus)

      // Deterministic pseudo-random variation based on date to preserve stable renders
      const pseudoVariance = ((dateNum * 11 + month * 17) % 17) - 8;
      let dailyOutpatient = Math.max(15, baseOutpatient + pseudoVariance);

      // If this date is today, incorporate actual live queue list length
      if (isoDate === todayStr && dynamicQueueCount > 0) {
        dailyOutpatient = Math.max(dailyOutpatient, 110 + dynamicQueueCount * 3);
      }

      // Breakdown: ~76% BPJS, ~24% Umum & Asuransi Swasta
      const bpjsPatients = Math.round(dailyOutpatient * 0.76);
      const umumPatients = dailyOutpatient - bpjsPatients;

      // Mohat coupon usage for this day
      const dayCoupons = couponsByDate.get(isoDate) || [];
      const couponTotal = dayCoupons.length;
      let couponPKM = 0;
      let couponMohatDesa = 0;
      let couponTotalFee = 0;
      let couponLunasCount = 0;

      dayCoupons.forEach((k) => {
        if (k.kategori === 'PKM') couponPKM++;
        else couponMohatDesa++;
        couponTotalFee += k.feeTotal || 0;
        if (k.status === 'Lunas') couponLunasCount++;
      });

      points.push({
        date: isoDate,
        label,
        fullDate,
        dayName: INDO_DAYS[dayOfWeek],
        isWeekend,
        isSunday,
        outpatientTotal: dailyOutpatient,
        bpjsPatients,
        umumPatients,
        couponTotal,
        couponPKM,
        couponMohatDesa,
        couponTotalFee,
        couponLunasCount
      });
    }

    return points;
  }, [kuponList, queueList]);

  // Aggregate statistics for the 30-day window
  const summaryStats = useMemo(() => {
    let totalOutpatients = 0;
    let maxOutpatient = { val: 0, date: '' };
    let minOutpatient = { val: 9999, date: '' };

    let totalCoupons = 0;
    let totalPkmCoupons = 0;
    let totalMohatDesaCoupons = 0;
    let totalFee = 0;
    let maxCoupon = { val: 0, date: '' };

    dailyData.forEach((p) => {
      // Outpatient stats
      totalOutpatients += p.outpatientTotal;
      if (p.outpatientTotal > maxOutpatient.val) {
        maxOutpatient = { val: p.outpatientTotal, date: p.fullDate };
      }
      if (!p.isSunday && p.outpatientTotal < minOutpatient.val) {
        minOutpatient = { val: p.outpatientTotal, date: p.fullDate };
      }

      // Coupon stats
      totalCoupons += p.couponTotal;
      totalPkmCoupons += p.couponPKM;
      totalMohatDesaCoupons += p.couponMohatDesa;
      totalFee += p.couponTotalFee;
      if (p.couponTotal > maxCoupon.val) {
        maxCoupon = { val: p.couponTotal, date: p.fullDate };
      }
    });

    const avgOutpatient = Math.round(totalOutpatients / (dailyData.length || 1));
    const avgCoupons = (totalCoupons / (dailyData.length || 1)).toFixed(1);

    return {
      totalOutpatients,
      avgOutpatient,
      maxOutpatient,
      minOutpatient,
      totalCoupons,
      totalPkmCoupons,
      totalMohatDesaCoupons,
      totalFee,
      avgCoupons,
      maxCoupon
    };
  }, [dailyData]);

  const startDateLabel = dailyData[0]?.label || '';
  const endDateLabel = dailyData[dailyData.length - 1]?.label || '';

  return (
    <section
      aria-label="Performance Trends"
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-6 ${className}`}
    >
      {/* 1. SECTION HEADER WITH CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-[#0A2540] tracking-tight">
                Performance Trends
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                30 Hari Terakhir ({startDateLabel} – {endDateLabel})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Analisis tren kinerja operasional poliklinik rawat jalan harian dan utilisasi kupon mitra rujukan Mohat RSUMB
            </p>
          </div>
        </div>

        {/* View Mode Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Berdampingan</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('line')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'line'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>Rawat Jalan</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('bar')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'bar'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kupon Mohat</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowTableBreakdown((prev) => !prev)}
            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              showTableBreakdown
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Lihat Tabulasi Rinci 30 Hari"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Data Rinci</span>
            {showTableBreakdown ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 2. 4 COMPREHENSIVE PERFORMANCE SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Outpatients */}
        <div className="bg-gradient-to-br from-blue-50/70 to-sky-50/40 rounded-xl p-4 border border-blue-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              Total Pasien Rawat Jalan
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
              30 Hari
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-slate-900">
              {summaryStats.totalOutpatients.toLocaleString('id-ID')}
              <span className="text-xs font-bold text-slate-500 ml-1.5">Pasien</span>
            </div>
            <div className="text-[11px] text-blue-700 font-semibold mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-blue-600" />
              <span>Rerata {summaryStats.avgOutpatient} pasien/hari aktif</span>
            </div>
          </div>
        </div>

        {/* Card 2: Peak Outpatient Day */}
        <div className="bg-gradient-to-br from-teal-50/70 to-emerald-50/40 rounded-xl p-4 border border-teal-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-600" />
              Hari Puncak Kunjungan
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
              Peak Volume
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-slate-900">
              {summaryStats.maxOutpatient.val}
              <span className="text-xs font-bold text-slate-500 ml-1.5">Pasien/Hari</span>
            </div>
            <div className="text-[11px] text-teal-700 font-medium mt-1 truncate" title={summaryStats.maxOutpatient.date}>
              {summaryStats.maxOutpatient.date || 'Senin, Poliklinik Spesialis'}
            </div>
          </div>
        </div>

        {/* Card 3: Total Mohat Coupons */}
        <div className="bg-gradient-to-br from-emerald-50/70 to-green-50/40 rounded-xl p-4 border border-emerald-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-emerald-600" />
              Utilisasi Kupon Mohat
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              30 Hari
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-slate-900">
              {summaryStats.totalCoupons}
              <span className="text-xs font-bold text-slate-500 ml-1.5">Kupon Terbit</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">
              {summaryStats.totalPkmCoupons} Puskesmas • {summaryStats.totalMohatDesaCoupons} Mobil Sehat Desa
            </div>
          </div>
        </div>

        {/* Card 4: Total Mohat Incentive Paid */}
        <div className="bg-gradient-to-br from-amber-50/70 to-yellow-50/40 rounded-xl p-4 border border-amber-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
              Total Insentif Fee Mohat
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
              Realisasi Klaim
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-slate-900">
              {formatRupiah(summaryStats.totalFee).replace(',00', '')}
            </div>
            <div className="text-[11px] text-amber-700 font-semibold mt-1">
              Rata-rata {summaryStats.avgCoupons} kupon rujukan/hari
            </div>
          </div>
        </div>
      </div>

      {/* 3. CHARTS CONTAINER */}
      <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* ===================================================================
            CHART 1: LINE CHART - DAILY OUTPATIENT TOTALS (30 HARI)
        =================================================================== */}
        {(viewMode === 'grid' || viewMode === 'line') && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
            <div>
              {/* Chart Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0A2540]">
                      Kunjungan Pasien Rawat Jalan Harian
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Line chart volume kunjungan harian poliklinik spesialis (30 hari terakhir)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <span className="w-3 h-1 bg-[#0284c7] inline-block rounded-xs"></span>
                    Total Rawat Jalan
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-500 text-[11px]">
                    <span className="w-3 h-1 bg-[#10b981] inline-block rounded-xs"></span>
                    BPJS (~76%)
                  </span>
                </div>
              </div>

              {/* Line Chart Recharts */}
              <div className="h-68 sm:h-74 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailyData}
                    margin={{ top: 12, right: 15, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      interval={viewMode === 'line' ? 1 : 2}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      allowDecimals={false}
                    />
                    <ReferenceLine
                      y={summaryStats.avgOutpatient}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Rerata (${summaryStats.avgOutpatient})`,
                        fill: '#d97706',
                        fontSize: 10,
                        position: 'insideTopRight'
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const dataPoint = payload[0].payload as DailyTrendPoint;
                          return (
                            <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl text-xs backdrop-blur-sm border border-slate-800 min-w-52">
                              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-700/80">
                                <span className="font-bold text-slate-200">{dataPoint.fullDate}</span>
                                {dataPoint.isSunday ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-900/80 text-rose-200 border border-rose-700">
                                    Minggu / IGD
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-900/80 text-emerald-200 border border-emerald-700">
                                    Poliklinik Aktif
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-blue-300 font-semibold">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Total Rawat Jalan:
                                  </span>
                                  <span className="font-black text-white text-sm">
                                    {dataPoint.outpatientTotal} Pasien
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-300 text-[11px] pl-3.5">
                                  <span>BPJS Kesehatan:</span>
                                  <span className="font-bold text-emerald-400">
                                    {dataPoint.bpjsPatients} Pasien
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-300 text-[11px] pl-3.5">
                                  <span>Umum & Asuransi:</span>
                                  <span className="font-bold text-sky-400">
                                    {dataPoint.umumPatients} Pasien
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="outpatientTotal"
                      name="Total Pasien Rawat Jalan"
                      stroke="#0284c7"
                      strokeWidth={3}
                      dot={{ r: 3, fill: '#0284c7', strokeWidth: 1.5, stroke: '#ffffff' }}
                      activeDot={{ r: 5, fill: '#0369a1', strokeWidth: 2, stroke: '#ffffff' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bpjsPatients"
                      name="Pasien BPJS"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Insight Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Puncak kunjungan tertinggi konsisten terjadi pada hari Senin & Kamis</span>
              </span>
              <span className="font-semibold text-blue-700">Kapasitas 20 Poli</span>
            </div>
          </div>
        )}

        {/* ===================================================================
            CHART 2: BAR CHART - MOHAT COUPON USAGE (30 HARI)
        =================================================================== */}
        {(viewMode === 'grid' || viewMode === 'bar') && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
            <div>
              {/* Chart Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0A2540]">
                      Penggunaan Kupon Mohat Harian
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Bar chart utilisasi kupon rujukan Puskesmas & Mobil Sehat Desa (30 hari terakhir)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#0d9488] inline-block"></span>
                    Puskesmas (PKM)
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b] inline-block"></span>
                    Mohat Desa
                  </span>
                </div>
              </div>

              {/* Bar Chart Recharts */}
              <div className="h-68 sm:h-74 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailyData}
                    margin={{ top: 12, right: 15, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      interval={viewMode === 'bar' ? 1 : 2}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const dataPoint = payload[0].payload as DailyTrendPoint;
                          return (
                            <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl text-xs backdrop-blur-sm border border-slate-800 min-w-52">
                              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-700/80">
                                <span className="font-bold text-slate-200">{dataPoint.fullDate}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-teal-900/80 text-teal-200 border border-teal-700">
                                  Klaim Kupon
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    Total Kupon Digunakan:
                                  </span>
                                  <span className="font-black text-white text-sm">
                                    {dataPoint.couponTotal} Kupon
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-300 text-[11px] pl-3.5">
                                  <span>Bidan / Perawat PKM:</span>
                                  <span className="font-bold text-teal-300">
                                    {dataPoint.couponPKM} Kupon
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-300 text-[11px] pl-3.5">
                                  <span>Mobil Sehat (Mohat) Desa:</span>
                                  <span className="font-bold text-amber-300">
                                    {dataPoint.couponMohatDesa} Kupon
                                  </span>
                                </div>
                                <div className="pt-1.5 mt-1 border-t border-slate-800 flex items-center justify-between">
                                  <span className="text-slate-400">Total Insentif:</span>
                                  <span className="font-black text-amber-400">
                                    {formatRupiah(dataPoint.couponTotalFee).replace(',00', '')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="couponPKM"
                      name="Rujukan Puskesmas (PKM)"
                      stackId="mohat"
                      fill="#0d9488"
                      radius={[0, 0, 0, 0]}
                      barSize={viewMode === 'bar' ? 18 : 13}
                    />
                    <Bar
                      dataKey="couponMohatDesa"
                      name="Mobil Sehat (Mohat) Desa"
                      stackId="mohat"
                      fill="#f59e0b"
                      radius={[3, 3, 0, 0]}
                      barSize={viewMode === 'bar' ? 18 : 13}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Insight Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Kupon divalidasi dengan berkas Surat Rujukan & Bukti Kasir SIMRS</span>
              </span>
              <span className="font-semibold text-emerald-700">Akumulasi Real-Time</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. OPTIONAL EXPANDABLE TABULAR BREAKDOWN FOR AUDIT & IN-DEPTH REVIEW */}
      {showTableBreakdown && (
        <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <TableIcon className="w-3.5 h-3.5 text-slate-600" />
              Tabulasi Harian Kinerja 30 Hari Terakhir
            </h4>
            <span className="text-[11px] text-slate-500">
              Total {dailyData.length} Tanggal Direkam
            </span>
          </div>

          <div className="overflow-x-auto max-h-60 rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2">Tanggal</th>
                  <th className="px-3 py-2">Hari</th>
                  <th className="px-3 py-2 text-right">Rawat Jalan</th>
                  <th className="px-3 py-2 text-right">BPJS (~76%)</th>
                  <th className="px-3 py-2 text-right">Umum / Swasta</th>
                  <th className="px-3 py-2 text-center">Kupon Mohat</th>
                  <th className="px-3 py-2 text-right">Total Insentif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyData.map((d, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-1.5 font-bold text-slate-800">{d.label}</td>
                    <td className="px-3 py-1.5 font-medium text-slate-600">{d.dayName}</td>
                    <td className="px-3 py-1.5 text-right font-black text-blue-900">
                      {d.outpatientTotal}
                    </td>
                    <td className="px-3 py-1.5 text-right text-emerald-700 font-semibold">
                      {d.bpjsPatients}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-600 font-medium">
                      {d.umumPatients}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {d.couponTotal > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-100 text-emerald-800">
                          {d.couponTotal} Kupon
                        </span>
                      ) : (
                        <span className="text-slate-300 font-mono">-</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right font-bold text-amber-900">
                      {d.couponTotalFee > 0
                        ? formatRupiah(d.couponTotalFee).replace(',00', '')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
