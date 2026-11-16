use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub game_path: Option<String>,
    pub mods_dir: Option<String>,
    pub theme: String,
    pub eac: bool,
    pub auto_backup: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            game_path: None,
            mods_dir: None,
            theme: "dark".into(),
            eac: false,
            auto_backup: true,
        }
    }
}

pub struct AppPaths {
    pub 配置目录: PathBuf,
    pub 设置文件: PathBuf,
    pub 配置档文件: PathBuf,
    pub 备份目录: PathBuf,
}

impl AppPaths {
    pub fn 解析(应用: &AppHandle) -> Result<Self, String> {
        let 配置目录 = 应用
            .path()
            .app_config_dir()
            .map_err(|错误| format!("无法定位应用数据目录：{错误}"))?;
        fs::create_dir_all(&配置目录).map_err(|错误| format!("无法创建应用数据目录：{错误}"))?;
        let 备份目录 = 配置目录.join("backups");
        fs::create_dir_all(&备份目录).map_err(|错误| format!("无法创建备份目录：{错误}"))?;
        Ok(Self {
            设置文件: 配置目录.join("settings.json"),
            配置档文件: 配置目录.join("profiles.json"),
            配置目录,
            备份目录,
        })
    }
}

impl Settings {
    pub fn 读取(路径: &AppPaths) -> Self {
        fs::read_to_string(&路径.设置文件)
            .ok()
            .and_then(|文本| serde_json::from_str::<Settings>(&文本).ok())
            .unwrap_or_default()
    }

    pub fn 保存(&self, 路径: &AppPaths) -> Result<(), String> {
        写入json(&路径.设置文件, self)
    }
}

/// 先写临时文件再替换，避免设置文件写到一半时损坏。
pub fn 写入json<T: Serialize + ?Sized>(
    路径: &std::path::Path,
    值: &T,
) -> Result<(), String> {
    let 字节 = serde_json::to_vec_pretty(值).map_err(|错误| format!("序列化失败：{错误}"))?;
    let 父目录 = 路径.parent().ok_or_else(|| "路径没有父目录".to_string())?;
    fs::create_dir_all(父目录).map_err(|错误| format!("无法创建目录：{错误}"))?;
    let 临时文件 = 路径.with_extension(format!(
        "{}.tmp",
        路径
            .extension()
            .map(|扩展名| 扩展名.to_string_lossy().to_string())
            .unwrap_or_default()
    ));
    fs::write(&临时文件, 字节).map_err(|错误| format!("写入失败：{错误}"))?;
    if 路径.exists() {
        fs::remove_file(路径).map_err(|错误| format!("替换旧文件失败：{错误}"))?;
    }
    fs::rename(&临时文件, 路径).map_err(|错误| format!("保存失败：{错误}"))
}
