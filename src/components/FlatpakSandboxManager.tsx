import React, { useState, useEffect } from 'react';
import { Package, ShieldCheck, ShieldAlert, Wifi, RefreshCw } from 'lucide-react';

export default function FlatpakSandboxManager() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchFlatpaks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/flatpak-sandbox');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load flatpak sandboxes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlatpaks();
  }, []);

  const handleToggleNetwork = async (id: string, currentNet: boolean) => {
    try {
      const res = await fetch('/api/system/flatpak-sandbox/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, networkAccess: !currentNet })
      });
      if (res.ok) {
        const json = await res.json();
        setData((prev: any) => ({ ...prev, flatpaks: json.flatpaks }));
      }
    } catch (err) {
      console.error('Error toggling network permission:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mr-2" />
        Auditing Flatpak Sandbox Overrides & AppImage Integrations...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#0c121a] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              FLATPAK & APPIMAGE SANDBOX
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Unused Runtimes: {data?.unusedRuntimeSizeMB} MB
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-100">Flatpak Permission & Sandbox Manager</h2>
          <p className="text-xs text-slate-400">
            Control sandboxed permissions for Flatpak applications including socket access, filesystem isolation, and networking.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.flatpaks?.map((app: any) => (
          <div key={app.id} className="bg-[#0c121a] p-4 rounded-xl border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-slate-200 block">{app.name}</span>
                <span className="text-[10px] font-mono text-slate-400">{app.id} ({app.version})</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                {app.sizeMB} MB
              </span>
            </div>

            <div className="bg-[#05070a] p-3 rounded-lg border border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5 text-slate-400" />
                  Network Access
                </span>
                <button
                  onClick={() => handleToggleNetwork(app.id, app.networkAccess)}
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded cursor-pointer ${
                    app.networkAccess ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                  }`}
                >
                  {app.networkAccess ? 'ALLOWED' : 'BLOCKED'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-slate-400">Filesystem Scope</span>
                <span className="font-mono text-[10px] text-slate-300 uppercase">{app.filesystemAccess}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
