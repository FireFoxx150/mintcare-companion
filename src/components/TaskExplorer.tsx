import React, { useState, useEffect } from "react";
import { 
  Terminal, 
  Search, 
  RefreshCw, 
  Download, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Cpu, 
  Database, 
  Skull, 
  Sparkles,
  Play,
  User,
  Activity,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SystemProcess } from "../types.js";

interface TaskExplorerProps {
  onAskAI?: (query: string) => void;
}

export default function TaskExplorer({ onAskAI }: TaskExplorerProps) {
  const [processes, setProcesses] = useState<SystemProcess[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"cpu" | "mem" | "pid" | "name">("cpu");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Confirmation state for killing processes
  const [confirmingPid, setConfirmingPid] = useState<number | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system/processes");
      if (res.ok) {
        const data = await res.json();
        setProcesses(data);
      }
    } catch (err) {
      console.error("Failed to fetch processes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
    // Poll processes every 10 seconds for real-time emulation
    const interval = setInterval(fetchProcesses, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleKillProcess = async (pid: number) => {
    try {
      const res = await fetch("/api/system/processes/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Optimistically filter from state
        setProcesses(prev => prev.filter(p => p.pid !== pid));
        setActionFeedback({ type: "success", message: data.message });
        setConfirmingPid(null);
        
        // Hide feedback after 5 seconds
        setTimeout(() => {
          setActionFeedback(null);
        }, 5000);
      } else {
        setActionFeedback({ type: "error", message: data.error || "Failed to terminate process." });
      }
    } catch (err) {
      console.error("Failed to kill process:", err);
      setActionFeedback({ type: "error", message: "Network error occurred while sending kill signal." });
    }
  };

  const handleExportCSV = () => {
    let csv = "PID,Process Name,User,Category,CPU %,Memory (MB),Status\n";
    sortedAndFilteredProcesses.forEach(p => {
      csv += `${p.pid},"${p.name}",${p.user},${p.category},${p.cpu}%,${p.mem} MB,${p.status}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mintcare_task_explorer_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAskAIAboutProcess = (proc: SystemProcess) => {
    if (onAskAI) {
      onAskAI(`Can you explain what the process '${proc.name}' (PID: ${proc.pid}, category: ${proc.category}) does in a Linux Mint system? It is currently using ${proc.cpu}% CPU and ${proc.mem}MB Memory. Is it safe to terminate if it runs away?`);
    }
  };

  // Compute stats
  const totalProcesses = processes.length;
  const runningCount = processes.filter(p => p.status === "running").length;
  const cumulativeCpu = Number(processes.reduce((acc, p) => acc + p.cpu, 0).toFixed(1));
  const cumulativeMem = processes.reduce((acc, p) => acc + p.mem, 0);

  // Identify Runaway Candidate (Highest CPU or memory load)
  const runawayCandidate = processes.reduce<SystemProcess | null>((runaway, current) => {
    if (!runaway) return current;
    // Prioritize CPU usage, then memory
    if (current.cpu > runaway.cpu) return current;
    if (current.cpu === runaway.cpu && current.mem > runaway.mem) return current;
    return runaway;
  }, null);

  // Filter & Sort
  const sortedAndFilteredProcesses = processes
    .filter(p => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        p.name.toLowerCase().includes(query) ||
        p.pid.toString().includes(query) ||
        p.user.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query);

      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "cpu") {
        comparison = a.cpu - b.cpu;
      } else if (sortBy === "mem") {
        comparison = a.mem - b.mem;
      } else if (sortBy === "pid") {
        comparison = a.pid - b.pid;
      } else if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });

  const toggleSort = (field: "cpu" | "mem" | "pid" | "name") => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc"); // Default to desc for metrics
    }
  };

  return (
    <div className="space-y-6">
      {/* Runaway Feedback Notification */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl border flex items-start gap-3 text-xs font-sans ${
              actionFeedback.type === "success" 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0" />
            )}
            <div className="flex-1">
              <span className="font-bold uppercase tracking-wider block mb-0.5">
                {actionFeedback.type === "success" ? "SIGKILL EXECUTED" : "KILL FAILED"}
              </span>
              <p className="font-mono">{actionFeedback.message}</p>
            </div>
            <button 
              onClick={() => setActionFeedback(null)} 
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer font-bold font-mono"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sentinel / Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0c121a] rounded-xl border border-white/5 p-4 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono">Processes</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-slate-100">{totalProcesses}</span>
              <span className="text-[10px] text-emerald-400 font-mono">({runningCount} running)</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0c121a] rounded-xl border border-white/5 p-4 flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/5 border border-cyan-500/10 rounded-lg text-cyan-400 shrink-0">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono">Total CPU Overhead</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-slate-100">{cumulativeCpu}%</span>
              <span className="text-[10px] text-slate-500 font-mono">system load</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0c121a] rounded-xl border border-white/5 p-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/5 border border-blue-500/10 rounded-lg text-blue-400 shrink-0">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 font-mono">Process Memory Space</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-slate-100">{cumulativeMem} MB</span>
              <span className="text-[10px] text-slate-500 font-mono">allocated RAM</span>
            </div>
          </div>
        </div>

        {/* Runaway Sentinel Highlight card */}
        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 flex items-center gap-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-1 opacity-10">
            <Skull className="h-16 w-16 text-red-500" />
          </div>
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 z-10">
            <span className="block text-[9px] uppercase tracking-wider font-bold text-red-400 font-mono">Runaway Sentinel Alert</span>
            {runawayCandidate ? (
              <div className="mt-0.5">
                <p className="text-xs font-bold text-slate-200 truncate">{runawayCandidate.name} (PID {runawayCandidate.pid})</p>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                  <span className="text-red-400 font-bold">{runawayCandidate.cpu}% CPU</span>
                  <span>•</span>
                  <span>{runawayCandidate.mem}MB Memory</span>
                </div>
              </div>
            ) : (
              <p className="text-xs font-medium text-slate-400 mt-1">All subsystems stable</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Container Header with Action & CSV Export */}
      <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <h3 className="font-sans font-bold text-sm tracking-wide text-slate-100 uppercase">Process Task Explorer</h3>
          </div>
          <p className="text-xs text-slate-400 font-sans">
            Inspect real-time kernel allocations, active threads, and terminate runaway processes impacting MintCare companion stability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
            id="export-tasks-csv"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          
          <button
            onClick={fetchProcesses}
            disabled={loading}
            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 disabled:opacity-30 cursor-pointer transition-all"
            title="Refresh Process List"
            id="refresh-tasks"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Interactive Controls Panel */}
      <div className="bg-[#0c121a] rounded-xl border border-white/5 p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search processes by PID, Name, User, or Category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#05070a] border border-emerald-900/20 hover:border-emerald-500/20 focus:border-emerald-500 rounded-lg text-xs text-slate-200 outline-none transition-all placeholder:text-slate-600 font-mono"
            id="task-explorer-search"
          />
        </div>

        {/* Filter Categories */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono mr-1">Category:</span>
          {(["all", "system", "cinnamon", "application", "network", "service"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider font-bold border transition-all cursor-pointer ${
                categoryFilter === cat
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                  : "bg-[#05070a] text-slate-400 border-white/5 hover:bg-white/5 hover:text-slate-200"
              }`}
              id={`filter-cat-${cat}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Confirmation Modal overlay (safety) */}
      <AnimatePresence>
        {confirmingPid !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c121a] border border-red-500/30 max-w-md w-full rounded-xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-4"
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="h-6 w-6" />
                <h4 className="font-sans font-bold text-sm tracking-wide uppercase">Force Kill Administrative Warning</h4>
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                You are about to send a <span className="font-mono text-red-400 font-bold">SIGKILL (9)</span> signal to 
                <span className="font-mono bg-[#05070a] px-1.5 py-0.5 rounded text-emerald-400 mx-1 font-bold">
                  {processes.find(p => p.pid === confirmingPid)?.name}
                </span> 
                (PID: <span className="font-mono text-slate-100 font-bold">{confirmingPid}</span>). 
                This immediately terminates the process thread without saving outstanding states or caches. Runaway termination is recommended only if the process is unresponsive.
              </p>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setConfirmingPid(null)}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-white/5"
                >
                  Cancel Operation
                </button>
                <button
                  onClick={() => handleKillProcess(confirmingPid)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-slate-100 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-[0_4px_12px_rgba(220,38,38,0.2)]"
                  id="confirm-kill-btn"
                >
                  <Skull className="h-3.5 w-3.5" />
                  Execute SIGKILL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Processes Table & Grid */}
      <div className="bg-[#0c121a] rounded-xl border border-white/5 overflow-hidden">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-[#05070a] border-b border-white/5 text-slate-500 font-mono text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4 font-bold cursor-pointer hover:text-slate-200 select-none" onClick={() => toggleSort("pid")}>
                  PID {sortBy === "pid" ? (sortOrder === "desc" ? "▼" : "▲") : ""}
                </th>
                <th className="py-3 px-4 font-bold cursor-pointer hover:text-slate-200 select-none" onClick={() => toggleSort("name")}>
                  Process Name {sortBy === "name" ? (sortOrder === "desc" ? "▼" : "▲") : ""}
                </th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold">User</th>
                <th className="py-3 px-4 font-bold cursor-pointer hover:text-slate-200 select-none" onClick={() => toggleSort("cpu")}>
                  CPU overhead {sortBy === "cpu" ? (sortOrder === "desc" ? "▼" : "▲") : ""}
                </th>
                <th className="py-3 px-4 font-bold cursor-pointer hover:text-slate-200 select-none" onClick={() => toggleSort("mem")}>
                  Memory overhead {sortBy === "mem" ? (sortOrder === "desc" ? "▼" : "▲") : ""}
                </th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedAndFilteredProcesses.length > 0 ? (
                sortedAndFilteredProcesses.map((proc) => {
                  const isRunaway = runawayCandidate?.pid === proc.pid && proc.cpu > 5;
                  return (
                    <tr 
                      key={proc.pid} 
                      className={`hover:bg-white/[0.02] transition-colors group ${
                        isRunaway ? "bg-red-500/[0.02]" : ""
                      }`}
                    >
                      {/* PID */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-400">
                        {proc.pid}
                      </td>

                      {/* Process Name */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span>{proc.name}</span>
                          {isRunaway && (
                            <span className="text-[8px] uppercase tracking-wider font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-1 py-0.2 rounded-sm" title="High CPU usage detected by sentinel">
                              Runaway
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block text-[9px] font-mono uppercase px-2 py-0.5 rounded-md font-bold ${
                          proc.category === "system" ? "bg-slate-500/10 text-slate-400 border border-slate-500/20" :
                          proc.category === "cinnamon" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          proc.category === "application" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                          proc.category === "network" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                          "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {proc.category}
                        </span>
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {proc.user}
                      </td>

                      {/* CPU */}
                      <td className="py-3.5 px-4">
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between font-mono text-[10px]">
                            <span className={`font-bold ${proc.cpu > 10 ? 'text-red-400' : 'text-slate-300'}`}>{proc.cpu}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#05070a] rounded-full overflow-hidden border border-white/5">
                            <div 
                              className={`h-full rounded-full ${
                                proc.cpu > 10 ? "bg-red-500" : proc.cpu > 3 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(proc.cpu * 4, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Memory */}
                      <td className="py-3.5 px-4">
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between font-mono text-[10px]">
                            <span className="font-semibold text-slate-300">{proc.mem} MB</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#05070a] rounded-full overflow-hidden border border-white/5">
                            <div 
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${Math.min((proc.mem / 1024) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 font-mono text-[10px]">
                        <div className="flex items-center gap-1.5 uppercase font-bold">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            proc.status === 'running' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' :
                            proc.status === 'sleeping' ? 'bg-slate-500' :
                            'bg-amber-500'
                          }`}></span>
                          <span className={proc.status === 'running' ? 'text-emerald-400' : 'text-slate-400'}>{proc.status}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onAskAI && (
                            <button
                              onClick={() => handleAskAIAboutProcess(proc)}
                              className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Analyze Process with AI"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmingPid(proc.pid)}
                            className="p-1 bg-red-500/5 hover:bg-red-500/20 text-red-400 border border-red-900/20 hover:border-red-500/30 rounded-lg transition-colors cursor-pointer"
                            title="Force Kill Process"
                            id={`kill-btn-${proc.pid}`}
                          >
                            <Skull className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                    <Info className="h-6 w-6 text-slate-600 mx-auto mb-2" />
                    No processes found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card Grid */}
        <div className="block md:hidden divide-y divide-white/5">
          {sortedAndFilteredProcesses.length > 0 ? (
            sortedAndFilteredProcesses.map((proc) => {
              const isRunaway = runawayCandidate?.pid === proc.pid && proc.cpu > 5;
              return (
                <div 
                  key={proc.pid} 
                  className={`p-4 space-y-3 ${
                    isRunaway ? "bg-red-500/[0.02]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-200">{proc.name}</span>
                        <span className="text-[9px] font-mono text-slate-500">({proc.pid})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-slate-500">{proc.user}</span>
                        <span className="text-slate-600 text-[9px] font-mono">•</span>
                        <span className="text-[9px] font-mono uppercase text-slate-400">{proc.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {onAskAI && (
                        <button
                          onClick={() => handleAskAIAboutProcess(proc)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg cursor-pointer"
                          title="Analyze Process"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmingPid(proc.pid)}
                        className="p-1.5 bg-red-500/5 text-red-400 border border-red-900/20 rounded-lg cursor-pointer"
                        title="Force Kill Process"
                      >
                        <Skull className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Resource meters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[10px] text-slate-400">
                        <span>CPU Overhead</span>
                        <span className={`font-bold ${proc.cpu > 10 ? 'text-red-400' : 'text-slate-300'}`}>{proc.cpu}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#05070a] rounded-full overflow-hidden border border-white/5">
                        <div 
                          className={`h-full rounded-full ${
                            proc.cpu > 10 ? "bg-red-500" : proc.cpu > 3 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(proc.cpu * 4, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[10px] text-slate-400">
                        <span>Memory Load</span>
                        <span className="font-semibold text-slate-300">{proc.mem} MB</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#05070a] rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${Math.min((proc.mem / 1024) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <div className="flex items-center gap-1.5 uppercase font-bold">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        proc.status === 'running' ? 'bg-emerald-500' : 'bg-slate-500'
                      }`}></span>
                      <span>{proc.status}</span>
                    </div>
                    {isRunaway && (
                      <span className="text-[9px] uppercase tracking-wider font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.2 rounded-sm animate-pulse">
                        Runaway Alert
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              <Info className="h-6 w-6 text-slate-600 mx-auto mb-2" />
              No processes found matching your criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
