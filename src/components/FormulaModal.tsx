import React from 'react';
import { BookOpen, X } from 'lucide-react';
import {
  ALPHA_HW_MW,
  BASE_SIGMA_P,
  BASE_SIGMA_T,
  CAPACITIVE_OFFSET_NS,
  P_STATIC_MW,
  SLIDING_WINDOW_SIZE,
} from '../engine/detectionEngine';

interface FormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  waferNoiseMultiplier: number;
  tau: number;
}

export const FormulaModal: React.FC<FormulaModalProps> = ({
  isOpen,
  onClose,
  waferNoiseMultiplier,
  tau,
}) => {
  if (!isOpen) return null;

  const sigmaP = (BASE_SIGMA_P * waferNoiseMultiplier).toFixed(3);
  const sigmaT = (BASE_SIGMA_T * waferNoiseMultiplier).toFixed(3);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-[#27272A] bg-[#111114] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#27272A] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-4 w-4 text-[#06B6D4]" />
            <h2 className="text-sm font-semibold tracking-tight text-[#F4F4F5]">
              SiliconGuard 5-Stage Detection Engine — Mathematical Reference
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#27272A] bg-[#18181B] p-1 text-[#A1A1AA] hover:text-[#F4F4F5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-5 text-xs">
          {/* Active calibration summary */}
          <div className="flex flex-wrap items-center gap-3 rounded border border-[#06B6D4]/30 bg-[#06B6D4]/5 px-3 py-2 font-mono text-[11px] text-[#F4F4F5]">
            <span className="text-[#06B6D4]">ACTIVE CALIBRATION:</span>
            <span>σ_wafer = {waferNoiseMultiplier.toFixed(1)}×</span>
            <span>σ_P = {sigmaP} mW</span>
            <span>σ_T = {sigmaT} ns</span>
            <span>τ = {tau.toFixed(1)}</span>
            <span>W = {SLIDING_WINDOW_SIZE} cycles</span>
          </div>

          {/* Stage 1 */}
          <div className="rounded border border-[#27272A] bg-[#18181B] p-3">
            <div className="mb-1.5 font-semibold text-[#06B6D4]">
              Stage 1 — Golden Reference Model (8-bit Unsigned ALU, masked 0xFF)
            </div>
            <div className="space-y-1 font-mono text-[11px] text-[#F4F4F5]">
              <div>
                μ_P(t) = P_static ({P_STATIC_MW.toFixed(1)} mW) + P_op[opcode] + α ({ALPHA_HW_MW} mW) × HW(Y_golden)
              </div>
              <div className="text-[#A1A1AA]">
                P_op = &#123; ADD: 4.5, SUB: 5.0, AND: 2.2, OR: 2.4, XOR: 3.1 &#125; mW
              </div>
              <div className="pt-1">
                μ_T(t) = T_base[opcode] + β·C_load ({CAPACITIVE_OFFSET_NS} ns)
              </div>
              <div className="text-[#A1A1AA]">
                T_base = &#123; ADD: 4.2, SUB: 4.6, AND: 2.8, OR: 2.9, XOR: 3.5 &#125; ns
              </div>
              <div className="pt-1 text-[#A1A1AA]">
                σ_P = 0.90 × σ_wafer, &nbsp; σ_T = 0.55 × σ_wafer &nbsp; (Box-Muller Gaussian noise)
              </div>
            </div>
          </div>

          {/* Stage 2 */}
          <div className="rounded border border-[#27272A] bg-[#18181B] p-3">
            <div className="mb-1.5 font-semibold text-[#EF4444]">
              Stage 2 — Deterministic Logic Diff
            </div>
            <div className="font-mono text-[11px] text-[#F4F4F5]">
              Δ_L(t) = Y_CUT(t) ⊕ Y_golden(t) &nbsp;&nbsp; (Any non-zero bit triggers CRITICAL)
            </div>
          </div>

          {/* Stage 3 */}
          <div className="rounded border border-[#27272A] bg-[#18181B] p-3">
            <div className="mb-1.5 font-semibold text-[#F4F4F5]">
              Stage 3 — Side-Channel Residuals &amp; Multi-Parameter Z-Score
            </div>
            <div className="space-y-1 font-mono text-[11px] text-[#F4F4F5]">
              <div>Δ_P(t) = P_CUT(t) − μ_P(t), &nbsp;&nbsp; Δ_T(t) = T_CUT(t) − μ_T(t)</div>
              <div>Z_P(t) = |Δ_P(t)| / σ_P, &nbsp;&nbsp; Z_T(t) = |Δ_T(t)| / σ_T</div>
              <div>Z_multi(t) = √( Z_P(t)² + Z_T(t)² )</div>
            </div>
          </div>

          {/* Stage 4 */}
          <div className="rounded border border-[#27272A] bg-[#18181B] p-3">
            <div className="mb-1.5 font-semibold text-[#F59E0B]">
              Stage 4 — Sliding-Window Drift Filter (W = 20 cycles)
            </div>
            <div className="space-y-1 font-mono text-[11px] text-[#F4F4F5]">
              <div>meanΔ_P = (1 / count) × Σ Δ_P(i) &nbsp;&nbsp; over last min(t, 20) cycles</div>
              <div>Z_window(t) = |meanΔ_P| / (σ_P / √count)</div>
              <div className="text-[#A1A1AA]">
                Isolates subtle static leakage (e.g. +2.4 mW) even under elevated wafer process noise.
              </div>
            </div>
          </div>

          {/* Stage 5 */}
          <div className="rounded border border-[#27272A] bg-[#18181B] p-3">
            <div className="mb-1.5 font-semibold text-[#10B981]">
              Stage 5 — Verdict Classification &amp; Chip Trust Score
            </div>
            <div className="space-y-1 font-mono text-[11px] text-[#F4F4F5]">
              <div className="text-[#EF4444]">
                CRITICAL (Active Trojan): Δ_L ≠ 0 OR Z_multi ≥ (τ + 1.0)
              </div>
              <div className="text-[#F59E0B]">
                WARNING (Dormant Suspect): else if max(Z_P, Z_T) ≥ τ OR (count ≥ 5 AND Z_window ≥ τ)
              </div>
              <div className="text-[#10B981]">PASS (Clean Silicon): otherwise</div>
              <div className="pt-1 text-[#F4F4F5]">
                TrustScore = max(0, round(100 − (40 × N_logic + 150 × (N_side / max(1, N_total)))))
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
