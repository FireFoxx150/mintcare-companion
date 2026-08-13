import React, { useState, useEffect } from "react";
import { 
  HardDrive, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  Flame, 
  Gauge, 
  Sparkles, 
  ShieldCheck,
  Play,
  Loader2
} from "lucide-react";
import { SmartDriveHealth } from "../types";

export default function DiskSmartHealthBenchmark({ onAskAI }: { onAskAI?: (q: string) => void }) {
  const [driveData, setDriveData] = useState<SmartDriveHealth | null>(null);
  const [loadingDrive, setLoadingDrive] = useState(true);
  const [driveError, setDriveError] = useState<string | null>(null);

  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchResults, setBenchResults] = useState<{
    averageReadSpeed: number;
    averageWriteSpeed: number;
    data: { blockSize: string; readSpeed: number; writeSpeed: number }[];
    driveName: string;
    durationMs: number;
  } | null>(null);
  const [benchError, setBenchError] = useState<string | null>(null);

  // Load live SMART data on mount
  useEffect(() => {
    async function fetchSmartHealth() {
      setLoadingDrive(true);
      setDriveError(null);
      try {
        const res = await fetch("/api/system/smart-health");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const drives: SmartDriveHealth[] = await res.json();
        if (drives.length > 0) {
          setDriveData(drives[0]);
        } else {
          setDriveError("No drives detected by S.M.A.R.T.");
        }
      } catch (err: any) {
        setDriveError(err.message ?? "Failed to load drive health data.");
      } finally {
        setLoadingDrive(false);
      }
    }
    fetchSmartHealth();
  }, []);

  // Run real disk benchmark via the server
  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    setBenchResults(null);
    setBenchError(null);
    try {
      const res = await fetch("/api/diagnostics/benchmark");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBenchResults(data);
    } catch (err: any) {
      setBenchError(err.message ?? "Benchmark failed.");
    } finally {
      setIsBenchmarking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <HardDrive className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-100">
                S.M.A.R.T. Drive Health & Speed Benchmark
              </h2>
            </div>
            <p className="text-slate-400 text-sm pl-11">
              Read low-level S.M.A.R.T disk health telemetry and measure real-time sequential & random IOPS disk speeds.
            </p>
          </div>

          <div className="flex items-center gap-2 pl-11 lg:pl-0">
            <button
              onClick={handleRunBenchmark}
              disabled={isBenchmarking}
              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              id="run-disk-benchmark-btn"
            >
              {isBenchmarking
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Play className="h-4 w-4 fill-black" />}
              {isBenchmarking ? "Running Benchmark..." : "Run Speed Benchmark"}
            </button>
          </div>
        </div>
      </div>

      {/* Drive Overview Cards */}
      {loadingDrive ? (
        <div className="flex items-center justify-center gap-3 py-10 text-slate-400 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          Loading S.M.A.R.T. drive data...
        </div>
      ) : driveError ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {driveError}
        </div>
      ) : driveData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium uppercase">Drive Health Status</span>
              <div className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                {driveData.healthPercentage}% HEALTHY
              </div>
              <span className="text-[11px] text-slate-400">
                {driveData.badSectors === 0 ? "No bad sectors detected" : `${driveData.badSectors} bad sector(s)`}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium uppercase">Drive Thermal Status</span>
              <div className="text-xl font-bold text-slate-100 flex items-center gap-2 font-mono">
                <Flame className="h-5 w-5 text-amber-400" />
                {driveData.temp} °C
              </div>
              <span className={`text-[11px] ${driveData.temp > 55 ? "text-red-400" : driveData.temp > 45 ? "text-amber-400" : "text-emerald-400"}`}>
                {driveData.temp > 55 ? "High Temperature Warning" : driveData.temp > 45 ? "Elevated — monitor closely" : "Optimal Thermal Zone"}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium uppercase">Power-on Time</span>
              <div className="text-xl font-bold text-slate-100 font-mono">
                {driveData.powerOnHours.toLocaleString()} Hours
              </div>
              <span className="text-[11px] text-slate-400">
                ~{Math.round(driveData.powerOnHours / 24)} Days Continuous Usage
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium uppercase">Model & Device</span>
              <div className="text-xs font-bold text-slate-200 truncate" title={driveData.model}>
                {driveData.model}
              </div>
              <span className="text-[11px] font-mono text-emerald-400">{driveData.device}</span>
            </div>
          </div>

          {/* S.M.A.R.T Attribute Table */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
              <h3 className="text-sm font-bold text-slate-200">S.M.A.R.T. Diagnostic Attributes</h3>
            </div>

            {driveData.attributes.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                No S.M.A.R.T. attributes available (smartctl may not be installed or drive unsupported).
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 overflow-x-auto">
                {driveData.attributes.map((attr) => (
                  <div key={attr.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-900/80 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-200">{attr.name}</div>
                      <div className="text-[11px] text-slate-400">{attr.description}</div>
                    </div>
                    <div className="flex items-center gap-6 font-mono shrink-0">
                      <span className="text-slate-300">{attr.raw}</span>
                      <span className={`px-2 py-0.5 rounded font-bold border ${
                        attr.status === "CRITICAL" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        attr.status === "WARNING" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}>
                        {attr.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Disk Speed Benchmark Results */}
      {benchError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {benchError}
        </div>
      )}

      {benchResults && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md space-y-4 animate-fadeIn">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-emerald-400" />
            Sequential I/O Benchmark Results
            <span className="ml-auto text-[11px] text-slate-400 font-normal font-mono">
              {benchResults.driveName} • took {(benchResults.durationMs / 1000).toFixed(1)}s
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <span className="text-xs text-slate-400 font-medium">Avg Sequential Read Speed</span>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                {benchResults.averageReadSpeed} <span className="text-xs text-slate-400 font-normal">MB/s</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (benchResults.averageReadSpeed / 7000) * 100)}%` }}></div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <span className="text-xs text-slate-400 font-medium">Avg Sequential Write Speed</span>
              <div className="text-2xl font-extrabold text-blue-400 font-mono">
                {benchResults.averageWriteSpeed} <span className="text-xs text-slate-400 font-normal">MB/s</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (benchResults.averageWriteSpeed / 7000) * 100)}%` }}></div>
              </div>
            </div>
          </div>

          {/* Per-block breakdown */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-2 pr-4 font-medium">Block Size</th>
                  <th className="text-right py-2 px-4 font-medium">Read MB/s</th>
                  <th className="text-right py-2 pl-4 font-medium">Write MB/s</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {benchResults.data.map((row) => (
                  <tr key={row.blockSize} className="hover:bg-slate-900/60">
                    <td className="py-1.5 pr-4 text-slate-300">{row.blockSize}</td>
                    <td className="py-1.5 px-4 text-right text-emerald-400">{row.readSpeed.toFixed(1)}</td>
                    <td className="py-1.5 pl-4 text-right text-blue-400">{row.writeSpeed.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
