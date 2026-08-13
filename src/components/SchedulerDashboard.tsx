import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ToggleLeft, 
  ToggleRight,
  RefreshCw,
  Sliders,
  Terminal,
  X,
  Search
} from "lucide-react";
import { MaintenanceTask, TaskCategory } from "../types";

export default function SchedulerDashboard() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled" | "success" | "failed">("all");

  // Form states
  const [name, setName] = useState("");
  const [cron, setCron] = useState("Daily at midnight");
  const [command, setCommand] = useState("");
  const [category, setCategory] = useState<TaskCategory>("cleanup");

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scheduler/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Failed to load scheduler tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggleTask = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/scheduler/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled })
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setTasks(tasks.map(t => t.id === id ? updatedTask : t));
      }
    } catch (err) {
      console.error("Failed to toggle task status:", err);
    }
  };

  const handleRunTaskManually = async (id: string) => {
    // Optimistic status update could go here
    try {
      const res = await fetch(`/api/scheduler/run/${id}`, {
        method: "POST"
      });
      if (res.ok) {
        const result = await res.json();
        // Update local tasks
        setTasks(tasks.map(t => t.id === id ? result.task : t));
        // Expand the logs instantly to show run result
        setExpandedTaskId(id);
      }
    } catch (err) {
      console.error("Failed to execute task manually:", err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/scheduler/tasks/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setTasks(tasks.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !command) return;

    try {
      const res = await fetch("/api/scheduler/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cron, command, category })
      });
      if (res.ok) {
        const newTask = await res.json();
        setTasks([...tasks, newTask]);
        setAddingTask(false);
        // Reset fields
        setName("");
        setCommand("");
        setCron("Daily at midnight");
        setCategory("cleanup");
      }
    } catch (err) {
      console.error("Failed to add task:", err);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + d.toLocaleDateString();
  };

  const filteredTasks = tasks.filter((task) => {
    const query = searchQuery.toLowerCase().trim();
    
    // Match search query with name, cron (frequency), command, or category
    const matchesQuery = !query || 
      task.name.toLowerCase().includes(query) ||
      task.cron.toLowerCase().includes(query) ||
      task.command.toLowerCase().includes(query) ||
      task.category.toLowerCase().includes(query);

    // Match status filter (enabled, disabled, success, failed)
    let matchesStatus = true;
    if (statusFilter === "enabled") {
      matchesStatus = task.enabled;
    } else if (statusFilter === "disabled") {
      matchesStatus = !task.enabled;
    } else if (statusFilter === "success") {
      matchesStatus = task.logs && task.logs[0]?.status === "success";
    } else if (statusFilter === "failed") {
      matchesStatus = task.logs && task.logs[0]?.status === "failed";
    }

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Upper header action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0c121a] p-5 rounded-xl border border-emerald-900/20 shadow-md">
        <div>
          <h2 className="font-sans font-bold text-slate-100 text-base">Automated Maintenance Scheduler</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Configure system cron logs, packages auto-updates, and network speed audits.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setAddingTask(true)}
            className="flex-1 sm:flex-initial py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
            id="open-add-task-btn"
          >
            <Plus className="h-4 w-4" />
            Add Custom Task
          </button>
        </div>
      </div>

      {/* Add Custom Task Overlay form (animated) */}
      <AnimatePresence>
        {addingTask && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0c121a] rounded-xl border border-emerald-900/40 max-w-lg w-full overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between bg-[#080c12] px-5 py-4 border-b border-emerald-900/20">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-emerald-400" />
                  <h3 className="font-sans font-bold text-slate-100 text-sm">Add Maintenance Task</h3>
                </div>
                <button 
                  onClick={() => setAddingTask(false)}
                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="p-5 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Task Description / Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Audit package system orphans"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#05070a] border border-emerald-900/20 hover:border-emerald-500/20 focus:border-emerald-500 rounded-lg p-2.5 outline-none transition-all placeholder:text-slate-700 text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Schedule Interval</label>
                    <select
                      value={cron}
                      onChange={(e) => setCron(e.target.value)}
                      className="w-full bg-[#05070a] border border-emerald-900/20 hover:border-emerald-500/20 focus:border-emerald-500 rounded-lg p-2.5 outline-none transition-all text-slate-300"
                    >
                      <option value="Daily at midnight" className="bg-[#0c121a] text-slate-300">Daily at midnight</option>
                      <option value="Every 4 hours" className="bg-[#0c121a] text-slate-300">Every 4 hours</option>
                      <option value="Weekly on Wednesday" className="bg-[#0c121a] text-slate-300">Weekly on Wednesday</option>
                      <option value="Every Sunday at 3:00 AM" className="bg-[#0c121a] text-slate-300">Every Sunday at 3:00 AM</option>
                      <option value="Every 1st of the month" className="bg-[#0c121a] text-slate-300">Every 1st of the month</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as TaskCategory)}
                      className="w-full bg-[#05070a] border border-emerald-900/20 hover:border-emerald-500/20 focus:border-emerald-500 rounded-lg p-2.5 outline-none transition-all capitalize text-slate-300"
                    >
                      <option value="cleanup" className="bg-[#0c121a] text-slate-300">Cleanup</option>
                      <option value="diagnostic" className="bg-[#0c121a] text-slate-300">Diagnostic</option>
                      <option value="update" className="bg-[#0c121a] text-slate-300">Update</option>
                      <option value="security" className="bg-[#0c121a] text-slate-300">Security</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Shell CLI Command</label>
                  <textarea
                    required
                    placeholder="e.g. sudo apt-get autoremove"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    rows={3}
                    className="w-full bg-[#05070a] border border-emerald-900/20 hover:border-emerald-500/20 focus:border-emerald-500 rounded-lg p-2.5 outline-none transition-all placeholder:text-slate-700 font-mono text-[11px] text-emerald-400"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddingTask(false)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-semibold rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                    id="submit-new-task-btn"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filters */}
      <div className="bg-[#0c121a] rounded-xl border border-white/5 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search tasks by name, frequency (e.g. daily, hourly), or command..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-[#05070a] border border-emerald-900/20 hover:border-emerald-500/20 focus:border-emerald-500 rounded-lg text-xs text-slate-200 outline-none transition-all placeholder:text-slate-600"
            id="scheduler-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono mr-1">Status:</span>
          {(["all", "enabled", "disabled", "success", "failed"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider font-bold border transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                  : "bg-[#05070a] text-slate-400 border-white/5 hover:bg-white/5 hover:text-slate-200"
              }`}
              id={`filter-status-${status}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards List */}
      {loading && tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#0c121a] rounded-xl border border-emerald-900/10">
          <RefreshCw className="h-10 w-10 text-emerald-400 animate-spin mb-4" />
          <p className="text-sm text-slate-400 font-mono">Connecting to scheduler module...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const isExpanded = expandedTaskId === task.id;
              return (
                <motion.div
                  key={task.id}
                  layoutId={`task-card-${task.id}`}
                  className={`bg-[#0c121a] rounded-xl border transition-all overflow-hidden ${
                    task.enabled 
                      ? "border-white/5" 
                      : "border-white/5 opacity-50"
                  }`}
                >
                  {/* Main Card Header */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg shrink-0 mt-0.5 text-emerald-400">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-sans font-bold text-sm text-slate-200 truncate">{task.name}</h4>
                          <span className="text-[10px] uppercase font-bold text-emerald-400 bg-[#05070a] border border-emerald-900/20 px-1.5 py-0.5 rounded-sm capitalize">
                            {task.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-slate-500" />
                          Schedule: {task.cron}
                        </p>
                      </div>
                    </div>

                    {/* Actions Column */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleTask(task.id, task.enabled)}
                          className="p-1 text-slate-400 hover:text-emerald-400 rounded-lg cursor-pointer transition-colors"
                          title={task.enabled ? "Disable schedule" : "Enable schedule"}
                        >
                          {task.enabled ? (
                            <ToggleRight className="h-7 w-7 text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.3)]" />
                          ) : (
                            <ToggleLeft className="h-7 w-7 text-slate-600" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRunTaskManually(task.id)}
                          disabled={!task.enabled}
                          className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg border border-emerald-500/30 bg-emerald-500/5 transition-all cursor-pointer"
                          title="Trigger task now"
                          id={`run-task-${task.id}`}
                        >
                          <Play className="h-3.5 w-3.5 fill-emerald-400" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg border border-white/5 cursor-pointer transition-colors"
                          title="View logs"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-red-900/20 bg-red-500/5 cursor-pointer transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details / Run logs */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1.5 border-t border-emerald-900/10 space-y-4 bg-[#05070a]/40">
                      <div className="space-y-1.5">
                        <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Target Command</h5>
                        <code className="block bg-[#05070a] text-emerald-400 p-2.5 rounded-lg border border-emerald-900/25 font-mono text-[11px] truncate">
                          {task.command}
                        </code>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div className="bg-[#0c121a] border border-white/5 p-2.5 rounded-lg">
                          <p className="text-[9px] uppercase font-bold text-slate-500 mb-0.5">Last Successful Run</p>
                          <p className="font-semibold text-slate-300">{formatDate(task.lastRun)}</p>
                        </div>
                        <div className="bg-[#0c121a] border border-white/5 p-2.5 rounded-lg">
                          <p className="text-[9px] uppercase font-bold text-slate-500 mb-0.5">Next Scheduled Execution</p>
                          <p className="font-semibold text-slate-300">{task.enabled ? formatDate(task.nextRun) : "Disabled"}</p>
                        </div>
                      </div>

                      {/* Logs History */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-emerald-400" />
                          Run History Log
                        </h5>
                        {task.logs && task.logs.length > 0 ? (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {task.logs.map((log) => (
                              <div key={log.id} className="bg-gray-950 rounded-lg border border-emerald-900/20 text-gray-300 p-3 font-mono text-[11px] space-y-1.5">
                                <div className="flex items-center justify-between border-b border-gray-900 pb-1.5 mb-1.5">
                                  <span className="text-gray-500">{formatDate(log.timestamp)}</span>
                                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                                    log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                  }`}>
                                    {log.status === 'success' ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                                    {log.status}
                                  </span>
                                </div>
                                <pre className="whitespace-pre-wrap leading-relaxed text-gray-400">
                                  {log.output}
                                </pre>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-[#05070a] border border-emerald-900/20 p-4 rounded-lg text-center text-slate-500 text-xs">
                            No execution logs found. Trigger the task manually or wait for the cron interval.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-[#0c121a] rounded-xl border border-white/5 text-center">
              <Sliders className="h-8 w-8 text-slate-600 mb-3" />
              <p className="text-sm font-sans font-semibold text-slate-300">No scheduled tasks match your search criteria</p>
              <p className="text-xs text-slate-500 font-mono mt-1">Try resetting the status filter or clearing your search term.</p>
              {(searchQuery || statusFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="mt-4 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
