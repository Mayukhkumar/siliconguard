import {
  ChipProfileId,
  ChipProfileMeta,
  CycleRecord,
  Opcode,
  SessionKpis,
  StimulusVector,
  Verdict,
} from '../types/silicon';

export const OPCODES: Opcode[] = ['ADD', 'SUB', 'AND', 'OR', 'XOR'];

export const P_STATIC_MW = 12.0;
export const ALPHA_HW_MW = 0.35;
export const CAPACITIVE_OFFSET_NS = 0.4;
export const BASE_SIGMA_P = 0.9;
export const BASE_SIGMA_T = 0.55;
export const SLIDING_WINDOW_SIZE = 20;

export const P_OP_MAP: Record<Opcode, number> = {
  ADD: 4.5,
  SUB: 5.0,
  AND: 2.2,
  OR: 2.4,
  XOR: 3.1,
};

export const T_BASE_MAP: Record<Opcode, number> = {
  ADD: 4.2,
  SUB: 4.6,
  AND: 2.8,
  OR: 2.9,
  XOR: 3.5,
};

export const CHIP_PROFILES: ChipProfileMeta[] = [
  {
    id: 'clean',
    name: 'Clean Baseline ALU',
    shortName: 'Clean Baseline',
    tag: 'GOLDEN REF',
    description: 'Verified reference silicon with zero tampering.',
    threatVector: 'Nominal process variation only',
  },
  {
    id: 'dormant_logic',
    name: 'Dormant Logic Trojan',
    shortName: 'Dormant Logic',
    tag: 'TRIGGERED PAYLOAD',
    description:
      'Silent on normal inputs; triggers ONLY when A = 0x0D, B = 0x07, XOR, flipping bits [1, 3] (0x0A) and spiking +4.2 mW.',
    threatVector: 'Rare-state combinational trigger',
  },
  {
    id: 'power_side_channel',
    name: 'Power Side-Channel Trojan',
    shortName: 'Power Side-Channel',
    tag: 'COVERT LEAKAGE',
    description:
      'Never corrupts logic, but adds constant +2.4 mW static leakage every cycle plus +6.5 mW burst spikes every 16 cycles.',
    threatVector: 'Sub-threshold leakage + periodic RF/burst',
  },
  {
    id: 'path_delay',
    name: 'Path Delay Trojan',
    shortName: 'Path Delay',
    tag: 'TIMING TAMPER',
    description:
      'Never corrupts logic, but adds +1.9 ns propagation delay specifically on SUB operations via parasitic capacitive loading.',
    threatVector: 'Critical-path capacitive slowdown',
  },
];

export function getProfileMeta(id: ChipProfileId): ChipProfileMeta {
  return CHIP_PROFILES.find((p) => p.id === id) ?? CHIP_PROFILES[0];
}

export function toHex2(value: number): string {
  return `0x${(value & 0xff).toString(16).toUpperCase().padStart(2, '0')}`;
}

export function toBin8(value: number): string {
  return (value & 0xff).toString(2).padStart(8, '0');
}

export function hammingWeight(value: number): number {
  let v = value & 0xff;
  let count = 0;
  while (v > 0) {
    count += v & 1;
    v >>= 1;
  }
  return count;
}

export function getFlippedBits(deltaL: number): number[] {
  const bits: number[] = [];
  for (let i = 0; i < 8; i++) {
    if (((deltaL >> i) & 1) === 1) {
      bits.push(i);
    }
  }
  return bits;
}

/**
 * Box-Muller transform for Gaussian noise N(mean, stdDev^2).
 */
export function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.max(1e-12, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

/**
 * Stage 1: 8-bit unsigned ALU golden reference output (masked to 0xFF).
 */
export function computeGoldenAlu(a: number, b: number, opcode: Opcode): number {
  const ua = a & 0xff;
  const ub = b & 0xff;
  switch (opcode) {
    case 'ADD':
      return (ua + ub) & 0xff;
    case 'SUB':
      return (ua - ub) & 0xff;
    case 'AND':
      return (ua & ub) & 0xff;
    case 'OR':
      return (ua | ub) & 0xff;
    case 'XOR':
      return (ua ^ ub) & 0xff;
  }
}

export function classifyCycle(
  record: Omit<
    CycleRecord,
    'verdict' | 'isLogicFlagged' | 'isSideChannelFlagged' | 'triggeredStages' | 'diagnosticSummary'
  >,
  tau: number
): Pick<
  CycleRecord,
  'verdict' | 'isLogicFlagged' | 'isSideChannelFlagged' | 'triggeredStages' | 'diagnosticSummary'
> {
  const {
    deltaL,
    flippedBits,
    zP,
    zT,
    zMulti,
    zWindow,
    windowCount,
    meanDeltaP,
    deltaP,
    deltaT,
    operandA,
    operandB,
    opcode,
    yCut,
    yGolden,
  } = record;

  const isLogicFlagged = deltaL !== 0;
  const isCriticalMulti = zMulti >= tau + 1.0;
  const isSingleAxisWarn = Math.max(zP, zT) >= tau;
  const isWindowWarn = windowCount >= 5 && zWindow >= tau;
  const isSideChannelFlagged = isCriticalMulti || isSingleAxisWarn || isWindowWarn;

  let verdict: Verdict = 'PASS';
  if (isLogicFlagged || isCriticalMulti) {
    verdict = 'CRITICAL';
  } else if (isSingleAxisWarn || isWindowWarn) {
    verdict = 'WARNING';
  }

  const triggeredStages: string[] = [];
  if (isLogicFlagged) {
    triggeredStages.push(`Stage 2: ΔL=${toHex2(deltaL)}`);
  }
  if (isCriticalMulti) {
    triggeredStages.push(`Stage 3: Z_multi=${zMulti.toFixed(2)} ≥ ${(tau + 1).toFixed(1)}`);
  } else {
    if (zP >= tau) triggeredStages.push(`Stage 3: Z_P=${zP.toFixed(2)} ≥ ${tau.toFixed(1)}`);
    if (zT >= tau) triggeredStages.push(`Stage 3: Z_T=${zT.toFixed(2)} ≥ ${tau.toFixed(1)}`);
  }
  if (isWindowWarn) {
    triggeredStages.push(
      `Stage 4: Z_window=${zWindow.toFixed(2)} ≥ ${tau.toFixed(1)} (W=${windowCount})`
    );
  }

  let diagnosticSummary: string;
  if (isLogicFlagged) {
    const bitList = flippedBits.join(', ');
    diagnosticSummary =
      `Bit flip detected at positions [${bitList}] on ${opcode} trigger ` +
      `(A=${toHex2(operandA)}, B=${toHex2(operandB)}). Logic mismatch ΔL = ${toHex2(deltaL)} ` +
      `(Y_CUT=${toHex2(yCut)} vs Y_golden=${toHex2(yGolden)})` +
      (zP >= tau
        ? ` accompanied by ${deltaP >= 0 ? '+' : ''}${deltaP.toFixed(2)} mW power spike.`
        : '.');
  } else if (verdict === 'CRITICAL') {
    if (zP >= zT && deltaP >= 5.0) {
      diagnosticSummary =
        `Severe power burst anomaly (ΔP=${deltaP >= 0 ? '+' : ''}${deltaP.toFixed(2)} mW, ` +
        `Z_P=${zP.toFixed(2)}, Z_multi=${zMulti.toFixed(2)} ≥ ${(tau + 1).toFixed(1)}) ` +
        `indicative of periodic side-channel burst or covert payload activation.`;
    } else if (zT >= zP && deltaT >= 1.2) {
      diagnosticSummary =
        `Critical path timing violation on ${opcode} (ΔT=${deltaT >= 0 ? '+' : ''}${deltaT.toFixed(2)} ns, ` +
        `Z_T=${zT.toFixed(2)}, Z_multi=${zMulti.toFixed(2)} ≥ ${(tau + 1).toFixed(1)}) ` +
        `consistent with parasitic capacitive loading.`;
    } else {
      diagnosticSummary =
        `Multi-parameter side-channel threshold exceeded (Z_multi=${zMulti.toFixed(2)} ≥ ${(tau + 1).toFixed(1)}; ` +
        `ΔP=${deltaP >= 0 ? '+' : ''}${deltaP.toFixed(2)} mW, ΔT=${deltaT >= 0 ? '+' : ''}${deltaT.toFixed(2)} ns).`;
    }
  } else if (verdict === 'WARNING') {
    if (isWindowWarn && !isSingleAxisWarn) {
      diagnosticSummary =
        `Sustained ${meanDeltaP >= 0 ? '+' : ''}${meanDeltaP.toFixed(2)} mW static leakage caught by ` +
        `${windowCount}-cycle sliding window (Z_window=${zWindow.toFixed(2)} ≥ τ=${tau.toFixed(1)}) ` +
        `despite single-cycle wafer noise.`;
    } else if (isWindowWarn && zP >= tau) {
      diagnosticSummary =
        `Power residual outlier (ΔP=${deltaP >= 0 ? '+' : ''}${deltaP.toFixed(2)} mW, Z_P=${zP.toFixed(2)}) ` +
        `reinforced by sustained ${windowCount}-cycle drift (Z_window=${zWindow.toFixed(2)} ≥ τ=${tau.toFixed(1)}).`;
    } else if (zT >= tau) {
      diagnosticSummary =
        `Path propagation delay suspect on ${opcode} (ΔT=${deltaT >= 0 ? '+' : ''}${deltaT.toFixed(2)} ns, ` +
        `Z_T=${zT.toFixed(2)} ≥ τ=${tau.toFixed(1)}), indicating capacitive loading on critical path.`;
    } else {
      diagnosticSummary =
        `Single-cycle power residual suspect (ΔP=${deltaP >= 0 ? '+' : ''}${deltaP.toFixed(2)} mW, ` +
        `Z_P=${zP.toFixed(2)} ≥ τ=${tau.toFixed(1)}).`;
    }
  } else {
    diagnosticSummary =
      `Clean silicon verification: zero logic mismatch (ΔL = 0x00) and all side-channel metrics ` +
      `(Z_P=${zP.toFixed(2)}, Z_T=${zT.toFixed(2)}, Z_multi=${zMulti.toFixed(2)}, Z_window=${zWindow.toFixed(2)}) ` +
      `within ±τ (${tau.toFixed(1)}) acceptance bounds.`;
  }

  return {
    verdict,
    isLogicFlagged,
    isSideChannelFlagged,
    triggeredStages,
    diagnosticSummary,
  };
}

export function simulateCycle(params: {
  cycleNumber: number;
  stimulus: StimulusVector;
  profileId: ChipProfileId;
  waferNoiseMultiplier: number;
  tau: number;
  priorCycles: CycleRecord[];
}): CycleRecord {
  const { cycleNumber, stimulus, profileId, waferNoiseMultiplier, tau, priorCycles } = params;
  const operandA = Math.max(0, Math.min(255, Math.floor(stimulus.operandA)));
  const operandB = Math.max(0, Math.min(255, Math.floor(stimulus.operandB)));
  const opcode = stimulus.opcode;

  // Stage 1: Golden Reference Model
  const yGolden = computeGoldenAlu(operandA, operandB, opcode);
  const hw = hammingWeight(yGolden);
  const muP = P_STATIC_MW + P_OP_MAP[opcode] + ALPHA_HW_MW * hw;
  const muT = T_BASE_MAP[opcode] + CAPACITIVE_OFFSET_NS;

  // Simulated CUT measurements with Gaussian noise
  const sigmaP = BASE_SIGMA_P * waferNoiseMultiplier;
  const sigmaT = BASE_SIGMA_T * waferNoiseMultiplier;
  let pCut = muP + gaussianRandom(0, sigmaP);
  let tCut = muT + gaussianRandom(0, sigmaT);
  let yCut = yGolden;

  // Apply active Trojan profile offsets
  if (profileId === 'dormant_logic') {
    if (operandA === 0x0d && operandB === 0x07 && opcode === 'XOR') {
      yCut = (yGolden ^ 0x0a) & 0xff;
      pCut += 4.2;
    }
  } else if (profileId === 'power_side_channel') {
    pCut += 2.4;
    if (cycleNumber % 16 === 0) {
      pCut += 6.5;
    }
  } else if (profileId === 'path_delay') {
    if (opcode === 'SUB') {
      tCut += 1.9;
    }
  }

  // Stage 2: Deterministic Logic Diff
  const deltaL = (yCut ^ yGolden) & 0xff;
  const flippedBits = getFlippedBits(deltaL);

  // Stage 3: Side-Channel Residuals & Multi-Parameter Z-Score
  const deltaP = pCut - muP;
  const deltaT = tCut - muT;
  const zP = Math.abs(deltaP) / sigmaP;
  const zT = Math.abs(deltaT) / sigmaT;
  const zMulti = Math.sqrt(zP * zP + zT * zT);

  // Stage 4: Sliding-Window Drift Filter (W = 20 cycles)
  const prevWindowSlice = priorCycles.slice(-(SLIDING_WINDOW_SIZE - 1));
  const windowCount = prevWindowSlice.length + 1;
  const sumDeltaP = prevWindowSlice.reduce((acc, c) => acc + c.deltaP, 0) + deltaP;
  const meanDeltaP = sumDeltaP / windowCount;
  const zWindow = Math.abs(meanDeltaP) / (sigmaP / Math.sqrt(windowCount));

  const baseRecord = {
    cycle: cycleNumber,
    timestamp: new Date().toISOString(),
    profileId,
    operandA,
    operandB,
    opcode,
    yGolden,
    yCut,
    hammingWeight: hw,
    deltaL,
    flippedBits,
    muP,
    muT,
    sigmaP,
    sigmaT,
    pCut,
    tCut,
    deltaP,
    deltaT,
    zP,
    zT,
    zMulti,
    windowCount,
    meanDeltaP,
    zWindow,
  };

  const classification = classifyCycle(baseRecord, tau);
  return {
    ...baseRecord,
    ...classification,
  };
}

export function reclassifyAllCycles(cycles: CycleRecord[], tau: number): CycleRecord[] {
  return cycles.map((c) => {
    const classification = classifyCycle(c, tau);
    return {
      ...c,
      ...classification,
    };
  });
}

export function computeKpis(cycles: CycleRecord[]): SessionKpis {
  const nTotal = cycles.length;
  let nLogic = 0;
  let nSide = 0;

  for (const c of cycles) {
    if (c.isLogicFlagged) nLogic++;
    if (c.isSideChannelFlagged) nSide++;
  }

  const trustScore = Math.max(
    0,
    Math.round(100 - (40 * nLogic + 150 * (nSide / Math.max(1, nTotal))))
  );

  return {
    nTotal,
    nLogic,
    nSide,
    trustScore,
  };
}

export function generateRandomVector(): StimulusVector {
  return {
    operandA: Math.floor(Math.random() * 256),
    operandB: Math.floor(Math.random() * 256),
    opcode: OPCODES[Math.floor(Math.random() * OPCODES.length)],
  };
}

/**
 * Generates 30 boundary/edge-case test vectors guaranteed to include the rare trigger
 * (A = 0x0D, B = 0x07, Opcode = XOR).
 */
export function generateRareStateSweepVectors(): StimulusVector[] {
  return [
    { operandA: 0x00, operandB: 0x00, opcode: 'ADD' },
    { operandA: 0xff, operandB: 0x01, opcode: 'ADD' },
    { operandA: 0xff, operandB: 0xff, opcode: 'ADD' },
    { operandA: 0x00, operandB: 0x01, opcode: 'SUB' },
    { operandA: 0x80, operandB: 0x01, opcode: 'SUB' },
    { operandA: 0x7f, operandB: 0x80, opcode: 'ADD' },
    { operandA: 0x55, operandB: 0xaa, opcode: 'XOR' },
    { operandA: 0xaa, operandB: 0x55, opcode: 'AND' },
    { operandA: 0x0f, operandB: 0xf0, opcode: 'OR' },
    { operandA: 0x01, operandB: 0xff, opcode: 'SUB' },
    { operandA: 0x0d, operandB: 0x07, opcode: 'ADD' }, // Near-miss: wrong opcode
    { operandA: 0x0d, operandB: 0x06, opcode: 'XOR' }, // Near-miss: B off by 1
    { operandA: 0x0c, operandB: 0x07, opcode: 'XOR' }, // Near-miss: A off by 1
    { operandA: 0xfe, operandB: 0xfe, opcode: 'XOR' },
    { operandA: 0x80, operandB: 0x80, opcode: 'ADD' },
    { operandA: 0x00, operandB: 0xff, opcode: 'AND' },
    { operandA: 0xff, operandB: 0x00, opcode: 'OR' },
    { operandA: 0x7f, operandB: 0x7f, opcode: 'SUB' },
    { operandA: 0x0d, operandB: 0x07, opcode: 'XOR' }, // Exact Rare-State Trojan Trigger
    { operandA: 0x10, operandB: 0x20, opcode: 'SUB' },
    { operandA: 0x01, operandB: 0x01, opcode: 'XOR' },
    { operandA: 0x81, operandB: 0x7e, opcode: 'ADD' },
    { operandA: 0x3c, operandB: 0xc3, opcode: 'XOR' },
    { operandA: 0x00, operandB: 0x80, opcode: 'SUB' },
    { operandA: 0xf0, operandB: 0x0f, opcode: 'AND' },
    { operandA: 0xa5, operandB: 0x5a, opcode: 'OR' },
    { operandA: 0x02, operandB: 0x04, opcode: 'SUB' },
    { operandA: 0xee, operandB: 0x11, opcode: 'ADD' },
    { operandA: 0x08, operandB: 0x08, opcode: 'XOR' },
    { operandA: 0xff, operandB: 0xff, opcode: 'SUB' },
  ];
}

export function generateInitialBaselineCycles(
  count = 25,
  waferNoiseMultiplier = 1.0,
  tau = 3.0
): CycleRecord[] {
  const cycles: CycleRecord[] = [];
  for (let i = 1; i <= count; i++) {
    const record = simulateCycle({
      cycleNumber: i,
      stimulus: generateRandomVector(),
      profileId: 'clean',
      waferNoiseMultiplier,
      tau,
      priorCycles: cycles,
    });
    cycles.push(record);
  }
  return cycles;
}
