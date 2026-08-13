import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldAlert, 
  Package, 
  RefreshCw, 
  Terminal as TerminalIcon, 
  Cpu, 
  ChevronRight, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  Play, 
  Sparkles, 
  DownloadCloud, 
  Layers, 
  Search,
  Check,
  AlertTriangle,
  Download
} from "lucide-react";
import { PackageUpdate, KernelUpgrade, PackageAuditState } from "../types";

interface PackageManagerAuditProps {
  onAskAI?: (query: string) => void;
}

export default function PackageManagerAudit({ onAskAI }: PackageManagerAuditProps) {
  const [auditState, setAuditState] = useState<PackageAuditState | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<'all' | 'security' | 'apt' | 'flatpak'>('all');
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const fetchAuditState = async () => {
    try {
      const res = await fetch("/api/system/package-audit");
      if (res.ok) {
        const data = await res.json();
        setAuditState(data);
      }
    } catch (err) {
      console.error("Failed to fetch package audit status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!auditState) return;
    let csv = "Section,Package Name,Manager,Type,Current Version,New Version,Download Size,Description\n";
    
    // Kernel Section
    csv += `Kernel System Upgrade,-,-,${kernel.status.toUpperCase()},${kernel.currentKernel},${kernel.suggestedKernel},-,Recommended Kernel Upgrade Available\n`;
    
    // Updates
    filteredUpdates.forEach(u => {
      const name = `"${u.name.replace(/"/g, '""')}"`;
      const manager = `"${u.manager.toUpperCase()}"`;
      const type = `"${u.type.toUpperCase()}"`;
      const curVer = `"${u.currentVersion.replace(/"/g, '""')}"`;
      const newVer = `"${u.newVersion.replace(/"/g, '""')}"`;
      const size = `"${u.size.replace(/"/g, '""')}"`;
      const desc = `"${u.description.replace(/"/g, '""')}"`;
      csv += `Pending Package,${name},${manager},${type},${curVer},${newVer},${size},${desc}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mintcare_package_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Poll for live log output and status updates when system is active
  useEffect(() => {
    fetchAuditState();
    
    // Fast polling if status is active, otherwise slow poll
    const getPollInterval = () => {
      if (auditState && auditState.status !== 'idle' && auditState.status !== 'finished') {
        return 1000;
      }
      return 4000;
    };

    const interval = setInterval(fetchAuditState, getPollInterval());
    return () => clearInterval(interval);
  }, [auditState?.status]);

  // Scroll terminal to bottom when logLines change
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [auditState?.logLines?.length, auditState?.status]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/system/package-audit/refresh", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setAuditState(data);
      }
    } catch (err) {
      console.error("Failed to run package re-scan:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAptUpdate = async () => {
    try {
      const res = await fetch("/api/system/package-audit/update-apt", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setAuditState(data);
      }
    } catch (err) {
      console.error("Failed to initiate apt update:", err);
    }
  };

  const handleTriggerFlatpakUpdate = async () => {
    try {
      const res = await fetch("/api/system/package-audit/update-flatpak", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setAuditState(data);
      }
    } catch (err) {
      console.error("Failed to initiate flatpak update:", err);
    }
  };

  const handleUpgradeKernel = async () => {
    if (!window.confirm("Kernel upgrades change the core boot structures of the operating system. A system reboot will be required immediately after installation. Proceed with kernel version migration?")) {
      return;
    }
    try {
      const res = await fetch("/api/system/package-audit/upgrade-kernel", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setAuditState(data);
      }
    } catch (err) {
      console.error("Failed to trigger kernel upgrade:", err);
    }
  };

  if (loading || !auditState) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 font-mono text-slate-500">
        <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
        <p className="text-xs">Querying package databases & checking repository mirrors...</p>
      </div>
    );
  }

  const { pendingUpdates, kernel, status, lastAuditTime, logLines } = auditState;

  // Filter package updates
  const filteredUpdates = pendingUpdates.filter(update => {
    const matchesSearch = update.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          update.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeFilter === 'security') return update.type === 'security';
    if (activeFilter === 'apt') return update.manager === 'apt';
    if (activeFilter === 'flatpak') return update.manager === 'flatpak';
    return true;
  });

  const securityCount = pendingUpdates.filter(u => u.type === 'security').length;
  const regularCount = pendingUpdates.filter(u => u.type === 'regular').length;
  const aptCount = pendingUpdates.filter(u => u.manager === 'apt').length;
  const flatpakCount = pendingUpdates.filter(u => u.manager === 'flatpak').length;

  return (
    <div className="space-y-6">
      
      {/* Header Panel with Stats Bar */}
      <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-emerald-400" />
            <h3 className="font-sans font-bold text-sm tracking-wide text-slate-100 uppercase">Package Manager Audit Engine</h3>
          </div>
          <p className="text-xs text-slate-400 font-sans">
            Diagnostic console for APT dependencies, flatpak sandboxes, and Linux kernel upgrades.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-mono text-slate-500 uppercase bg-[#05070a]/50 border border-white/5 px-2.5 py-1.5 rounded-lg">
            Last scan: <span className="text-slate-300 font-bold">{lastAuditTime}</span>
          </span>
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black text-[10px] font-mono uppercase tracking-wider font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_2px_8px_rgba(16,185,129,0.2)]"
            id="export-package-csv"
          >
            <Download className="h-3 w-3" />
            Download CSV Report
          </button>
          <button
            onClick={handleRefresh}
            disabled={status !== 'idle' && status !== 'finished'}
            className="px-3 py-1.5 bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/20 text-[#10b981] disabled:opacity-50 text-[10px] font-mono uppercase tracking-wider font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3 w-3 ${status === 'updating-apt' || status === 'updating-flatpak' ? 'animate-spin' : ''}`} />
            Rescan Packages
          </button>
        </div>
      </div>

      {/* Overview Stats Quick-grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-[#05070a]/40 border border-white/5 p-3.5 rounded-xl flex items-center gap-3.5">
          <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/15">
            <ShieldAlert className="h-5 w-5 text-red-400" />
          </div>
          <div className="font-mono text-left">
            <span className="text-slate-500 text-[9px] uppercase font-bold block">Security Updates</span>
            <span className="text-lg font-bold text-red-400">{securityCount}</span>
          </div>
        </div>

        <div className="bg-[#05070a]/40 border border-white/5 p-3.5 rounded-xl flex items-center gap-3.5">
          <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/15">
            <Package className="h-5 w-5 text-amber-400" />
          </div>
          <div className="font-mono text-left">
            <span className="text-slate-500 text-[9px] uppercase font-bold block">Regular Upgrades</span>
            <span className="text-lg font-bold text-amber-400">{regularCount}</span>
          </div>
        </div>

        <div className="bg-[#05070a]/40 border border-white/5 p-3.5 rounded-xl flex items-center gap-3.5">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/15">
            <Layers className="h-5 w-5 text-blue-400" />
          </div>
          <div className="font-mono text-left">
            <span className="text-slate-500 text-[9px] uppercase font-bold block">APT Dependencies</span>
            <span className="text-lg font-bold text-blue-400">{aptCount}</span>
          </div>
        </div>

        <div className="bg-[#05070a]/40 border border-white/5 p-3.5 rounded-xl flex items-center gap-3.5">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/15">
            <DownloadCloud className="h-5 w-5 text-purple-400" />
          </div>
          <div className="font-mono text-left">
            <span className="text-slate-500 text-[9px] uppercase font-bold block">Flatpak Runtimes</span>
            <span className="text-lg font-bold text-purple-400">{flatpakCount}</span>
          </div>
        </div>

      </div>

      {/* Main Grid: Pending Updates vs Kernel Advisory */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left column: Pending Security & Packages Updates */}
        <div className="xl:col-span-2 bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md flex flex-col justify-between space-y-4">
          
          <div className="space-y-4">
            
            {/* Filter Bar & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-400" />
                <h4 className="font-sans font-bold text-xs tracking-wider text-slate-200 uppercase">
                  Pending Upgrade Repositories ({pendingUpdates.length})
                </h4>
              </div>

              {/* Live search input */}
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search updates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#05070a]/60 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500/40 font-sans"
                />
              </div>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-1.5 font-mono text-[9px]">
              {[
                { id: 'all', label: 'All Packages', count: pendingUpdates.length },
                { id: 'security', label: 'Security Fixes', count: securityCount },
                { id: 'apt', label: 'APT (Debian)', count: aptCount },
                { id: 'flatpak', label: 'Flatpaks (Sandbox)', count: flatpakCount }
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id as any)}
                  className={`px-3 py-1 rounded border font-bold transition-all cursor-pointer ${
                    activeFilter === filter.id
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                      : "bg-[#05070a]/30 border-white/5 text-slate-400 hover:border-white/10"
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>

            {/* Updates list */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              <AnimatePresence mode="popLayout">
                {filteredUpdates.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2"
                  >
                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                    <p className="text-[11px] font-mono">Your packages are completely secure and optimized.</p>
                  </motion.div>
                ) : (
                  filteredUpdates.map((update) => (
                    <motion.div
                      key={update.id}
                      layoutId={update.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-[#05070a]/40 border border-white/5 rounded-xl p-3.5 space-y-2 hover:border-white/10 transition-all group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          {update.type === 'security' ? (
                            <ShieldAlert className="h-4 w-4 text-red-400 flex-shrink-0 animate-pulse" />
                          ) : (
                            <Package className="h-4 w-4 text-amber-400 flex-shrink-0" />
                          )}
                          <span className="font-mono text-xs font-bold text-slate-200 break-all select-all">
                            {update.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 self-start sm:self-center">
                          {/* Manager badge */}
                          <span className="text-[9px] font-mono uppercase bg-[#1e293b] text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                            {update.manager}
                          </span>
                          
                          {/* Type badge */}
                          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                            update.type === 'security' 
                              ? "bg-red-500/10 border-red-500/20 text-red-400" 
                              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          }`}>
                            {update.type}
                          </span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                        {update.description}
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-white/5 pt-2 mt-1">
                        <div>
                          Version: <span className="text-slate-400 select-all">{update.currentVersion}</span> 
                          <ChevronRight className="inline h-3 w-3 mx-1 text-slate-600" /> 
                          <span className="text-emerald-400 font-bold select-all">{update.newVersion}</span>
                        </div>
                        <div className="text-slate-400 font-bold">
                          {update.size}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* Upgrade Action Triggers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <div>
              <button
                disabled={aptCount === 0 || status === 'updating-apt' || status === 'updating-flatpak'}
                onClick={handleTriggerAptUpdate}
                className="w-full py-2.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 disabled:opacity-40 text-blue-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <DownloadCloud className="h-4 w-4" />
                Upgrade {aptCount} APT Packages
              </button>
              <p className="text-[9px] text-slate-500 font-mono text-center mt-1.5">
                Calculates deb dependencies & repairs security holes
              </p>
            </div>

            <div>
              <button
                disabled={flatpakCount === 0 || status === 'updating-apt' || status === 'updating-flatpak'}
                onClick={handleTriggerFlatpakUpdate}
                className="w-full py-2.5 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 disabled:opacity-40 text-purple-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Layers className="h-4 w-4" />
                Upgrade {flatpakCount} Flatpaks
              </button>
              <p className="text-[9px] text-slate-500 font-mono text-center mt-1.5">
                Applies sandbox updates to containerized applications
              </p>
            </div>
          </div>

        </div>

        {/* Right column: Kernel upgrades & logs terminal */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Kernel Upgrade Advisory Card */}
          <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md flex flex-col justify-between space-y-4">
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                <Cpu className="h-4 w-4 text-amber-400" />
                <h4 className="font-sans font-bold text-xs tracking-wider text-slate-200 uppercase">
                  Linux Kernel migration
                </h4>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Current running kernel:</span>
                <span className="font-bold text-slate-300 px-2 py-0.5 bg-[#05070a] border border-white/5 rounded">
                  {kernel.currentKernel}
                </span>
              </div>

              {kernel.status === 'upgrade-available' ? (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Suggested upgrade:</span>
                    <span className="font-bold text-emerald-400 px-2 py-0.5 bg-[#05070a] border border-emerald-500/15 rounded">
                      {kernel.suggestedKernel}
                    </span>
                  </div>

                  {/* Warning banner */}
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-3 flex gap-2.5 text-amber-400">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1 font-sans text-[11px] leading-relaxed">
                      <p className="font-bold">Recommended Kernel Update Available</p>
                      <p className="text-slate-400 text-[10px]">
                        Migrates base modules from standard kernel branch to LTS 6.11 core. Adds crucial PWM fan controls and eBPF security fixes.
                      </p>
                    </div>
                  </div>

                  {/* Changelog list */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">
                      Target kernel improvements:
                    </span>
                    <div className="space-y-1 font-mono text-[9px] text-slate-400">
                      {kernel.changelog.map((change, index) => (
                        <div key={index} className="flex gap-1.5 items-start">
                          <Check className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span>{change}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3 flex gap-2.5 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 font-sans text-[11px] leading-relaxed">
                    <p className="font-bold">Kernel up-to-date</p>
                    <p className="text-slate-400 text-[10px]">
                      Your operating system is running the fully audited 6.11.0 kernel. Active memory sandboxing and chassis PWM controllers are operational.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {kernel.status === 'upgrade-available' && (
              <div className="pt-2">
                <button
                  disabled={status === 'updating-apt' || status === 'updating-flatpak'}
                  onClick={handleUpgradeKernel}
                  className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 disabled:opacity-40 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Cpu className="h-4 w-4" />
                  Upgrade Kernel version
                </button>
              </div>
            )}

          </div>

          {/* Shell / Process outputs console */}
          <div className="bg-[#05070a] rounded-xl border border-white/5 p-4 flex flex-col space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <TerminalIcon className="h-4 w-4 text-slate-400 animate-pulse" />
                <span className="font-mono text-[10px] font-bold text-slate-300 uppercase">
                  Upgrade telemetry stream
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full animate-ping" style={{
                  backgroundColor: status === 'idle' ? '#64748b' : status === 'finished' ? '#10b981' : '#f59e0b'
                }} />
                <span className="text-[8px] font-mono uppercase text-slate-400">
                  {status === 'idle' ? 'STANDBY' : status === 'finished' ? 'COMPLETED' : 'EXECUTING'}
                </span>
              </div>
            </div>

            {/* Virtual scrolling console lines */}
            <div className="h-48 overflow-y-auto font-mono text-[10px] text-slate-400 bg-slate-950/80 p-3 rounded-lg border border-white/5 space-y-1.5 scrollbar-thin select-all">
              {logLines.map((line, idx) => {
                let colorClass = "text-slate-400";
                if (line.includes("[success]")) colorClass = "text-emerald-400 font-bold";
                else if (line.includes("[download]")) colorClass = "text-blue-400";
                else if (line.includes("[apt]") || line.includes("[flatpak]")) colorClass = "text-slate-300";
                else if (line.includes("warning") || line.includes("WARNING") || line.includes("REQUIRED")) colorClass = "text-amber-400 font-bold";
                else if (line.includes("[error]")) colorClass = "text-red-400 font-bold";

                return (
                  <div key={idx} className={`${colorClass} leading-relaxed`}>
                    {line}
                  </div>
                );
              })}
              <div ref={terminalEndRef} />
            </div>

            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
              <span>TTY: /dev/pts/2 (sandbox shell)</span>
              <span>UTF-8 encoding</span>
            </div>
          </div>

        </div>

      </div>

      {/* AI Helpdesk troubleshooting */}
      {onAskAI && (
        <div className="bg-[#0c121a] text-slate-200 rounded-xl border border-emerald-900/30 p-5 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] select-none pointer-events-none">
            <ShieldAlert className="h-28 w-28 text-emerald-400" />
          </div>

          <div className="space-y-4 max-w-2xl relative z-10 font-sans">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <h3 className="font-bold text-sm tracking-tight text-slate-100">Consult MintCare AI for Package audits</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you hitting broken apt dependencies, GPG key authorization failures, or flatpak container execution problems? Ask our helpdesk to formulate customized Linux Mint CLI commands or dependency patches instantly.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => onAskAI("I am getting a dpkg lock error message 'Could not get lock /var/lib/dpkg/lock-frontend'. How do I debug which process is holding this apt database lock in Cinnamon, and what are the terminal commands to safely release it?")}
                className="py-1.5 px-3 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-emerald-400 border border-[#10b981]/20 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
              >
                Solve dpkg database lock
              </button>
              
              <button
                onClick={() => onAskAI("How do flatpaks handle application sandboxing in Linux Mint? How can I inspect or modify custom permission overlays (like webcam, microphone, or network access) for sandboxed flatpak applications using the terminal command line?")}
                className="py-1.5 px-3 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-emerald-400 border border-[#10b981]/20 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer"
              >
                Inspect Flatpak Sandbox
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
