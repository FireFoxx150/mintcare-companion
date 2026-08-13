import FanControlCurveCreator from "./FanControlCurveCreator";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  Flame, 
  Wind, 
  Battery, 
  BatteryCharging, 
  Zap, 
  Thermometer, 
  Gauge, 
  Activity, 
  AlertTriangle, 
  Play, 
  Square,
  Sparkles,
  Info,
  Download,
  Laptop,
  Monitor,
  Heart,
  Percent,
  X,
  ShieldAlert,
  RefreshCw,
  Power
} from "lucide-react";
import { HardwareHealth, SystemProcess } from "../types";

interface HardwareHealthPanelProps {
  onAskAI?: (query: string) => void;
}

// Sub-component for Custom 240-degree Gauge Dial with Needle
interface GaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  colorHex: string;
  statusLabel?: string;
  icon: React.ReactNode;
}

function CircularGauge({ value, min, max, label, unit, colorHex, statusLabel, icon }: GaugeProps) {
  const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  
  // Radius of gauge
  const r = 40;
  const circumference = 2 * Math.PI * r; // ~251.3
  
  // 240-degree gauge:
  // Arc length = (240 / 360) * circumference = ~167.55
  // Gap length = 360 - 240 = 120 degrees = ~83.78
  const arcLength = (240 / 360) * circumference;
  const gapLength = circumference - arcLength;
  const strokeDashoffset = arcLength - (percent / 100) * arcLength;
  
  // Needle rotation (from -120 deg to +120 deg)
  const needleAngle = -120 + (percent / 100) * 240;

  return (
    <div className="flex flex-col items-center p-5 bg-[#05070a]/40 border border-white/5 rounded-xl text-center relative overflow-hidden group select-none">
      
      {/* Background radial glow */}
      <div 
        className="absolute inset-0 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${colorHex} 0%, transparent 70%)`
        }}
      />

      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold mb-3 block">
        {label}
      </span>

      {/* SVG Container */}
      <div className="relative w-36 h-32 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Gradients */}
          <defs>
            <radialGradient id={`glow-${label.replace(/\s+/g, '')}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colorHex} stopOpacity={0.4} />
              <stop offset="100%" stopColor={colorHex} stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* Background track (240 deg arc) */}
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#1e293b"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${gapLength}`}
            style={{
              transformOrigin: "50px 50px",
              transform: "rotate(-120deg)" // rotates start point to bottom-left
            }}
          />

          {/* Active value track */}
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={colorHex}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${gapLength}`}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
            style={{
              transformOrigin: "50px 50px",
              transform: "rotate(-120deg)"
            }}
          />

          {/* Core center node */}
          <circle cx="50" cy="50" r="4" fill="#0f172a" stroke="#475569" strokeWidth="2" />

          {/* Needle path */}
          <g 
            className="transition-transform duration-500 ease-out"
            style={{
              transformOrigin: "50px 50px",
              transform: `rotate(${needleAngle}deg)`
            }}
          >
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="18"
              stroke={colorHex}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Elegant pointer arrow head */}
            <polygon
              points="50,14 48,19 52,19"
              fill={colorHex}
            />
          </g>
        </svg>

        {/* Center overlay icon & value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-5">
          <div className="text-slate-500 transition-colors group-hover:text-slate-300">
            {icon}
          </div>
          <div className="mt-1 flex items-baseline">
            <span className="text-xl font-bold font-mono text-slate-100 tracking-tight">
              {typeof value === 'number' ? value.toFixed(0) : value}
            </span>
            <span className="text-[10px] font-mono text-slate-400 ml-0.5">{unit}</span>
          </div>
        </div>
      </div>

      {/* Sub status metadata */}
      <div className="mt-2">
        <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded border"
          style={{
            borderColor: `${colorHex}15`,
            backgroundColor: `${colorHex}08`,
            color: colorHex
          }}
        >
          {statusLabel || "MONITORING"}
        </span>
      </div>
    </div>
  );
}

export default function HardwareHealthPanel({ onAskAI }: HardwareHealthPanelProps) {
  const [panelTab, setPanelTab] = useState<'sensors' | 'fancurve'>('sensors');
  const [healthData, setHealthData] = useState<HardwareHealth | null>(null);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [manualPercent, setManualPercent] = useState(50);
  const [loading, setLoading] = useState(true);
  const [deviceType, setDeviceType] = useState<'laptop' | 'desktop'>(() => {
    const stored = localStorage.getItem("mintcare-device-type");
    return (stored === "desktop" || stored === "laptop") ? stored : "laptop";
  });

  const [processes, setProcesses] = useState<SystemProcess[]>([]);
  const [showThermalWarning, setShowThermalWarning] = useState(false);
  const [hasTriggeredWarning, setHasTriggeredWarning] = useState(false);
  const [isRefreshingProcesses, setIsRefreshingProcesses] = useState(false);

  const fetchProcesses = async () => {
    setIsRefreshingProcesses(true);
    try {
      const res = await fetch("/api/system/processes");
      if (res.ok) {
        const data = await res.json();
        data.sort((a: any, b: any) => b.cpu - a.cpu);
        setProcesses(data);
      }
    } catch (err) {
      console.error("Failed to fetch system processes:", err);
    } finally {
      setIsRefreshingProcesses(false);
    }
  };

  const handleKillProcess = async (pid: number) => {
    try {
      const res = await fetch("/api/system/processes/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid })
      });
      if (res.ok) {
        await fetchProcesses();
        await fetchHealthData();
      }
    } catch (err) {
      console.error("Failed to terminate process:", err);
    }
  };

  const handleExportCSV = () => {
    if (!healthData) return;
    let csv = "Sensor Category,Sensor Metric,Current Value,Unit,Status/Profile,Additional Metadata\n";
    
    // CPU Temp
    csv += `CPU,Processor Thermal Core,${healthData.cpuTemp.current},°C,${healthData.cpuTemp.current >= healthData.cpuTemp.critical ? "CRITICAL OVERHEAT" : healthData.cpuTemp.current >= healthData.cpuTemp.maxSafe ? "THERMAL WARNING" : "OPTIMAL CORE TEMP"},Max Safe: ${healthData.cpuTemp.maxSafe}°C / Critical: ${healthData.cpuTemp.critical}°C\n`;
    
    healthData.cpuTemp.cores.forEach(c => {
      csv += `CPU,${c.name},${c.temp},°C,MONITORING,-\n`;
    });

    // Fan Speed
    csv += `Cooling,Chassis Fan Speed,${healthData.fanSpeed.current},RPM,${healthData.fanSpeed.mode.toUpperCase()},Max: ${healthData.fanSpeed.max} RPM / Percent: ${healthData.fanSpeed.percent}%\n`;

    // Battery
    csv += `Power,Battery Charge,${healthData.battery.charge},%,${healthData.battery.status.toUpperCase()},Health: ${healthData.battery.health}% / Voltage: ${healthData.battery.voltage}V / Temp: ${healthData.battery.temp}°C / Remaining: ${healthData.battery.remainingMinutes} mins\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mintcare_hardware_sensors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchHealthData = async () => {
    try {
      const res = await fetch("/api/system/hardware-health");
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
        setIsStressTesting(data.isStressTesting);
        if (data.fanSpeed.mode === 'manual') {
          setManualPercent(data.fanSpeed.percent);
        }
      }
    } catch (err) {
      console.error("Failed to fetch hardware health metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Poll every 1.5 seconds for real-time sensor updates
  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 1500);
    return () => clearInterval(interval);
  }, []);

  // Monitor CPU temperature to trigger high thermal event warning modal
  useEffect(() => {
    if (!healthData) return;

    const currentTemp = healthData.cpuTemp.current;
    const maxSafe = healthData.cpuTemp.maxSafe;

    if (currentTemp >= maxSafe) {
      if (!hasTriggeredWarning) {
        setShowThermalWarning(true);
        setHasTriggeredWarning(true);
        fetchProcesses();
      }
    } else if (currentTemp < maxSafe - 5) {
      // Hysteresis of 5 degrees to reset the trigger so it can warn again
      setHasTriggeredWarning(false);
    }
  }, [healthData, hasTriggeredWarning]);

  // Keep processes real-time when the thermal warning is active
  useEffect(() => {
    if (!showThermalWarning) return;

    fetchProcesses();
    const interval = setInterval(fetchProcesses, 3000);
    return () => clearInterval(interval);
  }, [showThermalWarning]);

  const handleSetFanMode = async (mode: string, percent?: number) => {
    try {
      const res = await fetch("/api/system/hardware-health/fan-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, percent })
      });
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (err) {
      console.error("Failed to update cooling fan profile:", err);
    }
  };

  const handleToggleStressTest = async () => {
    const nextState = !isStressTesting;
    setIsStressTesting(nextState);
    try {
      const res = await fetch("/api/system/hardware-health/stress-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState })
      });
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
        setIsStressTesting(data.isStressTesting);
      }
    } catch (err) {
      console.error("Failed to toggle stress test:", err);
    }
  };

  const handleToggleBatteryPlug = async () => {
    try {
      const res = await fetch("/api/system/hardware-health/battery-toggle", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (err) {
      console.error("Failed to toggle battery power source:", err);
    }
  };

  if (loading || !healthData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 font-mono text-slate-500">
        <Activity className="h-8 w-8 text-emerald-500 animate-pulse" />
        <p className="text-xs">Connecting ACPI system sensor terminals...</p>
      </div>
    );
  }

  // Set color specs depending on values
  const getTempColor = (temp: number) => {
    if (temp >= healthData.cpuTemp.critical) return "#f87171"; // critical red
    if (temp >= healthData.cpuTemp.maxSafe) return "#fbbf24"; // warning amber
    return "#10b981"; // healthy emerald
  };

  const getFanColor = (rpm: number) => {
    if (rpm > 3500) return "#fbbf24"; // amber high speed
    if (rpm === 0) return "#64748b"; // muted slate
    return "#3b82f6"; // blue standard cooling
  };

  const getBatteryColor = (charge: number, status: string) => {
    if (status === 'charging' || status === 'full') return "#10b981"; // emerald
    if (charge <= 15) return "#f87171"; // low red
    if (charge <= 35) return "#fbbf24"; // warning amber
    return "#a7f3d0"; // mint / default
  };

  // Convert CPU temp readings to Recharts structure
  const tempChartData = healthData.cpuTemp.history.map((t, idx) => ({
    reading: idx,
    temp: t
  }));

  // Convert Fan Speed readings to Recharts structure
  const fanChartData = healthData.fanSpeed.history.map((f, idx) => ({
    reading: idx,
    rpm: f
  }));

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      {/* Sub-Tab Navigation Switcher */}
      <div className="flex items-center gap-2 bg-[#0c121a] p-1.5 rounded-xl border border-white/5 w-fit">
        <button
          onClick={() => setPanelTab('sensors')}
          className={`px-4 py-2 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-2 cursor-pointer ${
            panelTab === 'sensors'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          id="hw-tab-sensors-btn"
        >
          <Gauge className="h-4 w-4" />
          <span>Hardware Sensors & Thermals</span>
        </button>

        <button
          onClick={() => setPanelTab('fancurve')}
          className={`px-4 py-2 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-2 cursor-pointer ${
            panelTab === 'fancurve'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          id="hw-tab-fancurve-btn"
        >
          <Wind className="h-4 w-4 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Fan Control & Curve Creator</span>
          <span className="px-1.5 py-0.5 bg-emerald-500 text-black text-[9px] font-mono font-black uppercase rounded shadow-sm">
            AUTO-BOOT
          </span>
        </button>
      </div>

      {panelTab === 'fancurve' ? (
        <FanControlCurveCreator onAskAI={onAskAI} />
      ) : (
        <>
          <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-emerald-400" />
            <h3 className="font-sans font-bold text-sm tracking-wide text-slate-100 uppercase">Hardware Sensors Console</h3>
          </div>
          <p className="text-xs text-slate-400 font-sans">
            Real-time motherboard ACPI temperature monitors, cooling fans, and cell power indices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Chassis Form Factor Profile Selector */}
          <div className="bg-[#05070a]/90 p-1 rounded-xl border border-white/5 flex items-center gap-1">
            <button
              onClick={() => {
                setDeviceType('laptop');
                localStorage.setItem("mintcare-device-type", "laptop");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
                deviceType === 'laptop'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)] font-black'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              id="device-type-laptop-btn"
            >
              <Laptop className="h-3.5 w-3.5" />
              Laptop Profile
            </button>
            <button
              onClick={() => {
                setDeviceType('desktop');
                localStorage.setItem("mintcare-device-type", "desktop");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
                deviceType === 'desktop'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)] font-black'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              id="device-type-desktop-btn"
            >
              <Monitor className="h-3.5 w-3.5" />
              Desktop Profile
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
            id="export-hardware-csv"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>
      
      {/* Upper Gauges Panel Grid */}
      <div className={`grid grid-cols-1 gap-6 ${deviceType === 'laptop' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        
        {/* Gauge 1: CPU Temperature */}
        <CircularGauge
          value={healthData.cpuTemp.current}
          min={30}
          max={100}
          label="Processor Thermal core"
          unit="°C"
          colorHex={getTempColor(healthData.cpuTemp.current)}
          statusLabel={
            healthData.cpuTemp.current >= healthData.cpuTemp.critical ? "CRITICAL OVERHEAT" :
            healthData.cpuTemp.current >= healthData.cpuTemp.maxSafe ? "THERMAL WARNING" : "OPTIMAL CORE TEMP"
          }
          icon={<Thermometer className="h-5 w-5" style={{ color: getTempColor(healthData.cpuTemp.current) }} />}
        />

        {/* Gauge 2: Fan Speed */}
        <CircularGauge
          value={healthData.fanSpeed.current}
          min={0}
          max={healthData.fanSpeed.max}
          label="Chassis Cooling Fan"
          unit="RPM"
          colorHex={getFanColor(healthData.fanSpeed.current)}
          statusLabel={
            healthData.fanSpeed.current === 0 ? "FAN VENT IDLE" :
            healthData.fanSpeed.mode === 'silent' ? "SILENT VENT PROFILE" :
            healthData.fanSpeed.mode === 'performance' ? "HIGH PERFORMANCE ACTIVE" : "AUTOMATIC THERMAL PWM"
          }
          icon={<Wind className="h-5 w-5 animate-spin" style={{ 
            color: getFanColor(healthData.fanSpeed.current),
            animationDuration: healthData.fanSpeed.current > 0 ? `${Math.max(0.4, 5 - (healthData.fanSpeed.current / 800))}s` : '0s'
          }} />}
        />

        {/* Gauge 3: Battery Level (Laptop only) */}
        {deviceType === 'laptop' && (
          <CircularGauge
            value={healthData.battery.charge}
            min={0}
            max={100}
            label="Internal Lithium Cell"
            unit="%"
            colorHex={getBatteryColor(healthData.battery.charge, healthData.battery.status)}
            statusLabel={
              healthData.battery.status === 'charging' ? "CHARGING FLOW" :
              healthData.battery.status === 'full' ? "FULLY ENERGIZED" : "DISCHARGING LOAD"
            }
            icon={
              healthData.battery.status === 'charging' ? (
                <BatteryCharging className="h-5 w-5 text-emerald-400 animate-pulse" />
              ) : (
                <Battery className="h-5 w-5 text-slate-400" />
              )
            }
          />
        )}

      </div>

      {/* Control Actions Deck */}
      <div className={`grid grid-cols-1 gap-6 ${deviceType === 'laptop' ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-2'}`}>
        
        {/* Thermals & Core Stress Controller */}
        <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
              <Flame className="h-4 w-4 text-orange-400" />
              <h4 className="font-sans font-bold text-xs tracking-wider text-slate-200 uppercase">Core Thermals & Load Stress</h4>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Test cooling efficiency by injecting mathematical core floating-point loads. Generates active heavy workloads to verify thermal throttle protection limits.
            </p>

            {/* Core temperature breakdown list */}
            <div className="space-y-2 pt-1 font-mono text-[10px]">
              {healthData.cpuTemp.cores.map(core => (
                <div key={core.id} className="flex items-center justify-between bg-[#05070a]/40 px-2.5 py-1.5 rounded border border-white/5">
                  <span className="text-slate-400">{core.name}:</span>
                  <span className="font-bold text-slate-200" style={{ color: getTempColor(core.temp) }}>
                    {core.temp} °C
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleToggleStressTest}
              className={`w-full py-2 bg-transparent text-xs font-bold uppercase tracking-wider rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isStressTesting
                  ? "border-red-500/30 text-red-400 hover:bg-red-500/5"
                  : "border-orange-500/30 text-orange-400 hover:bg-orange-500/5"
              }`}
            >
              {isStressTesting ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-red-400" />
                  Terminate Stress Workload
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-orange-400" />
                  Trigger CPU Stress Test
                </>
              )}
            </button>
            {isStressTesting && (
              <p className="text-[9px] text-red-400/80 font-mono text-center mt-1.5 animate-pulse">
                ▲ FPU threads working at 100% capacity. Auto-stops in 15s.
              </p>
            )}
          </div>
        </div>

        {/* Chassis Fan Controller */}
        <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
              <Wind className="h-4 w-4 text-blue-400" />
              <h4 className="font-sans font-bold text-xs tracking-wider text-slate-200 uppercase">Cooling Fan Profile Engine</h4>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Override physical cooling cycles. Quiet operations restrict speeds to reduce acoustical hum, while performance profiles keep core temps at idle levels.
            </p>

            {/* Fan profiles choices */}
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
              {[
                { id: "auto", label: "Auto (PWM)" },
                { id: "silent", label: "Quiet Mode" },
                { id: "performance", label: "High Cool" },
                { id: "manual", label: "Manual Override" }
              ].map(profile => (
                <button
                  key={profile.id}
                  onClick={() => handleSetFanMode(profile.id, profile.id === 'manual' ? manualPercent : undefined)}
                  className={`p-2 rounded border text-left font-bold transition-all cursor-pointer ${
                    healthData.fanSpeed.mode === profile.id
                      ? "bg-blue-500/10 border-blue-500/40 text-blue-400"
                      : "bg-[#05070a]/30 border-white/5 text-slate-400 hover:border-white/10"
                  }`}
                >
                  {profile.label}
                </button>
              ))}
            </div>
          </div>

          {healthData.fanSpeed.mode === 'manual' && (
            <div className="space-y-1.5 font-mono text-[10px] pt-1.5 border-t border-white/5">
              <div className="flex justify-between text-slate-400">
                <span>MANUAL FAN DUTY CYCLE:</span>
                <span className="font-bold text-blue-400">{manualPercent}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={manualPercent}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setManualPercent(val);
                  handleSetFanMode('manual', val);
                }}
                className="w-full accent-blue-500 bg-[#030508] h-1.5 rounded cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* ACPI Power Cell Controller (Laptop only) */}
        {deviceType === 'laptop' && (
          <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                <Battery className="h-4 w-4 text-emerald-400" />
                <h4 className="font-sans font-bold text-xs tracking-wider text-slate-200 uppercase">Power Delivery Controller</h4>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Monitors the lithium-polymer chemical battery matrix. Testing the system's power governor throttle speed.
              </p>

              {/* Battery secondary metadata list */}
              <div className="space-y-2 pt-1 font-mono text-[10px]">
                <div className="flex justify-between bg-[#05070a]/40 px-2.5 py-1.5 rounded border border-white/5">
                  <span className="text-slate-400">Terminal Voltage:</span>
                  <span className="font-bold text-slate-200">{healthData.battery.voltage} Volts</span>
                </div>
                <div className="flex justify-between bg-[#05070a]/40 px-2.5 py-1.5 rounded border border-white/5">
                  <span className="text-slate-400">Chemical Core Temp:</span>
                  <span className="font-bold text-slate-200">{healthData.battery.temp} °C</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleToggleBatteryPlug}
                className="w-full py-2 bg-transparent text-xs font-bold uppercase tracking-wider rounded-lg border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Zap className="h-3.5 w-3.5" />
                {healthData.battery.status === 'charging' || healthData.battery.status === 'full' 
                  ? "Test Battery Governor" 
                  : "Plug in AC power adapter"
                }
              </button>
              
              {healthData.battery.status === 'discharging' && healthData.battery.remainingMinutes > 0 && (
                <p className="text-[9px] text-amber-400 font-mono text-center mt-1.5">
                  ✦ Running on battery power cells. Remaining: ~{healthData.battery.remainingMinutes} mins.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Battery Health Card (Laptop only) */}
        {deviceType === 'laptop' && (
          <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md flex flex-col justify-between space-y-4" id="laptop-battery-health-card">
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                <Heart className="h-4 w-4 text-rose-500 animate-pulse" />
                <h4 className="font-sans font-bold text-xs tracking-wider text-slate-200 uppercase">Battery Health</h4>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Real-time storage cell metrics, degradation parameters, cycle counts, and net charge rate.
              </p>

              {/* Health Stats */}
              <div className="space-y-2 pt-1 font-mono text-[10px]">
                {/* Capacity Degradation */}
                <div className="bg-[#05070a]/40 px-2.5 py-2.5 rounded border border-white/5 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Percent className="h-3 w-3 text-red-400" />
                      Capacity Degradation:
                    </span>
                    <span className="font-bold text-red-400">
                      {healthData.battery.capacityDegradation ?? (100 - healthData.battery.health)}%
                    </span>
                  </div>
                  {/* Degradation bar */}
                  <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500" 
                      style={{ width: `${healthData.battery.capacityDegradation ?? (100 - healthData.battery.health)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Cycle Counts */}
                <div className="flex justify-between bg-[#05070a]/40 px-2.5 py-1.5 rounded border border-white/5 items-center">
                  <span className="text-slate-400">Cycle Count:</span>
                  <span className="font-bold text-slate-200">
                    {healthData.battery.cycleCount ?? 342} cycles
                  </span>
                </div>

                {/* Current Discharge Rate */}
                <div className="flex justify-between bg-[#05070a]/40 px-2.5 py-1.5 rounded border border-white/5 items-center">
                  <span className="text-slate-400">Current Discharge Rate:</span>
                  <span className={`font-bold font-mono ${
                    (healthData.battery.dischargeRate ?? 0) < 0 ? "text-amber-400" : "text-emerald-400"
                  }`}>
                    {(healthData.battery.dischargeRate ?? 0) > 0 ? "+" : ""}{healthData.battery.dischargeRate ?? 0} Watts
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="p-2 bg-[#05070a]/50 rounded-lg border border-white/5 flex items-center gap-2 text-[9px] text-slate-400 leading-normal">
                <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span>
                  Battery storage cell health is <strong className="text-slate-200">Good</strong> (cycles limit 1,000).
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Historical Real-Time Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: CPU Temperature Real-time Feed */}
        <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md space-y-3.5">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-emerald-400" />
              <span className="font-sans font-bold text-xs tracking-wider text-slate-200 uppercase">
                Core Thermals Sweep Log
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">
              {healthData.cpuTemp.current.toFixed(1)} °C CURRENT
            </span>
          </div>

          <div className="h-40 font-mono text-[9px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tempChartData}>
                <defs>
                  <linearGradient id="tempGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getTempColor(healthData.cpuTemp.current)} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={getTempColor(healthData.cpuTemp.current)} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="reading" hide={true} />
                <YAxis domain={[30, 95]} hide={true} />
                <Tooltip 
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#05070a]/95 border border-white/10 px-2 py-1.5 rounded text-[10px] font-mono text-slate-300">
                          Temperature: <span className="text-emerald-400 font-bold">{payload[0].value}°C</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="temp" 
                  stroke={getTempColor(healthData.cpuTemp.current)} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#tempGlow)" 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Cooling Fan RPM sweeping track */}
        <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md space-y-3.5">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-blue-400" />
              <span className="font-sans font-bold text-xs tracking-wider text-slate-200 uppercase">
                PWM Cooling Fan Sweep Trace
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/15">
              {healthData.fanSpeed.current} RPM CURRENT
            </span>
          </div>

          <div className="h-40 font-mono text-[9px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fanChartData}>
                <defs>
                  <linearGradient id="fanGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getFanColor(healthData.fanSpeed.current)} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={getFanColor(healthData.fanSpeed.current)} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="reading" hide={true} />
                <YAxis domain={[0, 4800]} hide={true} />
                <Tooltip 
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#05070a]/95 border border-white/10 px-2 py-1.5 rounded text-[10px] font-mono text-slate-300">
                          Fan Speed: <span className="text-blue-400 font-bold">{payload[0].value} RPM</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="rpm" 
                  stroke={getFanColor(healthData.fanSpeed.current)} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#fanGlow)" 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* AI Troubleshooting panel */}
      {onAskAI && (
        <div className="bg-[#0c121a] text-slate-200 rounded-xl border border-blue-900/30 p-5 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] select-none pointer-events-none">
            <Gauge className="h-28 w-28 text-blue-400" />
          </div>

          <div className="space-y-4 max-w-2xl relative z-10 font-sans">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-400" />
              <h3 className="font-bold text-sm tracking-tight text-slate-100">Consult MintCare AI for ACPI Thermals</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you experiencing unusually high processor temperatures, fan whistling noise, or battery draining patterns? Consult the built-in AI helpdesk to diagnose motherboard thermal links or generate optimal fan configuration profiles.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => onAskAI("My CPU temperature is consistently hovering around 75°C to 80°C when idling on Linux Mint. What are the best diagnostic tools and terminal commands to find out which system processes are causing this thermal spike, and how can I resolve it?")}
                className="py-1.5 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
              >
                Diagnose Core Heat spikes
              </button>
              
              <button
                onClick={() => onAskAI("How do I configure custom fan curve thresholds and cooling profiles in Cinnamon? What are the standard ACPI fan-control configuration file locations on a Debian or Mint system?")}
                className="py-1.5 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
              >
                Custom ACPI Fan curves
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Priority Thermal Warning Modal */}
      <AnimatePresence>
        {showThermalWarning && healthData && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-[#0b0f17] border border-red-500/40 rounded-2xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(239,68,68,0.15)] relative space-y-5 overflow-hidden text-slate-200"
            >
              {/* Red glow pulse on background */}
              <div className="absolute inset-0 bg-radial-gradient from-red-500/5 via-transparent to-transparent pointer-events-none" />

              {/* Header */}
              <div className="flex items-start gap-4 pb-2 border-b border-red-500/20">
                <div className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/25 animate-pulse">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="font-sans font-black text-base text-red-400 tracking-wider uppercase">
                    Critical Heat Alert
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Processor Core temperature has exceeded safe operating limits.
                  </p>
                </div>
                <button
                  id="dismiss-thermal-warning-icon-btn"
                  onClick={() => setShowThermalWarning(false)}
                  className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  title="Close Alert"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Core Temp Sensor reading */}
              <div className="bg-red-950/10 border border-red-500/10 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest block">
                    Core Temp Sensor
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold font-mono text-red-400 tracking-tight">
                      {healthData.cpuTemp.current.toFixed(1)}°C
                    </span>
                    <span className="text-xs text-slate-400 font-sans">
                      / Max Safe limit: {healthData.cpuTemp.maxSafe}°C
                    </span>
                  </div>
                </div>
                
                {/* Visual heat indicator bar */}
                <div className="w-24 bg-slate-900 rounded-full h-3 border border-red-500/20 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-red-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (healthData.cpuTemp.current / 100) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Suggested Actions block */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-sans font-bold text-slate-300 uppercase tracking-wider">
                  Recommended cooling remediations:
                </h4>

                {/* 1. Coolings Fan Section */}
                <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <Wind className="h-4 w-4 text-blue-400 animate-spin" style={{ animationDuration: '3s' }} />
                        Chassis Cooling Fan Control
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        Currently running in <span className="text-slate-300 font-bold uppercase">{healthData.fanSpeed.mode}</span> mode at <span className="text-blue-400 font-bold font-mono">{healthData.fanSpeed.current} RPM</span> ({healthData.fanSpeed.percent}% speed).
                      </p>
                    </div>

                    {healthData.fanSpeed.mode !== "performance" && (
                      <button
                        id="set-high-perf-fan-btn"
                        onClick={() => handleSetFanMode("performance")}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-black font-bold text-[10px] uppercase tracking-wider rounded border border-blue-500 transition-all cursor-pointer shadow-[0_2px_8px_rgba(59,130,246,0.25)] flex items-center gap-1 shrink-0"
                      >
                        <Power className="h-3 w-3" />
                        Set High Perf
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Intensive Processes Section */}
                <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <Flame className="h-4 w-4 text-amber-400 animate-pulse" />
                      Intensive Background Processes
                    </div>
                    {isRefreshingProcesses && (
                      <RefreshCw className="h-3 w-3 text-slate-400 animate-spin" />
                    )}
                  </div>

                  {/* Active stress test check */}
                  {isStressTesting && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide block">
                          Active Heat Stress Test
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Thermal load is actively heating CPU cores.
                        </p>
                      </div>
                      <button
                        id="abort-stress-btn"
                        onClick={handleToggleStressTest}
                        className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-[10px] uppercase tracking-wider rounded border border-amber-500/30 transition-all cursor-pointer"
                      >
                        Abort Stress
                      </button>
                    </div>
                  )}

                  {/* Top processes table */}
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {processes.slice(0, 3).map((p) => (
                      <div 
                        key={p.pid} 
                        className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 text-[11px] font-mono hover:bg-white/5 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[10px]">PID: {p.pid}</span>
                          <span className="text-slate-200 font-bold">{p.name}</span>
                          <span className="text-[10px] text-slate-500">({p.user})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-red-400 font-bold font-mono">{p.cpu.toFixed(1)}% CPU</span>
                          <button
                            id={`kill-proc-btn-${p.pid}`}
                            onClick={() => handleKillProcess(p.pid)}
                            className="text-[10px] text-slate-400 hover:text-red-400 font-sans border border-slate-700/50 hover:border-red-500/30 px-1.5 py-0.5 rounded hover:bg-red-500/10 transition-colors cursor-pointer animate-none"
                          >
                            Kill
                          </button>
                        </div>
                      </div>
                    ))}
                    {processes.length === 0 && (
                      <p className="text-[10px] text-slate-500 italic py-2 text-center">
                        No background load processes detected.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  id="close-thermal-warning-btn"
                  onClick={() => setShowThermalWarning(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-white/5 transition-all cursor-pointer"
                >
                  Close & Acknowledge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        </>
      )}
    </div>
  );
}
