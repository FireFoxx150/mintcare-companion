import React, { useState, useEffect } from "react";
import { 
  Server, 
  Terminal, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldCheck, 
  Cpu, 
  HardDrive, 
  Activity, 
  X, 
  Zap, 
  Radio, 
  Sliders, 
  Layers, 
  AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SystemDataConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshStats: () => void;
}

export default function SystemDataConnectorModal({ isOpen, onClose, onRefreshStats }: SystemDataConnectorModalProps) {
  const [sourceInfo, setSourceInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSourceInfo = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/system/data-source");
      if (res.ok) {
        const data = await res.json();
        setSourceInfo(data);
      } else {
        const text = await res.text().catch(() => `HTTP ${res.status}`);
        setFetchError(`Server returned ${res.status}: ${text.slice(0, 120)}`);
      }
    } catch (err: any) {
      setFetchError(`Network error — is the backend running? (${err?.message ?? err})`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSourceInfo();
      const interval = setInterval(fetchSourceInfo, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const agentCommand = `curl -sSL ${window.location.origin}/api/system/agent/script | bash`;

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(agentCommand);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 3000);
  };

  // POST an action to an endpoint, always including the action name in the body
  const handleTriggerAction = async (
    actionEndpoint: string,
    label: string,
    body?: Record<string, string>
  ) => {
    try {
      setActionMessage({ type: "success", text: `Running: ${label}…` });
      const res = await fetch(actionEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: data.message || `${label} completed.` });
        onRefreshStats();
      } else {
        setActionMessage({ type: "error", text: data.error || `${label} failed (${res.status}).` });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: `Network error: ${err?.message ?? err}` });
    }
    setTimeout(() => setActionMessage(null), 6000);
  };

  // Purge both thumbnail cache AND trash in sequence
  const handlePurgeCachesAndTrash = async () => {
    setActionMessage({ type: "success", text: "Purging thumbnail cache and trash…" });
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/system/quick-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "clear-thumbnails" }),
        }),
        fetch("/api/system/quick-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "empty-recycle" }),
        }),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      if (r1.ok && r2.ok) {
        setActionMessage({ type: "success", text: `${d1.message} | ${d2.message}` });
        onRefreshStats();
      } else {
        setActionMessage({ type: "error", text: d1.error || d2.error || "Purge failed." });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: `Network error: ${err?.message ?? err}` });
    }
    setTimeout(() => setActionMessage(null), 6000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-3xl bg-[#080c12] border border-emerald-900/40 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-emerald-900/30 flex items-center justify-between bg-[#0b1018]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-emerald-300 font-sans tracking-tight">Linux Mint System Data Connector</h2>
                <p className="text-xs text-slate-400 font-mono">Connect your actual machine data & trigger live administrative changes</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto font-sans text-sm">
            
            {/* Fetch error banner */}
            {fetchError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-mono flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{fetchError}</span>
              </div>
            )}

            {/* Status Banner */}
            <div className={`p-4 rounded-xl border flex items-start gap-4 ${
              sourceInfo?.mode === "native" 
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                : sourceInfo?.mode === "agent"
                ? "bg-cyan-950/40 border-cyan-500/40 text-cyan-200"
                : "bg-amber-950/30 border-amber-500/30 text-amber-200"
            }`}>
              <div className={`p-2 rounded-lg mt-0.5 ${
                sourceInfo?.mode === "native" ? "bg-emerald-500 text-black" : sourceInfo?.mode === "agent" ? "bg-cyan-500 text-black" : "bg-amber-500 text-black"
              }`}>
                {sourceInfo?.mode === "native" ? <Server className="w-5 h-5" /> : sourceInfo?.mode === "agent" ? <Radio className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base font-mono">
                    {sourceInfo?.mode === "native" && "🟢 Running Directly on Native Linux Mint Machine"}
                    {sourceInfo?.mode === "agent" && `📡 Connected to Real Linux Mint Host via Agent (${sourceInfo?.agentLastSeenSec}s ago)`}
                    {sourceInfo?.mode === "sandbox" && "🧪 Container Sandbox Mode (Simulation Fallback)"}
                  </h3>
                  <button 
                    onClick={fetchSourceInfo} 
                    className="text-xs flex items-center gap-1 text-slate-400 hover:text-white underline font-mono"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {sourceInfo?.mode === "native" && "All diagnostics, temperatures, memory usage, and package updates are being read directly from your system kernel and sysfs."}
                  {sourceInfo?.mode === "agent" && "Real-time telemetry and hardware sensor feeds are streaming directly from your connected Linux Mint computer."}
                  {sourceInfo?.mode === "sandbox" && "You are viewing the dashboard in a sandboxed web container. Run the 1-click agent script below on your Linux Mint system to feed live host data and execute real changes!"}
                </p>
              </div>
            </div>

            {/* Machine Specs Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 bg-[#0c121e] border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">OS Version</span>
                <p className="text-emerald-300 font-bold truncate">{sourceInfo?.detectedMintName || "Linux Mint"}</p>
              </div>
              <div className="p-3 bg-[#0c121e] border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Kernel</span>
                <p className="text-slate-200 font-semibold truncate">{sourceInfo?.kernel || "Kernel 6.x"}</p>
              </div>
              <div className="p-3 bg-[#0c121e] border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Hostname</span>
                <p className="text-slate-200 font-semibold truncate">{sourceInfo?.hostname || "localhost"}</p>
              </div>
              <div className="p-3 bg-[#0c121e] border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">System RAM</span>
                <p className="text-slate-200 font-semibold truncate">{sourceInfo?.ramGb ? `${sourceInfo.ramGb} GB` : "16 GB"}</p>
              </div>
            </div>

            {/* 1-Click Agent Setup Command Block */}
            <div className="p-5 bg-[#0b121d] border border-emerald-900/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-emerald-200 text-sm font-sans">1-Click Linux Mint System Connector Command</h4>
                </div>
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                  Zero Dependencies
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Run this command in a terminal on your Linux Mint computer (<kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-emerald-300 font-mono">Ctrl+Alt+T</kbd>). It streams real hardware thermals, processes, updates, and timeshift snapshots directly into this portal.
              </p>

              <div className="relative group">
                <div className="p-3 bg-[#05080e] border border-emerald-900/60 rounded-lg font-mono text-xs text-emerald-300 break-all select-all flex items-center justify-between gap-2 shadow-inner">
                  <span>{agentCommand}</span>
                  <button
                    onClick={handleCopyCommand}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
                  >
                    {copiedCommand ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCommand ? "Copied!" : "Copy Command"}
                  </button>
                </div>
              </div>
            </div>

            {/* Real System Administrative Controls */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-200 text-sm font-sans flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Trigger Live Administrative Changes
              </h4>
              <p className="text-xs text-slate-400 font-sans">
                Execute real system management commands on your Linux Mint machine:
              </p>

              {actionMessage && (
                <div className={`p-3 rounded-lg text-xs font-mono border ${
                  actionMessage.type === "success" ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300" : "bg-red-950/60 border-red-500/40 text-red-300"
                }`}>
                  {actionMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans text-xs">
                <button
                  onClick={() => handleTriggerAction("/api/system/quick-action", "Flush Linux Memory Caches", { action: "flush-ram" })}
                  className="p-3 bg-[#0d1422] hover:bg-[#121c30] border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-200 group-hover:text-emerald-300">Flush Linux Memory Caches</div>
                    <div className="text-[10px] text-slate-400 font-mono">Runs 'sync && drop_caches=3'</div>
                  </div>
                  <Zap className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                </button>

                <button
                  onClick={() => handleTriggerAction("/api/system/package-audit/update-apt", "APT System Upgrade")}
                  className="p-3 bg-[#0d1422] hover:bg-[#121c30] border border-slate-800 hover:border-cyan-500/40 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-200 group-hover:text-cyan-300">Trigger APT Package Upgrades</div>
                    <div className="text-[10px] text-slate-400 font-mono">Runs 'apt-get update && upgrade'</div>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                </button>

                <button
                  onClick={handlePurgeCachesAndTrash}
                  className="p-3 bg-[#0d1422] hover:bg-[#121c30] border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-200 group-hover:text-amber-300">Purge Thumbnail & Trash</div>
                    <div className="text-[10px] text-slate-400 font-mono">Cleans ~/.cache/thumbnails & Trash</div>
                  </div>
                  <HardDrive className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                </button>

                <button
                  onClick={() => handleTriggerAction("/api/system/package-audit/update-flatpak", "Flatpak System Upgrade")}
                  className="p-3 bg-[#0d1422] hover:bg-[#121c30] border border-slate-800 hover:border-purple-500/40 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-200 group-hover:text-purple-300">Update Flatpak Applications</div>
                    <div className="text-[10px] text-slate-400 font-mono">Runs 'flatpak update -y'</div>
                  </div>
                  <Layers className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-emerald-900/30 bg-[#0b1018] flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">MintCare Direct Machine Synchronization</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg text-xs transition-all cursor-pointer"
            >
              Close & Return to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
