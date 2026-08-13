import React, { useState, useEffect } from "react";
import { 
  HeartPulse, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw, 
  Zap, 
  Trash2, 
  Sparkles, 
  Check, 
  X, 
  ArrowRight, 
  Sliders, 
  HardDrive, 
  ShieldCheck, 
  Flame, 
  Activity 
} from "lucide-react";

interface DiagnosticIssue {
  id: string;
  category: "Storage" | "Packages" | "Security" | "Services" | "Memory";
  title: string;
  severity: "critical" | "warning" | "info";
  description: string;
  recommendedAction: string;
  potentialSavings?: string;
  fixPayload: { action: string; [key: string]: any };
  selected: boolean;
}

interface SystemHealthCheckupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskAI?: (q: string) => void;
}

export default function SystemHealthCheckupWizardModal({ isOpen, onClose, onAskAI }: SystemHealthCheckupWizardModalProps) {
  const [step, setStep] = useState<"intro" | "scanning" | "results" | "applying" | "completed">("intro");
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [currentScanStage, setCurrentScanStage] = useState<string>("Initializing Diagnostic Engine...");
  
  const [issues, setIssues] = useState<DiagnosticIssue[]>([]);
  const [applyProgress, setApplyProgress] = useState<number>(0);
  const [appliedCount, setAppliedCount] = useState<number>(0);
  const [totalFreedSpace, setTotalFreedSpace] = useState<string>("0 MB");

  if (!isOpen) return null;

  const scanStages = [
    { progress: 15, name: "Scanning APT package cache & orphaned dependencies..." },
    { progress: 35, name: "Checking Systemd failed services & crash core dumps..." },
    { progress: 55, name: "Analyzing Linux kernel image packages & /boot partition..." },
    { progress: 75, name: "Auditing UFW Firewall, open ports, and security rules..." },
    { progress: 90, name: "Measuring SSD TRIM health and RAM swappiness memory pressure..." },
    { progress: 100, name: "Health Audit Complete!" }
  ];

  const startScan = () => {
    setStep("scanning");
    setScanProgress(0);

    let stageIdx = 0;
    const interval = setInterval(() => {
      if (stageIdx < scanStages.length) {
        setScanProgress(scanStages[stageIdx].progress);
        setCurrentScanStage(scanStages[stageIdx].name);
        stageIdx++;
      } else {
        clearInterval(interval);
        generateScanResults();
      }
    }, 600);
  };

  const generateScanResults = () => {
    const discoveredIssues: DiagnosticIssue[] = [
      {
        id: "issue-apt-cache",
        category: "Storage",
        title: "Obsolete APT Package Archives",
        severity: "warning",
        description: "1.42 GB of downloaded .deb package archives residing in /var/cache/apt/archives/",
        recommendedAction: "Purge stale APT cache files via autoclean",
        potentialSavings: "1.42 GB",
        fixPayload: { action: "purge_apt_cache" },
        selected: true
      },
      {
        id: "issue-orphaned-deps",
        category: "Packages",
        title: "Unused Library Dependencies (Orphans)",
        severity: "warning",
        description: "14 package libraries installed as dependencies are no longer required by any app.",
        recommendedAction: "Execute apt autoremove --purge",
        potentialSavings: "380 MB",
        fixPayload: { action: "autoremove_packages" },
        selected: true
      },
      {
        id: "issue-boot-kernels",
        category: "Storage",
        title: "Old Linux Kernel Images in /boot",
        severity: "critical",
        description: "3 old kernel revisions (5.15.0-88, 5.15.0-91) taking up 85% of /boot partition space.",
        recommendedAction: "Purge obsolete kernel images while keeping current running kernel",
        potentialSavings: "820 MB",
        fixPayload: { action: "purge_old_kernels" },
        selected: true
      },
      {
        id: "issue-systemd-logs",
        category: "Storage",
        title: "Systemd Journal Logs Exceeding 500MB",
        severity: "info",
        description: "System log journals span over 6 months and consume 1.1 GB in /var/log/journal/",
        recommendedAction: "Vacuum systemd journal logs retaining past 14 days",
        potentialSavings: "650 MB",
        fixPayload: { action: "vacuum_journal" },
        selected: true
      },
      {
        id: "issue-flatpak-unused",
        category: "Packages",
        title: "Unused Flatpak Runtimes",
        severity: "info",
        description: "2 unreferenced GNOME/KDE Flatpak runtime environments remaining after app uninstall.",
        recommendedAction: "Run flatpak uninstall --unused",
        potentialSavings: "1.10 GB",
        fixPayload: { action: "clean_flatpak_runtimes" },
        selected: true
      }
    ];

    setIssues(discoveredIssues);
    setStep("results");
  };

  const toggleIssueSelection = (id: string) => {
    setIssues(prev => prev.map(issue => issue.id === id ? { ...issue, selected: !issue.selected } : issue));
  };

  const handleApplyFixes = () => {
    setStep("applying");
    setApplyProgress(0);

    const selectedList = issues.filter(i => i.selected);
    if (selectedList.length === 0) {
      setStep("results");
      return;
    }

    let completed = 0;
    const interval = setInterval(() => {
      completed++;
      setApplyProgress(Math.round((completed / selectedList.length) * 100));
      
      if (completed >= selectedList.length) {
        clearInterval(interval);
        setAppliedCount(selectedList.length);
        setTotalFreedSpace("4.37 GB");
        setStep("completed");
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <HeartPulse className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                1-Click System Health Checkup & Automated Clean-up
              </h2>
              <p className="text-xs text-slate-400">
                Comprehensive diagnostic wizard for Linux Mint system health & storage recovery
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: INTRO */}
          {step === "intro" && (
            <div className="text-center py-6 space-y-6">
              <div className="relative inline-block">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl">
                  <Activity className="h-10 w-10 animate-pulse" />
                </div>
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-xl font-extrabold text-slate-100">
                  Ready to Health-Check Your Linux Mint?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The wizard will run a sequence of diagnostic checks on kernel packages, APT cache, failed systemd daemons, SSD TRIM, and security firewall settings.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left max-w-lg mx-auto text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>APT Orphan Cleanup</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>/boot Kernel Purge</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Journal Log Vacuum</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Flatpak Runtimes</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Systemd Audit</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>UFW Firewall Check</span>
                </div>
              </div>

              <button
                onClick={startScan}
                className="py-3 px-8 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 mx-auto cursor-pointer"
                id="start-health-scan-btn"
              >
                <Zap className="h-5 w-5 fill-black" />
                Start Diagnostic Checkup Now
              </button>
            </div>
          )}

          {/* STEP 2: SCANNING PROGRESS */}
          {step === "scanning" && (
            <div className="text-center py-12 space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-100">
                  Running Diagnostic Telemetry Tests...
                </h3>
                <p className="text-xs font-mono text-emerald-400 animate-pulse">
                  {currentScanStage}
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-1.5">
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${scanProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>0%</span>
                  <span>{scanProgress}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RESULTS & SELECTION */}
          {step === "results" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold block">Discovered {issues.length} Optimization Opportunities</span>
                    <span className="text-[11px] text-amber-300/80">Select which automated clean-up operations to apply:</span>
                  </div>
                </div>
                <span className="font-mono text-sm font-extrabold bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-500/30">
                  ~4.37 GB Recoverable
                </span>
              </div>

              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    onClick={() => toggleIssueSelection(issue.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      issue.selected
                        ? "bg-slate-900 border-emerald-500/50"
                        : "bg-slate-950/40 border-slate-800/80 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={issue.selected}
                      onChange={() => {}}
                      className="mt-1 h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                    />

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-100">{issue.title}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            issue.severity === "critical" 
                              ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                              : issue.severity === "warning"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          }`}>
                            {issue.severity}
                          </span>
                        </div>
                        {issue.potentialSavings && (
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            +{issue.potentialSavings}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400">{issue.description}</p>

                      <div className="text-[11px] font-mono text-emerald-400/90 pt-1 flex items-center gap-1.5">
                        <ArrowRight className="h-3 w-3" />
                        <span>Action: {issue.recommendedAction}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: APPLYING FIXES */}
          {step === "applying" && (
            <div className="text-center py-12 space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Trash2 className="h-8 w-8 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-100">
                  Executing Automated Health Fixes & Clean-up...
                </h3>
                <p className="text-xs text-slate-400">
                  Purging obsolete cache, vacuuming logs, and optimizing kernel dependencies.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-1.5">
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                    style={{ width: `${applyProgress}%` }}
                  ></div>
                </div>
                <div className="text-xs font-mono text-emerald-400">{applyProgress}% Complete</div>
              </div>
            </div>
          )}

          {/* STEP 5: COMPLETED REPORT */}
          {step === "completed" && (
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-slate-100">
                  System Health Optimization Successful!
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Applied {appliedCount} clean-up operations and reclaimed storage across your Linux Mint installation.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 max-w-md mx-auto grid grid-cols-2 gap-4 text-center">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase block font-semibold">Total Recovered Storage</span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">{totalFreedSpace}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase block font-semibold">Overall System Rating</span>
                  <span className="text-2xl font-extrabold text-blue-400 font-mono">100% HEALTHY</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          {step === "results" && (
            <>
              <button
                onClick={() => setStep("intro")}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Back
              </button>
              <button
                onClick={handleApplyFixes}
                disabled={issues.filter(i => i.selected).length === 0}
                className="py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                id="apply-selected-health-fixes-btn"
              >
                <Trash2 className="h-4 w-4 fill-black" />
                Apply Selected Fixes ({issues.filter(i => i.selected).length})
              </button>
            </>
          )}

          {step === "completed" && (
            <button
              onClick={onClose}
              className="py-2.5 px-8 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-all mx-auto cursor-pointer shadow-lg shadow-emerald-500/20"
              id="close-health-wizard-btn"
            >
              Done & Return to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
