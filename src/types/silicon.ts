export type Opcode = 'ADD' | 'SUB' | 'AND' | 'OR' | 'XOR';

export type ChipProfileId =
  | 'clean'
  | 'dormant_logic'
  | 'power_side_channel'
  | 'path_delay';

export type Verdict = 'PASS' | 'WARNING' | 'CRITICAL';

export interface ChipProfileMeta {
  id: ChipProfileId;
  name: string;
  shortName: string;
  tag: string;
  description: string;
  threatVector: string;
}

export interface StimulusVector {
  operandA: number;
  operandB: number;
  opcode: Opcode;
}

export interface ProfileMarker {
  afterCycle: number; // Cycle number immediately preceding the switch (0 if before cycle 1)
  fromProfile: ChipProfileId;
  toProfile: ChipProfileId;
}

export interface CycleRecord {
  cycle: number;
  timestamp: string;
  profileId: ChipProfileId;
  operandA: number;
  operandB: number;
  opcode: Opcode;
  yGolden: number;
  yCut: number;
  hammingWeight: number;
  deltaL: number;
  flippedBits: number[];
  muP: number;
  muT: number;
  sigmaP: number;
  sigmaT: number;
  pCut: number;
  tCut: number;
  deltaP: number;
  deltaT: number;
  zP: number;
  zT: number;
  zMulti: number;
  windowCount: number;
  meanDeltaP: number;
  zWindow: number;
  verdict: Verdict;
  isLogicFlagged: boolean;
  isSideChannelFlagged: boolean;
  triggeredStages: string[];
  diagnosticSummary: string;
}

export interface SessionKpis {
  nTotal: number;
  nLogic: number;
  nSide: number;
  trustScore: number;
}
