use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use tauri::AppHandle;
use walkdir::WalkDir;

use crate::数据模型::{
    Conflict, FileEntry, HealthIssue, ModDetails, ModEntry, ModsLocation, Snapshot, Stats,
};
use crate::备份;
use crate::配置档;
use crate::工具::{
    当前毫秒, 文件名文本, 查找子项, 安全文件夹名, 目录可写, 目录大小, 解析子目录, 移动目录,
    路径相同, 读取子目录,
};
use crate::模组信息::{显示名称, 读取模组信息, ParsedModInfo};
use crate::游戏::{
    从目录识别游戏, 检测游戏, 用户模组目录, 游戏是否运行, GameInfo, GameInstall,
};
use crate::设置::{AppPaths, Settings};

pub struct 上下文 {
    pub 路径: AppPaths,
    pub 设置: Settings,
    pub 游戏: Option<GameInstall>,
}

impl 上下文 {
    pub fn 加载(应用: &AppHandle) -> Result<Self, String> {
        let 路径 = AppPaths::解析(应用)?;
        let 设置 = Settings::读取(&路径);
        let 游戏 = match 设置.game_path.as_deref() {
            Some(原始路径) if !原始路径.trim().is_empty() => {
                let 目录 = Path::new(原始路径);
                if 目录.is_dir() {
                    从目录识别游戏(目录).or_else(检测游戏)
                } else {
                    检测游戏()
                }
            }
            _ => 检测游戏(),
        };
        Ok(Self { 路径, 设置, 游戏 })
    }

    pub fn 模组目录(&self) -> PathBuf {
        解析模组目录(&self.设置, self.游戏.as_ref())
    }
}

pub fn 解析模组目录(设置: &Settings, 游戏: Option<&GameInstall>) -> PathBuf {
    if let Some(目录) = 设置.mods_dir.as_deref() {
        if !目录.trim().is_empty() {
            return PathBuf::from(目录);
        }
    }
    let 用户目录 = 用户模组目录();
    let 用户目录有模组 = 目录内有模组(&用户目录);
    let 游戏目录 = 游戏.map(|游戏| 游戏.目录.join("Mods"));
    let 游戏目录有模组 = 游戏目录
        .as_ref()
        .map(|目录| 目录内有模组(目录))
        .unwrap_or(false);
    if !用户目录有模组 && 游戏目录有模组 {
        游戏目录.unwrap()
    } else {
        用户目录
    }
}

pub fn 目录内有模组(目录: &Path) -> bool {
    读取子目录(目录)
        .iter()
        .any(|子目录| 查找子项(子目录, "ModInfo.xml").is_some())
}

pub fn 停用目录(模组目录: &Path) -> PathBuf {
    let 名称 = {
        let 名称 = 文件名文本(模组目录);
        if 名称.is_empty() {
            "Mods".to_string()
        } else {
            名称
        }
    };
    match 模组目录.parent() {
        Some(父目录) => 父目录.join(format!("{名称}_Disabled")),
        None => PathBuf::from(format!("{名称}_Disabled")),
    }
}

struct 扫描结果 {
    条目: ModEntry,
    相对文件: Vec<String>,
}

fn 检查模组(目录: &Path, 已启用: bool, 加载序号: usize) -> 扫描结果 {
    let 文件夹 = 文件名文本(目录);
    let 读取结果 = 读取模组信息(目录);
    let 信息 = 读取结果.info.as_ref();
    let (字节数, 文件数) = 目录大小(目录);
    let mut 含dll = false;
    let mut 含xml = false;
    let mut 相对文件: Vec<String> = Vec::new();

    for 条目 in WalkDir::new(目录)
        .follow_links(false)
        .into_iter()
        .flatten()
    {
        if !条目.file_type().is_file() {
            continue;
        }
        let 相对路径 = 条目
            .path()
            .strip_prefix(目录)
            .map(|路径| 路径.to_string_lossy().replace('\\', "/"))
            .unwrap_or_default();
        if 相对路径.is_empty() {
            continue;
        }
        let 小写路径 = 相对路径.to_lowercase();
        if 小写路径.contains("/.git/")
            || 小写路径.starts_with(".git/")
            || 小写路径.contains("__macosx/")
        {
            continue;
        }
        let 扩展名 = 条目
            .path()
            .extension()
            .map(|扩展名| 扩展名.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        if 扩展名 == "dll" {
            含dll = true;
        }
        if 扩展名 == "xml" {
            含xml = true;
        }
        if 相对文件.len() < 8000 {
            相对文件.push(小写路径);
        }
    }

    扫描结果 {
        条目: ModEntry {
            folder: 文件夹.clone(),
            path: 目录.to_string_lossy().to_string(),
            enabled: 已启用,
            load_index: 加载序号,
            display_name: 显示名称(信息, &文件夹),
            internal_name: 信息.and_then(|信息| 信息.name.clone()),
            version: 信息.and_then(|信息| 信息.version.clone()),
            author: 信息.and_then(|信息| 信息.author.clone()),
            description: 信息.and_then(|信息| 信息.description.clone()),
            website: 信息.and_then(|信息| 信息.website.clone()),
            size_bytes: 字节数,
            file_count: 文件数,
            has_dll: 含dll,
            has_xml: 含xml,
            mod_info_ok: 读取结果
                .info
                .as_ref()
                .map(|信息| 信息.name.is_some() || 信息.display_name.is_some())
                .unwrap_or(false),
            mod_info_issue: 读取结果.issue.clone(),
        },
        相对文件,
    }
}

fn 收集模组(基础目录: &Path, 已启用: bool) -> Vec<扫描结果> {
    读取子目录(基础目录)
        .into_iter()
        .enumerate()
        .map(|(序号, 目录)| 检查模组(&目录, 已启用, if 已启用 { 序号 + 1 } else { 0 }))
        .collect()
}

fn 可忽略冲突(路径: &str) -> bool {
    let 文件名 = 路径.rsplit('/').next().unwrap_or(路径);
    if 文件名.eq_ignore_ascii_case("modinfo.xml")
        || 文件名.eq_ignore_ascii_case("thumbs.db")
        || 文件名.eq_ignore_ascii_case("desktop.ini")
        || 文件名.starts_with("readme")
        || 文件名.starts_with("license")
        || 文件名.starts_with("changelog")
    {
        return true;
    }
    路径.contains("/.git/") || 路径.contains("__macosx/")
}

fn 构建冲突(启用模组: &[扫描结果]) -> Vec<Conflict> {
    let mut 映射: HashMap<String, Vec<String>> = HashMap::new();
    for 扫描项 in 启用模组 {
        for 相对路径 in &扫描项.相对文件 {
            if 可忽略冲突(相对路径) {
                continue;
            }
            let 持有者 = 映射.entry(相对路径.clone()).or_default();
            if !持有者.contains(&扫描项.条目.folder) {
                持有者.push(扫描项.条目.folder.clone());
            }
        }
    }
    let mut 冲突列表: Vec<Conflict> = 映射
        .into_iter()
        .filter(|(_, 持有者)| 持有者.len() > 1)
        .map(|(路径, 模组)| Conflict { path: 路径, mods: 模组 })
        .collect();
    冲突列表.sort_by(|甲, 乙| {
        乙.mods
            .len()
            .cmp(&甲.mods.len())
            .then_with(|| 甲.path.cmp(&乙.path))
    });
    冲突列表.truncate(200);
    冲突列表
}

fn 是harmony(扫描项: &扫描结果) -> bool {
    let 文本 = format!(
        "{} {} {}",
        扫描项.条目.folder,
        扫描项.条目.display_name,
        扫描项.条目.internal_name.clone().unwrap_or_default()
    )
    .to_lowercase();
    文本.contains("harmony")
}

fn 生成问题(
    标识: &str,
    级别: &str,
    标题: impl Into<String>,
    详情: impl Into<String>,
) -> HealthIssue {
    HealthIssue {
        id: 标识.to_string(),
        severity: 级别.to_string(),
        title: 标题.into(),
        detail: 详情.into(),
    }
}

fn 统计模组目录(路径: &Path) -> usize {
    读取子目录(路径)
        .iter()
        .filter(|子目录| 查找子项(子目录, "ModInfo.xml").is_some())
        .count()
}

fn 目录信息(路径: &Path, 类型: &str, 启用数量: Option<usize>) -> ModsLocation {
    let 存在 = 路径.is_dir();
    let 模组数量 = if 存在 { 统计模组目录(路径) } else { 0 };
    ModsLocation {
        path: 路径.to_string_lossy().to_string(),
        kind: 类型.to_string(),
        exists: 存在,
        mod_count: 模组数量,
        enabled_count: 启用数量.unwrap_or(模组数量),
        writable: 存在 && 目录可写(路径),
    }
}

pub fn 扫描(上下文: &上下文, 覆盖目录: Option<&str>) -> Result<Snapshot, String> {
    let 模组目录 = match 覆盖目录 {
        Some(目录) if !目录.trim().is_empty() => PathBuf::from(目录),
        _ => 上下文.模组目录(),
    };
    let 停用目录 = 停用目录(&模组目录);

    let 启用模组 = 收集模组(&模组目录, true);
    let 停用模组 = 收集模组(&停用目录, false);
    let 总数 = 启用模组.len() + 停用模组.len();
    let 冲突列表 = 构建冲突(&启用模组);

    let mut 模组列表: Vec<ModEntry> = Vec::with_capacity(总数);
    let mut 全部扫描: Vec<&扫描结果> = Vec::new();
    for 扫描项 in &启用模组 {
        全部扫描.push(扫描项);
    }
    for 扫描项 in &停用模组 {
        全部扫描.push(扫描项);
    }
    模组列表.extend(启用模组.iter().map(|扫描项| 扫描项.条目.clone()));
    模组列表.extend(停用模组.iter().map(|扫描项| 扫描项.条目.clone()));
    模组列表.sort_by(|甲, 乙| {
        乙.enabled
            .cmp(&甲.enabled)
            .then(甲.load_index.cmp(&乙.load_index))
    });

    let mut 问题列表: Vec<HealthIssue> = Vec::new();
    if 上下文.游戏.is_none() {
        问题列表.push(生成问题(
            "game-missing",
            "warning",
            "未找到游戏安装",
            "仍然可以管理 Mods 目录；在设置里指定游戏目录后就能直接启动游戏。",
        ));
    }
    if 游戏是否运行() {
        问题列表.push(生成问题(
            "game-running",
            "warning",
            "游戏正在运行",
            "启用或停用模组不会立刻生效，请先退出游戏再操作。",
        ));
    }

    let 目录存在 = 模组目录.is_dir();
    if 目录存在 && !目录可写(&模组目录) {
        问题列表.push(生成问题(
            "not-writable",
            "error",
            "Mods 目录不可写",
            "通常是游戏装在 Program Files 导致的。请在设置中切换到用户数据目录，或以管理员身份运行本程序。",
        ));
    }
    if !目录存在 {
        问题列表.push(生成问题(
            "mods-missing",
            "info",
            "Mods 目录尚未创建",
            "安装第一个模组时会自动创建；也可以现在打开目录手动放入。",
        ));
    }

    let 无效模组: Vec<&扫描结果> = 全部扫描
        .iter()
        .copied()
        .filter(|扫描项| !扫描项.条目.mod_info_ok)
        .collect();
    if !无效模组.is_empty() {
        let 名称列表 = 无效模组
            .iter()
            .take(4)
            .map(|扫描项| 扫描项.条目.folder.clone())
            .collect::<Vec<_>>()
            .join("、");
        问题列表.push(生成问题(
            "invalid-modinfo",
            "warning",
            format!("{} 个文件夹缺少 ModInfo.xml", 无效模组.len()),
            format!(
                "{名称列表}{} 不会被游戏加载。",
                if 无效模组.len() > 4 { " 等" } else { "" }
            ),
        ));
    }

    let 启用引用: Vec<&扫描结果> = 启用模组.iter().collect();
    let 有harmony = 启用引用.iter().any(|扫描项| 是harmony(扫描项));
    let 代码模组: Vec<&&扫描结果> = 启用引用
        .iter()
        .filter(|扫描项| 扫描项.条目.has_dll && !是harmony(扫描项))
        .collect();
    if !代码模组.is_empty() && !有harmony {
        问题列表.push(生成问题(
            "harmony-missing",
            "warning",
            "含 DLL 的模组缺少 Harmony",
            format!(
                "检测到 {} 个代码模组，但没有启用 0_TFP_Harmony。大多数代码模组需要它才能运行。",
                代码模组.len()
            ),
        ));
    }

    let mut 按内部名分组: HashMap<String, Vec<String>> = HashMap::new();
    for 扫描项 in &启用模组 {
        if let Some(名称) = &扫描项.条目.internal_name {
            if !名称.trim().is_empty() {
                按内部名分组
                    .entry(名称.to_lowercase())
                    .or_default()
                    .push(扫描项.条目.folder.clone());
            }
        }
    }
    let 重名组: Vec<(String, Vec<String>)> = 按内部名分组
        .into_iter()
        .filter(|(_, 文件夹列表)| 文件夹列表.len() > 1)
        .collect();
    if !重名组.is_empty() {
        let 示例 = 重名组
            .iter()
            .take(3)
            .map(|(名称, 文件夹列表)| format!("{名称}（{}）", 文件夹列表.join(" / ")))
            .collect::<Vec<_>>()
            .join("；");
        问题列表.push(生成问题(
            "duplicate-name",
            "warning",
            format!("{} 组模组内部名重复", 重名组.len()),
            format!("{示例}。同一时间只应启用其中一个。"),
        ));
    }

    if !冲突列表.is_empty() {
        问题列表.push(生成问题(
            "conflicts",
            "warning",
            format!("{} 处文件冲突", 冲突列表.len()),
            "多个启用模组写入了同一个相对路径，后加载的会覆盖先加载的；打开模组详情可以查看具体文件。",
        ));
    }

    let 用户目录 = 用户模组目录();
    let 游戏目录 = 上下文.游戏.as_ref().map(|游戏| 游戏.目录.join("Mods"));
    let 当前类型 = if 路径相同(&模组目录, &用户目录) {
        "user"
    } else if 游戏目录
        .as_ref()
        .map(|目录| 路径相同(&模组目录, 目录))
        .unwrap_or(false)
    {
        "game"
    } else {
        "custom"
    };

    let mut 目录列表 = vec![目录信息(&模组目录, 当前类型, Some(启用模组.len()))];
    if !路径相同(&模组目录, &用户目录) {
        目录列表.push(目录信息(&用户目录, "user", None));
    }
    if let Some(目录) = &游戏目录 {
        if !路径相同(&模组目录, 目录) && !路径相同(目录, &用户目录) {
            目录列表.push(目录信息(目录, "game", None));
        }
    }
    for 其他目录 in &目录列表 {
        if 路径相同(Path::new(&其他目录.path), &模组目录) || 其他目录.mod_count == 0 {
            continue;
        }
        问题列表.push(生成问题(
            &format!("other-library-{}", 其他目录.kind),
            "info",
            "另一处 Mods 目录里还有模组",
            format!(
                "{} 中有 {} 个模组。游戏会同时加载这两处目录，建议只保留一处，避免重复或版本打架。",
                其他目录.path, 其他目录.mod_count
            ),
        ));
    }

    if 启用模组.is_empty() && !模组列表.is_empty() {
        问题列表.push(生成问题(
            "none-enabled",
            "info",
            "所有模组都处于停用状态",
            "可以在模组库中逐个启用，或应用一个配置档。",
        ));
    }

    问题列表.sort_by_key(|问题| match 问题.severity.as_str() {
        "error" => 0,
        "warning" => 1,
        _ => 2,
    });

    let 统计 = Stats {
        total: 模组列表.len(),
        enabled: 启用模组.len(),
        disabled: 停用模组.len(),
        code_mods: 启用模组
            .iter()
            .filter(|扫描项| 扫描项.条目.has_dll)
            .count(),
        conflicts: 冲突列表.len(),
        total_bytes: 模组列表.iter().map(|模组| 模组.size_bytes).sum(),
    };

    Ok(Snapshot {
        mods_dir: 模组目录.to_string_lossy().to_string(),
        disabled_dir: 停用目录.to_string_lossy().to_string(),
        mods: 模组列表,
        conflicts: 冲突列表,
        issues: 问题列表,
        game: GameInfo::从安装信息(上下文.游戏.as_ref()),
        locations: 目录列表,
        profiles: 配置档::列出配置档(&上下文.路径),
        backups: 备份::列出备份(&上下文.路径),
        stats: 统计,
        scanned_at: 当前毫秒(),
    })
}

pub fn 设置启用(模组目录: &Path, 文件夹: &str, 已启用: bool) -> Result<(), String> {
    let 名称 = 安全文件夹名(文件夹)?;
    let 停用目录 = 停用目录(模组目录);
    let (来源基础, 目标基础): (&Path, &Path) = if 已启用 {
        (停用目录.as_path(), 模组目录)
    } else {
        (模组目录, 停用目录.as_path())
    };
    let 来源 = 来源基础.join(&名称);
    let 目标 = 目标基础.join(&名称);
    if !来源.exists() {
        if 目标.exists() {
            return Ok(());
        }
        return Err(format!("找不到模组文件夹：{名称}"));
    }
    if !来源.is_dir() {
        return Err(format!("“{名称}”不是文件夹"));
    }
    if 目标.exists() {
        return Err(format!(
            "目标位置已经存在同名文件夹，无法{}：{名称}",
            if 已启用 { "启用" } else { "停用" }
        ));
    }
    // 确认真实来源是预期目录的直接子目录。
    解析子目录(来源基础, &名称)?;
    fs::create_dir_all(目标基础).map_err(|错误| format!("无法创建目标目录：{错误}"))?;
    移动目录(&来源, &目标).map_err(|错误| format!("移动失败：{错误}"))
}

pub fn 模组详情(
    模组目录: &Path,
    文件夹: &str,
    已启用: bool,
) -> Result<ModDetails, String> {
    let 基础目录 = if 已启用 {
        模组目录.to_path_buf()
    } else {
        停用目录(模组目录)
    };
    let 目录 = 解析子目录(&基础目录, 文件夹)?;
    let 读取结果 = 读取模组信息(&目录);
    let 信息: Option<&ParsedModInfo> = 读取结果.info.as_ref();
    let (字节数, 文件数) = 目录大小(&目录);
    let mut 含dll = false;
    let mut 含xml = false;
    let mut 文件列表: Vec<FileEntry> = Vec::new();
    for 条目 in WalkDir::new(&目录)
        .follow_links(false)
        .into_iter()
        .flatten()
    {
        if !条目.file_type().is_file() {
            continue;
        }
        let 相对路径 = 条目
            .path()
            .strip_prefix(&目录)
            .map(|路径| 路径.to_string_lossy().replace('\\', "/"))
            .unwrap_or_default();
        let 扩展名 = 条目
            .path()
            .extension()
            .map(|扩展名| 扩展名.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        if 扩展名 == "dll" {
            含dll = true;
        }
        if 扩展名 == "xml" {
            含xml = true;
        }
        if 文件列表.len() < 500 {
            文件列表.push(FileEntry {
                path: 相对路径,
                size_bytes: 条目.metadata().map(|元数据| 元数据.len()).unwrap_or(0),
            });
        }
    }
    文件列表.sort_by(|甲, 乙| 甲.path.cmp(&乙.path));
    let 条目 = ModEntry {
        folder: 文件夹.to_string(),
        path: 目录.to_string_lossy().to_string(),
        enabled: 已启用,
        load_index: 0,
        display_name: 显示名称(信息, 文件夹),
        internal_name: 信息.and_then(|信息| 信息.name.clone()),
        version: 信息.and_then(|信息| 信息.version.clone()),
        author: 信息.and_then(|信息| 信息.author.clone()),
        description: 信息.and_then(|信息| 信息.description.clone()),
        website: 信息.and_then(|信息| 信息.website.clone()),
        size_bytes: 字节数,
        file_count: 文件数,
        has_dll: 含dll,
        has_xml: 含xml,
        mod_info_ok: 读取结果
            .info
            .as_ref()
            .map(|信息| 信息.name.is_some() || 信息.display_name.is_some())
            .unwrap_or(false),
        mod_info_issue: 读取结果.issue,
    };
    let 冲突列表 = if 已启用 {
        let 扫描项列表 = 收集模组(模组目录, true);
        构建冲突(&扫描项列表)
            .into_iter()
            .filter(|冲突| {
                冲突
                    .mods
                    .iter()
                    .any(|名称| 名称.eq_ignore_ascii_case(文件夹))
            })
            .collect()
    } else {
        Vec::new()
    };
    Ok(ModDetails {
        entry: 条目,
        files: 文件列表,
        conflicts: 冲突列表,
        total_files: 文件数,
    })
}

pub fn 当前模组目录(上下文: &上下文, 覆盖目录: Option<&str>) -> PathBuf {
    match 覆盖目录 {
        Some(目录) if !目录.trim().is_empty() => PathBuf::from(目录),
        _ => 上下文.模组目录(),
    }
}

#[cfg(test)]
mod 测试 {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn 创建测试模组(根目录: &Path, 名称: &str, xml: &str) {
        let 目录 = 根目录.join(名称);
        fs::create_dir_all(&目录).unwrap();
        fs::write(目录.join("ModInfo.xml"), xml).unwrap();
    }

    #[test]
    fn 停用目录是同级目录() {
        assert_eq!(
            停用目录(Path::new("C:\\Users\\me\\AppData\\Roaming\\7DaysToDie\\Mods")),
            PathBuf::from("C:\\Users\\me\\AppData\\Roaming\\7DaysToDie\\Mods_Disabled")
        );
    }

    #[test]
    fn 启用停用会移动目录() {
        let 临时目录 = tempdir().unwrap();
        let 模组目录 = 临时目录.path().join("Mods");
        fs::create_dir_all(&模组目录).unwrap();
        创建测试模组(&模组目录, "TestMod", "<xml><Name value=\"Test\" /></xml>");
        设置启用(&模组目录, "TestMod", false).unwrap();
        assert!(!模组目录.join("TestMod").exists());
        assert!(停用目录(&模组目录).join("TestMod").exists());
        设置启用(&模组目录, "TestMod", true).unwrap();
        assert!(模组目录.join("TestMod").exists());
    }

    #[test]
    fn 冲突检测能找到共享文件() {
        let 临时目录 = tempdir().unwrap();
        let 模组目录 = 临时目录.path().join("Mods");
        fs::create_dir_all(&模组目录).unwrap();
        for 名称 in ["A", "B"] {
            创建测试模组(&模组目录, 名称, "<xml><Name value=\"M\" /></xml>");
            fs::create_dir_all(模组目录.join(名称).join("Config")).unwrap();
            fs::write(模组目录.join(名称).join("Config").join("items.xml"), "x").unwrap();
        }
        let 扫描项列表 = 收集模组(&模组目录, true);
        let 冲突列表 = 构建冲突(&扫描项列表);
        assert_eq!(冲突列表.len(), 1);
        assert_eq!(冲突列表[0].mods.len(), 2);
    }
}
