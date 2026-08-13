import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  Folder, 
  PieChart as ChartIcon, 
  Grid, 
  CheckSquare, 
  Square, 
  HardDrive, 
  Sparkles, 
  AlertTriangle 
} from "lucide-react";
import { CleanupItem } from "../types";

interface DiskSpaceChartProps {
  items: CleanupItem[];
  checkedIds: string[];
  onToggleItem: (id: string) => void;
}

// Map categories to physical directory paths commonly cleaned in Linux Mint
const ITEM_DIRECTORIES: Record<string, string> = {
  "apt-cache": "/var/cache/apt/archives",
  "apt-orphans": "/var/lib/apt/lists",
  "journald-logs": "/var/log/journal",
  "flatpak-unused": "/var/lib/flatpak",
  "thumbnails-cache": "~/.cache/thumbnails",
  "browser-cache": "~/.cache/mozilla/firefox",
  "tmp-files": "/tmp",
  "user-trash": "~/.local/share/Trash"
};

// Colors for categories
const CATEGORY_COLORS: Record<string, { bar: string; border: string; bg: string; text: string }> = {
  apt: { 
    bar: "#3b82f6", 
    border: "border-blue-500/20", 
    bg: "bg-blue-500/5", 
    text: "text-blue-400" 
  },
  logs: { 
    bar: "#f59e0b", 
    border: "border-amber-500/20", 
    bg: "bg-amber-500/5", 
    text: "text-amber-400" 
  },
  flatpak: { 
    bar: "#ec4899", 
    border: "border-pink-500/20", 
    bg: "bg-pink-500/5", 
    text: "text-pink-400" 
  },
  cache: { 
    bar: "#8b5cf6", 
    border: "border-violet-500/20", 
    bg: "bg-violet-500/5", 
    text: "text-violet-400" 
  },
  tmp: { 
    bar: "#10b981", 
    border: "border-emerald-500/20", 
    bg: "bg-emerald-500/5", 
    text: "text-emerald-400" 
  }
};

export default function DiskSpaceChart({ items, checkedIds, onToggleItem }: DiskSpaceChartProps) {
  const [viewMode, setViewMode] = useState<"baobab" | "bar">("baobab");

  // Prepare data for Recharts & Baobab Tree Layout
  const chartData = items.map(item => {
    const isChecked = checkedIds.includes(item.id);
    const directory = ITEM_DIRECTORIES[item.id] || "/";
    const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.tmp;
    
    return {
      id: item.id,
      name: item.name,
      shortName: item.name.replace("Cinnamon Desktop ", "").replace("Mozilla Firefox ", "").replace("System ", ""),
      value: item.estimatedSizeMB,
      directory,
      category: item.category,
      isChecked,
      colors,
      raw: item
    };
  }).sort((a, b) => b.value - a.value);

  const totalSize = chartData.reduce((sum, d) => sum + d.value, 0);
  const selectedSize = chartData.filter(d => d.isChecked).reduce((sum, d) => sum + d.value, 0);

  // Custom Tooltip for Recharts horizontal bar chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#05070a]/95 border border-white/10 p-3 rounded-lg shadow-xl font-sans text-xs space-y-1">
          <p className="font-bold text-slate-100">{data.name}</p>
          <p className="text-[11px] font-mono text-emerald-400">{data.directory}</p>
          <div className="flex items-center justify-between gap-6 text-[10px] text-slate-400 pt-1 border-t border-white/5 font-mono">
            <span>FOOTPRINT:</span>
            <span className="font-bold text-slate-200">{data.value} MB</span>
          </div>
          <div className="text-[9px] text-slate-500 italic mt-0.5">
            {data.isChecked ? "✓ Scheduled for removal" : "Click segment to include in cleanup"}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#0c121a] rounded-xl border border-white/5 p-5 shadow-md space-y-5">
      
      {/* Header and Controller Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <HardDrive className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-sm tracking-wide text-slate-100">Disk Space Allocation Analyzer</h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">Physical distribution of waste sectors on root partition.</p>
          </div>
        </div>

        {/* View mode buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-center bg-[#05070a] border border-white/5 p-1 rounded-lg">
          <button
            onClick={() => setViewMode("baobab")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "baobab"
                ? "bg-emerald-600 text-black shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Grid className="h-3.5 w-3.5" />
            Baobab Tree Grid
          </button>
          <button
            onClick={() => setViewMode("bar")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "bar"
                ? "bg-emerald-600 text-black shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <ChartIcon className="h-3.5 w-3.5" />
            Bar Chart
          </button>
        </div>
      </div>

      {/* Disk Space Allocation Summary Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span>MAPPED TARGET POOL:</span>
            <span className="font-bold text-slate-200">{(totalSize / 1024).toFixed(2)} GB ({totalSize} MB)</span>
          </span>
          <span className="flex items-center gap-1">
            <span>SELECTED FOR REMOVAL:</span>
            <span className={`font-bold ${selectedSize > 0 ? "text-emerald-400" : "text-slate-500"}`}>
              {(selectedSize / 1024).toFixed(2)} GB ({selectedSize} MB)
            </span>
          </span>
        </div>
        
        {/* Visual composite progress line */}
        <div className="h-3 bg-[#030508] rounded-full overflow-hidden flex border border-white/5">
          {chartData.map((data) => {
            const widthPct = (data.value / totalSize) * 100;
            return (
              <div
                key={data.id}
                style={{ width: `${widthPct}%` }}
                onClick={() => onToggleItem(data.id)}
                className={`h-full transition-all relative group cursor-pointer border-r border-black/20`}
                title={`${data.name}: ${data.value} MB`}
              >
                <div 
                  className="h-full w-full opacity-70 group-hover:opacity-100 transition-all"
                  style={{ backgroundColor: data.colors.bar }}
                />
                
                {/* Visual indicator showing scheduled state */}
                {data.isChecked && (
                  <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main visualization frame */}
      <div className="min-h-[220px] bg-[#05070a]/40 rounded-xl border border-white/5 p-4 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {viewMode === "baobab" ? (
            
            /* --- BAOBAB-STYLE PROPORTIONAL GRID MAP --- */
            <motion.div
              key="baobab-grid"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
            >
              {chartData.map((data) => {
                const proportionOfTotal = (data.value / totalSize) * 100;
                
                return (
                  <div
                    key={data.id}
                    onClick={() => onToggleItem(data.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-3 relative overflow-hidden group select-none ${
                      data.colors.bg
                    } ${
                      data.isChecked
                        ? "border-emerald-500/30 ring-1 ring-emerald-500/10"
                        : "border-white/5 hover:border-emerald-500/20"
                    }`}
                  >
                    {/* Top block */}
                    <div className="space-y-1 relative z-10">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Folder className={`h-3.5 w-3.5 shrink-0 ${data.colors.text}`} />
                          <h4 className="font-sans font-bold text-xs text-slate-200 truncate group-hover:text-emerald-400 transition-colors">
                            {data.shortName}
                          </h4>
                        </div>
                        
                        <div className="shrink-0">
                          {data.isChecked ? (
                            <CheckSquare className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-600" />
                          )}
                        </div>
                      </div>
                      
                      <code className="block font-mono text-[9px] text-slate-500 truncate" title={data.directory}>
                        {data.directory}
                      </code>
                    </div>

                    {/* Bottom metric details */}
                    <div className="flex items-end justify-between gap-2 pt-1 border-t border-white/5 relative z-10">
                      <div className="font-mono text-[10px]">
                        <span className="text-slate-500">SECTOR SIZE:</span>
                        <span className="text-slate-200 font-bold ml-1.5">{data.value} MB</span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {proportionOfTotal.toFixed(1)}%
                      </div>
                    </div>

                    {/* Proportional absolute background gauge bar */}
                    <div 
                      className="absolute bottom-0 left-0 h-1 transition-all" 
                      style={{ 
                        width: `${proportionOfTotal}%`, 
                        backgroundColor: data.colors.bar,
                        opacity: data.isChecked ? 0.8 : 0.35 
                      }}
                    />
                  </div>
                );
              })}
            </motion.div>

          ) : (
            
            /* --- RECHARTS DYNAMIC HORIZONTAL BAR CHART --- */
            <motion.div
              key="recharts-bar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-64 font-mono text-xs"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: 20, bottom: 5 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload[0]) {
                      const clickedId = state.activePayload[0].payload.id;
                      onToggleItem(clickedId);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    stroke="#475569" 
                    fontSize={9}
                    tickFormatter={(v) => `${v}MB`}
                  />
                  <YAxis 
                    dataKey="shortName" 
                    type="category" 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    width={95}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                    cursor="pointer"
                  >
                    {chartData.map((entry, index) => {
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.colors.bar}
                          fillOpacity={entry.isChecked ? 1 : 0.45}
                          stroke={entry.colors.bar}
                          strokeWidth={entry.isChecked ? 1.5 : 0}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-slate-500 font-sans text-center mt-2 select-none">
                Interactive Chart: Click any vertical item name or bar cell to toggle the folder selection.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
