import React from 'react';
import { Waves } from 'lucide-react';
import { SLIDING_WINDOW_SIZE } from '../engine/detectionEngine';
import { CycleRecord } from '../types/silicon';

interface SlidingWindowMeterProps {
  cycle: CycleRecord | null;
  tau: number;
}

export const SlidingWindowMeter: React.FC<SlidingWindowMeterProps> = ({ cycle, tau }) => {
  const zWindow = cycle ? cycle.zWindow : 0;
  const meanDeltaP = cycle ? cycle.meanDeltaP : 0;
  const windowCount = cycle ? cycle.windowCount : 0;
  const sigmaWindow = cycle ? cycle.sigmaP / Math.sqrt(Math.max(1, windowCount)) : 0;

  const isArmed = windowCount >= 5;
  const isTriggered = isArmed && zWindow >= tau;
  const scaleMax = Math.max(6.0, tau + 2.5, zWindow * 1.1);
  const fillPct = Math.min(100, (zWindow / scaleMax) * 100);
  const thresholdPct = Math.min(100, (tau / scaleMax) * 100);

  const barColor = isTriggered
    ? 'bg-[#F59E0B] shadow-[0_0_10px_rgba(245,158,11,0.5)]'
    : 'bg-[#10B981]';

  const statusText = !cycle
    ? 'NO DATA'
    : !isArmed
      ? `WARMING UP (${windowCount}/5)`
      : isTriggered
        ? 'DRIFT SUSPECT'
        : 'NOMINAL';

  const statusBadgeClass = !cycle || !isArmed
    ? 'border-[#27272A] bg-[#18181B] text-[#A1A1AA]'
    : isTriggered
      ? 'border-[#F59E0B]/50 bg-[#F59E0B]/15 text-[#F59E0B]'
      : 'border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]';

  return (
    <div className="rounded border border-[#27272A] bg-[#111114] px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Waves className="h-3.5 w-3.5 text-[#06B6D4]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F4F4F5]">
            Sliding-Window Drift Meter
          </span>
          <span className="font-mono text-[10px] text-[#A1A1AA]">
            (W = {windowCount}/{SLIDING_WINDOW_SIZE} cycles · σ_win = {sigmaWindow.toFixed(3)} mW)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
          <span className="text-[#A1A1AA]">
            mean(ΔP):{' '}
            <span className={isTriggered ? 'font-semibold text-[#F59E0B]' : 'text-[#F4F4F5]'}>
              {meanDeltaP >= 0 ? '+' : ''}
              {meanDeltaP.toFixed(3)} mW
            </span>
          </span>
          <span className="text-[#A1A1AA]">
            Z_window:{' '}
            <span className={isTriggered ? 'font-semibold text-[#F59E0B]' : 'font-semibold text-[#10B981]'}>
              {zWindow.toFixed(2)}
            </span>
            <span className="text-[#71717A]"> / τ={tau.toFixed(1)}</span>
          </span>
          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass}`}>
            {statusText}
          </span>
        </div>
      </div>

      {/* Horizontal Gauge Bar */}
      <div className="relative mt-2 h-2.5 w-full overflow-visible rounded bg-[#18181B] ring-1 ring-[#27272A]">
        <div
          className={`h-full rounded-l transition-all duration-200 ${barColor}`}
          style={{ width: `${fillPct}%` }}
        />
        {/* Threshold tick at tau */}
        <div
          className="absolute -top-1 bottom-[-4px] w-0.5 bg-[#F59E0B]"
          style={{ left: `${thresholdPct}%` }}
          title={`Threshold τ = ${tau.toFixed(1)}`}
        >
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 font-mono text-[9px] text-[#F59E0B]">
            τ={tau.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
};
