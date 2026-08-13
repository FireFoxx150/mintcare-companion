import React, { useState, useEffect } from 'react';
import { Terminal, Plus, Power, Trash2, Layout, CheckCircle2, RefreshCw } from 'lucide-react';

export default function CinnamonDesktopManager() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCmd, setNewCmd] = useState('');
  const [newCat, setNewCat] = useState('Custom');

  const fetchAutostartApps = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/autostart');
      if (res.ok) {
        const json = await res.json();
        setApps(json);
      }
    } catch (err) {
      console.error('Failed to load autostart apps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutostartApps();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch('/api/system/autostart/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        const json = await res.json();
        setApps(json.autostartApps);
      }
    } catch (err) {
      console.error('Error toggling autostart app:', err);
    }
  };

  const handleAddApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCmd) return;
    try {
      const res = await fetch('/api/system/autostart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, command: newCmd, category: newCat })
      });
      if (res.ok) {
        setNewName('');
        setNewCmd('');
        setShowAddModal(false);
        fetchAutostartApps();
      }
    } catch (err) {
      console.error('Error adding autostart app:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mr-2" />
        Scanning Cinnamon Autostart Entry Directories...
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
              CINNAMON DESKTOP & AUTOSTART
            </span>
            <span className="text-xs text-slate-400 font-mono">~/.config/autostart</span>
          </div>
          <h2 className="text-lg font-bold text-slate-100">Startup Applications & Desktop Daemon Manager</h2>
          <p className="text-xs text-slate-400">
            Control background applications launched automatically when logging into Linux Mint Cinnamon.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
        >
          <Plus className="h-4 w-4" />
          Add Startup Command
        </button>
      </div>

      {/* Autostart Application List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {apps.map((app) => (
          <div
            key={app.id}
            className="bg-[#0c121a] p-4 rounded-xl border border-white/5 flex items-start justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-200">{app.name}</span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  {app.category}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 bg-[#05070a] p-1.5 rounded border border-white/5">
                {app.command}
              </p>
            </div>

            <button
              onClick={() => handleToggle(app.id)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                app.enabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800/40 border-white/5 text-slate-500'
              }`}
              title={app.enabled ? 'Disable Startup' : 'Enable Startup'}
            >
              <Power className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c121a] border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-emerald-400" />
              Add Startup Application
            </h3>
            <form onSubmit={handleAddApp} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Application Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. My Background Sync"
                  className="w-full bg-[#05070a] border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Execution Command</label>
                <input
                  type="text"
                  value={newCmd}
                  onChange={(e) => setNewCmd(e.target.value)}
                  placeholder="e.g. redshift-gtk -l 51.5:-0.1"
                  className="w-full bg-[#05070a] border border-white/10 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-xl"
                >
                  Save Autostart Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
