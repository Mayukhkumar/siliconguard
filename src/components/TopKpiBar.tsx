import React from 'react';
import {
  Activity,
  Cloud,
  Cpu,
  Download,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { ChipProfileMeta, SessionKpis } from '../types/silicon';

interface TopKpiBarProps {
  activeProfile: ChipProfileMeta;
  isLiveClock: boolean;
  kpis: SessionKpis;
  onReset: () => void;
  onExportJson: () => void;
  onOpenFormulaModal: () => void;
  onOpenCloudModal: () => void;
}

export const TopKpiBar: React.FC<TopKpiBarProps> = ({
  activeProfile,
  isLiveClock,
  kpis,
  onReset,
  onExportJson,
  onOpenFormulaModal,
  onOpenCloudModal,
}) => {
  const { nTotal, nLogic, nSide, trustScore } = kpis;

  const trustColor =
    trustScore >= 85
      ? { text: 'text-[#10B981]', bar: 'bg-[#10B981]', border: 'border-[#10B981]/30' }
      : trustScore >= 50
        ? { text: 'text-[#F59E0B]', bar: 'bg-[#F59E0B]', border: 'border-[#F59E0B]/30' }
        : { text: 'text-[#EF4444]', bar: 'bg-[#EF4444]', border: 'border-[#EF4444]/30' };

  const profileBadgeClass =
    activeProfile.id === 'clean'
      ? 'border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]'
      : activeProfile.id === 'dormant_logic'
        ? 'border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]'
        : 'border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]';

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#27272A] bg-[#111114] px-4 py-2.5">
      {/* Left: Brand, Active Profile Pill, Live Clock */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-[#27272A] bg-[#18181B] text-[#06B6D4]">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-[#F4F4F5]">
              <span>SiliconGuard</span>
              <span className="font-mono text-xs font-normal text-[#A1A1AA]">
                // Hardware Verification Engine
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider ${profileBadgeClass}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                CUT: {activeProfile.name.toUpperCase()}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] ${
                  isLiveClock
                    ? 'border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]'
                    : 'border-[#27272A] bg-[#18181B] text-[#A1A1AA]'
                }`}
              >
                <Activity className={`h-3 w-3 ${isLiveClock ? 'animate-pulse' : ''}`} />
                {isLiveClock ? 'CLK LIVE · 3 Hz' : 'CLK STANDBY'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center: 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* 1. Cycles Analyzed */}
        <div className="flex min-w-[128px] flex-col justify-between rounded border border-[#27272A] bg-[#18181B] px-3 py-1.5">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-[#A1A1AA]">
            <span>Cycles Analyzed</span>
            <span className="font-mono text-[#06B6D4]">N_total</span>
          </div>
          <div className="mt-0.5 font-mono text-lg font-semibold leading-tight text-[#F4F4F5]">
            {nTotal}
          </div>
        </div>

        {/* 2. Logic Mismatches */}
        <div
          className={`flex min-w-[132px] flex-col justify-between rounded border px-3 py-1.5 transition-colors ${
            nLogic > 0
              ? 'border-[#EF4444]/60 bg-[#EF4444]/10'
              : 'border-[#27272A] bg-[#18181B]'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-[#A1A1AA]">
            <span>Logic Mismatches</span>
            <span className="font-mono text-[#A1A1AA]">N_logic</span>
          </div>
          <div
            className={`mt-0.5 flex items-center gap-1.5 font-mono text-lg font-semibold leading-tight ${
              nLogic > 0 ? 'text-[#EF4444]' : 'text-[#F4F4F5]'
            }`}
          >
            {nLogic > 0 && <ShieldAlert className="h-4 w-4 text-[#EF4444]" />}
            <span>{nLogic}</span>
          </div>
        </div>

        {/* 3. Side-Channel Flags */}
        <div
          className={`flex min-w-[138px] flex-col justify-between rounded border px-3 py-1.5 transition-colors ${
            nSide > 0
              ? 'border-[#F59E0B]/60 bg-[#F59E0B]/10'
              : 'border-[#27272A] bg-[#18181B]'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-[#A1A1AA]">
            <span>Side-Channel Flags</span>
            <span className="font-mono text-[#A1A1AA]">N_side</span>
          </div>
          <div
            className={`mt-0.5 font-mono text-lg font-semibold leading-tight ${
              nSide > 0 ? 'text-[#F59E0B]' : 'text-[#F4F4F5]'
            }`}
          >
            {nSide}
          </div>
        </div>

        {/* 4. Chip Trust Score */}
        <div
          className={`flex min-w-[155px] flex-col justify-between rounded border bg-[#18181B] px-3 py-1.5 ${trustColor.border}`}
        >
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-[#A1A1AA]">
            <span>Chip Trust Score</span>
            <ShieldCheck className={`h-3.5 w-3.5 ${trustColor.text}`} />
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className={`font-mono text-lg font-semibold leading-tight ${trustColor.text}`}>
              {trustScore}%
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#27272A]">
              <div
                className={`h-full transition-all duration-300 ${trustColor.bar}`}
                style={{ width: `${trustScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right: Formula Reference, Reset Session, Export JSON */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenFormulaModal}
          title="5-Stage Detection Formula Reference"
          className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#27272A] bg-[#18181B] font-mono text-xs font-semibold text-[#06B6D4] transition-colors hover:border-[#06B6D4]/60 hover:bg-[#06B6D4]/10"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-8 items-center gap-1.5 rounded border border-[#27272A] bg-[#18181B] px-2.5 text-xs font-medium text-[#F4F4F5] transition-colors hover:border-[#3F3F46] hover:bg-[#27272A]"
        >
          <RotateCcw className="h-3.5 w-3.5 text-[#A1A1AA]" />
          <span>Reset Session</span>
        </button>

        <button
          type="button"
          onClick={onOpenCloudModal}
          className="inline-flex h-8 items-center gap-1.5 rounded border border-[#10B981]/40 bg-[#10B981]/10 px-2.5 text-xs font-medium text-[#10B981] transition-colors hover:border-[#10B981] hover:bg-[#10B981]/20"
        >
          <Cloud className="h-3.5 w-3.5" />
          <span>Cloud Audits</span>
        </button>

        <button
          type="button"
          onClick={onExportJson}
          className="inline-flex h-8 items-center gap-1.5 rounded border border-[#06B6D4]/40 bg-[#06B6D4]/10 px-2.5 text-xs font-medium text-[#06B6D4] transition-colors hover:border-[#06B6D4] hover:bg-[#06B6D4]/20"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Forensic Report (JSON)</span>
        </button>
      </div>
    </header>
  );
};
