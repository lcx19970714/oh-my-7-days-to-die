export type Theme = "dark" | "light" | "system";
export type Severity = "error" | "warning" | "info";
export type 页面键 =
  | "overview"
  | "mods"
  | "profiles"
  | "backups"
  | "discover"
  | "settings";

export interface Settings {
  gamePath: string | null;
  modsDir: string | null;
  theme: Theme;
  eac: boolean;
  autoBackup: boolean;
}

export interface ModEntry {
  folder: string;
  path: string;
  enabled: boolean;
  loadIndex: number;
  displayName: string;
  internalName: string | null;
  version: string | null;
  author: string | null;
  description: string | null;
  website: string | null;
  sizeBytes: number;
  fileCount: number;
  hasDll: boolean;
  hasXml: boolean;
  modInfoOk: boolean;
  modInfoIssue: string | null;
}

export interface Conflict {
  path: string;
  mods: string[];
}

export interface HealthIssue {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

export interface ModsLocation {
  path: string;
  kind: "user" | "game" | "custom" | string;
  exists: boolean;
  modCount: number;
  enabledCount: number;
  writable: boolean;
}

export interface Stats {
  total: number;
  enabled: number;
  disabled: number;
  codeMods: number;
  conflicts: number;
  totalBytes: number;
}

export interface Profile {
  id: string;
  name: string;
  mods: string[];
  createdAt: number;
  updatedAt: number;
}

export interface BackupEntry {
  id: string;
  folder: string;
  displayName: string;
  version: string | null;
  reason: "replace" | "delete" | string;
  createdAt: number;
  sizeBytes: number;
}

export interface GameInfo {
  installed: boolean;
  path: string | null;
  exe: string | null;
  eacExe: string | null;
  steamBuild: string | null;
  running: boolean;
  gameModsDir: string | null;
  userModsDir: string;
}

export interface Snapshot {
  modsDir: string;
  disabledDir: string;
  mods: ModEntry[];
  conflicts: Conflict[];
  issues: HealthIssue[];
  game: GameInfo;
  locations: ModsLocation[];
  profiles: Profile[];
  backups: BackupEntry[];
  stats: Stats;
  scannedAt: number;
}

export interface Bootstrap {
  settings: Settings;
  snapshot: Snapshot;
  dataDir: string;
  backupsDir: string;
  version: string;
}

export interface InstalledMod {
  folder: string;
  displayName: string;
  version: string | null;
}

export interface InstallReport {
  installed: InstalledMod[];
  replaced: string[];
  errors: string[];
}

export interface InstallProgress {
  phase: "extract" | "install" | "done" | string;
  label: string;
  current: number;
  total: number;
  percent: number;
}

export interface ApplyReport {
  enabled: number;
  disabled: number;
  missing: string[];
  errors: string[];
}

export interface FileEntry {
  path: string;
  sizeBytes: number;
}

export interface ModDetails {
  entry: ModEntry;
  files: FileEntry[];
  conflicts: Conflict[];
  totalFiles: number;
}
