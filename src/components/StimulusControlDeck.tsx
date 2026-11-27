import React, { useState } from 'react';
import {
  Crosshair,
  Pause,
  Play,
  Shuffle,
  Sliders,
  StepForward,
  Target,
  Zap,
} from 'lucide-react';
import {
  BASE_SIGMA_P,
  BASE_SIGMA_T,
  CHIP_PROFILES,
  OPCODES,
  toHex2,
} from '../engine/detectionEngine';
import { ChipProfileId, Opcode, StimulusVector } from '../types/silicon';

interface StimulusControlDeckProps {
  activeProfileId: ChipProfileId;
  autoResetOnProfileSwitch: boolean;
  onToggleAutoReset: (next: boolean) => void;
  onSelectProfile: (id: ChipProfileId) => void;
  isLiveClock: boolean;
  onToggleLiveClock: () => void;
  onStepOne: () => void;
  onRunRandom50: () => void;
  onRunTargetedSweep: () => void;
  onInjectManual: (vector: StimulusVector) => void;
  waferNoiseMultiplier: number;
  onChangeWaferNoise: (val: number) => void;
  tau: number;
  onChangeTau: (val: number) => void;
}

export const StimulusControlDeck: React.FC<StimulusControlDeckProps> = ({
  activeProfileId,
  autoResetOnProfileSwitch,
  onToggleAutoReset,
  onSelectProfile,
  isLiveClock,
  onToggleLiveClock,
  onStepOne,
  onRunRandom50,
  onRunTargetedSweep,
  onInjectManual,
  waferNoiseMultiplier,
  onChangeWaferNoise,
  tau,
  onChangeTau,
}) => {
  const [operandA, setOperandA] = useState<number>(13); // 0x0D
  const [operandB, setOperandB] = useState<number>(7); // 0x07
  const [opcode, setOpcode] = useState<Opcode>('XOR');

  const clampByte = (raw: string): number => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return 0;
    return Math.max(0, Math.min(255, parsed));
  };

  const handleInject = (e: React.FormEvent) => {
    e.preventDefault();
    onInjectManual({ operandA, operandB, opcode });
  };

  const sigmaP = (BASE_SIGMA_P * waferNoiseMultiplier).toFixed(2);
  const sigmaT = (BASE_SIGMA_T * waferNoiseMultiplier).toFixed(2);

  return (
    <aside className="flex flex-col gap-3 overflow-y-auto border-b border-[#27272A] bg-[#111114] p-3 lg:border-b-0 lg:border-r">
      {/* 1. CUT Profile Selector */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
            1. Chip Under Test (CUT)
          </h2>
          <label
            className="flex cursor-pointer items-center gap-1.5 text-[10px] text-[#A1A1AA] hover:text-[#F4F4F5]"
            title="Automatically reset session trace and KPIs when switching CUT profiles"
          >
            <input
              type="checkbox"
              checked={autoResetOnProfileSwitch}
              onChange={(e) => onToggleAutoReset(e.target.checked)}
              className="h-3 w-3 rounded border-[#27272A] bg-[#18181B] accent-[#06B6D4]"
            />
            <span>Auto-reset</span>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {CHIP_PROFILES.map((profile) => {
            const isActive = profile.id === activeProfileId;
            const accentClass =
              profile.id === 'clean'
                ? 'text-[#10B981]'
                : profile.id === 'dormant_logic'
                  ? 'text-[#EF4444]'
                  : 'text-[#F59E0B]';

            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => onSelectProfile(profile.id)}
                className={`group rounded border p-2 text-left transition-all ${
                  isActive
                    ? 'border-[#06B6D4] bg-[#18181B] shadow-[0_0_0_1px_rgba(6,182,212,0.25)]'
                    : 'border-[#27272A] bg-[#18181B]/60 hover:border-[#3F3F46] hover:bg-[#18181B]'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-semibold text-[#F4F4F5]">{profile.name}</span>
                  <span className={`font-mono text-[9px] font-semibold tracking-wider ${accentClass}`}>
                    {profile.tag}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-[#A1A1AA]">
                  {profile.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Execution Controls */}
      <section className="border-t border-[#27272A] pt-2.5">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
          2. Execution Controls
        </h2>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={onStepOne}
            className="flex items-center justify-center gap-1.5 rounded border border-[#27272A] bg-[#18181B] px-2.5 py-1.5 text-xs font-medium text-[#F4F4F5] transition-colors hover:border-[#3F3F46] hover:bg-[#27272A]"
          >
            <StepForward className="h-3.5 w-3.5 text-[#06B6D4]" />
            <span>Step 1 Cycle</span>
          </button>

          <button
            type="button"
            onClick={onToggleLiveClock}
            className={`flex items-center justify-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              isLiveClock
                ? 'border-[#10B981]/60 bg-[#10B981]/15 text-[#10B981]'
                : 'border-[#27272A] bg-[#18181B] text-[#F4F4F5] hover:border-[#3F3F46] hover:bg-[#27272A]'
            }`}
          >
            {isLiveClock ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span>Pause Clock</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 text-[#10B981]" />
                <span>Live Clock (~3 Hz)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onRunRandom50}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded border border-[#27272A] bg-[#18181B] px-2.5 py-1.5 text-xs font-medium text-[#F4F4F5] transition-colors hover:border-[#3F3F46] hover:bg-[#27272A]"
          >
            <Shuffle className="h-3.5 w-3.5 text-[#A1A1AA]" />
            <span>Run 50 Random Vectors</span>
          </button>

          <button
            type="button"
            onClick={onRunTargetedSweep}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-2.5 py-1.5 text-xs font-medium text-[#F59E0B] transition-colors hover:border-[#F59E0B] hover:bg-[#F59E0B]/20"
          >
            <Target className="h-3.5 w-3.5" />
            <span>Run Targeted Rare-State Sweep (30)</span>
          </button>
        </div>
      </section>

      {/* 3. Manual Vector Injector */}
      <section className="border-t border-[#27272A] pt-2.5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
            3. Manual Vector Injector
          </h2>
          <Crosshair className="h-3.5 w-3.5 text-[#A1A1AA]" />
        </div>

        <form onSubmit={handleInject} className="space-y-2 rounded border border-[#27272A] bg-[#18181B] p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] text-[#A1A1AA]">
                <span>Operand A</span>
                <span className="font-mono text-[#06B6D4]">{toHex2(operandA)}</span>
              </div>
              <input
                type="number"
                min={0}
                max={255}
                value={operandA}
                onChange={(e) => setOperandA(clampByte(e.target.value))}
                className="w-full rounded border border-[#27272A] bg-[#09090B] px-2 py-1 font-mono text-xs text-[#F4F4F5] focus:border-[#06B6D4] focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] text-[#A1A1AA]">
                <span>Operand B</span>
                <span className="font-mono text-[#06B6D4]">{toHex2(operandB)}</span>
              </div>
              <input
                type="number"
                min={0}
                max={255}
                value={operandB}
                onChange={(e) => setOperandB(clampByte(e.target.value))}
                className="w-full rounded border border-[#27272A] bg-[#09090B] px-2 py-1 font-mono text-xs text-[#F4F4F5] focus:border-[#06B6D4] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-[#A1A1AA]">Opcode</label>
              <select
                value={opcode}
                onChange={(e) => setOpcode(e.target.value as Opcode)}
                className="w-full rounded border border-[#27272A] bg-[#09090B] px-2 py-1 font-mono text-xs text-[#F4F4F5] focus:border-[#06B6D4] focus:outline-none"
              >
                {OPCODES.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded border border-[#06B6D4]/50 bg-[#06B6D4]/15 px-3 py-1 text-xs font-medium text-[#06B6D4] transition-colors hover:border-[#06B6D4] hover:bg-[#06B6D4]/25"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Inject Vector</span>
            </button>
          </div>
        </form>
      </section>

      {/* 4. Calibration Sliders */}
      <section className="border-t border-[#27272A] pt-2.5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
            4. Calibration Parameters
          </h2>
          <Sliders className="h-3.5 w-3.5 text-[#A1A1AA]" />
        </div>

        <div className="space-y-3 rounded border border-[#27272A] bg-[#18181B] p-2.5">
          {/* Wafer Noise */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-[#F4F4F5]">Wafer Process Noise (σ_wafer)</span>
              <span className="font-mono font-semibold text-[#06B6D4]">
                {waferNoiseMultiplier.toFixed(1)}×
              </span>
            </div>
            <input
              type="range"
              min={0.2}
              max={2.5}
              step={0.1}
              value={waferNoiseMultiplier}
              onChange={(e) => onChangeWaferNoise(parseFloat(e.target.value))}
              className="eda-slider w-full"
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-[#A1A1AA]">
              <span>σ_P = {sigmaP} mW</span>
              <span>σ_T = {sigmaT} ns</span>
            </div>
          </div>

          {/* Z-Score Threshold */}
          <div className="border-t border-[#27272A] pt-2.5">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-[#F4F4F5]">Z-Score Threshold (τ)</span>
              <span className="font-mono font-semibold text-[#F59E0B]">{tau.toFixed(1)}σ</span>
            </div>
            <input
              type="range"
              min={1.5}
              max={4.5}
              step={0.1}
              value={tau}
              onChange={(e) => onChangeTau(parseFloat(e.target.value))}
              className="eda-slider w-full"
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-[#A1A1AA]">
              <span>WARN ≥ {tau.toFixed(1)}σ</span>
              <span>CRIT ≥ {(tau + 1.0).toFixed(1)}σ</span>
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
};
