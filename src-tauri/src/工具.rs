use std::fs;
use std::io;
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use walkdir::WalkDir;

/// 当前 Unix 毫秒时间戳。
pub fn 当前毫秒() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|时长| 时长.as_millis() as u64)
        .unwrap_or(0)
}

/// 形如 20261114_204900 的本地时间戳，用于备份目录名。
pub fn 时间戳() -> String {
    chrono::Local::now().format("%Y%m%d_%H%M%S").to_string()
}

/// 生成只含 ASCII 小写字母、数字与连字符的短标识。
pub fn 生成短标识(文本: &str, 最大长度: usize) -> String {
    let mut 结果 = String::new();
    let mut 上一个连字符 = false;
    for 字符 in 文本.chars() {
        if 字符.is_ascii_alphanumeric() {
            结果.push(字符.to_ascii_lowercase());
            上一个连字符 = false;
        } else if 字符 == '-' || 字符 == '_' {
            if !上一个连字符 && !结果.is_empty() {
                结果.push('-');
                上一个连字符 = true;
            }
        } else if 字符.is_whitespace() || 字符 == '.' {
            if !上一个连字符 && !结果.is_empty() {
                结果.push('-');
                上一个连字符 = true;
            }
        }
        if 结果.chars().count() >= 最大长度 {
            break;
        }
    }
    let 修剪后 = 结果.trim_matches('-').to_string();
    if 修剪后.is_empty() {
        "mod".to_string()
    } else {
        修剪后
    }
}

/// 校验并清理一个可安全放进 Mods 目录的文件夹名（Windows 规则）。
pub fn 安全文件夹名(名称: &str) -> Result<String, String> {
    let 去空白 = 名称.trim().trim_matches('.').trim();
    if 去空白.is_empty() {
        return Err("模组文件夹名为空".into());
    }
    if 去空白.chars().any(|字符| 字符.is_control()) {
        return Err("模组文件夹名包含控制字符".into());
    }
    if 去空白.len() > 120 {
        return Err("模组文件夹名过长".into());
    }
    let mut 结果 = String::with_capacity(去空白.len());
    for 字符 in 去空白.chars() {
        match 字符 {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => 结果.push('_'),
            _ => 结果.push(字符),
        }
    }
    let 结果 = 结果.trim_end_matches([' ', '.']).to_string();
    if 结果.is_empty() || 结果 == "." || 结果 == ".." {
        return Err("模组文件夹名不合法".into());
    }
    let 保留名 = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
        "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];
    if 保留名.contains(&结果.to_ascii_uppercase().as_str()) {
        return Err(format!("“{结果}”是 Windows 保留名称，请重命名后再安装"));
    }
    Ok(结果)
}

/// 只拼接一个普通路径分量，拒绝分隔符、盘符与 `..`。
pub fn 拼接子路径(基础目录: &Path, 名称: &str) -> Result<PathBuf, String> {
    let 路径 = Path::new(名称);
    let mut 分量 = 路径.components();
    match (分量.next(), 分量.next()) {
        (Some(Component::Normal(_)), None) => Ok(基础目录.join(路径)),
        _ => Err(format!("非法路径：{名称}")),
    }
}

/// 确认子目录确实直接位于基础目录下，并拒绝符号链接逃逸。
pub fn 解析子目录(基础目录: &Path, 名称: &str) -> Result<PathBuf, String> {
    let 候选 = 拼接子路径(基础目录, 名称)?;
    let 元数据 =
        fs::symlink_metadata(&候选).map_err(|_| format!("找不到模组目录：{名称}"))?;
    if 元数据.file_type().is_symlink() {
        return Err(format!("“{名称}”是一个符号链接，出于安全考虑不会操作它"));
    }
    if !元数据.is_dir() {
        return Err(format!("“{名称}”不是文件夹"));
    }
    let 规范基础 = 基础目录
        .canonicalize()
        .map_err(|错误| format!("无法读取目录：{错误}"))?;
    let 规范路径 = 候选
        .canonicalize()
        .map_err(|错误| format!("无法读取目录：{错误}"))?;
    if !规范路径.starts_with(&规范基础) {
        return Err("路径越界，已拒绝操作".into());
    }
    Ok(候选)
}

pub fn 移动目录(来源: &Path, 目标: &Path) -> io::Result<()> {
    if 目标.exists() {
        return Err(io::Error::new(
            io::ErrorKind::AlreadyExists,
            "目标位置已存在同名文件夹",
        ));
    }
    if let Some(父目录) = 目标.parent() {
        fs::create_dir_all(父目录)?;
    }
    match fs::rename(来源, 目标) {
        Ok(()) => Ok(()),
        Err(重命名错误) => {
            // 跨盘符或偶发占用：退化为复制后再删除。
            复制目录(来源, 目标)?;
            fs::remove_dir_all(来源).map_err(|删除错误| {
                io::Error::new(
                    删除错误.kind(),
                    format!(
                        "内容已复制到新位置，但无法删除旧目录：{删除错误}（移动错误：{重命名错误}）"
                    ),
                )
            })
        }
    }
}

pub fn 复制目录(来源: &Path, 目标: &Path) -> io::Result<u64> {
    let mut 已复制 = 0u64;
    fs::create_dir_all(目标)?;
    for 条目 in WalkDir::new(来源).follow_links(false) {
        let 条目 = 条目.map_err(|错误| io::Error::new(io::ErrorKind::Other, 错误.to_string()))?;
        let 相对路径 = 条目
            .path()
            .strip_prefix(来源)
            .map_err(|错误| io::Error::new(io::ErrorKind::InvalidData, 错误.to_string()))?;
        if 相对路径.as_os_str().is_empty() {
            continue;
        }
        let 目标路径 = 目标.join(相对路径);
        let 类型 = 条目.file_type();
        if 类型.is_dir() {
            fs::create_dir_all(&目标路径)?;
        } else if 类型.is_file() {
            if let Some(父目录) = 目标路径.parent() {
                fs::create_dir_all(父目录)?;
            }
            fs::copy(条目.path(), &目标路径)?;
            已复制 += 1;
        }
    }
    Ok(已复制)
}

pub fn 目录大小(路径: &Path) -> (u64, u32) {
    let mut 总字节 = 0u64;
    let mut 文件数 = 0u32;
    for 条目 in WalkDir::new(路径)
        .follow_links(false)
        .into_iter()
        .flatten()
    {
        if 条目.file_type().is_file() {
            if let Ok(元数据) = 条目.metadata() {
                总字节 = 总字节.saturating_add(元数据.len());
                文件数 = 文件数.saturating_add(1);
            }
        }
    }
    (总字节, 文件数)
}

/// 读取目录下的直接子目录，过滤隐藏项与系统垃圾目录，并按名称排序。
pub fn 读取子目录(路径: &Path) -> Vec<PathBuf> {
    let Ok(读取结果) = fs::read_dir(路径) else {
        return Vec::new();
    };
    let mut 目录列表: Vec<PathBuf> = 读取结果
        .flatten()
        .filter(|条目| {
            let 名称 = 条目.file_name().to_string_lossy().to_string();
            !名称.starts_with('.')
                && !名称.eq_ignore_ascii_case("System Volume Information")
                && !名称.eq_ignore_ascii_case("__MACOSX")
                && 条目.file_type().map(|类型| 类型.is_dir()).unwrap_or(false)
        })
        .map(|条目| 条目.path())
        .collect();
    目录列表.sort_by_key(|路径| {
        路径
            .file_name()
            .map(|名称| 名称.to_string_lossy().to_lowercase())
            .unwrap_or_default()
    });
    目录列表
}

pub fn 查找子项(目录: &Path, 名称: &str) -> Option<PathBuf> {
    let 读取结果 = fs::read_dir(目录).ok()?;
    for 条目 in 读取结果.flatten() {
        if 条目
            .file_name()
            .to_string_lossy()
            .eq_ignore_ascii_case(名称)
        {
            return Some(条目.path());
        }
    }
    None
}

/// 通过创建并删除一个临时文件，判断目录是否真的可写。
pub fn 目录可写(目录: &Path) -> bool {
    if !目录.is_dir() {
        return false;
    }
    let 探针 = 目录.join(format!(".wasteland-write-{}.tmp", uuid::Uuid::new_v4()));
    match fs::write(&探针, b"ok") {
        Ok(()) => {
            let _ = fs::remove_file(&探针);
            true
        }
        Err(_) => false,
    }
}

pub fn 路径相同(甲: &Path, 乙: &Path) -> bool {
    let 规范化 = |路径: &Path| {
        路径
            .to_string_lossy()
            .replace('/', "\\")
            .trim_end_matches('\\')
            .to_lowercase()
    };
    规范化(甲) == 规范化(乙)
}

pub fn 文件名文本(路径: &Path) -> String {
    路径
        .file_name()
        .map(|名称| 名称.to_string_lossy().to_string())
        .unwrap_or_default()
}

pub fn 小写扩展名(路径: &Path) -> String {
    路径
        .extension()
        .map(|扩展名| 扩展名.to_string_lossy().to_lowercase())
        .unwrap_or_default()
}

#[cfg(test)]
mod 测试 {
    use super::*;

    #[test]
    fn 拒绝路径穿越() {
        let 基础目录 = Path::new("C:\\Mods");
        assert!(拼接子路径(基础目录, "..").is_err());
        assert!(拼接子路径(基础目录, "a/b").is_err());
        assert!(拼接子路径(基础目录, "C:\\evil").is_err());
        assert!(拼接子路径(基础目录, "Good_Mod").is_ok());
    }

    #[test]
    fn 清理非法文件名() {
        assert_eq!(安全文件夹名("a:b?c").unwrap(), "a_b_c");
        assert!(安全文件夹名("CON").is_err());
        assert!(安全文件夹名("  ").is_err());
    }

    #[test]
    fn 短标识有长度上限() {
        let 标识 = 生成短标识("War3zuk AIO 中文版", 20);
        assert!(标识.len() <= 20);
        assert!(!标识.contains(' '));
    }
}
