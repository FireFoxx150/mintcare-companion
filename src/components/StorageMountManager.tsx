import React, { useState, useEffect } from 'react';
import { HardDrive, Zap, CheckCircle2, Server, Database, RefreshCw } from 'lucide-react';

export default function StorageMountManager() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trimming, setTrimming] = useState(false);
  const [trimResult, setTrimResult] = useState<string | null>(null);

  const fetchMountData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/mounts');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch mount points:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMountData();
  }, []);

  const handleRunSSDTrim = async () => {
    setTrimming(true);
    setTrimResult(null);
    try {
      const res = await fetch('/api/system/mounts/trim', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setTrimResult(json.message);
      }
    } catch (err: any) {
      setTrimResult('TRIM operation error: ' + err.message);
    } finally {
      setTrimming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mr-2" />
        Reading Mounted Filesystem Tables (/etc/fstab & df -hT)...
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
              FILESYSTEM MOUNTS & SSD TRIM
            </span>
            <span className="text-xs text-slate-400 font-mono">fstrim -av</span>
          </div>
          <h2 className="text-lg font-bold text-slate-100">Storage Partition & SSD Optimizer</h2>
          <p className="text-xs text-slate-400">
            Inspect active partition mount targets, filesystem types (ext4, vfat, btrfs), and trigger SSD TRIM commands.
          </p>
        </div>

        <button
          onClick={handleRunSSDTrim}
          disabled={trimming}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
        >
          <Zap className="h-4 w-4" />
          {trimming ? 'Executing fstrim...' : 'Run SSD TRIM Now'}
        </button>
      </div>

      {trimResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          {trimResult}
        </div>
      )}

      {/* Mounted Filesystems */}
      <div className="bg-[#0c121a] p-5 rounded-2xl border border-white/5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-emerald-400" />
          Mounted Filesystem Targets (df -hT)
        </h3>

        <div className="space-y-3">
          {data?.mounts?.map((mount: any, idx: number) => {
            const usedPercent = Math.round((mount.usedGB / mount.sizeGB) * 100) || 0;
            return (
              <div key={idx} className="bg-[#05070a] p-4 rounded-xl border border-white/5 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      {mount.target}
                    </span>
                    <span className="text-xs font-mono text-slate-300">{mount.device}</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {mount.fstype}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-400">
                    {mount.usedGB} GB used / {mount.sizeGB} GB total ({mount.freeGB} GB free)
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      usedPercent > 85 ? 'bg-red-500' : usedPercent > 70 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, usedPercent)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
