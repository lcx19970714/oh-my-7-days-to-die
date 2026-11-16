use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::{Deserialize, Serialize};

use crate::工具::{小写扩展名, 查找子项};

#[derive(Debug, Clone)]
pub struct GameInstall {
    pub 目录: PathBuf,
    pub 主程序: PathBuf,
    pub eac程序: Option<PathBuf>,
    pub steam构建号: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GameInfo {
    pub installed: bool,
    pub path: Option<String>,
    pub exe: Option<String>,
    pub eac_exe: Option<String>,
    pub steam_build: Option<String>,
    pub running: bool,
    pub game_mods_dir: Option<String>,
    pub user_mods_dir: String,
}

impl GameInfo {
    pub fn 从安装信息(安装: Option<&GameInstall>) -> Self {
        let 用户目录 = 用户模组目录();
        match 安装 {
            Some(游戏) => Self {
                installed: true,
                path: Some(游戏.目录.to_string_lossy().to_string()),
                exe: Some(游戏.主程序.to_string_lossy().to_string()),
                eac_exe: 游戏
                    .eac程序
                    .as_ref()
                    .map(|路径| 路径.to_string_lossy().to_string()),
                steam_build: 游戏.steam构建号.clone(),
                running: 游戏是否运行(),
                game_mods_dir: Some(游戏.目录.join("Mods").to_string_lossy().to_string()),
                user_mods_dir: 用户目录.to_string_lossy().to_string(),
            },
            None => Self {
                installed: false,
                path: None,
                exe: None,
                eac_exe: None,
                steam_build: None,
                running: 游戏是否运行(),
                game_mods_dir: None,
                user_mods_dir: 用户目录.to_string_lossy().to_string(),
            },
        }
    }
}

pub fn 用户模组目录() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("7DaysToDie")
        .join("Mods")
}

pub fn 从目录识别游戏(目录: &Path) -> Option<GameInstall> {
    if !目录.is_dir() {
        return None;
    }
    let 主程序 = 查找子项(目录, "7DaysToDie.exe")?;
    if 小写扩展名(&主程序) != "exe" {
        return None;
    }
    let eac程序 = 查找子项(目录, "7DaysToDie_EAC.exe");
    // dunce 会去掉 Windows canonicalize 产生的 \\?\ 前缀，路径显示更干净。
    let 规范目录 = dunce::canonicalize(目录).unwrap_or_else(|_| 目录.to_path_buf());
    let steam构建号 = 读取steam构建号(&规范目录);
    Some(GameInstall {
        目录: 规范目录,
        主程序,
        eac程序,
        steam构建号,
    })
}

pub fn 检测游戏() -> Option<GameInstall> {
    for 根目录 in steam库根目录() {
        let 目录 = 根目录
            .join("steamapps")
            .join("common")
            .join("7 Days To Die");
        if let Some(游戏) = 从目录识别游戏(&目录) {
            return Some(游戏);
        }
        let 备用目录 = 根目录
            .join("steamapps")
            .join("common")
            .join("7DaysToDie");
        if let Some(游戏) = 从目录识别游戏(&备用目录) {
            return Some(游戏);
        }
    }
    for 目录 in 常见候选目录() {
        if let Some(游戏) = 从目录识别游戏(&目录) {
            return Some(游戏);
        }
    }
    None
}

fn 常见候选目录() -> Vec<PathBuf> {
    let mut 结果 = Vec::new();
    let mut 根列表: Vec<PathBuf> = Vec::new();
    if let Ok(路径) = std::env::var("ProgramFiles(x86)") {
        根列表.push(PathBuf::from(路径).join("Steam"));
    }
    if let Ok(路径) = std::env::var("ProgramFiles") {
        根列表.push(PathBuf::from(路径).join("Steam"));
    }
    for 盘符 in ["C:", "D:", "E:", "F:", "G:"] {
        根列表.push(PathBuf::from(format!("{盘符}\\Steam")));
        根列表.push(PathBuf::from(format!("{盘符}\\SteamLibrary")));
    }
    for 根目录 in 根列表 {
        结果.push(根目录.join("steamapps").join("common").join("7 Days To Die"));
    }
    结果
}

fn steam库根目录() -> Vec<PathBuf> {
    let mut 根列表: Vec<PathBuf> = Vec::new();
    #[cfg(windows)]
    {
        use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_32KEY};
        use winreg::RegKey;

        if let Ok(键) = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey_with_flags("Software\\Valve\\Steam", KEY_READ)
        {
            if let Ok(路径) = 键.get_value::<String, _>("SteamPath") {
                if !路径.trim().is_empty() {
                    根列表.push(PathBuf::from(路径));
                }
            }
        }
        if let Ok(键) = RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey_with_flags(
            "SOFTWARE\\WOW6432Node\\Valve\\Steam",
            KEY_READ | KEY_WOW64_32KEY,
        ) {
            if let Ok(路径) = 键.get_value::<String, _>("InstallPath") {
                if !路径.trim().is_empty() {
                    根列表.push(PathBuf::from(路径));
                }
            }
        }
    }
    根列表.extend(常见候选目录().into_iter().filter_map(|路径| {
        // 候选目录指向 .../steamapps/common/7 Days To Die，向上回到 Steam 根目录。
        路径
            .parent()?
            .parent()?
            .parent()
            .map(|父目录| 父目录.to_path_buf())
    }));

    let mut 展开后: Vec<PathBuf> = Vec::new();
    for 根目录 in 根列表 {
        if !根目录.is_dir() {
            continue;
        }
        展开后.push(根目录.clone());
        let 清单路径 = 根目录.join("steamapps").join("libraryfolders.vdf");
        if let Ok(文本) = std::fs::read_to_string(&清单路径) {
            for 库目录 in 解析库文件夹(&文本) {
                if 库目录.is_dir() {
                    展开后.push(库目录);
                }
            }
        }
    }

    let mut 已见 = BTreeSet::new();
    展开后
        .into_iter()
        .filter(|路径| 已见.insert(路径.to_string_lossy().to_lowercase()))
        .collect()
}

/// 从 Steam 的 `libraryfolders.vdf` 提取所有 `"path" "..."`。
pub fn 解析库文件夹(文本: &str) -> Vec<PathBuf> {
    let mut 结果 = Vec::new();
    for 行 in 文本.lines() {
        let 修剪后 = 行.trim();
        if !修剪后.to_ascii_lowercase().starts_with("\"path\"") {
            continue;
        }
        let 剩余 = 修剪后[6..].trim_start();
        let Some(剩余) = 剩余.strip_prefix('"') else {
            continue;
        };
        let Some(结束) = 剩余.find('"') else {
            continue;
        };
        let 原始 = 剩余[..结束].replace("\\\\", "\\");
        if !原始.trim().is_empty() {
            结果.push(PathBuf::from(原始));
        }
    }
    结果
}

fn 读取steam构建号(游戏目录: &Path) -> Option<String> {
    // <库>/steamapps/common/7 Days To Die -> <库>/steamapps/appmanifest_251570.acf
    let steam应用目录 = 游戏目录.parent()?.parent()?;
    let 清单文件 = steam应用目录.join("appmanifest_251570.acf");
    let 文本 = std::fs::read_to_string(清单文件).ok()?;
    for 行 in 文本.lines() {
        let 修剪后 = 行.trim();
        if 修剪后.starts_with("\"buildid\"") {
            let 剩余 = 修剪后[9..].trim();
            let 剩余 = 剩余.strip_prefix('"')?;
            let 结束 = 剩余.find('"')?;
            return Some(剩余[..结束].to_string());
        }
    }
    None
}

#[cfg(windows)]
pub fn 游戏是否运行() -> bool {
    use std::os::windows::process::CommandExt;
    const 不显示窗口: u32 = 0x0800_0000;
    for 进程名 in ["7DaysToDie.exe", "7DaysToDie_EAC.exe"] {
        let mut 命令 = Command::new("tasklist");
        命令.args(["/FI", &format!("IMAGENAME eq {进程名}"), "/NH"]);
        命令.creation_flags(不显示窗口);
        if let Ok(输出) = 命令.output() {
            let 文本 = String::from_utf8_lossy(&输出.stdout).to_lowercase();
            if 文本.contains(&进程名.to_lowercase()) {
                return true;
            }
        }
    }
    false
}

#[cfg(not(windows))]
pub fn 游戏是否运行() -> bool {
    false
}

pub fn 启动游戏(游戏: &GameInstall, 使用eac: bool) -> Result<(), String> {
    if 游戏是否运行() {
        return Err("游戏已经在运行，请先退出游戏再启动".into());
    }
    let 程序 = if 使用eac {
        游戏.eac程序.as_ref().unwrap_or(&游戏.主程序)
    } else {
        &游戏.主程序
    };
    if !程序.exists() {
        return Err(format!("找不到游戏启动程序：{}", 程序.display()));
    }
    Command::new(程序)
        .current_dir(&游戏.目录)
        .spawn()
        .map(|_| ())
        .map_err(|错误| format!("启动游戏失败：{错误}"))
}

#[cfg(test)]
mod 测试 {
    use super::*;

    #[test]
    fn 解析steam库目录() {
        let 清单 = r#"
"libraryfolders"
{
    "0"
    {
        "path"        "C:\\Program Files (x86)\\Steam"
        "label"       ""
    }
    "1"
    {
        "path"        "D:\\SteamLibrary"
    }
}
"#;
        let 路径列表 = 解析库文件夹(清单);
        assert_eq!(路径列表.len(), 2);
        assert_eq!(路径列表[0], PathBuf::from("C:\\Program Files (x86)\\Steam"));
        assert_eq!(路径列表[1], PathBuf::from("D:\\SteamLibrary"));
    }

    #[test]
    fn 解析正斜杠库路径() {
        let 清单 = "\"path\" \"E:/Games/Steam\"\n";
        assert_eq!(
            解析库文件夹(清单)[0],
            PathBuf::from("E:/Games/Steam")
        );
    }
}
