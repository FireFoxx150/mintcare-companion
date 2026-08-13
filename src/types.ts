export interface SystemStats {
  hostname: string;
  platform: string;
  arch: string;
  release: string;
  cpuModel: string;
  cpuCores: number;
  cpuUsage: number;
  totalMem: number;
  freeMem: number;
  usedMem: number;
  loadAvg: number[];
  diskTotal: number;
  diskFree: number;
  diskUsed: number;
  uptime: number;
}

export type TaskCategory = 'cleanup' | 'security' | 'diagnostic' | 'update';

export interface TaskLog {
  id: string;
  timestamp: string;
  output: string;
  status: 'success' | 'failed';
}

export interface MaintenanceTask {
  id: string;
  name: string;
  cron: string; // e.g. "0 0 * * *" or descriptive "Daily at midnight"
  lastRun?: string;
  nextRun?: string;
  enabled: boolean;
  command: string;
  category: TaskCategory;
  logs: TaskLog[];
}

export interface CleanupItem {
  id: string;
  name: string;
  description: string;
  command: string;
  safe: boolean;
  category: 'apt' | 'flatpak' | 'cache' | 'logs' | 'tmp';
  estimatedSizeMB: number;
}

export interface NetworkHost {
  id: string;
  name: string;
  host: string;
  category: 'dns' | 'gateway' | 'repository' | 'cdn' | 'search';
}

export interface NetworkMetric {
  hostId: string;
  name: string;
  host: string;
  pingMs: number | null;
  dnsMs: number | null;
  status: 'online' | 'offline' | 'checking';
  history: { timestamp: string; latency: number }[];
  packetLoss: number; // percentage
}

export interface DiagnosticResult {
  category: string;
  item: string;
  status: 'pass' | 'warning' | 'fail';
  value: string;
  remediation?: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  service: string;
  severity: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  source: string;
}

export interface SystemProcess {
  pid: number;
  name: string;
  cpu: number;
  mem: number; // in MB
  status: 'running' | 'sleeping' | 'stopped';
  user: string;
  category: 'system' | 'cinnamon' | 'application' | 'network' | 'service';
}

export interface TuningProfile {
  swappiness: number; // 0-100 (default 60)
  cinnamonLimit: number; // in MB (e.g., 1024, 512, 256)
  journalLimit: number; // in MB (e.g., 50, 100, 500)
  ufwEnabled: boolean;
  flatpakHardened: boolean;
}

export interface AuditReport {
  timestamp: string;
  stats: SystemStats;
  cleanupItems: { id: string; name: string; checked: boolean }[];
  networkMetrics: NetworkMetric[];
  diagnostics: DiagnosticResult[];
  schedulerTasks: MaintenanceTask[];
}

export interface CinnamonSpice {
  id: string;
  name: string;
  type: "applet" | "desklet" | "extension";
  version: string;
  author: string;
  cpu: number;
  mem: number; // MB
  active: boolean;
  errors: number;
  leaky: boolean;
  description: string;
}

export interface AptMirror {
  id: string;
  name: string;
  url: string;
  ping: number; // ms, -1 for offline
  status: "excellent" | "good" | "slow" | "offline";
  isOfficial: boolean;
  country: string;
}

export interface SmartDriveAttribute {
  id: number;
  name: string;
  raw: string;
  value: number;
  worst: number;
  threshold: number;
  status: "OK" | "WARNING" | "CRITICAL";
  description: string;
}

export interface SmartDriveHealth {
  device: string; // /dev/sda, /dev/nvme0n1
  model: string;
  temp: number; // celsius
  healthPercentage: number;
  wearIndicator: number; // % remaining life
  badSectors: number;
  powerOnHours: number;
  attributes: SmartDriveAttribute[];
}

export interface BackupSource {
  id: string;
  path: string;
  name: string;
  enabled: boolean;
  estimatedSizeMb: number;
}

export interface BackupSettings {
  destinationPath: string;
  schedule: "manual" | "daily" | "weekly" | "monthly";
  dryRun: boolean;
  compress: boolean;
  excludeHidden: boolean;
}

export interface BackupHistoryEntry {
  id: string;
  timestamp: string;
  status: "success" | "failed" | "running";
  copiedBytes: number; // in bytes
  copiedFilesCount: number;
  durationMs: number;
  snapshotName: string;
  isDryRun: boolean;
  logSummary: string;
  spaceUtilizedBytes?: number;
  spaceRecoveredBytes?: number;
  verified?: boolean;
  integrityScore?: number;
}

export interface CpuCoreTemp {
  id: number;
  name: string;
  temp: number;
}

export interface HardwareHealth {
  cpuTemp: {
    current: number;
    cores: CpuCoreTemp[];
    maxSafe: number;
    critical: number;
    status: 'normal' | 'warning' | 'critical';
    history: number[];
  };
  fanSpeed: {
    current: number;
    max: number;
    percent: number;
    mode: 'auto' | 'manual' | 'silent' | 'performance';
    history: number[];
  };
  battery: {
    health: number;
    charge: number;
    status: 'charging' | 'discharging' | 'full' | 'not-present';
    voltage: number;
    temp: number;
    remainingMinutes: number;
    history: number[];
    cycleCount?: number;
    capacityDegradation?: number;
    dischargeRate?: number; // Watts
  };
}

export interface PackageUpdate {
  id: string;
  name: string;
  currentVersion: string;
  newVersion: string;
  type: 'security' | 'regular';
  manager: 'apt' | 'flatpak';
  size: string;
  description: string;
}

export interface KernelUpgrade {
  currentKernel: string;
  suggestedKernel: string;
  status: 'up-to-date' | 'upgrade-available' | 'recommended';
  changelog: string[];
}

export interface PackageAuditState {
  pendingUpdates: PackageUpdate[];
  kernel: KernelUpgrade;
  status: 'idle' | 'updating-apt' | 'updating-flatpak' | 'finished';
  lastAuditTime: string;
  logLines: string[];
}

export interface TimeshiftSnapshot {
  id: string;
  name: string;
  timestamp: string;
  type: 'RSYNC' | 'BTRFS';
  tags: ('O' | 'D' | 'W' | 'M' | 'H')[];
  size: string;
  device: string;
  comment: string;
}

export interface FanCurvePoint {
  temp: number;
  speed: number;
}

export interface FanProfile {
  id: string;
  name: string;
  sensorTarget: 'cpu' | 'gpu' | 'nvme' | 'system';
  fanChannel: 'cpu_fan' | 'chassis_1' | 'chassis_2' | 'gpu_fan';
  points: FanCurvePoint[];
  hysteresis: number;
  zeroRpmMode: boolean;
  zeroRpmThreshold: number;
  isBuiltIn?: boolean;
}

export interface FanCurveState {
  profiles: FanProfile[];
  activeProfileId: string;
  autostartOnMintBoot: boolean;
  serviceStatus: 'active' | 'inactive' | 'configuring';
  desktopAutostartPath: string;
  systemdServicePath: string;
  scriptPath: string;
  generatedBashScript: string;
}



