import React, { useState, useEffect } from 'react';
import { Battery, BatteryCharging, Cpu, ShieldCheck, Zap, RefreshCw } from 'lucide-react';

export default function PowerManagementPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [changingGov, setChangingGov] = useState(false);

  const fetchPowerData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/power-management');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch power data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPowerData();
  }, []);

  const handleGovernorChange = async (gov: string) => {
    setChangingGov(true);
    try {
      const res = await fetch('/api/system/power-management/governor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ governor: gov })
      });
      if (res.ok) {
        const json = await res.json();
        setData((prev: any) => ({ ...prev, governor: json.governor }));
      }
    } catch (err) {
      console.error('Error changing scaling governor:', err);
    } finally {
      setChangingGov(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mr-2" />
        Polling Battery Wear Metrics & CPU Frequency Governors...
      </div>
    );
  }

  const bat = data?.battery;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0c121a] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              POWER & BATTERY HEALTH
            </span>
            <span className="text-xs text-slate-400 font-mono">TLP Daemon Active</span>
          </div>
          <h2 className="text-lg font-bold text-slate-100">Power Management & Battery Health Center</h2>
          <p className="text-xs text-slate-400">
            Monitor real-time battery capacity degradation, power draw, and switch CPU scaling governors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Battery Health Card */}
        <div className="bg-[#0c121a] p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <BatteryCharging className="h-5 w-5 text-emerald-400" />
            Battery Diagnostics & Capacity Degradation
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between bg-[#05070a] p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400">Battery Health Score</span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                {bat?.healthPercent}% (Good)
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#05070a] p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400">Design Capacity</span>
              <span className="text-xs font-mono text-slate-300">
                {(bat?.designCapacityMWh / 1000).toFixed(1)} Wh
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#05070a] p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400">Current Full Charge Capacity</span>
              <span className="text-xs font-mono text-slate-300">
                {(bat?.fullCapacityMWh / 1000).toFixed(1)} Wh
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#05070a] p-3 rounded-xl border border-white/5">
              <span className="text-xs text-slate-400">Discharge Rate</span>
              <span className="text-xs font-mono text-amber-400 font-bold">
                {bat?.dischargeRateW} Watts
              </span>
            </div>
          </div>
        </div>

        {/* CPU Scaling Governors */}
        <div className="bg-[#0c121a] p-5 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-emerald-400" />
            CPU Frequency Scaling Governor
          </h3>

          <p className="text-xs text-slate-400">
            Select the active Linux kernel frequency governor to balance performance and power efficiency.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {data?.availableGovernors?.map((gov: string) => {
              const isActive = data?.governor === gov;
              return (
                <button
                  key={gov}
                  onClick={() => handleGovernorChange(gov)}
                  disabled={changingGov}
                  className={`p-3 rounded-xl border text-xs font-mono font-bold uppercase transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                      : 'bg-[#05070a] border-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{gov}</span>
                    {isActive && <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
