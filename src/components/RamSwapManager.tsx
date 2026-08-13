import React, { useState, useEffect } from 'react';
import { Database, Zap, RefreshCw, CheckCircle2, Sliders } from 'lucide-react';

export default function RamSwapManager() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dropping, setDropping] = useState(false);
  const [dropMessage, setDropMessage] = useState<string | null>(null);
  const [swappinessVal, setSwappinessVal] = useState(10);

  const fetchRamData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/ram-swap');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setSwappinessVal(json.swappiness);
      }
    } catch (err) {
      console.error('Failed to fetch RAM data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRamData();
  }, []);

  const handleDropCaches = async () => {
    setDropping(true);
    setDropMessage(null);
    try {
      const res = await fetch('/api/system/ram-swap/drop-caches', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setDropMessage(json.message);
        fetchRamData();
      }
    } catch (err: any) {
      setDropMessage('Error dropping caches: ' + err.message);
    } finally {
      setDropping(false);
    }
  };

  const handleSwappinessChange = async (val: number) => {
    setSwappinessVal(val);
    try {
      await fetch('/api/system/ram-swap/swappiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ swappiness: val })
      });
    } catch (err) {
      console.error('Error setting swappiness:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mr-2" />
        Reading /proc/meminfo & Kernel Memory Management Allocations...
      </div>
    );
  }

  const ramUsedPercent = Math.round((data?.usedMB / data?.totalMB) * 100) || 0;

  return (
    <div className="space-y-6">
      <div className="bg-[#0c121a] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              RAM & ZRAM SWAP OPTIMIZER
            </span>
            <span className="text-xs text-slate-400 font-mono">zram0: LZ4 Compressed</span>
          </div>
          <h2 className="text-lg font-bold text-slate-100">Physical Memory & Swappiness Control</h2>
          <p className="text-xs text-slate-400">
            Purge Linux PageCache, dentries, and inodes, or adjust kernel swappiness behavior.
          </p>
        </div>

        <button
          onClick={handleDropCaches}
          disabled={dropping}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
        >
          <Zap className="h-4 w-4" />
          {dropping ? 'Purging PageCache...' : 'Flush RAM Caches Now'}
        </button>
      </div>

      {dropMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-emerald-300 text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          {dropMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* RAM Usage Breakdown */}
        <div className="bg-[#0c121a] p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-400" />
            Physical Memory Breakdown (/proc/meminfo)
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between bg-[#05070a] p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400">Total Installed RAM</span>
              <span className="text-xs font-mono font-bold text-slate-200">
                {(data?.totalMB / 1024).toFixed(1)} GB
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#05070a] p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400">Active Applications</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {(data?.usedMB / 1024).toFixed(1)} GB ({ramUsedPercent}%)
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#05070a] p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400">Reclaimable Cache & Buffers</span>
              <span className="text-xs font-mono text-amber-400 font-bold">
                {(data?.cachedMB / 1024).toFixed(1)} GB
              </span>
            </div>
          </div>
        </div>

        {/* Swappiness Tuning */}
        <div className="bg-[#0c121a] p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-emerald-400" />
            Kernel Swappiness Tuning (vm.swappiness)
          </h3>

          <p className="text-xs text-slate-400">
            Lower values (e.g. 10) keep applications in physical RAM longer before swapping to SSD/HDD.
          </p>

          <div className="bg-[#05070a] p-4 rounded-xl border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Swappiness Ratio</span>
              <span className="text-sm font-mono font-bold text-emerald-400">{swappinessVal}</span>
            </div>

            <input
              type="range"
              min="1"
              max="100"
              value={swappinessVal}
              onChange={(e) => handleSwappinessChange(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1 (Prefer Physical RAM)</span>
              <span>60 (Default)</span>
              <span>100 (Aggressive Swap)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
