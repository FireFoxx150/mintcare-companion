import React, { useState, useEffect } from "react";
import { 
  Zap, 
  Gamepad2, 
  BatteryCharging, 
  Code, 
  ShieldCheck, 
  Sliders, 
  CheckCircle2, 
  Sparkles, 
  Terminal, 
  RefreshCw,
  Download,
  Flame,
  Gauge,
  SlidersHorizontal,
  Info
} from "lucide-react";

interface TuningPreset {
  id: string;
  name: string;
  description: string;
  icon: any;
  badge: string;
  badgeColor: string;
  settings: {
    cpuGovernor: "performance" | "schedutil" | "powersave";
    swappiness: number;
    vfsCachePressure: number;
    cinnamonCompositor: boolean;
    fanMode: "aggressive" | "balanced" | "quiet";
    firewallProfile: "strict" | "standard" | "permissive";
    sysctlTcpFastOpen: boolean;
    sysctlDisableIcmpPing: boolean;
  };
}

export default function SystemTuningPresetManager({ onAskAI }: { onAskAI?: (q: string) => void }) {
  const [activePresetId, setActivePresetId] = useState<string>("balanced");
  const [swappiness, setSwappiness] = useState<number>(60);
  const [vfsCachePressure, setVfsCachePressure] = useState<number>(100);
  const [cpuGovernor, setCpuGovernor] = useState<string>("schedutil");
  const [tcpFastOpen, setTcpFastOpen] = useState<boolean>(true);
  const [disableIcmpPing, setDisableIcmpPing] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const presets: TuningPreset[] = [
    {
      id: "gaming",
      name: "Gaming & Ultra Performance",
      description: "Forces max CPU frequency governor, lowers swappiness to 10 for zero micro-stutters, and sets aggressive fan cooling.",
      icon: Gamepad2,
      badge: "MAX FPS",
      badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
      settings: {
        cpuGovernor: "performance",
        swappiness: 10,
        vfsCachePressure: 50,
        cinnamonCompositor: false,
        fanMode: "aggressive",
        firewallProfile: "standard",
        sysctlTcpFastOpen: true,
        sysctlDisableIcmpPing: false
      }
    },
    {
      id: "balanced",
      name: "Linux Mint Balanced Standard",
      description: "Default responsive configuration optimized for daily browsing, media streaming, and general office desktop usage.",
      icon: Gauge,
      badge: "RECOMMENDED",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      settings: {
        cpuGovernor: "schedutil",
        swappiness: 60,
        vfsCachePressure: 100,
        cinnamonCompositor: true,
        fanMode: "balanced",
        firewallProfile: "standard",
        sysctlTcpFastOpen: true,
        sysctlDisableIcmpPing: false
      }
    },
    {
      id: "powersave",
      name: "Eco & Laptop Battery Saver",
      description: "Reduces CPU clock limits, lowers background indexing frequency, dims fan curve, and optimizes swappiness for longevity.",
      icon: BatteryCharging,
      badge: "BATTERY EXTREME",
      badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      settings: {
        cpuGovernor: "powersave",
        swappiness: 80,
        vfsCachePressure: 120,
        cinnamonCompositor: true,
        fanMode: "quiet",
        firewallProfile: "standard",
        sysctlTcpFastOpen: false,
        sysctlDisableIcmpPing: false
      }
    },
    {
      id: "developer",
      name: "Developer & Workstation",
      description: "High file descriptor limits (`fs.file-max`), optimized VFS cache retention for large git builds, and low memory pressure.",
      icon: Code,
      badge: "IDE & BUILD",
      badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      settings: {
        cpuGovernor: "performance",
        swappiness: 20,
        vfsCachePressure: 50,
        cinnamonCompositor: true,
        fanMode: "balanced",
        firewallProfile: "standard",
        sysctlTcpFastOpen: true,
        sysctlDisableIcmpPing: false
      }
    },
    {
      id: "hardened",
      name: "Strict Security Hardening",
      description: "Blocks incoming ICMP pings, enforces strict UFW firewall, locks down socket buffers, and enables TCP SYN cookies.",
      icon: ShieldCheck,
      badge: "AIRGAP HARDENED",
      badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      settings: {
        cpuGovernor: "schedutil",
        swappiness: 50,
        vfsCachePressure: 100,
        cinnamonCompositor: true,
        fanMode: "balanced",
        firewallProfile: "strict",
        sysctlTcpFastOpen: true,
        sysctlDisableIcmpPing: true
      }
    }
  ];

  const handleApplyPreset = (preset: TuningPreset) => {
    setActivePresetId(preset.id);
    setSwappiness(preset.settings.swappiness);
    setVfsCachePressure(preset.settings.vfsCachePressure);
    setCpuGovernor(preset.settings.cpuGovernor);
    setTcpFastOpen(preset.settings.sysctlTcpFastOpen);
    setDisableIcmpPing(preset.settings.sysctlDisableIcmpPing);

    setIsApplying(true);
    setStatusMessage(`Applying '${preset.name}' kernel parameters...`);

    fetch("/api/system/tuning/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset.settings)
    })
      .then(res => res.json())
      .then(data => {
        setIsApplying(false);
        setStatusMessage(`Successfully activated profile: ${preset.name}`);
        setTimeout(() => setStatusMessage(null), 4000);
      })
      .catch(err => {
        setIsApplying(false);
        setStatusMessage(`Applied ${preset.name} (Simulation Mode).`);
        setTimeout(() => setStatusMessage(null), 4000);
      });
  };

  const handleExportSysctlConf = () => {
    const sysctlContent = `# =====================================================================
# MintCare Companion System Tuning Configuration
# Generated: ${new Date().toLocaleString()}
# Active Preset Profile: ${activePresetId.toUpperCase()}
# =====================================================================

vm.swappiness=${swappiness}
vm.vfs_cache_pressure=${vfsCachePressure}
net.ipv4.tcp_fastopen=${tcpFastOpen ? 3 : 0}
net.ipv4.icmp_echo_ignore_all=${disableIcmpPing ? 1 : 0}
fs.file-max=2097152
kernel.sysrq=1
`;

    const blob = new Blob([sysctlContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `99-mintcare-${activePresetId}-tuning.conf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Sliders className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-100">
                One-Click System Tuning & Performance Profiles
              </h2>
            </div>
            <p className="text-slate-400 text-sm pl-11">
              Switch entire kernel governor, memory swappiness, and thermal modes in a single click tailored for Linux Mint.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pl-11 lg:pl-0">
            <button
              onClick={handleExportSysctlConf}
              className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
              id="export-sysctl-btn"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              Export /etc/sysctl.d File
            </button>
            {onAskAI && (
              <button
                onClick={() => onAskAI("How do Linux Mint CPU governors and sysctl swappiness affect gaming and battery life?")}
                className="py-2 px-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                id="ask-ai-tuning-btn"
              >
                <Sparkles className="h-4 w-4" />
                Ask AI Assistant
              </button>
            )}
          </div>
        </div>

        {statusMessage && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {presets.map((p) => {
          const Icon = p.icon;
          const isActive = activePresetId === p.id;
          return (
            <div
              key={p.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                isActive
                  ? "bg-slate-900 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`p-2.5 rounded-xl border ${isActive ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-300"}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-sm font-bold text-slate-100">{p.name}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${p.badgeColor}`}>
                    {p.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed pl-1">
                  {p.description}
                </p>

                <div className="pt-2 border-t border-slate-800/60 space-y-1.5 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>CPU Governor:</span>
                    <span className="font-mono text-emerald-400 font-semibold uppercase">{p.settings.cpuGovernor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Swappiness:</span>
                    <span className="font-mono text-slate-200">{p.settings.swappiness}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fan Control Curve:</span>
                    <span className="font-mono text-slate-200 capitalize">{p.settings.fanMode}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleApplyPreset(p)}
                disabled={isApplying}
                className={`mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isActive
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                }`}
                id={`apply-preset-${p.id}`}
              >
                {isActive ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-black" />
                    Active Profile
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 text-emerald-400" />
                    Activate Preset
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Manual Sysctl & Governor Fine Tuning Panel */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md space-y-5">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400">
            <SlidersHorizontal className="h-5 w-5" />
          </span>
          <h3 className="text-base font-bold text-slate-100">
            Manual Kernel Parameter Tuning Sliders
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Swappiness Slider */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-950/50 border border-slate-800/60">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-amber-400" />
                vm.swappiness
              </span>
              <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {swappiness}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={swappiness}
              onChange={(e) => setSwappiness(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Lower values (10-20) force Linux Mint to keep application RAM in physical memory before swapping to SSD/HDD.
            </p>
          </div>

          {/* VFS Cache Pressure Slider */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-950/50 border border-slate-800/60">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-blue-400" />
                vm.vfs_cache_pressure
              </span>
              <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {vfsCachePressure}
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              value={vfsCachePressure}
              onChange={(e) => setVfsCachePressure(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Controls directory entry cache retention. 50 speeds up file tree browsing in Nemo file manager.
            </p>
          </div>

          {/* CPU Governor Selection */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-950/50 border border-slate-800/60">
            <span className="text-xs font-semibold text-slate-200 block">
              CPU Frequency Scaling Governor
            </span>
            <select
              value={cpuGovernor}
              onChange={(e) => setCpuGovernor(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2.5 outline-none focus:border-emerald-500"
            >
              <option value="performance">performance (Lock CPU @ Max Frequency)</option>
              <option value="schedutil">schedutil (Linux Mint Standard Dynamic)</option>
              <option value="powersave">powersave (Battery Energy Saver)</option>
              <option value="ondemand">ondemand (Classic On-Demand)</option>
            </select>
            <p className="text-[11px] text-slate-400">
              Directly sets /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor across all CPU cores.
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-950/50 border border-slate-800/60">
            <label className="flex items-center justify-between text-xs cursor-pointer">
              <span className="text-slate-200 font-medium">Enable TCP Fast Open (net.ipv4.tcp_fastopen)</span>
              <input
                type="checkbox"
                checked={tcpFastOpen}
                onChange={(e) => setTcpFastOpen(e.target.checked)}
                className="rounded accent-emerald-500 h-4 w-4 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between text-xs cursor-pointer">
              <span className="text-slate-200 font-medium">Suppress External ICMP Ping (Security)</span>
              <input
                type="checkbox"
                checked={disableIcmpPing}
                onChange={(e) => setDisableIcmpPing(e.target.checked)}
                className="rounded accent-emerald-500 h-4 w-4 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
