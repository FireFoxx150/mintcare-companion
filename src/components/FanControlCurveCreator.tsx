import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wind, 
  Flame, 
  Sliders, 
  Power, 
  Sparkles, 
  Save, 
  Check, 
  Play, 
  Terminal, 
  RotateCcw, 
  Cpu, 
  Activity, 
  Zap, 
  Plus, 
  Trash2, 
  Info, 
  ShieldCheck, 
  Copy, 
  CheckSquare, 
  Square,
  HelpCircle,
  FileCode,
  Gauge
} from "lucide-react";
import { FanProfile, FanCurvePoint, FanCurveState } from "../types";

interface FanControlCurveCreatorProps {
  onAskAI?: (query: string) => void;
}

export default function FanControlCurveCreator({ onAskAI }: FanControlCurveCreatorProps) {
  const [curveState, setCurveState] = useState<FanCurveState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<FanProfile | null>(null);
  const [simulatedTemp, setSimulatedTemp] = useState<number>(45);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'editor' | 'autostart' | 'presets'>('editor');

  const chartRef = useRef<SVGSVGElement | null>(null);
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);

  const fetchFanCurveState = async () => {
    try {
      const res = await fetch("/api/system/fan-curve");
      if (res.ok) {
        const data = await res.json();
        setCurveState(data);
        if (data.activeProfile) {
          setSelectedProfile(data.activeProfile);
          setSimulatedTemp(Math.round(data.cpuTemp || 45));
        }
      }
    } catch (err) {
      console.error("Failed to fetch fan curve state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFanCurveState();
  }, []);

  const handleApplyProfile = async (profileId: string) => {
    try {
      const res = await fetch("/api/system/fan-curve/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId })
      });
      if (res.ok) {
        const data = await res.json();
        setCurveState(prev => prev ? {
          ...prev,
          profiles: data.profiles,
          activeProfileId: data.activeProfileId,
          activeProfile: data.activeProfile,
          generatedBashScript: data.generatedBashScript
        } : null);
        setSelectedProfile(data.activeProfile);
        setSaveSuccessMsg(`Profile "${data.activeProfile.name}" applied as active Linux Mint fan curve!`);
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error("Failed to apply profile:", err);
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedProfile) return;
    try {
      const res = await fetch("/api/system/fan-curve/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedProfile)
      });
      if (res.ok) {
        const data = await res.json();
        setCurveState(prev => prev ? {
          ...prev,
          profiles: data.profiles,
          activeProfile: data.activeProfile,
          generatedBashScript: data.generatedBashScript
        } : null);
        setSaveSuccessMsg("Fan curve profile configuration successfully saved!");
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error("Failed to save fan profile:", err);
    }
  };

  const handleToggleAutostart = async (enabled: boolean) => {
    try {
      const res = await fetch("/api/system/fan-curve/autostart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled })
      });
      if (res.ok) {
        const data = await res.json();
        setCurveState(prev => prev ? {
          ...prev,
          autostartOnMintBoot: data.autostartOnMintBoot,
          serviceStatus: data.serviceStatus,
          generatedBashScript: data.generatedBashScript
        } : null);
        setSaveSuccessMsg(
          enabled 
            ? "Linux Mint boot autostart ENABLED! Profile will load automatically at boot."
            : "Linux Mint boot autostart DISABLED."
        );
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error("Failed to toggle autostart:", err);
    }
  };

  const handleAddPoint = () => {
    if (!selectedProfile) return;
    const pts = [...selectedProfile.points].sort((a, b) => a.temp - b.temp);
    
    // Find gap or extend
    let newTemp = 60;
    let newSpeed = 50;
    if (pts.length > 0) {
      const maxT = pts[pts.length - 1].temp;
      newTemp = Math.min(95, maxT + 10);
      newSpeed = Math.min(100, pts[pts.length - 1].speed + 15);
    }

    const updatedPoints = [...pts, { temp: newTemp, speed: newSpeed }].sort((a, b) => a.temp - b.temp);
    setSelectedProfile({
      ...selectedProfile,
      points: updatedPoints
    });
  };

  const handleRemovePoint = (index: number) => {
    if (!selectedProfile || selectedProfile.points.length <= 2) return; // Keep at least 2 points
    const updatedPoints = selectedProfile.points.filter((_, idx) => idx !== index);
    setSelectedProfile({
      ...selectedProfile,
      points: updatedPoints
    });
  };

  const handleUpdatePoint = (index: number, field: 'temp' | 'speed', val: number) => {
    if (!selectedProfile) return;
    const updatedPoints = [...selectedProfile.points];
    updatedPoints[index] = {
      ...updatedPoints[index],
      [field]: Math.max(0, Math.min(field === 'temp' ? 100 : 100, val))
    };
    // Keep sorted by temp
    updatedPoints.sort((a, b) => a.temp - b.temp);
    setSelectedProfile({
      ...selectedProfile,
      points: updatedPoints
    });
  };

  // Calculate speed for given temp from curve
  const calculateSpeedForTemp = (temp: number, profile: FanProfile): number => {
    if (profile.zeroRpmMode && temp < profile.zeroRpmThreshold) return 0;
    const pts = [...profile.points].sort((a, b) => a.temp - b.temp);
    if (pts.length === 0) return 50;
    if (temp <= pts[0].temp) return pts[0].speed;
    if (temp >= pts[pts.length - 1].temp) return pts[pts.length - 1].speed;

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      if (temp >= p1.temp && temp <= p2.temp) {
        const range = p2.temp - p1.temp;
        if (range === 0) return p1.speed;
        const ratio = (temp - p1.temp) / range;
        return Math.round(p1.speed + ratio * (p2.speed - p1.speed));
      }
    }
    return 50;
  };

  const calculatedCurrentSpeed = selectedProfile ? calculateSpeedForTemp(simulatedTemp, selectedProfile) : 0;
  const estimatedRpm = Math.round((calculatedCurrentSpeed / 100) * 4500);

  // SVG Chart Dimensions
  const svgWidth = 600;
  const svgHeight = 280;
  const padding = { top: 30, right: 30, bottom: 40, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Map Temp (20°C - 100°C) to SVG X
  const mapTempToX = (temp: number) => {
    const clamped = Math.max(20, Math.min(100, temp));
    return padding.left + ((clamped - 20) / (100 - 20)) * graphWidth;
  };

  // Map Speed (0% - 100%) to SVG Y
  const mapSpeedToY = (speed: number) => {
    const clamped = Math.max(0, Math.min(100, speed));
    return padding.top + graphHeight - (clamped / 100) * graphHeight;
  };

  // Convert SVG Mouse X, Y back to Temp, Speed
  const handleSVGMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingPointIndex === null || !selectedProfile || !chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Scale mouse coordinates to SVG viewBox space
    const scaleX = svgWidth / rect.width;
    const scaleY = svgHeight / rect.height;

    const svgX = mouseX * scaleX;
    const svgY = mouseY * scaleY;

    // Convert to Temp and Speed
    let rawTemp = 20 + ((svgX - padding.left) / graphWidth) * (100 - 20);
    let rawSpeed = ((padding.top + graphHeight - svgY) / graphHeight) * 100;

    rawTemp = Math.round(Math.max(20, Math.min(100, rawTemp)));
    rawSpeed = Math.round(Math.max(0, Math.min(100, rawSpeed)));

    const updatedPoints = [...selectedProfile.points];
    updatedPoints[draggingPointIndex] = { temp: rawTemp, speed: rawSpeed };
    updatedPoints.sort((a, b) => a.temp - b.temp);

    setSelectedProfile({
      ...selectedProfile,
      points: updatedPoints
    });
  };

  const handleSVGMouseUp = () => {
    setDraggingPointIndex(null);
  };

  if (loading || !curveState || !selectedProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 font-mono text-slate-500">
        <Wind className="h-8 w-8 text-emerald-500 animate-spin" />
        <p className="text-xs">Connecting Fan Curve Control Engine & Linux Mint ACPI...</p>
      </div>
    );
  }

  // Generate SVG path for points
  const sortedPoints = [...selectedProfile.points].sort((a, b) => a.temp - b.temp);
  const pathD = sortedPoints.reduce((acc, pt, idx) => {
    const x = mapTempToX(pt.temp);
    const y = mapSpeedToY(pt.speed);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, "");

  // Area path below curve
  const firstX = mapTempToX(sortedPoints[0]?.temp || 20);
  const lastX = mapTempToX(sortedPoints[sortedPoints.length - 1]?.temp || 100);
  const bottomY = mapSpeedToY(0);
  const areaD = `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <Wind className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm tracking-wide text-slate-100 uppercase">
                Fan Control & Curve Creator
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Precision thermal PWM fan curve modeling with automatic profile loading on Linux Mint boot.
              </p>
            </div>
          </div>
        </div>

        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Autostart Toggle */}
          <button
            onClick={() => handleToggleAutostart(!curveState.autostartOnMintBoot)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono transition-all border flex items-center gap-2 cursor-pointer ${
              curveState.autostartOnMintBoot
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                : "bg-slate-900/60 text-slate-400 border-white/10 hover:border-white/20"
            }`}
            title="Toggle whether this fan curve profile is automatically loaded when Linux Mint boots"
            id="btn-toggle-autostart-boot"
          >
            {curveState.autostartOnMintBoot ? (
              <>
                <CheckSquare className="h-4 w-4 text-emerald-400" />
                <span>Auto-Load on Mint Boot: <strong className="text-emerald-300 uppercase">ENABLED</strong></span>
              </>
            ) : (
              <>
                <Square className="h-4 w-4 text-slate-500" />
                <span>Auto-Load on Mint Boot: <strong className="text-slate-500 uppercase">OFF</strong></span>
              </>
            )}
          </button>

          {/* Save Profile Button */}
          <button
            onClick={handleSaveProfile}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.25)]"
            id="btn-save-fancurve-profile"
          >
            <Save className="h-4 w-4" />
            Save Profile
          </button>

          {/* View Autostart Script Button */}
          <button
            onClick={() => setShowScriptModal(true)}
            className="px-3.5 py-2 bg-[#05070a] hover:bg-white/5 border border-white/10 hover:border-emerald-500/30 text-slate-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            id="btn-view-autostart-script"
          >
            <Terminal className="h-4 w-4 text-emerald-400" />
            Boot Script
          </button>
        </div>
      </div>

      {/* Success Banner Notice */}
      <AnimatePresence>
        {saveSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-300 flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button 
              onClick={() => setSaveSuccessMsg("")}
              className="text-emerald-400 hover:text-emerald-200 text-xs font-bold uppercase"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Selector Cards Bar */}
      <div className="bg-[#0c121a] rounded-xl border border-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-emerald-400" />
            Thermal Profile Presets
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Active in Kernel: <strong className="text-emerald-400">{curveState.profiles.find(p => p.id === curveState.activeProfileId)?.name || selectedProfile.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {curveState.profiles.map(prof => {
            const isActive = curveState.activeProfileId === prof.id;
            const isSelected = selectedProfile.id === prof.id;

            return (
              <div
                key={prof.id}
                onClick={() => {
                  setSelectedProfile(prof);
                  handleApplyProfile(prof.id);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                  isActive
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.12)]"
                    : isSelected
                    ? "bg-white/5 border-emerald-500/30 text-slate-200"
                    : "bg-[#05070a]/40 border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-sans tracking-wide truncate">
                    {prof.name}
                  </span>
                  {isActive && (
                    <span className="px-1.5 py-0.5 bg-emerald-500 text-black text-[9px] font-mono font-black uppercase rounded shadow-sm">
                      ACTIVE
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Target: {prof.sensorTarget.toUpperCase()}</span>
                  <span>{prof.zeroRpmMode ? "Zero-RPM" : "Continuous"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Interactive Curve SVG Chart + Settings & Simulation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 8 Cols: Interactive Fan Curve Graph */}
        <div className="lg:col-span-7 bg-[#0c121a] rounded-xl border border-white/5 p-5 space-y-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h4 className="font-sans font-bold text-xs tracking-wider text-slate-200 uppercase flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                Interactive PWM Fan Curve Modeling Graph
              </h4>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Drag control points directly on the chart or use the table below to adjust temperature-to-PWM response ratios.
              </p>
            </div>
            <button
              onClick={handleAddPoint}
              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Point
            </button>
          </div>

          {/* SVG Canvas Chart */}
          <div className="relative bg-[#05070a] border border-white/5 rounded-xl p-3 overflow-hidden select-none">
            
            {/* Background Temperature Zone Gradients */}
            <div className="absolute inset-0 pointer-events-none opacity-20 flex">
              <div className="w-[30%] bg-emerald-900/30 border-r border-emerald-500/10" title="Quiet Temp Zone (< 45°C)"></div>
              <div className="w-[30%] bg-blue-900/30 border-r border-blue-500/10" title="Normal Thermal Zone (45°C - 70°C)"></div>
              <div className="w-[25%] bg-amber-900/30 border-r border-amber-500/10" title="High Workload Zone (70°C - 85°C)"></div>
              <div className="w-[15%] bg-red-900/30" title="Critical Overheat Zone (> 85°C)"></div>
            </div>

            <svg
              ref={chartRef}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto cursor-crosshair relative z-10"
              onMouseMove={handleSVGMouseMove}
              onMouseUp={handleSVGMouseUp}
              onMouseLeave={handleSVGMouseUp}
            >
              <defs>
                <linearGradient id="fanCurveGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 25, 50, 75, 100].map(s => {
                const y = mapSpeedToY(s);
                return (
                  <g key={`grid-y-${s}`}>
                    <line x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />
                    <text x={padding.left - 8} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                      {s}%
                    </text>
                  </g>
                );
              })}

              {[20, 35, 50, 65, 80, 95].map(t => {
                const x = mapTempToX(t);
                return (
                  <g key={`grid-x-${t}`}>
                    <line x1={x} y1={padding.top} x2={x} y2={svgHeight - padding.bottom} stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />
                    <text x={x} y={svgHeight - padding.bottom + 16} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
                      {t}°C
                    </text>
                  </g>
                );
              })}

              {/* Zero RPM Threshold Line */}
              {selectedProfile.zeroRpmMode && (
                <g>
                  <line 
                    x1={mapTempToX(selectedProfile.zeroRpmThreshold)} 
                    y1={padding.top} 
                    x2={mapTempToX(selectedProfile.zeroRpmThreshold)} 
                    y2={svgHeight - padding.bottom} 
                    stroke="#f59e0b" 
                    strokeWidth="1.5"
                    strokeDasharray="4 2" 
                  />
                  <text 
                    x={mapTempToX(selectedProfile.zeroRpmThreshold) + 4} 
                    y={padding.top + 12} 
                    fill="#f59e0b" 
                    fontSize="8" 
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    Zero-RPM Limit ({selectedProfile.zeroRpmThreshold}°C)
                  </text>
                </g>
              )}

              {/* Area fill under curve */}
              <path d={areaD} fill="url(#fanCurveGlow)" />

              {/* Main Line Path */}
              <path d={pathD} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Simulated Temperature Vertical Line Marker */}
              <g>
                <line
                  x1={mapTempToX(simulatedTemp)}
                  y1={padding.top}
                  x2={mapTempToX(simulatedTemp)}
                  y2={svgHeight - padding.bottom}
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={mapTempToX(simulatedTemp)}
                  cy={mapSpeedToY(calculatedCurrentSpeed)}
                  r="6"
                  fill="#38bdf8"
                  stroke="#05070a"
                  strokeWidth="2"
                  className="animate-pulse"
                />
                <text
                  x={mapTempToX(simulatedTemp)}
                  y={padding.top - 8}
                  fill="#38bdf8"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {simulatedTemp}°C ({calculatedCurrentSpeed}%)
                </text>
              </g>

              {/* Draggable Point Nodes */}
              {sortedPoints.map((pt, idx) => {
                const cx = mapTempToX(pt.temp);
                const cy = mapSpeedToY(pt.speed);
                const isDragging = draggingPointIndex === idx;

                return (
                  <g key={`pt-${idx}`} className="group/node">
                    <circle
                      cx={cx}
                      cy={cy}
                      r="9"
                      fill={isDragging ? "#34d399" : "#10b981"}
                      stroke="#05070a"
                      strokeWidth="3"
                      className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingPointIndex(idx);
                      }}
                    />
                    {/* Tooltip text on point */}
                    <text
                      x={cx}
                      y={cy - 12}
                      fill="#e2e8f0"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {pt.temp}°C, {pt.speed}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Points Table Editor */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              Control Points Coordinate Matrix
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {sortedPoints.map((pt, idx) => (
                <div 
                  key={idx} 
                  className="bg-[#05070a]/60 border border-white/5 rounded-lg p-2 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-bold">P{idx + 1}:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="20"
                        max="100"
                        value={pt.temp}
                        onChange={(e) => handleUpdatePoint(idx, 'temp', parseInt(e.target.value) || 20)}
                        className="w-12 bg-[#080c12] border border-white/10 rounded px-1 py-0.5 text-center text-slate-200 font-bold focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="text-slate-500">°C</span>
                      <span className="text-slate-600">→</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={pt.speed}
                        onChange={(e) => handleUpdatePoint(idx, 'speed', parseInt(e.target.value) || 0)}
                        className="w-12 bg-[#080c12] border border-white/10 rounded px-1 py-0.5 text-center text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="text-emerald-500">%</span>
                    </div>
                  </div>

                  {sortedPoints.length > 2 && (
                    <button
                      onClick={() => handleRemovePoint(idx)}
                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Remove Point"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Thermal Mapping, Zero-RPM & Dynamic Live Simulator */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Hardware Sensor & Channel Mapping Card */}
          <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 space-y-4 shadow-md">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
              <Cpu className="h-4 w-4 text-emerald-400" />
              <h4 className="font-sans font-bold text-xs tracking-wider text-slate-200 uppercase">
                ACPI Hardware & Channel Mapping
              </h4>
            </div>

            <div className="space-y-3 font-mono text-xs">
              
              {/* Profile Name Input */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Profile Name:</label>
                <input
                  type="text"
                  value={selectedProfile.name}
                  onChange={(e) => setSelectedProfile({ ...selectedProfile, name: e.target.value })}
                  className="w-full bg-[#05070a] border border-white/10 rounded-lg px-3 py-1.5 text-slate-200 font-semibold focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              {/* Sensor Target Selector */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Primary Target Thermal Sensor:</label>
                <select
                  value={selectedProfile.sensorTarget}
                  onChange={(e) => setSelectedProfile({ ...selectedProfile, sensorTarget: e.target.value as any })}
                  className="w-full bg-[#05070a] border border-white/10 rounded-lg px-3 py-1.5 text-slate-200 font-semibold focus:border-emerald-500/50 focus:outline-none"
                >
                  <option value="cpu">CPU Package Core Temperature</option>
                  <option value="gpu">Discrete GPU Thermal Junction</option>
                  <option value="nvme">NVMe PCIe SSD Storage Controller</option>
                  <option value="system">Motherboard System VRM</option>
                </select>
              </div>

              {/* Fan PWM Channel Header */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Fan Channel Header (PWM):</label>
                <select
                  value={selectedProfile.fanChannel}
                  onChange={(e) => setSelectedProfile({ ...selectedProfile, fanChannel: e.target.value as any })}
                  className="w-full bg-[#05070a] border border-white/10 rounded-lg px-3 py-1.5 text-slate-200 font-semibold focus:border-emerald-500/50 focus:outline-none"
                >
                  <option value="cpu_fan">CPU_FAN (Main Processor Heatsink)</option>
                  <option value="chassis_1">SYS_FAN1 / CHA_FAN1 (Intake Fans)</option>
                  <option value="chassis_2">SYS_FAN2 / CHA_FAN2 (Exhaust Fans)</option>
                  <option value="gpu_fan">GPU_FAN (Graphics Card Cooler)</option>
                </select>
              </div>

              {/* Hysteresis Delay Setting */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-bold uppercase">Hysteresis Delay Buffer:</span>
                  <span className="text-emerald-400 font-bold">{selectedProfile.hysteresis}°C</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={selectedProfile.hysteresis}
                  onChange={(e) => setSelectedProfile({ ...selectedProfile, hysteresis: parseInt(e.target.value) || 2 })}
                  className="w-full accent-emerald-500 bg-[#030508] h-1.5 rounded cursor-pointer"
                />
                <p className="text-[9px] text-slate-500 leading-normal">
                  Prevents fan RPM rapidly cycling/ramping up and down when core temps fluctuate near point boundaries.
                </p>
              </div>

              {/* Zero RPM Mode Toggle */}
              <div className="bg-[#05070a]/50 p-3 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-200 uppercase font-sans flex items-center gap-1.5">
                    <Power className="h-3.5 w-3.5 text-amber-400" />
                    Zero-RPM Acoustic Silence Mode
                  </span>
                  <button
                    onClick={() => setSelectedProfile({ ...selectedProfile, zeroRpmMode: !selectedProfile.zeroRpmMode })}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      selectedProfile.zeroRpmMode
                        ? "bg-amber-500 text-black shadow-sm"
                        : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {selectedProfile.zeroRpmMode ? "ENABLED" : "OFF"}
                  </button>
                </div>

                {selectedProfile.zeroRpmMode && (
                  <div className="space-y-1 pt-1 border-t border-white/5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 font-bold">Shutoff Cutoff Threshold:</span>
                      <span className="text-amber-400 font-bold">{selectedProfile.zeroRpmThreshold}°C</span>
                    </div>
                    <input
                      type="range"
                      min="25"
                      max="50"
                      value={selectedProfile.zeroRpmThreshold}
                      onChange={(e) => setSelectedProfile({ ...selectedProfile, zeroRpmThreshold: parseInt(e.target.value) || 35 })}
                      className="w-full accent-amber-500 bg-[#030508] h-1.5 rounded cursor-pointer"
                    />
                    <p className="text-[9px] text-amber-400/80">
                      Fans turn completely OFF (0 RPM) when core temperature is below {selectedProfile.zeroRpmThreshold}°C.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Dynamic Real-Time Thermal Simulator Card */}
          <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-sky-400" />
                <h4 className="font-sans font-bold text-xs tracking-wider text-slate-200 uppercase">
                  Real-Time Thermal Curve Simulator
                </h4>
              </div>
              <span className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[9px] font-mono font-bold rounded">
                LIVE SIM
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Adjust the core temperature slider to test how your custom fan curve will respond dynamically across varying thermal loads.
            </p>

            <div className="bg-[#05070a]/60 p-4 rounded-xl border border-white/5 space-y-3 font-mono">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Simulated Core Temperature:</span>
                <span className="text-sky-400 font-bold text-sm">{simulatedTemp} °C</span>
              </div>

              <input
                type="range"
                min="20"
                max="95"
                value={simulatedTemp}
                onChange={(e) => setSimulatedTemp(parseInt(e.target.value) || 45)}
                className="w-full accent-sky-400 bg-[#030508] h-2 rounded cursor-pointer"
              />

              <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                <div className="bg-[#080c12] p-2.5 rounded-lg border border-white/5">
                  <span className="block text-[9px] text-slate-500 uppercase font-bold">Calculated PWM Duty</span>
                  <span className="text-lg font-black text-emerald-400">{calculatedCurrentSpeed}%</span>
                </div>
                <div className="bg-[#080c12] p-2.5 rounded-lg border border-white/5">
                  <span className="block text-[9px] text-slate-500 uppercase font-bold">Estimated Fan Speed</span>
                  <span className="text-lg font-black text-sky-400">{estimatedRpm} RPM</span>
                </div>
              </div>
            </div>

            {/* Quick Temp Preset Buttons */}
            <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
              <button 
                onClick={() => setSimulatedTemp(32)}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-slate-300 font-bold cursor-pointer"
              >
                32°C Idle
              </button>
              <button 
                onClick={() => setSimulatedTemp(55)}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-slate-300 font-bold cursor-pointer"
              >
                55°C Work
              </button>
              <button 
                onClick={() => setSimulatedTemp(78)}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-slate-300 font-bold cursor-pointer"
              >
                78°C Heavy
              </button>
              <button 
                onClick={() => setSimulatedTemp(92)}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-slate-300 font-bold cursor-pointer"
              >
                92°C Peak
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Linux Mint Autostart Script Modal */}
      <AnimatePresence>
        {showScriptModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c121a] border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-sans font-bold text-sm text-slate-100 uppercase tracking-wide">
                    Linux Mint Fan Curve Boot Autostart Integration
                  </h3>
                </div>
                <button
                  onClick={() => setShowScriptModal(false)}
                  className="text-slate-400 hover:text-slate-200 text-xs font-bold px-2 py-1 rounded bg-white/5"
                >
                  Close ✕
                </button>
              </div>

              <div className="space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
                <p>
                  MintCare Companion automatically provisions your custom Linux Mint startup files so your active fan curve profile loads automatically whenever Linux Mint boots up:
                </p>

                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-3 bg-[#05070a] border border-white/5 rounded-lg space-y-1">
                    <span className="text-emerald-400 font-bold block">1. Desktop Autostart File:</span>
                    <span className="text-slate-400 block">{curveState.desktopAutostartPath}</span>
                  </div>

                  <div className="p-3 bg-[#05070a] border border-white/5 rounded-lg space-y-1">
                    <span className="text-emerald-400 font-bold block">2. Systemd Service Target:</span>
                    <span className="text-slate-400 block">{curveState.systemdServicePath}</span>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between bg-[#05070a] px-3 py-2 rounded-t-lg border-t border-x border-white/10 text-[10px] font-mono text-slate-400">
                    <span>Executable Bash Autostart Script (`mintcare-fancontrol.sh`)</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(curveState.generatedBashScript);
                        setCopiedScript(true);
                        setTimeout(() => setCopiedScript(false), 3000);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedScript ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedScript ? "Copied!" : "Copy Script"}
                    </button>
                  </div>
                  <pre className="p-4 bg-[#030508] border border-white/10 rounded-b-lg text-[10px] font-mono text-emerald-300/90 overflow-x-auto max-h-56 leading-relaxed">
                    {curveState.generatedBashScript}
                  </pre>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <span className="text-[10px] font-mono text-slate-500">
                  Status: <strong className="text-emerald-400 uppercase">{curveState.serviceStatus}</strong>
                </span>
                <button
                  onClick={() => setShowScriptModal(false)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-lg uppercase tracking-wide cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
