import React, { useState, useEffect } from 'react';
import {
  Plus,
  X,
  CalendarPlus,
  Megaphone,
  Ticket,
  ClipboardList,
  Sparkles,
  Zap
} from 'lucide-react';
import { ActiveNavTab } from '../types';

interface MobileFloatingActionButtonProps {
  onOpenAddSchedule: () => void;
  onNavigateTab: (tab: ActiveNavTab) => void;
  onToggleGemini: () => void;
  activeTab: ActiveNavTab;
}

export const MobileFloatingActionButton: React.FC<MobileFloatingActionButtonProps> = ({
  onOpenAddSchedule,
  onNavigateTab,
  onToggleGemini,
  activeTab
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Close when user presses Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Actions list configuration for quick thumb access
  const quickActions = [
    {
      id: 'add-schedule',
      label: 'Tambah Jadwal DPJP',
      icon: CalendarPlus,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/30',
      badge: 'Jadwal',
      onClick: () => {
        setIsOpen(false);
        onOpenAddSchedule();
      }
    },
    {
      id: 'broadcast-wa',
      label: 'Broadcast WA Pasien',
      icon: Megaphone,
      color: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-900/30',
      badge: 'WhatsApp',
      onClick: () => {
        setIsOpen(false);
        onNavigateTab('contact_patients');
      }
    },
    {
      id: 'kupon-mohat',
      label: 'Kupon Fee Mohat',
      icon: Ticket,
      color: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-900/30',
      badge: 'Fee Mohat',
      onClick: () => {
        setIsOpen(false);
        onNavigateTab('kupon_mohat');
      }
    },
    {
      id: 'patient-notes',
      label: 'Catatan & Operan Shift',
      icon: ClipboardList,
      color: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/30',
      badge: 'Admisi',
      onClick: () => {
        setIsOpen(false);
        onNavigateTab('patient_notes');
      }
    },
    {
      id: 'gemini-ai',
      label: 'Tanya Asisten AI',
      icon: Sparkles,
      color: 'bg-gradient-to-r from-emerald-600 to-[#005d42] hover:from-emerald-700 hover:to-[#004732] text-white shadow-emerald-950/30',
      badge: 'AI SIMRS',
      onClick: () => {
        setIsOpen(false);
        onToggleGemini();
      }
    }
  ];

  return (
    <div className="md:hidden print:hidden no-print">
      {/* Dimmed backdrop when speed dial is expanded */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-2xs z-40 transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating Action Menu Container in bottom-right */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 pointer-events-none">
        {/* Speed-dial action items (unfolds upwards) */}
        {isOpen && (
          <div className="flex flex-col items-end gap-2.5 mb-1 pointer-events-auto animate-in slide-in-from-bottom-5 fade-in duration-200">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.id}
                  className="flex items-center gap-2.5 transition-all group"
                  style={{
                    animationDelay: `${index * 40}ms`
                  }}
                >
                  {/* Text Label Pill (left of the action icon) */}
                  <button
                    type="button"
                    onClick={action.onClick}
                    className="px-3 py-1.5 bg-white text-slate-800 hover:text-[#005d42] text-xs font-bold rounded-xl shadow-lg border border-slate-200/90 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <span>{action.label}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500">
                      {action.badge}
                    </span>
                  </button>

                  {/* Circular Action Icon Button */}
                  <button
                    type="button"
                    onClick={action.onClick}
                    className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer ${action.color}`}
                    aria-label={action.label}
                    title={action.label}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Primary FAB Master Button (thumb-sized 54px circle with glow) */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`pointer-events-auto relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer border border-emerald-300/40 ${
            isOpen
              ? 'bg-slate-900 text-white shadow-slate-950/50 rotate-90 scale-105'
              : 'bg-gradient-to-r from-emerald-600 via-[#005d42] to-emerald-800 text-white shadow-emerald-950/40 hover:scale-105'
          }`}
          aria-label={isOpen ? 'Tutup menu aksi cepat' : 'Buka menu aksi cepat'}
          aria-expanded={isOpen}
          title={isOpen ? 'Tutup menu aksi cepat' : 'Aksi Cepat Mobile (Tambah Jadwal, Broadcast WA, dll)'}
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform" />
          ) : (
            <>
              <div className="relative flex items-center justify-center">
                <Plus className="w-7 h-7 transition-transform stroke-[2.5]" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
              </div>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
