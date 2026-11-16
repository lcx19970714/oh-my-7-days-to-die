use std::fs;
use std::path::{Path, PathBuf};

use crate::数据模型::BackupEntry;
use crate::模组信息::{显示名称, ParsedModInfo};
use crate::工具::{当前毫秒, 拼接子路径, 时间戳, 生成短标识, 文件名文本, 目录大小, 移动目录};
use crate::设置::AppPaths;

pub fn 创建备份(
    路径: &AppPaths,
    模组目录: &Path,
    原因: &str,
    信息: Option<&ParsedModInfo>,
) -> Result<BackupEntry, String> {
    if !模组目录.is_dir() {
        return Err("要备份的模组目录不存在".into());
    }
    let 文件夹 = 文件名文本(模组目录);
    if 文件夹.is_empty() {
        return Err("无法读取模组文件夹名".into());
    }
    let (字节数, _) = 目录大小(模组目录);
    let 基础标识 = format!("{}_{}", 时间戳(), 生成短标识(&文件夹, 32));
    let mut 标识 = 基础标识.clone();
    let mut 序号 = 2usize;
    while 路径.备份目录.join(&标识).exists() {
        标识 = format!("{基础标识}_{序号}");
        序号 += 1;
    }
    let 备份包 = 路径.备份目录.join(&标识);
    fs::create_dir_all(&备份包).map_err(|错误| format!("无法创建备份目录：{错误}"))?;
    let 内容目录 = 备份包.join("mod");
    if let Err(错误) = 移动目录(模组目录, &内容目录) {
        let _ = fs::remove_dir_all(&备份包);
        return Err(format!("移入备份失败：{错误}"));
    }

    let 条目 = BackupEntry {
        id: 标识.clone(),
        folder: 文件夹.clone(),
        display_name: 显示名称(信息, &文件夹),
        version: 信息.and_then(|信息| 信息.version.clone()),
        reason: 原因.to_string(),
        created_at: 当前毫秒(),
        size_bytes: 字节数,
    };
    if let Err(错误) = fs::write(
        备份包.join("meta.json"),
        serde_json::to_vec_pretty(&条目).unwrap_or_default(),
    ) {
        // 元数据写入失败时把模组移回去，避免数据丢失。
        let _ = 移动目录(&内容目录, 模组目录);
        let _ = fs::remove_dir_all(&备份包);
        return Err(format!("写入备份信息失败：{错误}"));
    }
    Ok(条目)
}

pub fn 列出备份(路径: &AppPaths) -> Vec<BackupEntry> {
    let Ok(读取结果) = fs::read_dir(&路径.备份目录) else {
        return Vec::new();
    };
    let mut 条目列表: Vec<BackupEntry> = 读取结果
        .flatten()
        .filter(|目录项| 目录项.file_type().map(|类型| 类型.is_dir()).unwrap_or(false))
        .filter_map(|目录项| {
            let 元数据文件 = 目录项.path().join("meta.json");
            let 文本 = fs::read_to_string(元数据文件).ok()?;
            let mut 备份条目: BackupEntry = serde_json::from_str(&文本).ok()?;
            if 备份条目.size_bytes == 0 {
                备份条目.size_bytes = 目录大小(&目录项.path().join("mod")).0;
            }
            Some(备份条目)
        })
        .collect();
    条目列表.sort_by(|甲, 乙| 乙.created_at.cmp(&甲.created_at));
    条目列表
}

pub fn 备份包路径(路径: &AppPaths, 标识: &str) -> Result<PathBuf, String> {
    拼接子路径(&路径.备份目录, 标识)
}

pub fn 恢复备份(路径: &AppPaths, 标识: &str, 模组目录: &Path) -> Result<String, String> {
    let 备份包 = 备份包路径(路径, 标识)?;
    let 元数据 = fs::read_to_string(备份包.join("meta.json"))
        .map_err(|_| "找不到这条备份的记录".to_string())?;
    let 条目: BackupEntry =
        serde_json::from_str(&元数据).map_err(|错误| format!("备份记录损坏：{错误}"))?;
    let 目标目录 = 拼接子路径(模组目录, &条目.folder)?;
    if 目标目录.exists() {
        return Err(format!(
            "“{}”已经存在于 Mods 目录，请先停用或移走它再恢复",
            条目.folder
        ));
    }
    fs::create_dir_all(模组目录).map_err(|错误| format!("无法创建 Mods 目录：{错误}"))?;
    移动目录(&备份包.join("mod"), &目标目录).map_err(|错误| format!("恢复失败：{错误}"))?;
    let _ = fs::remove_dir_all(&备份包);
    Ok(条目.folder)
}

pub fn 删除备份(路径: &AppPaths, 标识: &str) -> Result<(), String> {
    let 备份包 = 备份包路径(路径, 标识)?;
    if !备份包.exists() {
        return Err("备份不存在或已被删除".into());
    }
    fs::remove_dir_all(&备份包).map_err(|错误| format!("删除备份失败：{错误}"))
}
