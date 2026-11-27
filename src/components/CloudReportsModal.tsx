import React, { useEffect, useState } from 'react';
import {
  Cloud,
  CloudUpload,
  Database,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  CloudForensicReport,
  fetchForensicReports,
  isSupabaseConfigured,
  saveForensicReport,
} from '../lib/supabase';
import { ChipProfileMeta, CycleRecord, SessionKpis } from '../types/silicon';

interface CloudReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: ChipProfileMeta;
  waferNoiseMultiplier: number;
  tau: number;
  kpis: SessionKpis;
  cycles: CycleRecord[];
}

export const CloudReportsModal: React.FC<CloudReportsModalProps> = ({
  isOpen,
  onClose,
  activeProfile,
  waferNoiseMultiplier,
  tau,
  kpis,
  cycles,
}) => {
  const [sessionLabel, setSessionLabel] = useState<string>(
    `${activeProfile.shortName} · ${kpis.nTotal} cycles`
  );
  const [reports, setReports] = useState<CloudForensicReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSessionLabel(`${activeProfile.shortName} · ${kpis.nTotal} cycles`);
    setErrorMsg(null);
    setSuccessMsg(null);
    void loadReports();
  }, [isOpen, activeProfile.shortName, kpis.nTotal]);

  const loadReports = async () => {
    if (!isSupabaseConfigured) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchForensicReports(20);
      setReports(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load cloud reports.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const flaggedAnomalies = cycles.filter((c) => c.verdict !== 'PASS');
      const saved = await saveForensicReport({
        sessionLabel,
        profileId: activeProfile.id,
        profileName: activeProfile.name,
        waferNoiseMultiplier,
        tauThreshold: tau,
        kpis,
        flaggedAnomalies,
      });
      setReports((prev) => [saved, ...prev]);
      setSuccessMsg(`Saved report #${saved.id} to Supabase.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save report.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-[#27272A] bg-[#111114] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272A] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Database className="h-4 w-4 text-[#10B981]" />
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-[#F4F4F5]">
                Supabase Cloud Forensic Registry
              </h2>
              <p className="font-mono text-[10px] text-[#A1A1AA]">
                Persist verification runs &amp; inspect audit history across sessions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#27272A] bg-[#18181B] p-1 text-[#A1A1AA] hover:text-[#F4F4F5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
          {!isSupabaseConfigured ? (
            <div className="rounded border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3 text-[#F4F4F5]">
              Supabase environment variables (<code>VITE_SUPABASE_URL</code>,{' '}
              <code>VITE_SUPABASE_ANON_KEY</code>) are not set. Add them to{' '}
              <code>.env.local</code> or Vercel Environment Variables to enable cloud persistence.
            </div>
          ) : (
            <>
              {/* Save Current Session Card */}
              <form
                onSubmit={handleSave}
                className="rounded border border-[#27272A] bg-[#18181B] p-3.5"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F4F4F5]">
                    Snapshot Current Session to Supabase
                  </span>
                  <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-[#A1A1AA]">
                    <span>CUT: {activeProfile.shortName}</span>
                    <span>N_total: {kpis.nTotal}</span>
                    <span className={kpis.nLogic > 0 ? 'text-[#EF4444]' : ''}>
                      N_logic: {kpis.nLogic}
                    </span>
                    <span className={kpis.nSide > 0 ? 'text-[#F59E0B]' : ''}>
                      N_side: {kpis.nSide}
                    </span>
                    <span className="text-[#06B6D4]">Trust: {kpis.trustScore}%</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={sessionLabel}
                    onChange={(e) => setSessionLabel(e.target.value)}
                    maxLength={120}
                    placeholder="e.g. Dormant Logic Sweep — Rare-State Trigger Caught"
                    className="min-w-[240px] flex-1 rounded border border-[#27272A] bg-[#09090B] px-3 py-1.5 font-mono text-xs text-[#F4F4F5] focus:border-[#06B6D4] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSaving || kpis.nTotal === 0}
                    className="inline-flex items-center gap-1.5 rounded border border-[#10B981]/50 bg-[#10B981]/15 px-3.5 py-1.5 text-xs font-medium text-[#10B981] transition-colors hover:border-[#10B981] hover:bg-[#10B981]/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CloudUpload className="h-3.5 w-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Audit to Cloud'}</span>
                  </button>
                </div>

                {errorMsg && (
                  <div className="mt-2 rounded border border-[#EF4444]/40 bg-[#EF4444]/10 px-2.5 py-1.5 font-mono text-[11px] text-[#EF4444]">
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="mt-2 rounded border border-[#10B981]/40 bg-[#10B981]/10 px-2.5 py-1.5 font-mono text-[11px] text-[#10B981]">
                    {successMsg}
                  </div>
                )}
              </form>

              {/* Saved Cloud Reports Table */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-3.5 w-3.5 text-[#06B6D4]" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F4F4F5]">
                      Persisted Forensic Runs ({reports.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadReports()}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-[11px] text-[#A1A1AA] hover:text-[#F4F4F5]"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="overflow-hidden rounded border border-[#27272A] bg-[#09090B]">
                  <table className="w-full border-collapse text-left font-mono text-[11px]">
                    <thead className="border-b border-[#27272A] bg-[#18181B] text-[10px] uppercase tracking-wider text-[#A1A1AA]">
                      <tr>
                        <th className="px-3 py-2 font-medium">Run #</th>
                        <th className="px-3 py-2 font-medium">Session Label</th>
                        <th className="px-3 py-2 font-medium">CUT Profile</th>
                        <th className="px-3 py-2 font-medium text-right">Cycles</th>
                        <th className="px-3 py-2 font-medium text-right">Logic</th>
                        <th className="px-3 py-2 font-medium text-right">Side</th>
                        <th className="px-3 py-2 font-medium text-right">Trust</th>
                        <th className="px-3 py-2 font-medium text-right">Saved At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A]/60">
                      {reports.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-8 text-center text-[#71717A]">
                            {isLoading
                              ? 'Loading persisted reports from Supabase...'
                              : 'No cloud forensic reports saved yet. Click "Save Audit to Cloud" above!'}
                          </td>
                        </tr>
                      ) : (
                        reports.map((rep) => {
                          const trustColor =
                            rep.trust_score >= 85
                              ? 'text-[#10B981]'
                              : rep.trust_score >= 50
                                ? 'text-[#F59E0B]'
                                : 'text-[#EF4444]';

                          return (
                            <tr key={rep.id} className="hover:bg-[#18181B]/70">
                              <td className="px-3 py-2 text-[#A1A1AA]">#{rep.id}</td>
                              <td className="px-3 py-2 font-sans text-xs font-medium text-[#F4F4F5]">
                                {rep.session_label}
                              </td>
                              <td className="px-3 py-2 text-[#06B6D4]">{rep.profile_name}</td>
                              <td className="px-3 py-2 text-right text-[#F4F4F5]">{rep.n_total}</td>
                              <td
                                className={`px-3 py-2 text-right ${
                                  rep.n_logic > 0 ? 'font-bold text-[#EF4444]' : 'text-[#A1A1AA]'
                                }`}
                              >
                                {rep.n_logic}
                              </td>
                              <td
                                className={`px-3 py-2 text-right ${
                                  rep.n_side > 0 ? 'font-bold text-[#F59E0B]' : 'text-[#A1A1AA]'
                                }`}
                              >
                                {rep.n_side}
                              </td>
                              <td className={`px-3 py-2 text-right font-semibold ${trustColor}`}>
                                <span className="inline-flex items-center gap-1">
                                  {rep.trust_score >= 85 ? (
                                    <ShieldCheck className="h-3 w-3" />
                                  ) : (
                                    <ShieldAlert className="h-3 w-3" />
                                  )}
                                  {rep.trust_score}%
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right text-[10px] text-[#71717A]">
                                {new Date(rep.created_at).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
