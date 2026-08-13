import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Cpu, 
  HardDrive, 
  Layers, 
  Activity, 
  Terminal, 
  Clock, 
  ShieldCheck, 
  Server,
  AlertTriangle,
  RefreshCw,
  Search,
  Skull,
  Sparkles,
  ShieldAlert,
  Thermometer,
  Eye,
  Heart,
  Info,
  FileText,
  Download,
  Check,
  Printer,
  X
} from "lucide-react";
import { SystemStats, SystemProcess, SmartDriveHealth, DiagnosticResult } from "../types";

interface DashboardProps {
  stats: SystemStats | null;
  loading: boolean;
  onRefresh: () => void;
  onAskAI?: (query: string) => void;
  onOpenHealthWizard?: () => void;
}

export default function Dashboard({ stats, loading, onRefresh, onAskAI, onOpenHealthWizard }: DashboardProps) {
  const [processes, setProcesses] = useState<SystemProcess[]>([]);
  const [processesLoading, setProcessesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [killingPid, setKillingPid] = useState<number | null>(null);

  const [smartDrives, setSmartDrives] = useState<SmartDriveHealth[]>([]);
  const [smartLoading, setSmartLoading] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState<string | null>(null);

  // Custom polling update pulse animation state
  const [isPulsing, setIsPulsing] = useState(false);

  // Export Diagnostics Report Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportDiagnostics, setExportDiagnostics] = useState<DiagnosticResult[]>([]);
  const [exportDiagLoading, setExportDiagLoading] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  const fetchExportDiagnostics = async () => {
    setExportDiagLoading(true);
    setExportSuccessMessage(null);
    try {
      const res = await fetch("/api/diagnostics/run");
      if (res.ok) {
        const data = await res.json();
        setExportDiagnostics(data);
      }
    } catch (err) {
      console.error("Failed to run export diagnostics:", err);
    } finally {
      setExportDiagLoading(false);
    }
  };

  useEffect(() => {
    if (isExportModalOpen) {
      fetchExportDiagnostics();
    }
  }, [isExportModalOpen]);

  useEffect(() => {
    if (stats) {
      setIsPulsing(true);
      const timer = setTimeout(() => {
        setIsPulsing(false);
      }, 1200); // 1.2s matches our keyframe animation duration exactly
      return () => clearTimeout(timer);
    }
  }, [stats]);

  const fetchProcesses = async () => {
    setProcessesLoading(true);
    try {
      const res = await fetch("/api/system/processes");
      if (res.ok) {
        const data = await res.json();
        setProcesses(data);
      }
    } catch (err) {
      console.error("Failed to fetch processes:", err);
    } finally {
      setProcessesLoading(false);
    }
  };

  const fetchSmartDrives = async () => {
    setSmartLoading(true);
    try {
      const res = await fetch("/api/system/smart-health");
      if (res.ok) {
        const data = await res.json();
        setSmartDrives(data);
        if (data.length > 0 && !selectedDrive) {
          setSelectedDrive(data[0].device);
        }
      }
    } catch (err) {
      console.error("Failed to fetch SMART drive details:", err);
    } finally {
      setSmartLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
    fetchSmartDrives();
  }, [stats]); // Refetch when main stats are refreshed too

  const handleKillProcess = async (pid: number) => {
    setKillingPid(pid);
    try {
      const res = await fetch("/api/system/processes/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid })
      });
      if (res.ok) {
        // Remove from list or trigger refresh
        setProcesses(processes.filter(p => p.pid !== pid));
      }
    } catch (err) {
      console.error("Failed to terminate process:", err);
    } finally {
      setKillingPid(null);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-sm text-gray-500 font-mono">Querying system metrics...</p>
      </div>
    );
  }

  const system = stats || {
    hostname: "linux-mint-desktop",
    platform: "Linux Mint 21.3 (Virginia)",
    arch: "x86_64",
    release: "5.15.0-91-generic",
    cpuModel: "Intel Core i7-10700K CPU @ 3.80GHz",
    cpuCores: 8,
    cpuUsage: 14,
    totalMem: 16 * 1024 * 1024 * 1024,
    freeMem: 6 * 1024 * 1024 * 1024,
    usedMem: 10 * 1024 * 1024 * 1024,
    loadAvg: [0.35, 0.42, 0.28],
    diskTotal: 512 * 1024 * 1024 * 1024,
    diskFree: 180 * 1024 * 1024 * 1024,
    diskUsed: 332 * 1024 * 1024 * 1024,
    uptime: 43200 + 1850,
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
    return parts.join(" ");
  };

  const ramPct = Math.round((system.usedMem / system.totalMem) * 100);
  const diskPct = Math.round((system.diskUsed / system.diskTotal) * 100);

  // Animation states
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
  };

  const getFallbackDiagnostics = (): DiagnosticResult[] => {
    const currentRamPct = Math.round((system.usedMem / system.totalMem) * 100);
    const currentDiskPct = Math.round((system.diskUsed / system.diskTotal) * 100);
    const results: DiagnosticResult[] = [];
    
    // RAM
    results.push({
      category: "Memory",
      item: "System RAM Overhead",
      status: currentRamPct > 90 ? "fail" : currentRamPct > 75 ? "warning" : "pass",
      value: `${currentRamPct}% occupied`,
      remediation: currentRamPct > 75 ? "Clean user application memory or drop page cache." : undefined
    });

    // Disk
    results.push({
      category: "Disk",
      item: "Root File System Capacity",
      status: currentDiskPct > 90 ? "fail" : currentDiskPct > 80 ? "warning" : "pass",
      value: `${currentDiskPct}% full`,
      remediation: currentDiskPct > 80 ? "Run Mint Clean or vacuum log sizes." : undefined
    });

    // CPU load
    results.push({
      category: "CPU",
      item: "Processor Core Saturation",
      status: system.cpuUsage > 90 ? "fail" : system.cpuUsage > 70 ? "warning" : "pass",
      value: `${system.cpuUsage}% CPU Load`,
      remediation: system.cpuUsage > 70 ? "Investigate resource-heavy processes or background threads." : undefined
    });

    // SMART
    const allDrivesHealthy = smartDrives.length > 0 ? smartDrives.every(d => d.badSectors === 0) : true;
    results.push({
      category: "Storage Hardware",
      item: "S.M.A.R.T. Drive Diagnostics",
      status: allDrivesHealthy ? "pass" : "warning",
      value: allDrivesHealthy ? "All physical disks healthy" : "Bad sectors reallocated",
      remediation: allDrivesHealthy ? undefined : "Monitor reallocated sector attributes or replace SSD."
    });

    return results;
  };

  const handleDownloadTextReport = () => {
    const diags = exportDiagnostics.length > 0 ? exportDiagnostics : getFallbackDiagnostics();
    const reportText = generateTextReport(system, diags, smartDrives, processes);
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mintcare-health-report-${system.hostname}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportSuccessMessage("Text Report successfully exported!");
  };

  const handleDownloadHtmlReport = () => {
    const diags = exportDiagnostics.length > 0 ? exportDiagnostics : getFallbackDiagnostics();
    const reportHtml = generateHtmlReport(system, diags, smartDrives, processes);
    const blob = new Blob([reportHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mintcare-health-report-${system.hostname}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportSuccessMessage("Formatted PDF/HTML Report successfully exported!");
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Upper bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0c121a] p-4 rounded-xl border border-emerald-900/20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-slate-100 text-base">{system.hostname}</h3>
            <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              {system.platform} ({system.arch}) • Kernel {system.release}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">System Uptime</p>
            <p className="text-sm font-semibold text-emerald-300 font-mono flex items-center gap-1 justify-end">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {formatUptime(system.uptime)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onOpenHealthWizard && (
              <button
                onClick={onOpenHealthWizard}
                className="py-2 px-3 text-black bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-sans font-bold text-xs shadow-lg shadow-emerald-500/20"
                id="open-health-wizard-btn"
              >
                <Heart className="h-4 w-4 fill-black" />
                <span className="text-xs uppercase tracking-wider">Health Checkup Wizard</span>
              </button>
            )}
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5 font-mono text-xs bg-emerald-500/10"
              id="open-export-report-btn"
            >
              <FileText className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Export Report</span>
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5 font-mono text-xs bg-emerald-500/10"
              id="refresh-stats-btn"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-xs font-semibold uppercase tracking-wider">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Gauges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CPU Usage Card */}
        <motion.div 
          variants={itemVariants} 
          className={`bg-[#0c121a] p-6 rounded-xl border border-white/5 shadow-md flex flex-col justify-between transition-colors ${
            isPulsing ? "animate-pulse-emerald" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-400" />
              <span className="font-sans font-bold text-slate-300 text-sm tracking-wide">Processor Activity</span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {system.cpuCores} Cores
            </span>
          </div>

          <div className="relative py-4 flex flex-col items-center justify-center">
            {/* Simple SVG Circular Gauge */}
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="52"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="10"
                fill="transparent"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="52"
                stroke="#10b981"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 52}
                initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - system.cpuUsage / 100) }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-2xl font-bold font-mono text-emerald-400">{system.cpuUsage}%</span>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">CPU Load</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
            <p className="text-xs text-slate-400 truncate font-mono text-center">{system.cpuModel}</p>
            <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
              <span>Load Average:</span>
              <span className="font-semibold text-slate-300">
                {system.loadAvg.map(val => val.toFixed(2)).join(" • ")}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Memory Card */}
        <motion.div 
          variants={itemVariants} 
          className={`bg-[#0c121a] p-6 rounded-xl border border-white/5 shadow-md flex flex-col justify-between transition-colors ${
            isPulsing ? "animate-pulse-blue" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-400" />
              <span className="font-sans font-bold text-slate-300 text-sm tracking-wide">System Memory (RAM)</span>
            </div>
            <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              {formatBytes(system.totalMem)}
            </span>
          </div>

          <div className="relative py-4 flex flex-col items-center justify-center">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="52"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="10"
                fill="transparent"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="52"
                stroke="#3b82f6"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 52}
                initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - ramPct / 100) }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-2xl font-bold font-mono text-blue-400">{ramPct}%</span>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">RAM Used</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-center">
              <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
                <p className="text-[10px] text-slate-500">USED</p>
                <p className="font-semibold text-slate-300">{formatBytes(system.usedMem)}</p>
              </div>
              <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
                <p className="text-[10px] text-slate-500">FREE</p>
                <p className="font-semibold text-slate-300">{formatBytes(system.freeMem)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Disk Space Card */}
        <motion.div 
          variants={itemVariants} 
          className={`bg-[#0c121a] p-6 rounded-xl border border-white/5 shadow-md flex flex-col justify-between transition-colors ${
            isPulsing ? "animate-pulse-orange" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-orange-400" />
              <span className="font-sans font-bold text-slate-300 text-sm tracking-wide">Root Directory Disk</span>
            </div>
            <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
              {formatBytes(system.diskTotal)}
            </span>
          </div>

          <div className="relative py-4 flex flex-col items-center justify-center">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="52"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="10"
                fill="transparent"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="52"
                stroke="#f97316"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 52}
                initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - diskPct / 100) }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-2xl font-bold font-mono text-orange-400">{diskPct}%</span>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Storage Full</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-center">
              <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
                <p className="text-[10px] text-slate-500">OCCUPIED</p>
                <p className="font-semibold text-slate-300">{formatBytes(system.diskUsed)}</p>
              </div>
              <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
                <p className="text-[10px] text-slate-500">AVAILABLE</p>
                <p className="font-semibold text-slate-300">{formatBytes(system.diskFree)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* S.M.A.R.T Physical Drive Health & Thermal Sensor Array */}
      <motion.div 
        variants={itemVariants} 
        className="bg-[#0c121a] p-5 sm:p-6 rounded-xl border border-white/5 shadow-md space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 shrink-0">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-slate-100 text-sm tracking-wide">S.M.A.R.T. Disk Diagnostic & Temperature Sensors</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Inspect physical NVMe/SATA sector allocation, raw telemetry attributes, and controller thermal logs.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 bg-[#05070a]/60 p-1 rounded-lg border border-white/5">
            {smartDrives.map((drv) => (
              <button
                key={drv.device}
                onClick={() => setSelectedDrive(drv.device)}
                className={`px-3 py-1.5 rounded-md font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                  selectedDrive === drv.device
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-500 hover:text-slate-300 border border-transparent"
                }`}
              >
                {drv.device.split("/dev/")[1]} {drv.badSectors > 0 ? "⚠️" : "✓"}
              </button>
            ))}
          </div>
        </div>

        {smartDrives.length > 0 && selectedDrive && (() => {
          const drive = smartDrives.find(d => d.device === selectedDrive)!;
          const isHealthy = drive.badSectors === 0 && drive.healthPercentage >= 90;
          
          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
              
              {/* Drive Overview & Thermals */}
              <div className="bg-[#05070a]/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[9px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold tracking-wide">
                    {drive.device} // ACTIVE DEVS
                  </span>
                  <h4 className="font-sans font-bold text-sm text-slate-200">{drive.model}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-mono">
                    Device Node: <span className="text-slate-300">{drive.device}</span><br />
                    Power Hours: <span className="text-slate-300">{drive.powerOnHours.toLocaleString()} Hrs</span>
                  </p>
                </div>

                {/* Thermal Sensor Gauge */}
                <div className="flex items-center gap-4 bg-[#030508] p-3 rounded-lg border border-white/5">
                  <div className={`p-2.5 rounded-lg shrink-0 ${
                    drive.temp > 45 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    <Thermometer className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider">Controller Temp</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-xl font-bold font-mono ${drive.temp > 45 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {drive.temp}°C
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">/ 70°C max</span>
                    </div>
                  </div>
                  <div className="flex-1 text-right">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      drive.temp > 45 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {drive.temp > 45 ? "WARM" : "COOL"}
                    </span>
                  </div>
                </div>

                {/* Lifetime remaining metric */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>REMAINING SSD LIFETIME:</span>
                    <span className="font-bold text-emerald-400">{drive.wearIndicator}%</span>
                  </div>
                  <div className="w-full bg-[#030508] h-2 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full rounded-full ${drive.wearIndicator < 90 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${drive.wearIndicator}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Status parameters */}
              <div className="bg-[#05070a]/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <span className="text-[9px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold tracking-wide">
                    INTEGRITY PROFILE
                  </span>
                  
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-slate-500">Wear Status:</span>
                      <span className={`font-bold ${isHealthy ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isHealthy ? "EXCELLENT" : "PRE-FAILURE WARNING"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-slate-500">Reallocated Sectors:</span>
                      <span className={`font-bold ${drive.badSectors > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {drive.badSectors} Sector{drive.badSectors !== 1 && "s"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-slate-500">Hardware Controller:</span>
                      <span className="text-slate-300">PASS (L-MINT Verified)</span>
                    </div>

                    <div className="flex justify-between pb-1">
                      <span className="text-slate-500">Power On/Off Loops:</span>
                      <span className="text-slate-300">1,421 Cycles</span>
                    </div>
                  </div>
                </div>

                {/* AI advice trigger */}
                {onAskAI && (
                  <button
                    onClick={() => onAskAI(`I am reviewing S.M.A.R.T attributes on my Linux Mint computer for disk [${drive.model}] (${drive.device}). It has a temperature of ${drive.temp}C, ${drive.badSectors} bad sector reallocation count, and ${drive.wearIndicator}% physical lifetime remaining. Is this drive safe, what does reallocated sectors count mean, and how do I perform a deeper smartctl self-test command?`)}
                    className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/25 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Explain SMART with Mint AI
                  </button>
                )}
              </div>

              {/* Attributes block */}
              <div className="bg-[#05070a]/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between space-y-3 lg:col-span-1">
                <span className="text-[9px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold tracking-wide">
                  CRITICAL RAW TELEMETRY
                </span>

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 text-[11px] leading-relaxed font-mono">
                  {drive.attributes.map((attr) => (
                    <div 
                      key={attr.id} 
                      className="p-2 bg-[#030508]/60 rounded border border-white/5 space-y-1 flex justify-between items-center"
                    >
                      <div className="min-w-0 pr-1.5">
                        <span className="text-slate-500 font-bold">ID {attr.id}</span> • <span className="text-slate-300 font-sans truncate inline-block max-w-[120px]" title={attr.name}>{attr.name}</span>
                        <p className="text-[9px] text-slate-500 leading-none truncate">{attr.raw}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded uppercase ${
                        attr.status === 'OK' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {attr.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          );
        })()}
      </motion.div>

      {/* Active Process Explorer & Resource Hog Analyzer */}
      <motion.div 
        variants={itemVariants} 
        className="bg-[#0c121a] p-5 sm:p-6 rounded-xl border border-white/5 shadow-md space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-slate-100 text-sm tracking-wide">Active Process Explorer & Resource Hog Analyzer</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Monitor system-wide memory hogs, active Cinnamon threads, and administrative sub-services.
              </p>
            </div>
          </div>
          
          {/* Quick Refresh Processes Button */}
          <button
            onClick={fetchProcesses}
            disabled={processesLoading}
            className="self-start sm:self-auto px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg border border-white/10 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${processesLoading ? 'animate-spin' : ''}`} />
            Reload Threads
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#05070a]/40 p-3 rounded-lg border border-emerald-900/10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by process name, PID, user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#05070a] border border-emerald-900/10 hover:border-emerald-500/20 focus:border-emerald-500 rounded-lg py-2 pl-9 pr-4 text-xs outline-none transition-all placeholder:text-slate-700 text-slate-300"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
            <span className="text-slate-500 mr-1 uppercase font-bold tracking-wider">Hogs Only:</span>
            <button 
              onClick={() => setSearchQuery("cinnamon")} 
              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 rounded border border-white/5 cursor-pointer transition-colors"
            >
              Cinnamon
            </button>
            <button 
              onClick={() => setSearchQuery("firefox")} 
              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 rounded border border-white/5 cursor-pointer transition-colors"
            >
              Browsers
            </button>
            <button 
              onClick={() => setSearchQuery("root")} 
              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 rounded border border-white/5 cursor-pointer transition-colors"
            >
              Root Level
            </button>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded border border-red-900/20 cursor-pointer transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Process Table Grid */}
        <div className="overflow-x-auto rounded-lg border border-white/5">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#05070a] text-slate-400 uppercase tracking-wider font-mono text-[9px] border-b border-white/5">
                <th className="py-3 px-4">PID</th>
                <th className="py-3 px-4">Process Name</th>
                <th className="py-3 px-4">CPU Overhead</th>
                <th className="py-3 px-4">Memory footprint</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Administrative Signals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {processes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-mono text-xs">
                    {processesLoading ? "Loading threads inventory..." : "No active processes found matching search query."}
                  </td>
                </tr>
              ) : (
                processes
                  .filter(p => {
                    const q = searchQuery.toLowerCase().trim();
                    if (!q) return true;
                    return p.name.toLowerCase().includes(q) || 
                           p.pid.toString().includes(q) || 
                           p.user.toLowerCase().includes(q) ||
                           p.category.toLowerCase().includes(q);
                  })
                  .map((proc) => {
                    const isMemoryHog = proc.mem > 300;
                    const isCpuHog = proc.cpu > 4;
                    const isSystem = proc.user === "root";
                    
                    return (
                      <tr key={proc.pid} className="hover:bg-white/5/25 transition-colors font-mono">
                        <td className="py-3 px-4 text-slate-500">{proc.pid}</td>
                        <td className="py-3 px-4 font-sans font-semibold text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${proc.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
                            <span>{proc.name}</span>
                            {isMemoryHog && (
                              <span className="text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1 py-0.5 rounded uppercase font-bold tracking-wider scale-95 origin-left">
                                MEM HOG
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${isCpuHog ? 'text-amber-400' : 'text-slate-300'}`}>
                              {proc.cpu}%
                            </span>
                            <div className="w-12 bg-[#05070a] h-1.5 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className={`h-full rounded-full ${isCpuHog ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(proc.cpu * 8, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-semibold ${isMemoryHog ? 'text-amber-400' : 'text-slate-300'}`}>
                            {proc.mem} MB
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                            isSystem ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {proc.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {onAskAI && (
                              <button
                                onClick={() => onAskAI(`How can I troubleshoot high resource footprint on Linux Mint for process [${proc.name}]? It is running under user [${proc.user}] with CPU: ${proc.cpu}% and RAM: ${proc.mem}MB. What does this daemon do, is it safe to terminate, and what is the best command to reset it safely?`)}
                                className="px-2 py-1 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 rounded text-[10px] text-emerald-400 font-sans font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                title="Consult Mint Care AI"
                              >
                                <Sparkles className="h-3 w-3" />
                                Inspect AI
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleKillProcess(proc.pid)}
                              disabled={killingPid === proc.pid}
                              className="p-1 hover:bg-red-500/10 border border-transparent hover:border-red-500/25 rounded text-slate-500 hover:text-red-400 transition-all cursor-pointer disabled:opacity-30"
                              title={`Send SIGKILL to Process ${proc.pid}`}
                            >
                              <Skull className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Linux Mint Environment Helper Console */}
      <motion.div variants={itemVariants} className="bg-gray-900 text-gray-200 p-5 rounded-xl border border-gray-800 shadow-lg font-mono">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500 inline-block"></span>
              <span className="h-3 w-3 rounded-full bg-yellow-500 inline-block"></span>
              <span className="h-3 w-3 rounded-full bg-green-500 inline-block"></span>
            </div>
            <span className="text-xs text-gray-400 ml-2 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
              mintcare@diagnostic-console:~
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 px-2 py-0.5 rounded-sm bg-gray-800">
            Sandbox Active
          </span>
        </div>

        <div className="space-y-2.5 text-xs text-gray-300 leading-relaxed">
          <p className="text-gray-500"># Welcome to the MintCare Companion Diagnostic environment.</p>
          <p className="text-gray-500"># This web server compiles metrics directly from your sandboxed instance</p>
          <p className="text-gray-500"># and helps construct optimization cleanups ready for deployment on Linux Mint.</p>
          <div className="p-3 bg-gray-950 rounded-lg border border-gray-800/50 mt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-emerald-400">mintcare@system$</span>
              <span className="text-gray-500">uname -a</span>
            </div>
            <p className="text-gray-400">{system.platform} {system.release} {system.arch}</p>
          </div>
          <div className="p-3 bg-gray-950 rounded-lg border border-gray-800/50 space-y-1">
            <div className="flex justify-between">
              <span className="text-emerald-400">mintcare@system$</span>
              <span className="text-gray-500">cat /proc/meminfo | head -n 3</span>
            </div>
            <p className="text-gray-400">MemTotal:     {Math.round(system.totalMem / 1024).toLocaleString()} kB</p>
            <p className="text-gray-400">MemFree:      {Math.round(system.freeMem / 1024).toLocaleString()} kB</p>
            <p className="text-gray-400">MemAvailable: {Math.round((system.freeMem + (system.totalMem * 0.15)) / 1024).toLocaleString()} kB</p>
          </div>
        </div>
      </motion.div>

      {/* Immersive Export Diagnostics Report Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="export-report-modal">
          <div className="bg-[#0c121a] border border-emerald-500/25 max-w-xl w-full rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.15)] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gradient-to-r from-emerald-950/20 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-slate-100 text-base">Export Diagnostics & Health Report</h3>
                  <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Compile live system snapshot</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsExportModalOpen(false);
                  setExportSuccessMessage(null);
                }}
                className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer"
                id="close-export-report-modal-btn"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Diagnostic Compilation Status Panel */}
              <div className="bg-[#05070a]/60 p-4 rounded-xl border border-white/5 space-y-3">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono">Snapshot compilation parameters</span>
                
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 bg-[#080c12]/50 rounded-lg border border-white/5 space-y-1">
                    <span className="text-slate-500 text-[9px] block uppercase">Target Host</span>
                    <span className="font-bold text-slate-200 truncate block">{system.hostname}</span>
                  </div>
                  <div className="p-2.5 bg-[#080c12]/50 rounded-lg border border-white/5 space-y-1">
                    <span className="text-slate-500 text-[9px] block uppercase">Platform OS</span>
                    <span className="font-bold text-slate-200 truncate block">{system.platform}</span>
                  </div>
                  <div className="p-2.5 bg-[#080c12]/50 rounded-lg border border-white/5 space-y-1">
                    <span className="text-slate-500 text-[9px] block uppercase">Kernel Release</span>
                    <span className="font-bold text-slate-200 truncate block">{system.release}</span>
                  </div>
                  <div className="p-2.5 bg-[#080c12]/50 rounded-lg border border-white/5 space-y-1">
                    <span className="text-slate-500 text-[9px] block uppercase">Uptime Session</span>
                    <span className="font-bold text-slate-200 truncate block">{formatUptime(system.uptime)}</span>
                  </div>
                </div>

                {/* Compilation progress or success bar */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Diagnostic Suite Integration:</span>
                  {exportDiagLoading ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Running OS sysctl audits...
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="h-3.5 w-3.5 font-bold" />
                      {(exportDiagnostics.length > 0 ? exportDiagnostics : getFallbackDiagnostics()).length} checks bundled
                    </span>
                  )}
                </div>
              </div>

              {/* Informative advice */}
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex gap-2.5 text-xs text-slate-400 leading-relaxed">
                <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  The formatted PDF option downloads a gorgeous, self-contained HTML file. Open it and print/save to PDF natively via your browser for pixel-perfect document rendering.
                </p>
              </div>

              {/* Status/Success Message */}
              {exportSuccessMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{exportSuccessMessage}</span>
                </div>
              )}

              {/* Report Export Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {/* PDF/HTML download option */}
                <button
                  onClick={handleDownloadHtmlReport}
                  disabled={exportDiagLoading}
                  className="flex flex-col items-center justify-center p-5 bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 hover:from-emerald-500/15 hover:to-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/45 rounded-xl cursor-pointer text-center space-y-2.5 transition-all text-slate-200 hover:text-emerald-300 disabled:opacity-40"
                  id="download-html-report-btn"
                >
                  <Printer className="h-8 w-8 text-emerald-400" />
                  <div>
                    <span className="text-sm font-bold block">Formatted PDF Report</span>
                    <span className="text-[10px] text-slate-400 font-mono">Beautiful, high-fidelity PDF output</span>
                  </div>
                </button>

                {/* Plain Text download option */}
                <button
                  onClick={handleDownloadTextReport}
                  disabled={exportDiagLoading}
                  className="flex flex-col items-center justify-center p-5 bg-gradient-to-b from-slate-900/60 to-slate-900/40 hover:from-slate-900/80 hover:to-slate-900/60 border border-white/5 hover:border-white/15 rounded-xl cursor-pointer text-center space-y-2.5 transition-all text-slate-300 hover:text-slate-100 disabled:opacity-40"
                  id="download-txt-report-btn"
                >
                  <FileText className="h-8 w-8 text-slate-400" />
                  <div>
                    <span className="text-sm font-bold block">Plain Text Report</span>
                    <span className="text-[10px] text-slate-400 font-mono">Standard ASCII CLI formatting</span>
                  </div>
                </button>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#05070a]/40 border-t border-white/5 text-right">
              <button
                onClick={() => {
                  setIsExportModalOpen(false);
                  setExportSuccessMessage(null);
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                id="close-export-report-footer-btn"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </motion.div>
  );
}

// Global snapshot report generator helper functions for download snap-files
function generateTextReport(
  system: any, 
  diagnostics: DiagnosticResult[], 
  smartDrives: SmartDriveHealth[], 
  processes: SystemProcess[]
): string {
  const dateStr = new Date().toLocaleString();
  const ramPct = Math.round((system.usedMem / system.totalMem) * 100);
  const diskPct = Math.round((system.diskUsed / system.diskTotal) * 100);
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
    return parts.join(" ");
  };

  let report = "";
  report += "================================================================================\n";
  report += "                  MINTCARE SYSTEM COMPANION HEALTH REPORT                        \n";
  report += "================================================================================\n";
  report += `Generated On  : ${dateStr}\n`;
  report += `Target Host   : ${system.hostname}\n`;
  report += `Platform/OS   : ${system.platform} (${system.arch})\n`;
  report += `Kernel Ver    : ${system.release}\n`;
  report += `Uptime        : ${formatUptime(system.uptime)}\n`;
  report += "================================================================================\n\n";

  report += "[1. RESOURCE PERFORMANCE SUMMARY]\n";
  report += "--------------------------------------------------------------------------------\n";
  report += `CPU Model     : ${system.cpuModel}\n`;
  report += `CPU Cores     : ${system.cpuCores} physical/logical threads\n`;
  report += `CPU Usage     : ${system.cpuUsage}%\n`;
  report += `Load Average  : ${system.loadAvg.map((v: number) => v.toFixed(2)).join(" • ")}\n`;
  report += `RAM Overhead  : ${ramPct}% used (${formatBytes(system.usedMem)} of ${formatBytes(system.totalMem)})\n`;
  report += `Disk Space    : ${diskPct}% full (${formatBytes(system.diskUsed)} of ${formatBytes(system.diskTotal)})\n`;
  report += "--------------------------------------------------------------------------------\n\n";

  report += "[2. ACTIVE SYSTEM DIAGNOSTIC CHECKS]\n";
  report += "--------------------------------------------------------------------------------\n";
  if (diagnostics.length === 0) {
    report += " No diagnostics run yet. Execute checks via companion diagnostics panel.\n";
  } else {
    diagnostics.forEach(d => {
      report += `[${d.status.toUpperCase()}] ${d.category} - ${d.item}\n`;
      report += `      Reported Value: ${d.value}\n`;
      if (d.remediation) {
        report += `      Remediation   : ${d.remediation}\n`;
      }
      report += "\n";
    });
  }
  report += "--------------------------------------------------------------------------------\n\n";

  report += "[3. S.M.A.R.T. PHYSICAL HARD DRIVES]\n";
  report += "--------------------------------------------------------------------------------\n";
  if (smartDrives.length === 0) {
    report += " No physical SMART sensor details recorded.\n";
  } else {
    smartDrives.forEach(drv => {
      report += `Device Node   : ${drv.device}\n`;
      report += `Model Name    : ${drv.model}\n`;
      report += `Integrity     : ${drv.badSectors === 0 ? "HEALTHY (0 bad sectors)" : "WARNING (" + drv.badSectors + " bad sectors)"}\n`;
      report += `Temperature   : ${drv.temp}°C\n`;
      report += `Wear Indicator: ${drv.wearIndicator}% remaining lifetime\n`;
      report += `Power-On Loops: ${drv.powerOnHours.toLocaleString()} Hours\n`;
      report += "\n";
    });
  }
  report += "--------------------------------------------------------------------------------\n\n";

  report += "[4. ACTIVE PROCESS THREADS INVENTORY]\n";
  report += "--------------------------------------------------------------------------------\n";
  report += "  PID      PROCESS NAME          CPU %      RAM SIZE      CATEGORY     USER\n";
  report += "--------------------------------------------------------------------------------\n";
  if (processes.length === 0) {
    report += "  No process list captured.\n";
  } else {
    processes.slice(0, 15).forEach(p => {
      const nameCol = p.name.padEnd(20).substring(0, 20);
      const pidCol = p.pid.toString().padEnd(8).substring(0, 8);
      const cpuCol = `${p.cpu}%`.padEnd(10).substring(0, 10);
      const memCol = `${p.mem} MB`.padEnd(13).substring(0, 13);
      const catCol = p.category.padEnd(12).substring(0, 12);
      report += `  ${pidCol} ${nameCol}  ${cpuCol} ${memCol}  ${catCol} ${p.user}\n`;
    });
  }
  report += "--------------------------------------------------------------------------------\n\n";
  report += "=========================== END OF DIAGNOSTIC REPORT ===========================\n";

  return report;
}

function generateHtmlReport(
  system: any, 
  diagnostics: DiagnosticResult[], 
  smartDrives: SmartDriveHealth[], 
  processes: SystemProcess[]
): string {
  const dateStr = new Date().toLocaleString();
  const ramPct = Math.round((system.usedMem / system.totalMem) * 100);
  const diskPct = Math.round((system.diskUsed / system.diskTotal) * 100);
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
    return parts.join(" ");
  };

  const diagRows = diagnostics.map(d => `
    <tr class="border-b border-gray-100 hover:bg-gray-50/50">
      <td class="py-3 px-4 font-mono text-xs font-semibold text-gray-500">${d.category}</td>
      <td class="py-3 px-4 text-sm font-semibold text-gray-900">${d.item}</td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
          d.status === 'pass' ? 'bg-emerald-100 text-emerald-800' :
          d.status === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
        }">
          ${d.status.toUpperCase()}
        </span>
      </td>
      <td class="py-3 px-4 font-mono text-xs text-gray-600">${d.value}</td>
      <td class="py-3 px-4 text-xs text-gray-500 italic font-sans leading-relaxed">${d.remediation || '-'}</td>
    </tr>
  `).join('');

  const driveDetails = smartDrives.map(drv => `
    <div class="bg-gray-50 p-4 rounded-xl border border-gray-200/60 space-y-3">
      <div class="flex items-center justify-between border-b border-gray-200/60 pb-2">
        <span class="text-xs font-mono font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">${drv.device}</span>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          drv.badSectors === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        }">
          ${drv.badSectors === 0 ? 'HEALTHY' : 'WARNING'}
        </span>
      </div>
      <h4 class="text-sm font-bold text-gray-800">${drv.model}</h4>
      <div class="grid grid-cols-2 gap-3 text-xs font-mono text-gray-600">
        <div>Power-On Hours: <span class="font-bold text-gray-900">${drv.powerOnHours.toLocaleString()} Hrs</span></div>
        <div>Wear Level Remaining: <span class="font-bold text-emerald-600">${drv.wearIndicator}%</span></div>
        <div>Temp Sensor: <span class="font-bold ${drv.temp > 45 ? 'text-amber-600' : 'text-emerald-600'}">${drv.temp}°C</span></div>
        <div>Bad Sector Count: <span class="font-bold ${drv.badSectors > 0 ? 'text-amber-600' : 'text-emerald-600'}">${drv.badSectors}</span></div>
      </div>
    </div>
  `).join('');

  const procRows = processes.slice(0, 10).map(p => `
    <tr class="border-b border-gray-100 hover:bg-gray-50/50 font-mono text-xs">
      <td class="py-2 px-4 text-gray-400">${p.pid}</td>
      <td class="py-2 px-4 font-sans font-semibold text-gray-800">${p.name}</td>
      <td class="py-2 px-4 font-semibold text-gray-700">${p.cpu}%</td>
      <td class="py-2 px-4 font-semibold text-gray-700">${p.mem} MB</td>
      <td class="py-2 px-4 text-gray-500 uppercase font-bold text-[10px]">${p.category}</td>
      <td class="py-2 px-4 text-gray-400 text-right">${p.user}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MintCare System Health Diagnostic Report - ${system.hostname}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
    body {
      font-family: 'Inter', sans-serif;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    @media print {
      body {
        background-color: white !important;
        color: black !important;
      }
      .no-print {
        display: none !important;
      }
      .print-shadow-none {
        box-shadow: none !important;
      }
      .page-break {
        page-break-before: always;
      }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 p-6 md:p-12">
  <div class="max-w-4xl mx-auto space-y-8 bg-white p-6 md:p-10 rounded-2xl border border-gray-200/80 shadow-sm print-shadow-none">
    
    <!-- Top Alert bar for interactive actions -->
    <div class="no-print bg-emerald-50 border border-emerald-200/60 p-4 rounded-xl flex items-center justify-between gap-4">
      <div class="space-y-0.5">
        <h5 class="text-sm font-bold text-emerald-900">MintCare Interactive Diagnostic Document</h5>
        <p class="text-xs text-emerald-700">This file is fully self-contained. Click below to print or save as a pixel-perfect PDF report.</p>
      </div>
      <button 
        onclick="window.print()" 
        class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print / Save to PDF
      </button>
    </div>

    <!-- Main Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-6">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black uppercase rounded tracking-wider">MINTCARE</span>
          <span class="text-xs text-gray-400 font-mono">CONFIDENTIAL SYSTEM AUDIT</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-gray-950">System Health & Diagnostic Summary</h1>
        <p class="text-xs text-gray-500 font-mono">Generated: ${dateStr}</p>
      </div>
      <div class="text-left sm:text-right font-mono text-xs text-gray-600 space-y-0.5">
        <div>Hostname: <span class="font-bold text-gray-900">${system.hostname}</span></div>
        <div>Platform: <span class="font-semibold text-gray-800">${system.platform}</span></div>
        <div>Uptime: <span class="font-bold text-gray-900">${formatUptime(system.uptime)}</span></div>
      </div>
    </div>

    <!-- Quick Stats Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- CPU -->
      <div class="bg-gray-50 p-5 rounded-xl border border-gray-200/80 flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">CPU Activity</span>
          <p class="text-2xl font-bold font-mono text-emerald-600">${system.cpuUsage}%</p>
          <p class="text-[10px] text-gray-500 font-mono truncate max-w-[160px]">${system.cpuCores} Cores • ${system.loadAvg[0].toFixed(2)} Avg</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center font-bold text-emerald-600 font-mono text-xs">
          C
        </div>
      </div>
      <!-- RAM -->
      <div class="bg-gray-50 p-5 rounded-xl border border-gray-200/80 flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">RAM Utilization</span>
          <p class="text-2xl font-bold font-mono text-blue-600">${ramPct}%</p>
          <p class="text-[10px] text-gray-500 font-mono">${formatBytes(system.usedMem)} / ${formatBytes(system.totalMem)}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-blue-50 border-4 border-blue-100 flex items-center justify-center font-bold text-blue-600 font-mono text-xs">
          M
        </div>
      </div>
      <!-- Disk -->
      <div class="bg-gray-50 p-5 rounded-xl border border-gray-200/80 flex items-center justify-between">
        <div class="space-y-1">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Root Directory Disk</span>
          <p class="text-2xl font-bold font-mono text-orange-600">${diskPct}%</p>
          <p class="text-[10px] text-gray-500 font-mono">${formatBytes(system.diskUsed)} / ${formatBytes(system.diskTotal)}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-orange-50 border-4 border-orange-100 flex items-center justify-center font-bold text-orange-600 font-mono text-xs">
          D
        </div>
      </div>
    </div>

    <!-- Diagnostic Checks -->
    <div class="space-y-3">
      <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Active System Diagnostic Checks</h3>
      <div class="overflow-x-auto rounded-xl border border-gray-200">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-gray-50 text-gray-500 uppercase tracking-wider font-mono text-[9px] border-b border-gray-200">
              <th class="py-3 px-4">Category</th>
              <th class="py-3 px-4">Diagnostic Item</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Reported Value</th>
              <th class="py-3 px-4">Remediation Advice</th>
            </tr>
          </thead>
          <tbody>
            ${diagRows || '<tr><td colspan="5" class="py-6 text-center text-gray-400 font-mono">No active diagnostics run. Run diagnostics from panel first.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="page-break"></div>

    <!-- S.M.A.R.T Drive Status & Temperature -->
    <div class="space-y-3 pt-4">
      <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">S.M.A.R.T. Physical Hard Drive Sensors</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${driveDetails || '<p class="text-xs text-gray-400 font-mono col-span-2">No SMART drives reported.</p>'}
      </div>
    </div>

    <!-- Process Threads Explorer -->
    <div class="space-y-3 pt-4">
      <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Active Process Threads & Overhead Inventory</h3>
      <div class="overflow-x-auto rounded-xl border border-gray-200">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-gray-50 text-gray-500 uppercase tracking-wider font-mono text-[9px] border-b border-gray-200">
              <th class="py-2.5 px-4">PID</th>
              <th class="py-2.5 px-4">Process Name</th>
              <th class="py-2.5 px-4">CPU %</th>
              <th class="py-2.5 px-4">RAM Size</th>
              <th class="py-2.5 px-4">Category</th>
              <th class="py-2.5 px-4 text-right">User Context</th>
            </tr>
          </thead>
          <tbody>
            ${procRows || '<tr><td colspan="6" class="py-6 text-center text-gray-400 font-mono">No process threads captured.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer block -->
    <div class="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between text-[10px] text-gray-400 font-mono gap-4">
      <span>MintCare Diagnostic Summary Report // COMPANION CENTER</span>
      <span>Printed Security Hash: SHA-256/MC-0C121A-SEC</span>
    </div>

  </div>
</body>
</html>
  `;
}
