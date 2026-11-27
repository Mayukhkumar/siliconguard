import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { getProfileMeta } from '../engine/detectionEngine';
import { CycleRecord, ProfileMarker } from '../types/silicon';

interface OscilloscopeCanvasProps {
  cycles: CycleRecord[];
  tau: number;
  profileMarkers: ProfileMarker[];
  hoveredCycle: number | null;
  pinnedCycle: number | null;
  onHoverCycle: (cycleNumber: number | null) => void;
  onPinCycle: (cycleNumber: number | null) => void;
}

type MetricKind = 'power' | 'delay';

const PLOT_PAD_LEFT = 54;
const PLOT_PAD_RIGHT = 16;
const PLOT_PAD_TOP = 14;
const PLOT_PAD_BOTTOM = 22;

function drawSingleScope(params: {
  canvas: HTMLCanvasElement;
  visibleCycles: CycleRecord[];
  metric: MetricKind;
  tau: number;
  profileMarkers: ProfileMarker[];
  activeInspectCycle: number | null;
  pinnedCycle: number | null;
}) {
  const {
    canvas,
    visibleCycles,
    metric,
    tau,
    profileMarkers,
    activeInspectCycle,
    pinnedCycle,
  } = params;

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  const targetW = Math.round(rect.width * dpr);
  const targetH = Math.round(rect.height * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const plotW = Math.max(10, width - PLOT_PAD_LEFT - PLOT_PAD_RIGHT);
  const plotH = Math.max(10, height - PLOT_PAD_TOP - PLOT_PAD_BOTTOM);

  // Clear background
  ctx.fillStyle = '#09090B';
  ctx.fillRect(0, 0, width, height);

  if (visibleCycles.length === 0) {
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NO TELEMETRY CYCLES RECORDED — STEP OR RUN STIMULUS', width / 2, height / 2);
    ctx.restore();
    return;
  }

  // Determine Y bounds across expected band and observed points
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const c of visibleCycles) {
    const mu = metric === 'power' ? c.muP : c.muT;
    const sigma = metric === 'power' ? c.sigmaP : c.sigmaT;
    const cut = metric === 'power' ? c.pCut : c.tCut;
    const bandLow = mu - tau * sigma;
    const bandHigh = mu + tau * sigma;
    yMin = Math.min(yMin, bandLow, cut, mu);
    yMax = Math.max(yMax, bandHigh, cut, mu);
  }

  const span = Math.max(1.0, yMax - yMin);
  yMin -= span * 0.14;
  yMax += span * 0.14;

  const count = visibleCycles.length;
  const xForIndex = (idx: number): number => {
    if (count === 1) return PLOT_PAD_LEFT + plotW / 2;
    return PLOT_PAD_LEFT + (idx / (count - 1)) * plotW;
  };
  const yForValue = (val: number): number => {
    const norm = (val - yMin) / (yMax - yMin);
    return PLOT_PAD_TOP + (1 - norm) * plotH;
  };

  // Horizontal grid lines & Y-axis labels
  const yTicks = 4;
  ctx.lineWidth = 1;
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= yTicks; i++) {
    const frac = i / yTicks;
    const val = yMax - frac * (yMax - yMin);
    const y = PLOT_PAD_TOP + frac * plotH;

    ctx.strokeStyle = '#18181B';
    ctx.beginPath();
    ctx.moveTo(PLOT_PAD_LEFT, y);
    ctx.lineTo(PLOT_PAD_LEFT + plotW, y);
    ctx.stroke();

    ctx.fillStyle = '#A1A1AA';
    ctx.fillText(val.toFixed(1), PLOT_PAD_LEFT - 7, y);
  }

  // Vertical grid lines & X-axis cycle labels
  const stepTick = count <= 12 ? 1 : count <= 30 ? 5 : 10;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < count; i++) {
    const c = visibleCycles[i];
    if (i === 0 || i === count - 1 || c.cycle % stepTick === 0) {
      const x = xForIndex(i);
      ctx.strokeStyle = '#18181B';
      ctx.beginPath();
      ctx.moveTo(x, PLOT_PAD_TOP);
      ctx.lineTo(x, PLOT_PAD_TOP + plotH);
      ctx.stroke();

      ctx.fillStyle = '#71717A';
      ctx.fillText(`#${c.cycle}`, x, PLOT_PAD_TOP + plotH + 5);
    }
  }

  // Plot frame border
  ctx.strokeStyle = '#27272A';
  ctx.strokeRect(PLOT_PAD_LEFT, PLOT_PAD_TOP, plotW, plotH);

  // Shaded +/- (tau * sigma) acceptance band
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const c = visibleCycles[i];
    const mu = metric === 'power' ? c.muP : c.muT;
    const sigma = metric === 'power' ? c.sigmaP : c.sigmaT;
    const x = xForIndex(i);
    const y = yForValue(mu + tau * sigma);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = count - 1; i >= 0; i--) {
    const c = visibleCycles[i];
    const mu = metric === 'power' ? c.muP : c.muT;
    const sigma = metric === 'power' ? c.sigmaP : c.sigmaT;
    const x = xForIndex(i);
    const y = yForValue(mu - tau * sigma);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(6, 182, 212, 0.10)';
  ctx.fill();

  // Subtle upper & lower band boundaries
  ctx.save();
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.30)';
  ctx.lineWidth = 1;
  for (const sign of [1, -1]) {
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const c = visibleCycles[i];
      const mu = metric === 'power' ? c.muP : c.muT;
      const sigma = metric === 'power' ? c.sigmaP : c.sigmaT;
      const x = xForIndex(i);
      const y = yForValue(mu + sign * tau * sigma);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Profile switch markers inside visible range
  const firstCycle = visibleCycles[0].cycle;
  const lastCycle = visibleCycles[count - 1].cycle;
  for (const marker of profileMarkers) {
    if (marker.afterCycle >= firstCycle && marker.afterCycle < lastCycle) {
      const idx = visibleCycles.findIndex((c) => c.cycle > marker.afterCycle);
      if (idx > 0) {
        const x = (xForIndex(idx - 1) + xForIndex(idx)) / 2;
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, PLOT_PAD_TOP);
        ctx.lineTo(x, PLOT_PAD_TOP + plotH);
        ctx.stroke();

        const label = `→ ${getProfileMeta(marker.toProfile).shortName}`;
        ctx.font = '9px "JetBrains Mono", monospace';
        const labelW = ctx.measureText(label).width + 8;
        ctx.fillStyle = '#18181B';
        ctx.fillRect(Math.min(x + 3, PLOT_PAD_LEFT + plotW - labelW - 2), PLOT_PAD_TOP + 3, labelW, 14);
        ctx.fillStyle = '#F59E0B';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          label,
          Math.min(x + 7, PLOT_PAD_LEFT + plotW - labelW + 2),
          PLOT_PAD_TOP + 10
        );
        ctx.restore();
      }
    }
  }

  // Golden Expected mu_P / mu_T (dashed cyan line)
  ctx.save();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#06B6D4';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const c = visibleCycles[i];
    const mu = metric === 'power' ? c.muP : c.muT;
    const x = xForIndex(i);
    const y = yForValue(mu);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  // CUT Observed trace (solid white line, colored segments on anomalies)
  ctx.lineWidth = 1.8;
  for (let i = 1; i < count; i++) {
    const prev = visibleCycles[i - 1];
    const curr = visibleCycles[i];
    const x1 = xForIndex(i - 1);
    const y1 = yForValue(metric === 'power' ? prev.pCut : prev.tCut);
    const x2 = xForIndex(i);
    const y2 = yForValue(metric === 'power' ? curr.pCut : curr.tCut);

    let segColor = '#F4F4F5';
    if (curr.verdict === 'CRITICAL') segColor = '#EF4444';
    else if (curr.verdict === 'WARNING') segColor = '#F59E0B';

    ctx.strokeStyle = segColor;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Data point nodes (highlight WARNING / CRITICAL)
  for (let i = 0; i < count; i++) {
    const c = visibleCycles[i];
    const x = xForIndex(i);
    const y = yForValue(metric === 'power' ? c.pCut : c.tCut);
    const isAnomaly = c.verdict !== 'PASS';

    if (isAnomaly) {
      const color = c.verdict === 'CRITICAL' ? '#EF4444' : '#F59E0B';
      ctx.fillStyle = c.verdict === 'CRITICAL' ? 'rgba(239,68,68,0.22)' : 'rgba(245,158,11,0.22)';
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (count <= 35) {
      ctx.fillStyle = '#F4F4F5';
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Synchronized Interactive Crosshair
  if (activeInspectCycle !== null) {
    const idx = visibleCycles.findIndex((c) => c.cycle === activeInspectCycle);
    if (idx !== -1) {
      const c = visibleCycles[idx];
      const x = xForIndex(idx);
      const yCut = yForValue(metric === 'power' ? c.pCut : c.tCut);
      const yMu = yForValue(metric === 'power' ? c.muP : c.muT);
      const isPinned = pinnedCycle === activeInspectCycle;

      ctx.save();
      if (!isPinned) ctx.setLineDash([3, 3]);
      ctx.strokeStyle = isPinned ? '#06B6D4' : 'rgba(244, 244, 245, 0.55)';
      ctx.lineWidth = isPinned ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x, PLOT_PAD_TOP);
      ctx.lineTo(x, PLOT_PAD_TOP + plotH);
      ctx.stroke();
      ctx.restore();

      // Golden target ring
      ctx.fillStyle = '#06B6D4';
      ctx.beginPath();
      ctx.arc(x, yMu, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // CUT target ring
      const cutColor =
        c.verdict === 'CRITICAL' ? '#EF4444' : c.verdict === 'WARNING' ? '#F59E0B' : '#F4F4F5';
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 2;
      ctx.fillStyle = cutColor;
      ctx.beginPath();
      ctx.arc(x, yCut, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}

export const OscilloscopeCanvas: React.FC<OscilloscopeCanvasProps> = ({
  cycles,
  tau,
  profileMarkers,
  hoveredCycle,
  pinnedCycle,
  onHoverCycle,
  onPinCycle,
}) => {
  const powerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const delayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [resizeTick, setResizeTick] = useState(0);

  const visibleCycles = useMemo(() => cycles.slice(-60), [cycles]);

  const activeInspectCycle = useMemo(() => {
    if (hoveredCycle !== null) return hoveredCycle;
    if (pinnedCycle !== null) return pinnedCycle;
    return visibleCycles.length > 0 ? visibleCycles[visibleCycles.length - 1].cycle : null;
  }, [hoveredCycle, pinnedCycle, visibleCycles]);

  const inspectedRecord = useMemo(
    () => visibleCycles.find((c) => c.cycle === activeInspectCycle) ?? null,
    [visibleCycles, activeInspectCycle]
  );

  // Observe container resize for crisp Retina redraws
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setResizeTick((t) => t + 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (powerCanvasRef.current) {
      drawSingleScope({
        canvas: powerCanvasRef.current,
        visibleCycles,
        metric: 'power',
        tau,
        profileMarkers,
        activeInspectCycle,
        pinnedCycle,
      });
    }
    if (delayCanvasRef.current) {
      drawSingleScope({
        canvas: delayCanvasRef.current,
        visibleCycles,
        metric: 'delay',
        tau,
        profileMarkers,
        activeInspectCycle,
        pinnedCycle,
      });
    }
  }, [visibleCycles, tau, profileMarkers, activeInspectCycle, pinnedCycle, resizeTick]);

  const resolveCycleAtPointer = (
    e: React.MouseEvent<HTMLCanvasElement>
  ): number | null => {
    if (visibleCycles.length === 0) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const plotW = Math.max(10, rect.width - PLOT_PAD_LEFT - PLOT_PAD_RIGHT);
    const clampedX = Math.max(PLOT_PAD_LEFT, Math.min(PLOT_PAD_LEFT + plotW, x));
    if (visibleCycles.length === 1) return visibleCycles[0].cycle;
    const ratio = (clampedX - PLOT_PAD_LEFT) / plotW;
    const idx = Math.round(ratio * (visibleCycles.length - 1));
    const safeIdx = Math.max(0, Math.min(visibleCycles.length - 1, idx));
    return visibleCycles[safeIdx].cycle;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cyc = resolveCycleAtPointer(e);
    if (cyc !== hoveredCycle) onHoverCycle(cyc);
  };

  const handleMouseLeave = () => {
    onHoverCycle(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cyc = resolveCycleAtPointer(e);
    if (cyc === null) return;
    onPinCycle(pinnedCycle === cyc ? null : cyc);
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      {/* Scope Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-3 text-[11px]">
          <span className="font-semibold uppercase tracking-wider text-[#A1A1AA]">
            Dual Synchronized Side-Channel Oscilloscopes
          </span>
          <span className="font-mono text-[10px] text-[#71717A]">
            WINDOW: LAST {visibleCycles.length}/60 CYCLES
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-[#A1A1AA]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 bg-[#F4F4F5]" />
            <span>CUT Observed</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 border-t border-dashed border-[#06B6D4]" />
            <span className="text-[#06B6D4]">Golden μ</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-3 rounded-sm border border-[#06B6D4]/40 bg-[#06B6D4]/15" />
            <span>±τ·σ Band</span>
          </span>
          {pinnedCycle !== null && (
            <button
              type="button"
              onClick={() => onPinCycle(null)}
              className="inline-flex items-center gap-1 rounded border border-[#06B6D4]/50 bg-[#06B6D4]/15 px-1.5 py-0.5 text-[#06B6D4] hover:bg-[#06B6D4]/25"
            >
              <Lock className="h-2.5 w-2.5" />
              <span>PINNED #{pinnedCycle} · Unpin</span>
            </button>
          )}
          {pinnedCycle === null && hoveredCycle !== null && (
            <span className="inline-flex items-center gap-1 rounded border border-[#27272A] bg-[#18181B] px-1.5 py-0.5 text-[#F4F4F5]">
              <Unlock className="h-2.5 w-2.5 text-[#A1A1AA]" />
              <span>HOVER #{hoveredCycle} (Click to pin)</span>
            </span>
          )}
        </div>
      </div>

      {/* Chart 1: Power Consumption (mW) */}
      <div className="rounded border border-[#27272A] bg-[#111114] p-2">
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="text-[11px] font-medium text-[#F4F4F5]">
            CH1 · Power Consumption <span className="font-mono text-[#A1A1AA]">(mW)</span>
          </span>
          {inspectedRecord && (
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className="text-[#A1A1AA]">
                #{inspectedRecord.cycle} [{inspectedRecord.opcode}]
              </span>
              <span className="text-[#06B6D4]">
                μ_P: {inspectedRecord.muP.toFixed(2)} mW
              </span>
              <span className="text-[#F4F4F5]">
                P_CUT: {inspectedRecord.pCut.toFixed(2)} mW
              </span>
              <span
                className={
                  inspectedRecord.zP >= tau ? 'font-semibold text-[#F59E0B]' : 'text-[#A1A1AA]'
                }
              >
                ΔP: {inspectedRecord.deltaP >= 0 ? '+' : ''}
                {inspectedRecord.deltaP.toFixed(2)} mW
              </span>
            </div>
          )}
        </div>
        <canvas
          ref={powerCanvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className="h-[132px] w-full cursor-crosshair rounded"
        />
      </div>

      {/* Chart 2: Path Propagation Delay (ns) */}
      <div className="rounded border border-[#27272A] bg-[#111114] p-2">
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="text-[11px] font-medium text-[#F4F4F5]">
            CH2 · Path Propagation Delay <span className="font-mono text-[#A1A1AA]">(ns)</span>
          </span>
          {inspectedRecord && (
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className="text-[#A1A1AA]">
                #{inspectedRecord.cycle} [{inspectedRecord.opcode}]
              </span>
              <span className="text-[#06B6D4]">
                μ_T: {inspectedRecord.muT.toFixed(2)} ns
              </span>
              <span className="text-[#F4F4F5]">
                T_CUT: {inspectedRecord.tCut.toFixed(2)} ns
              </span>
              <span
                className={
                  inspectedRecord.zT >= tau ? 'font-semibold text-[#F59E0B]' : 'text-[#A1A1AA]'
                }
              >
                ΔT: {inspectedRecord.deltaT >= 0 ? '+' : ''}
                {inspectedRecord.deltaT.toFixed(2)} ns
              </span>
            </div>
          )}
        </div>
        <canvas
          ref={delayCanvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className="h-[132px] w-full cursor-crosshair rounded"
        />
      </div>
    </div>
  );
};
