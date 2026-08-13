import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Trash2, Clock, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';

interface KernelBootManagerProps {
  onAskAI?: (query: string) => void;
}

export default function KernelBootManager({ onAskAI }: KernelBootManagerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleanMessage, setCleanMessage] = useState<string | null>(null);

  const fetchKernelBootData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/kernel-boot');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load kernel boot stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKernelBootData();
  }, []);

  const handleCleanObsoleteKernels = async () => {
    setCleaning(true);
    setCleanMessage(null);
    try {
      const res = await fetch('/api/system/kernel-boot/clean-old', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setCleanMessage(json.message);
        fetchKernelBootData();
      }
    } catch (err: any) {
      setCleanMessage('Error cleaning kernels: ' + err.message);
    } finally {
      setCleaning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mr-2" />
        Analyzing Linux Mint Boot Sequence & Installed Kernels...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0c121a] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              LINUX KERNEL & SYSTEMD BOOT
            </span>
            <span className="text-xs text-slate-400 font-mono">v5.15 LTS</span>
          </div>
          <h2 className="text-lg font-bold text-slate-100">Kernel & Boot Optimization Center</h2>
          <p className="text-xs text-slate-400">
            Monitor boot bottleneck service benchmarks, active kernel image tree, and purge obsolete headers.
          </p>
        </div>

        <button
          onClick={handleCleanObsoleteKernels}
          disabled={cleaning}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
        >
          <Trash2 className="h-4 w-4" />
          {cleaning ? 'Purging Old Kernels...' : 'Purge Unused Old Kernels'}
        </button>
      </div>

      {cleanMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          {cleanMessage}
        </div>
      )}

      {/* Boot Profiler */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#0c121a] p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-400" />
            Boot Time Analyzer (systemd-analyze)
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-[#05070a] p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400">Total Boot Duration</span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                {(data?.bootTime?.totalTimeMs / 1000).toFixed(2)}s
              </span>
            </div>
            <div className="flex items-center justify-between bg-[#05070a] p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400">Kernel Initialization</span>
              <span className="text-xs font-mono text-slate-300">
                {(data?.bootTime?.kernelTimeMs / 1000).toFixed(2)}s
              </span>
            </div>
            <div className="flex items-center justify-between bg-[#05070a] p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400">Userspace Daemon Startup</span>
              <span className="text-xs font-mono text-slate-300">
                {(data?.bootTime?.userspaceTimeMs / 1000).toFixed(2)}s
              </span>
            </div>
          </div>
        </div>

        {/* Slowest Startup Services */}
        <div className="lg:col-span-2 bg-[#0c121a] p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            Slowest Boot Services (systemd-analyze blame)
          </h3>
          <div className="space-y-2">
            {data?.blameServices?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between bg-[#05070a] p-2.5 rounded-xl border border-white/5">
                <span className="text-xs font-mono text-slate-300 truncate max-w-[280px]">
                  {item.service}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full"
                      style={{ width: `${Math.min(100, (item.timeMs / 2000) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400 min-w-[50px] text-right">
                    {item.timeMs}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Installed Kernel Trees */}
      <div className="bg-[#0c121a] p-5 rounded-2xl border border-white/5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-emerald-400" />
          Installed Linux Kernel Images (/boot)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data?.installedKernels?.map((kernel: string, idx: number) => {
            const isActive = kernel === data?.activeKernel;
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-[#05070a] border-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-200">{kernel}</span>
                  {isActive ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> ACTIVE
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 uppercase font-mono">BACKUP</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {isActive ? 'Currently running system kernel.' : 'Obsolete backup image available for cleanup.'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
