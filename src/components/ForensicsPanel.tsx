import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSearch, ShieldAlert } from 'lucide-react';
import { getProfileMeta, toHex2 } from '../engine/detectionEngine';
import { CycleRecord } from '../types/silicon';

interface ForensicsPanelProps {
  cycles: CycleRecord[];
  inspectedCycle: CycleRecord | null;
  pinnedCycle: number | null;
  onSelectCycle: (cycleNumber: number) => void;
}

type LogFilter = 'all' | 'anomalies';

export const ForensicsPanel: React.FC<ForensicsPanelProps> = ({
  cycles,
  inspectedCycle,
  pinnedCycle,
  onSelectCycle,
}) => {
  const [filter, setFilter] = useState<LogFilter>('all');

  const anomalyCount = useMemo(
    () => cycles.filter((c) => c.verdict !== 'PASS').length,
    [cycles]
  );

  const displayedCycles = useMemo(() => {
    const base = filter === 'anomalies' ? cycles.filter((c) => c.verdict !== 'PASS') : cycles;
    return [...base].reverse();
  }, [cycles, filter]);

  const verdictChip = (verdict: CycleRecord['verdict']) => {
    if (verdict === 'CRITICAL') {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-[#EF4444]/50 bg-[#EF4444]/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#EF4444]">
          CRITICAL
        </span>
      );
    }
    if (verdict === 'WARNING') {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#F59E0B]">
          WARNING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[#10B981]/40 bg-[#10B981]/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#10B981]">
        PASS
      </span>
    );
  };

  return (
    <section className="grid grid-cols-1 gap-2 border-t border-[#27272A] bg-[#09090B] p-2 lg:grid-cols-10">
      {/* Left (70%): Filterable Forensic Telemetry Log */}
      <div className="flex min-h-[210px] max-h-[255px] flex-col rounded border border-[#27272A] bg-[#111114] lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272A] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F4F4F5]">
              Forensic Telemetry Log
            </span>
            <span className="font-mono text-[10px] text-[#71717A]">
              Click any row to pin on oscilloscopes
            </span>
          </div>

          <div className="flex items-center gap-1 rounded border border-[#27272A] bg-[#09090B] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded px-2 py-0.5 font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-[#18181B] text-[#F4F4F5]'
                  : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
            >
              All Cycles <span className="font-mono text-[10px] text-[#06B6D4]">({cycles.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('anomalies')}
              className={`rounded px-2 py-0.5 font-medium transition-colors ${
                filter === 'anomalies'
                  ? 'bg-[#18181B] text-[#F4F4F5]'
                  : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
            >
              Anomalies Only{' '}
              <span
                className={`font-mono text-[10px] ${
                  anomalyCount > 0 ? 'text-[#F59E0B]' : 'text-[#71717A]'
                }`}
              >
                ({anomalyCount})
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-left font-mono text-[11px]">
            <thead className="sticky top-0 z-10 border-b border-[#27272A] bg-[#18181B] text-[10px] uppercase tracking-wider text-[#A1A1AA]">
              <tr>
                <th className="px-2.5 py-1.5 font-medium">Cycle #</th>
                <th className="px-2.5 py-1.5 font-medium">Inputs (Hex)</th>
                <th className="px-2.5 py-1.5 font-medium">Opcode</th>
                <th className="px-2.5 py-1.5 font-medium">Logic Diff</th>
                <th className="px-2.5 py-1.5 font-medium text-right">ΔP (mW)</th>
                <th className="px-2.5 py-1.5 font-medium text-right">ΔT (ns)</th>
                <th className="px-2.5 py-1.5 font-medium text-right">Z_multi</th>
                <th className="px-2.5 py-1.5 font-medium text-right">Z_window</th>
                <th className="px-2.5 py-1.5 font-medium text-right">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/60">
              {displayedCycles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-xs text-[#71717A]">
                    {filter === 'anomalies'
                      ? 'No anomalies detected in the current session.'
                      : 'No cycles logged yet.'}
                  </td>
                </tr>
              ) : (
                displayedCycles.map((c) => {
                  const isSelected = inspectedCycle?.cycle === c.cycle;
                  const isPinnedRow = pinnedCycle === c.cycle;

                  return (
                    <tr
                      key={c.cycle}
                      onClick={() => onSelectCycle(c.cycle)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#06B6D4]/15'
                          : c.verdict === 'CRITICAL'
                            ? 'bg-[#EF4444]/[0.04] hover:bg-[#EF4444]/10'
                            : c.verdict === 'WARNING'
                              ? 'bg-[#F59E0B]/[0.04] hover:bg-[#F59E0B]/10'
                              : 'hover:bg-[#18181B]'
                      }`}
                    >
                      <td className="px-2.5 py-1.5 text-[#F4F4F5]">
                        <span className={isPinnedRow ? 'font-bold text-[#06B6D4]' : ''}>
                          #{c.cycle}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 text-[#A1A1AA]">
                        {toHex2(c.operandA)}, {toHex2(c.operandB)}
                      </td>
                      <td className="px-2.5 py-1.5 font-semibold text-[#F4F4F5]">{c.opcode}</td>
                      <td
                        className={`px-2.5 py-1.5 ${
                          c.deltaL !== 0 ? 'font-bold text-[#EF4444]' : 'text-[#71717A]'
                        }`}
                      >
                        {toHex2(c.deltaL)}
                      </td>
                      <td className="px-2.5 py-1.5 text-right text-[#F4F4F5]">
                        {c.deltaP >= 0 ? '+' : ''}
                        {c.deltaP.toFixed(2)}
                      </td>
                      <td className="px-2.5 py-1.5 text-right text-[#F4F4F5]">
                        {c.deltaT >= 0 ? '+' : ''}
                        {c.deltaT.toFixed(2)}
                      </td>
                      <td className="px-2.5 py-1.5 text-right text-[#F4F4F5]">
                        {c.zMulti.toFixed(2)}
                      </td>
                      <td className="px-2.5 py-1.5 text-right text-[#F4F4F5]">
                        {c.zWindow.toFixed(2)}
                      </td>
                      <td className="px-2.5 py-1.5 text-right">{verdictChip(c.verdict)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right (30%): Diagnostic Root-Cause Inspector */}
      <div className="flex min-h-[210px] max-h-[255px] flex-col rounded border border-[#27272A] bg-[#111114] p-3 lg:col-span-3">
        <div className="mb-2 flex items-center justify-between border-b border-[#27272A] pb-1.5">
          <div className="flex items-center gap-1.5">
            <FileSearch className="h-3.5 w-3.5 text-[#06B6D4]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F4F4F5]">
              Diagnostic Root-Cause Inspector
            </span>
          </div>
          {inspectedCycle && (
            <span className="font-mono text-[10px] text-[#06B6D4]">
              Cycle #{inspectedCycle.cycle}
            </span>
          )}
        </div>

        {!inspectedCycle ? (
          <div className="flex flex-1 items-center justify-center text-xs text-[#71717A]">
            Select or run a cycle to inspect diagnostics.
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-between gap-2 overflow-y-auto text-xs">
            <div className="space-y-2">
              {/* Verdict callout */}
              <div
                className={`flex items-start gap-2 rounded border p-2.5 ${
                  inspectedCycle.verdict === 'CRITICAL'
                    ? 'border-[#EF4444]/50 bg-[#EF4444]/10'
                    : inspectedCycle.verdict === 'WARNING'
                      ? 'border-[#F59E0B]/50 bg-[#F59E0B]/10'
                      : 'border-[#10B981]/40 bg-[#10B981]/10'
                }`}
              >
                {inspectedCycle.verdict === 'CRITICAL' ? (
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
                ) : inspectedCycle.verdict === 'WARNING' ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                )}
                <p className="text-[11px] leading-relaxed text-[#F4F4F5]">
                  {inspectedCycle.diagnosticSummary}
                </p>
              </div>

              {/* Triggered Stages */}
              {inspectedCycle.triggeredStages.length > 0 && (
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                    Triggered Detection Gates
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {inspectedCycle.triggeredStages.map((stage) => (
                      <span
                        key={stage}
                        className="rounded border border-[#27272A] bg-[#18181B] px-1.5 py-0.5 font-mono text-[10px] text-[#F4F4F5]"
                      >
                        {stage}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Compact Telemetry Summary */}
            <div className="grid grid-cols-2 gap-1.5 rounded border border-[#27272A] bg-[#18181B] p-2 font-mono text-[10px]">
              <div>
                <span className="text-[#A1A1AA]">CUT Profile: </span>
                <span className="text-[#F4F4F5]">
                  {getProfileMeta(inspectedCycle.profileId).shortName}
                </span>
              </div>
              <div>
                <span className="text-[#A1A1AA]">HW(Y_gld): </span>
                <span className="text-[#F4F4F5]">{inspectedCycle.hammingWeight} bits</span>
              </div>
              <div>
                <span className="text-[#A1A1AA]">P_CUT / μ_P: </span>
                <span className="text-[#F4F4F5]">
                  {inspectedCycle.pCut.toFixed(2)} /{' '}
                  <span className="text-[#06B6D4]">{inspectedCycle.muP.toFixed(2)}</span>
                </span>
              </div>
              <div>
                <span className="text-[#A1A1AA]">T_CUT / μ_T: </span>
                <span className="text-[#F4F4F5]">
                  {inspectedCycle.tCut.toFixed(2)} /{' '}
                  <span className="text-[#06B6D4]">{inspectedCycle.muT.toFixed(2)}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
