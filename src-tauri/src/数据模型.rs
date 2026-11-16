use serde::{Deserialize, Serialize};

use crate::设置::Settings;
use crate::游戏::GameInfo;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ModEntry {
    pub folder: String,
    pub path: String,
    pub enabled: bool,
    pub load_index: usize,
    pub display_name: String,
    pub internal_name: Option<String>,
    pub version: Option<String>,
    pub author: Option<String>,
    pub description: Option<String>,
    pub website: Option<String>,
    pub size_bytes: u64,
    pub file_count: u32,
    pub has_dll: bool,
    pub has_xml: bool,
    pub mod_info_ok: bool,
    pub mod_info_issue: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conflict {
    pub path: String,
    pub mods: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthIssue {
    pub id: String,
    pub severity: String,
    pub title: String,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModsLocation {
    pub path: String,
    pub kind: String,
    pub exists: bool,
    pub mod_count: usize,
    pub enabled_count: usize,
    pub writable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub total: usize,
    pub enabled: usize,
    pub disabled: usize,
    pub code_mods: usize,
    pub conflicts: usize,
    pub total_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub mods: Vec<String>,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupEntry {
    pub id: String,
    pub folder: String,
    pub display_name: String,
    pub version: Option<String>,
    pub reason: String,
    pub created_at: u64,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub mods_dir: String,
    pub disabled_dir: String,
    pub mods: Vec<ModEntry>,
    pub conflicts: Vec<Conflict>,
    pub issues: Vec<HealthIssue>,
    pub game: GameInfo,
    pub locations: Vec<ModsLocation>,
    pub profiles: Vec<Profile>,
    pub backups: Vec<BackupEntry>,
    pub stats: Stats,
    pub scanned_at: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Bootstrap {
    pub settings: Settings,
    pub snapshot: Snapshot,
    pub data_dir: String,
    pub backups_dir: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledMod {
    pub folder: String,
    pub display_name: String,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct InstallReport {
    pub installed: Vec<InstalledMod>,
    pub replaced: Vec<String>,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallProgress {
    pub phase: String,
    pub label: String,
    pub current: usize,
    pub total: usize,
    pub percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ApplyReport {
    pub enabled: usize,
    pub disabled: usize,
    pub missing: Vec<String>,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModDetails {
    pub entry: ModEntry,
    pub files: Vec<FileEntry>,
    pub conflicts: Vec<Conflict>,
    pub total_files: u32,
}
