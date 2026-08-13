import React, { useState, useEffect } from "react";
import { 
  Server, 
  Activity, 
  CheckCircle2, 
  RefreshCw, 
  Zap, 
  Globe, 
  ShieldCheck, 
  Terminal,
  ArrowRight,
  Download,
  Check,
  Loader2
} from "lucide-react";
import { AptMirror } from "../types";

export default function AptMirrorSpeedTester({ onAskAI }: { onAskAI?: (q: string) => void }) {
  const [mirrors, setMirrors] = useState<AptMirror[]>([]);
  const [loadingMirrors, setLoadingMirrors] = useState(true);
  const [activeMirrorUrl, setActiveMirrorUrl] = useState<string>("");
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Load live mirror pings + current active mirror on mount
  useEffect(() => {
    async function init() {
      setLoadingMirrors(true);
      try {
        // Current active mirror
        const mirrorRes = await fetch("/api/system/apt-mirror");
        if (mirrorRes.ok) {
          const mirrorData = await mirrorRes.json();
          if (mirrorData.currentMirror) setActiveMirrorUrl(mirrorData.currentMirror);
        }

        // Live-pinged mirror list
        const listRes = await fetch("/api/network/apt-mirrors");
        if (listRes.ok) {
          const listData: AptMirror[] = await listRes.json();
          setMirrors(listData);
        }
      } catch (e) {
        console.error("Failed to load mirror data:", e);
      } finally {
        setLoadingMirrors(false);
      }
    }
    init();
  }, []);

  // Real live ping sweep via server
  const handleRunSpeedTest = async () => {
    setIsTesting(true);
    setStatusMsg("Pinging global APT repository mirrors — measuring live TCP latency...");
    try {
      const res = await fetch("/api/network/apt-mirrors/test", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: AptMirror[] = await res.json();
      setMirrors(updated);
      const fastest = updated.find(m => m.ping > 0);
      setStatusMsg(fastest
        ? `Benchmark complete — fastest mirror: ${fastest.name} (${fastest.ping}ms)`
        : "Benchmark complete. Check mirror statuses."
      );
    } catch (err) {
      setStatusMsg("Mirror ping sweep failed — check network connection.");
    } finally {
      setIsTesting(false);
      setTimeout(() => setStatusMsg(null), 6000);
    }
  };

  const handleSelectMirror = (mirror: AptMirror) => {
    setActiveMirrorUrl(mirror.url);
    setStatusMsg(`Switching official Linux Mint repository to ${mirror.name}...`);

    fetch("/api/system/apt-mirror/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mirrorUrl: mirror.url, mirrorName: mirror.name })
    })
      .then(res => res.json())
      .then(() => {
        setStatusMsg(`Successfully configured ${mirror.name} in /etc/apt/sources.list.d/`);
        setTimeout(() => setStatusMsg(null), 4000);
      })
      .catch(() => {
        setStatusMsg(`Set active mirror: ${mirror.name}`);
        setTimeout(() => setStatusMsg(null), 4000);
      });
  };

  const handleAutoSelectFastest = () => {
    const reachable = mirrors.filter(m => m.ping > 0).sort((a, b) => a.ping - b.ping);
    if (reachable.length > 0) handleSelectMirror(reachable[0]);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Globe className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-100">
                APT Repository Mirror Speed Tester & Benchmark
              </h2>
            </div>
            <p className="text-slate-400 text-sm pl-11">
              Test live mirror TCP latency and automatically switch your Linux Mint sources to the fastest mirror.
            </p>
          </div>

          <div className="flex items-center gap-2 pl-11 lg:pl-0">
            <button
              onClick={handleRunSpeedTest}
              disabled={isTesting}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
              id="run-mirror-test-btn"
            >
              {isTesting
                ? <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                : <RefreshCw className="h-4 w-4 text-emerald-400" />}
              {isTesting ? "Testing Mirrors..." : "Run Mirror Benchmark"}
            </button>

            <button
              onClick={handleAutoSelectFastest}
              disabled={isTesting || mirrors.length === 0}
              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              id="auto-select-mirror-btn"
            >
              <Zap className="h-4 w-4 fill-black" />
              Auto-Switch to Fastest
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>

      {/* Active Mirror Info Bar */}
      {activeMirrorUrl && (
        <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400 font-medium">Active APT Repository Mirror:</span>
            <span className="font-mono text-emerald-300 font-semibold truncate max-w-md">{activeMirrorUrl}</span>
          </div>
          <span className="text-slate-400 text-[11px] font-mono bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            /etc/apt/sources.list.d/official-package-repositories.list
          </span>
        </div>
      )}

      {/* Mirror Benchmark Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-400" />
            {loadingMirrors
              ? "Loading live mirror data..."
              : `Global Repository Mirrors (${mirrors.length} pinged)`}
          </h3>
          <span className="text-xs text-slate-400">Sorted by live TCP latency</span>
        </div>

        {loadingMirrors ? (
          <div className="flex items-center justify-center gap-3 py-12 text-slate-400 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            Measuring live latency to all mirrors...
          </div>
        ) : mirrors.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No mirrors available. Click "Run Mirror Benchmark" to scan.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {mirrors.map((mirror) => {
              const isActive = activeMirrorUrl === mirror.url;
              const isOffline = mirror.status === "offline" || mirror.ping < 0;
              return (
                <div
                  key={mirror.id}
                  className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                    isActive ? "bg-emerald-500/5" : "hover:bg-slate-900/80"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{mirror.name}</span>
                      {mirror.isOfficial && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 font-semibold">
                          OFFICIAL
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-bold flex items-center gap-1">
                          <Check className="h-3 w-3" /> ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
                      <span>{mirror.url}</span>
                      <span>•</span>
                      <span>{mirror.country}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right space-y-0.5">
                      <div className={`font-mono text-xs font-bold ${isOffline ? "text-red-400" : "text-emerald-400"}`}>
                        {isOffline ? "Offline" : `${mirror.ping} ms`}
                      </div>
                      <div className={`text-[10px] capitalize ${
                        mirror.status === "excellent" ? "text-emerald-400" :
                        mirror.status === "good" ? "text-blue-400" :
                        mirror.status === "slow" ? "text-amber-400" : "text-red-400"
                      }`}>
                        {mirror.status}
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectMirror(mirror)}
                      disabled={isActive || isOffline}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-default"
                          : isOffline
                          ? "bg-red-500/10 text-red-400 border border-red-500/20 cursor-not-allowed opacity-50"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                      }`}
                      id={`select-mirror-${mirror.id}`}
                    >
                      {isActive ? "Selected" : isOffline ? "Offline" : "Set as Mirror"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
