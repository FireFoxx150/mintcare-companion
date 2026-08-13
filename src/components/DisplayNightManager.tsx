import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, RefreshCw, Power } from 'lucide-react';

export default function DisplayNightManager() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [redshift, setRedshift] = useState(true);
  const [temp, setTemp] = useState(3700);

  const fetchDisplayData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/display-night');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setRedshift(json.redshiftActive);
        setTemp(json.colorTempK);
      }
    } catch (err) {
      console.error('Failed to load display settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisplayData();
  }, []);

  const handleToggleRedshift = async () => {
    const nextState = !redshift;
    setRedshift(nextState);
    try {
      await fetch('/api/system/display-night/redshift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextState, colorTempK: temp })
      });
    } catch (err) {
      console.error('Error toggling redshift:', err);
    }
  };

  const handleTempChange = async (newTemp: number) => {
    setTemp(newTemp);
    try {
      await fetch('/api/system/display-night/redshift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: redshift, colorTempK: newTemp })
      });
    } catch (err) {
      console.error('Error setting color temp:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mr-2" />
        Detecting Connected Display Monitors & Redshift Color Temp...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#0c121a] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              DISPLAY & NIGHT LIGHT (REDSHIFT)
            </span>
            <span className="text-xs text-slate-400 font-mono">xrandr / gamma</span>
          </div>
          <h2 className="text-lg font-bold text-slate-100">Display & Night Light Manager</h2>
          <p className="text-xs text-slate-400">
            Configure screen warmth temperatures, refresh rates, and multi-monitor display outputs.
          </p>
        </div>

        <button
          onClick={handleToggleRedshift}
          className={`px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            redshift
              ? 'bg-amber-500 text-black shadow-[0_4px_12px_rgba(245,158,11,0.2)]'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          <Moon className="h-4 w-4" />
          {redshift ? 'Night Light Active' : 'Night Light Off'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Redshift Warmth Control */}
        <div className="bg-[#0c121a] p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-400" />
            Redshift Color Temperature ({temp}K)
          </h3>

          <div className="bg-[#05070a] p-4 rounded-xl border border-white/5 space-y-3">
            <input
              type="range"
              min="2500"
              max="6500"
              step="100"
              value={temp}
              onChange={(e) => handleTempChange(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>2500K (Warm Night)</span>
              <span>4500K (Neutral)</span>
              <span>6500K (Daylight)</span>
            </div>
          </div>
        </div>

        {/* Connected Displays */}
        <div className="bg-[#0c121a] p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Monitor className="h-4 w-4 text-emerald-400" />
            Detected Displays (xrandr)
          </h3>

          <div className="space-y-2">
            {data?.monitors?.map((m: any) => (
              <div key={m.id} className="bg-[#05070a] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-200">{m.name}</span>
                  <span className="text-[10px] text-slate-400 block">{m.id}</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {m.refreshRateHz} Hz
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
