import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, RotateCcw, X } from 'lucide-react';
import { CloudReportsModal } from './components/CloudReportsModal';
import { DifferentialComparator } from './components/DifferentialComparator';
import { ForensicsPanel } from './components/ForensicsPanel';
import { FormulaModal } from './components/FormulaModal';
import { OscilloscopeCanvas } from './components/OscilloscopeCanvas';
import { SlidingWindowMeter } from './components/SlidingWindowMeter';
import { StimulusControlDeck } from './components/StimulusControlDeck';
import { TopKpiBar } from './components/TopKpiBar';
import {
  SLIDING_WINDOW_SIZE,
  computeKpis,
  generateInitialBaselineCycles,
  generateRandomVector,
  generateRareStateSweepVectors,
  getProfileMeta,
  reclassifyAllCycles,
  simulateCycle,
} from './engine/detectionEngine';
import {
  ChipProfileId,
  CycleRecord,
  ProfileMarker,
  StimulusVector,
} from './types/silicon';

export function App() {
  const [activeProfileId, setActiveProfileId] = useState<ChipProfileId>('clean');
  const [autoResetOnProfileSwitch, setAutoResetOnProfileSwitch] = useState<boolean>(false);
  const [waferNoiseMultiplier, setWaferNoiseMultiplier] = useState<number>(1.0);
  const [tau, setTau] = useState<number>(3.0);

  const [cycles, setCycles] = useState<CycleRecord[]>(() =>
    generateInitialBaselineCycles(25, 1.0, 3.0)
  );
  const [profileMarkers, setProfileMarkers] = useState<ProfileMarker[]>([]);
  const [switchBannerProfile, setSwitchBannerProfile] = useState<ChipProfileId | null>(null);

  const [isLiveClock, setIsLiveClock] = useState<boolean>(false);
  const [hoveredCycle, setHoveredCycle] = useState<number | null>(null);
  const [pinnedCycle, setPinnedCycle] = useState<number | null>(null);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState<boolean>(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);

  // Refs for interval live clock so it always reads latest calibration & profile
  const stateRef = useRef({
    activeProfileId,
    waferNoiseMultiplier,
    tau,
  });
  stateRef.current = { activeProfileId, waferNoiseMultiplier, tau };

  const appendStimuli = useCallback(
    (stimuli: StimulusVector[]) => {
      const { activeProfileId: profile, waferNoiseMultiplier: noise, tau: threshold } =
        stateRef.current;
      setCycles((prev) => {
        const next = [...prev];
        let nextCycleNum = next.length > 0 ? next[next.length - 1].cycle + 1 : 1;
        for (const stim of stimuli) {
          const rec = simulateCycle({
            cycleNumber: nextCycleNum++,
            stimulus: stim,
            profileId: profile,
            waferNoiseMultiplier: noise,
            tau: threshold,
            priorCycles: next,
          });
          next.push(rec);
        }
        return next;
      });
    },
    []
  );

  // Live Clock (~3 cycles / second -> 333 ms)
  useEffect(() => {
    if (!isLiveClock) return;
    const timer = window.setInterval(() => {
      appendStimuli([generateRandomVector()]);
    }, 333);
    return () => window.clearInterval(timer);
  }, [isLiveClock, appendStimuli]);

  // Esc key clears pinned cycle or closes modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCloudModalOpen) setIsCloudModalOpen(false);
        else if (isFormulaModalOpen) setIsFormulaModalOpen(false);
        else if (pinnedCycle !== null) setPinnedCycle(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCloudModalOpen, isFormulaModalOpen, pinnedCycle]);

  const handleResetSession = useCallback(() => {
    setIsLiveClock(false);
    setCycles([]);
    setProfileMarkers([]);
    setHoveredCycle(null);
    setPinnedCycle(null);
    setSwitchBannerProfile(null);
  }, []);

  const handleSelectProfile = useCallback(
    (nextId: ChipProfileId) => {
      if (nextId === activeProfileId) return;
      if (autoResetOnProfileSwitch) {
        setIsLiveClock(false);
        setCycles([]);
        setProfileMarkers([]);
        setHoveredCycle(null);
        setPinnedCycle(null);
        setSwitchBannerProfile(null);
        setActiveProfileId(nextId);
      } else {
        const lastCycleNum = cycles.length > 0 ? cycles[cycles.length - 1].cycle : 0;
        if (lastCycleNum > 0) {
          setProfileMarkers((prev) => [
            ...prev,
            {
              afterCycle: lastCycleNum,
              fromProfile: activeProfileId,
              toProfile: nextId,
            },
          ]);
          setSwitchBannerProfile(nextId);
        }
        setActiveProfileId(nextId);
      }
    },
    [activeProfileId, autoResetOnProfileSwitch, cycles]
  );

  const handleChangeTau = useCallback((nextTau: number) => {
    setTau(nextTau);
    setCycles((prev) => reclassifyAllCycles(prev, nextTau));
  }, []);

  const handleStepOne = useCallback(() => {
    appendStimuli([generateRandomVector()]);
  }, [appendStimuli]);

  const handleRunRandom50 = useCallback(() => {
    const batch = Array.from({ length: 50 }, () => generateRandomVector());
    appendStimuli(batch);
  }, [appendStimuli]);

  const handleRunTargetedSweep = useCallback(() => {
    appendStimuli(generateRareStateSweepVectors());
  }, [appendStimuli]);

  const handleInjectManual = useCallback(
    (vector: StimulusVector) => {
      appendStimuli([vector]);
    },
    [appendStimuli]
  );

  const kpis = useMemo(() => computeKpis(cycles), [cycles]);
  const activeProfileMeta = useMemo(() => getProfileMeta(activeProfileId), [activeProfileId]);

  const inspectedCycle = useMemo(() => {
    const targetNum = hoveredCycle ?? pinnedCycle;
    if (targetNum !== null) {
      const found = cycles.find((c) => c.cycle === targetNum);
      if (found) return found;
    }
    return cycles.length > 0 ? cycles[cycles.length - 1] : null;
  }, [cycles, hoveredCycle, pinnedCycle]);

  const handleExportJson = useCallback(() => {
    const flaggedAnomalies = cycles.filter((c) => c.verdict !== 'PASS');
    const report = {
      tool: 'SiliconGuard // Hardware Verification Engine',
      exportedAt: new Date().toISOString(),
      sessionConfig: {
        activeProfile: activeProfileMeta,
        waferNoiseMultiplier,
        zScoreThresholdTau: tau,
        slidingWindowSize: SLIDING_WINDOW_SIZE,
        profileSwitchMarkers: profileMarkers,
      },
      kpis,
      flaggedAnomalyCount: flaggedAnomalies.length,
      flaggedAnomalyCycles: flaggedAnomalies,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siliconguard-forensic-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [activeProfileMeta, cycles, kpis, profileMarkers, tau, waferNoiseMultiplier]);

  return (
    <div className="flex min-h-screen flex-col bg-[#09090B] text-[#F4F4F5] lg:h-screen lg:overflow-hidden">
      {/* ZONE A: Top KPI Status Bar */}
      <TopKpiBar
        activeProfile={activeProfileMeta}
        isLiveClock={isLiveClock}
        kpis={kpis}
        onReset={handleResetSession}
        onExportJson={handleExportJson}
        onOpenFormulaModal={() => setIsFormulaModalOpen(true)}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
      />

      {/* Main Desktop Workbench Body */}
      <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-[310px_1fr]">
        {/* ZONE B: Left Sidebar (Stimulus & Threat Control Deck) */}
        <StimulusControlDeck
          activeProfileId={activeProfileId}
          autoResetOnProfileSwitch={autoResetOnProfileSwitch}
          onToggleAutoReset={setAutoResetOnProfileSwitch}
          onSelectProfile={handleSelectProfile}
          isLiveClock={isLiveClock}
          onToggleLiveClock={() => setIsLiveClock((v) => !v)}
          onStepOne={handleStepOne}
          onRunRandom50={handleRunRandom50}
          onRunTargetedSweep={handleRunTargetedSweep}
          onInjectManual={handleInjectManual}
          waferNoiseMultiplier={waferNoiseMultiplier}
          onChangeWaferNoise={setWaferNoiseMultiplier}
          tau={tau}
          onChangeTau={handleChangeTau}
        />

        {/* Right Area: ZONE C (Center Viewport) + ZONE D (Bottom Forensics Panel) */}
        <main className="flex flex-1 flex-col lg:min-h-0 lg:overflow-hidden">
          {/* ZONE C: Center Viewport */}
          <div className="flex-1 space-y-2 overflow-y-auto p-2.5 lg:min-h-0">
            {/* Optional Profile Switch Comparison Banner */}
            {switchBannerProfile && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-1.5 text-xs">
                <div className="flex items-center gap-2 text-[#F4F4F5]">
                  <AlertCircle className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span>
                    Profile switched to{' '}
                    <strong className="font-semibold text-[#F59E0B]">
                      {getProfileMeta(switchBannerProfile).name}
                    </strong>{' '}
                    — marker placed on oscilloscopes. Reset for isolated KPI comparison?
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleResetSession}
                    className="inline-flex items-center gap-1 rounded border border-[#F59E0B]/50 bg-[#F59E0B]/20 px-2 py-0.5 text-[11px] font-medium text-[#F59E0B] hover:bg-[#F59E0B]/30"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Clean Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwitchBannerProfile(null)}
                    className="rounded p-0.5 text-[#A1A1AA] hover:text-[#F4F4F5]"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* 1. Dual Synchronized Retina HTML5 Canvas Oscilloscopes */}
            <OscilloscopeCanvas
              cycles={cycles}
              tau={tau}
              profileMarkers={profileMarkers}
              hoveredCycle={hoveredCycle}
              pinnedCycle={pinnedCycle}
              onHoverCycle={setHoveredCycle}
              onPinCycle={setPinnedCycle}
            />

            {/* 2. Sliding-Window Drift Meter */}
            <SlidingWindowMeter cycle={inspectedCycle} tau={tau} />

            {/* 3. Differential Comparator & Live Math Readout */}
            <DifferentialComparator
              cycle={inspectedCycle}
              tau={tau}
              isPinned={pinnedCycle !== null && inspectedCycle?.cycle === pinnedCycle}
              isHovered={hoveredCycle !== null && inspectedCycle?.cycle === hoveredCycle}
            />
          </div>

          {/* ZONE D: Bottom Forensics Panel */}
          <ForensicsPanel
            cycles={cycles}
            inspectedCycle={inspectedCycle}
            pinnedCycle={pinnedCycle}
            onSelectCycle={(cycleNum) =>
              setPinnedCycle((prev) => (prev === cycleNum ? null : cycleNum))
            }
          />
        </main>
      </div>

      {/* Formula Reference Modal */}
      <FormulaModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
        waferNoiseMultiplier={waferNoiseMultiplier}
        tau={tau}
      />

      {/* Supabase Cloud Forensic Registry Modal */}
      <CloudReportsModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        activeProfile={activeProfileMeta}
        waferNoiseMultiplier={waferNoiseMultiplier}
        tau={tau}
        kpis={kpis}
        cycles={cycles}
      />
    </div>
  );
}

export default App;
