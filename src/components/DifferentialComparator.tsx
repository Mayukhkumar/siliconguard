import React from 'react';
import { Binary, Calculator, Lock } from 'lucide-react';
import { toBin8, toHex2 } from '../engine/detectionEngine';
import { CycleRecord } from '../types/silicon';

interface DifferentialComparatorProps {
  cycle: CycleRecord | null;
  tau: number;
  isPinned: boolean;
  isHovered: boolean;
}

const BitRow: React.FC<{
  label: string;
  value: number;
  highlightMask?: number;
  variant: 'golden' | 'cut' | 'diff';
}> = ({ label, value, highlightMask = 0, variant }) => {
  const bits = toBin8(value).split('');

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-[105px] items-center justify-between font-mono text-[11px]">
        <span className="text-[#A1A1AA]">{label}</span>
        <span
          className={
            variant === 'golden'
              ? 'text-[#06B6D4]'
              : variant === 'diff' && value !== 0
                ? 'font-semibold text-[#EF4444]'
                : 'text-[#F4F4F5]'
          }
        >
          {toHex2(value)}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {bits.map((bit, idx) => {
          const bitPosition = 7 - idx;
          const isFlipped = ((highlightMask >> bitPosition) & 1) === 1;
          const isDiffOne = variant === 'diff' && bit === '1';

          let boxClass = 'border-[#27272A] bg-[#09090B] text-[#A1A1AA]';
          if (isDiffOne) {
            boxClass =
              'border-[#EF4444] bg-[#EF4444]/20 text-[#EF4444] font-bold shadow-[0_0_8px_rgba(239,68,68,0.45)]';
          } else if (variant === 'cut' && isFlipped) {
            boxClass =
              'border-[#EF4444]/80 bg-[#EF4444]/15 text-[#EF4444] font-semibold';
          } else if (variant === 'golden' && bit === '1') {
            boxClass = 'border-[#06B6D4]/40 bg-[#06B6D4]/10 text-[#06B6D4]';
          } else if (bit === '1') {
            boxClass = 'border-[#3F3F46] bg-[#18181B] text-[#F4F4F5]';
          }

          return (
            <div
              key={bitPosition}
              title={`Bit ${bitPosition}`}
              className={`flex h-6 w-6 items-center justify-center rounded border font-mono text-[11px] transition-colors ${boxClass}`}
            >
              {bit}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const DifferentialComparator: React.FC<DifferentialComparatorProps> = ({
  cycle,
  tau,
  isPinned,
  isHovered,
}) => {
  if (!cycle) {
    return (
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div className="rounded border border-[#27272A] bg-[#111114] p-3 text-xs text-[#A1A1AA]">
          No cycle selected for Bit-Level Register Diff.
        </div>
        <div className="rounded border border-[#27272A] bg-[#111114] p-3 text-xs text-[#A1A1AA]">
          No cycle selected for Live Detection Formula Strip.
        </div>
      </div>
    );
  }

  const verdictBadge =
    cycle.verdict === 'CRITICAL'
      ? {
          label: 'CRITICAL: Active Trojan',
          cls: 'border-[#EF4444]/60 bg-[#EF4444]/15 text-[#EF4444]',
        }
      : cycle.verdict === 'WARNING'
        ? {
            label: 'WARNING: Dormant Suspect',
            cls: 'border-[#F59E0B]/60 bg-[#F59E0B]/15 text-[#F59E0B]',
          }
        : {
            label: 'PASS: Clean Silicon',
            cls: 'border-[#10B981]/50 bg-[#10B981]/15 text-[#10B981]',
          };

  const inspectTag = isHovered ? 'HOVER' : isPinned ? 'PINNED' : 'LATEST';

  return (
    <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
      {/* Left Card: Bit-Level Register Diff */}
      <div className="rounded border border-[#27272A] bg-[#111114] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#27272A] pb-1.5">
          <div className="flex items-center gap-1.5">
            <Binary className="h-3.5 w-3.5 text-[#06B6D4]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F4F4F5]">
              Bit-Level Register Diff
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="inline-flex items-center gap-1 rounded border border-[#27272A] bg-[#18181B] px-1.5 py-0.5 text-[#06B6D4]">
              {isPinned && <Lock className="h-2.5 w-2.5" />}
              {inspectTag} #{cycle.cycle}
            </span>
            <span className="text-[#A1A1AA]">
              A=<span className="text-[#F4F4F5]">{toHex2(cycle.operandA)}</span>({cycle.operandA})
            </span>
            <span className="text-[#A1A1AA]">
              B=<span className="text-[#F4F4F5]">{toHex2(cycle.operandB)}</span>({cycle.operandB})
            </span>
            <span className="rounded bg-[#18181B] px-1.5 py-0.5 font-semibold text-[#F4F4F5]">
              {cycle.opcode}
            </span>
          </div>
        </div>

        {/* Bit index header */}
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="min-w-[105px] font-mono text-[9px] text-[#71717A]">REGISTER / HEX</span>
          <div className="flex items-center gap-1">
            {[7, 6, 5, 4, 3, 2, 1, 0].map((b) => (
              <span
                key={b}
                className="w-6 text-center font-mono text-[9px] text-[#71717A]"
              >
                b{b}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <BitRow label="Y_golden" value={cycle.yGolden} variant="golden" />
          <BitRow
            label="Y_CUT"
            value={cycle.yCut}
            highlightMask={cycle.deltaL}
            variant="cut"
          />
          <BitRow
            label="Δ_L = CUT⊕GLD"
            value={cycle.deltaL}
            highlightMask={cycle.deltaL}
            variant="diff"
          />
        </div>
      </div>

      {/* Right Card: Live Detection Formula Strip */}
      <div className="rounded border border-[#27272A] bg-[#111114] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#27272A] pb-1.5">
          <div className="flex items-center gap-1.5">
            <Calculator className="h-3.5 w-3.5 text-[#06B6D4]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F4F4F5]">
              Live Detection Formula Strip
            </span>
          </div>
          <span
            className={`rounded border px-2 py-0.5 font-mono text-[10px] font-semibold ${verdictBadge.cls}`}
          >
            {verdictBadge.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
          {/* Delta_P & Z_P */}
          <div className="rounded border border-[#27272A] bg-[#18181B] px-2.5 py-1.5">
            <div className="text-[10px] text-[#A1A1AA]">Power Residual &amp; Z_P</div>
            <div className="mt-0.5 flex items-baseline justify-between">
              <span className="text-[#F4F4F5]">
                ΔP = {cycle.deltaP >= 0 ? '+' : ''}
                {cycle.deltaP.toFixed(2)} mW
              </span>
              <span
                className={`font-semibold ${
                  cycle.zP >= tau ? 'text-[#F59E0B]' : 'text-[#10B981]'
                }`}
              >
                Z_P = {cycle.zP.toFixed(2)}
              </span>
            </div>
            <div className="mt-0.5 text-[9px] text-[#71717A]">
              |{cycle.deltaP.toFixed(2)}| / {cycle.sigmaP.toFixed(2)} mW
            </div>
          </div>

          {/* Delta_T & Z_T */}
          <div className="rounded border border-[#27272A] bg-[#18181B] px-2.5 py-1.5">
            <div className="text-[10px] text-[#A1A1AA]">Delay Residual &amp; Z_T</div>
            <div className="mt-0.5 flex items-baseline justify-between">
              <span className="text-[#F4F4F5]">
                ΔT = {cycle.deltaT >= 0 ? '+' : ''}
                {cycle.deltaT.toFixed(2)} ns
              </span>
              <span
                className={`font-semibold ${
                  cycle.zT >= tau ? 'text-[#F59E0B]' : 'text-[#10B981]'
                }`}
              >
                Z_T = {cycle.zT.toFixed(2)}
              </span>
            </div>
            <div className="mt-0.5 text-[9px] text-[#71717A]">
              |{cycle.deltaT.toFixed(2)}| / {cycle.sigmaT.toFixed(2)} ns
            </div>
          </div>

          {/* Z_multi */}
          <div className="rounded border border-[#27272A] bg-[#18181B] px-2.5 py-1.5">
            <div className="flex items-center justify-between text-[10px] text-[#A1A1AA]">
              <span>Multi-Param Z_multi</span>
              <span className="text-[#71717A]">CRIT ≥ {(tau + 1.0).toFixed(1)}</span>
            </div>
            <div className="mt-0.5 flex items-baseline justify-between">
              <span className="text-[10px] text-[#A1A1AA]">
                √({cycle.zP.toFixed(2)}² + {cycle.zT.toFixed(2)}²)
              </span>
              <span
                className={`font-semibold ${
                  cycle.zMulti >= tau + 1.0
                    ? 'text-[#EF4444]'
                    : cycle.zMulti >= tau
                      ? 'text-[#F59E0B]'
                      : 'text-[#10B981]'
                }`}
              >
                {cycle.zMulti.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Z_window */}
          <div className="rounded border border-[#27272A] bg-[#18181B] px-2.5 py-1.5">
            <div className="flex items-center justify-between text-[10px] text-[#A1A1AA]">
              <span>Drift Z_window (W={cycle.windowCount})</span>
              <span className="text-[#71717A]">WARN ≥ {tau.toFixed(1)}</span>
            </div>
            <div className="mt-0.5 flex items-baseline justify-between">
              <span className="text-[10px] text-[#A1A1AA]">
                |{cycle.meanDeltaP.toFixed(2)}| / ({cycle.sigmaP.toFixed(2)}/√{cycle.windowCount})
              </span>
              <span
                className={`font-semibold ${
                  cycle.windowCount >= 5 && cycle.zWindow >= tau
                    ? 'text-[#F59E0B]'
                    : 'text-[#10B981]'
                }`}
              >
                {cycle.zWindow.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
