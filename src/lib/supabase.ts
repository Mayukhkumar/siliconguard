import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ChipProfileId, CycleRecord, SessionKpis } from '../types/silicon';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export interface CloudForensicReport {
  id: number;
  created_at: string;
  session_label: string;
  profile_id: ChipProfileId;
  profile_name: string;
  wafer_noise_multiplier: number;
  tau_threshold: number;
  n_total: number;
  n_logic: number;
  n_side: number;
  trust_score: number;
  flagged_anomalies: CycleRecord[];
}

export async function saveForensicReport(params: {
  sessionLabel: string;
  profileId: ChipProfileId;
  profileName: string;
  waferNoiseMultiplier: number;
  tauThreshold: number;
  kpis: SessionKpis;
  flaggedAnomalies: CycleRecord[];
}): Promise<CloudForensicReport> {
  if (!supabase) {
    throw new Error('Supabase environment variables are not configured.');
  }

  const trimmedLabel = params.sessionLabel.trim().slice(0, 120);
  if (!trimmedLabel) {
    throw new Error('Please enter a session label before saving.');
  }
  if (params.kpis.nTotal <= 0) {
    throw new Error('Run at least 1 cycle before saving a forensic report.');
  }

  const { data, error } = await supabase
    .from('forensic_reports')
    .insert({
      session_label: trimmedLabel,
      profile_id: params.profileId,
      profile_name: params.profileName,
      wafer_noise_multiplier: Number(params.waferNoiseMultiplier.toFixed(2)),
      tau_threshold: Number(params.tauThreshold.toFixed(2)),
      n_total: params.kpis.nTotal,
      n_logic: params.kpis.nLogic,
      n_side: params.kpis.nSide,
      trust_score: params.kpis.trustScore,
      flagged_anomalies: params.flaggedAnomalies,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as CloudForensicReport;
}

export async function fetchForensicReports(limit = 20): Promise<CloudForensicReport[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('forensic_reports')
    .select(
      'id, created_at, session_label, profile_id, profile_name, wafer_noise_multiplier, tau_threshold, n_total, n_logic, n_side, trust_score, flagged_anomalies'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CloudForensicReport[];
}
