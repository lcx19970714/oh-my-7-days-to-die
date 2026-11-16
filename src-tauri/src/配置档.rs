use std::collections::HashMap;
use std::fs;

use crate::数据模型::{ApplyReport, Profile};
use crate::设置::{写入json, AppPaths};
use crate::工具::{当前毫秒, 文件名文本, 读取子目录};

fn 读取全部配置档(路径: &AppPaths) -> Vec<Profile> {
    fs::read_to_string(&路径.配置档文件)
        .ok()
        .and_then(|文本| serde_json::from_str::<Vec<Profile>>(&文本).ok())
        .unwrap_or_default()
}

fn 写入全部配置档(路径: &AppPaths, 配置档列表: &[Profile]) -> Result<(), String> {
    写入json(&路径.配置档文件, &配置档列表)
}

pub fn 列出配置档(路径: &AppPaths) -> Vec<Profile> {
    let mut 配置档列表 = 读取全部配置档(路径);
    配置档列表.sort_by(|甲, 乙| 乙.updated_at.cmp(&甲.updated_at));
    配置档列表
}

pub fn 保存配置档(路径: &AppPaths, 名称: &str, 模组列表: &[String]) -> Result<Profile, String> {
    let 名称 = 名称.trim();
    if 名称.is_empty() {
        return Err("配置档名称不能为空".into());
    }
    if 名称.chars().count() > 40 {
        return Err("配置档名称最多 40 个字符".into());
    }
    let mut 全部 = 读取全部配置档(路径);
    let 现在 = 当前毫秒();
    if let Some(已有) = 全部
        .iter_mut()
        .find(|配置档| 配置档.name.eq_ignore_ascii_case(名称))
    {
        已有.mods = 模组列表.to_vec();
        已有.updated_at = 现在;
        let 结果 = 已有.clone();
        写入全部配置档(路径, &全部)?;
        return Ok(结果);
    }
    let 配置档 = Profile {
        id: format!("p{现在}"),
        name: 名称.to_string(),
        mods: 模组列表.to_vec(),
        created_at: 现在,
        updated_at: 现在,
    };
    全部.push(配置档.clone());
    写入全部配置档(路径, &全部)?;
    Ok(配置档)
}

pub fn 删除配置档(路径: &AppPaths, 标识: &str) -> Result<(), String> {
    let mut 全部 = 读取全部配置档(路径);
    let 删除前数量 = 全部.len();
    全部.retain(|配置档| 配置档.id != 标识);
    if 全部.len() == 删除前数量 {
        return Err("配置档不存在".into());
    }
    写入全部配置档(路径, &全部)
}

pub fn 应用配置档(
    路径: &AppPaths,
    标识: &str,
    模组目录: &std::path::Path,
) -> Result<ApplyReport, String> {
    let 配置档 = 读取全部配置档(路径)
        .into_iter()
        .find(|配置档| 配置档.id == 标识)
        .ok_or_else(|| "配置档不存在".to_string())?;
    let 目标启用项: HashMap<String, &str> = 配置档
        .mods
        .iter()
        .map(|名称| (名称.to_lowercase(), 名称.as_str()))
        .collect();
    let 停用目录 = crate::模组库::停用目录(模组目录);
    let 启用目录列表 = 读取子目录(模组目录);
    let 停用目录列表 = 读取子目录(&停用目录);
    let mut 当前状态: HashMap<String, (String, bool)> = HashMap::new();
    for 目录 in 启用目录列表 {
        let 名称 = 文件名文本(&目录);
        当前状态.insert(名称.to_lowercase(), (名称, true));
    }
    for 目录 in 停用目录列表 {
        let 名称 = 文件名文本(&目录);
        当前状态.insert(名称.to_lowercase(), (名称, false));
    }

    let mut 报告 = ApplyReport::default();
    for (小写名, (文件夹, 当前已启用)) in &当前状态 {
        let 目标启用 = 目标启用项.contains_key(小写名);
        if 目标启用 == *当前已启用 {
            continue;
        }
        match crate::模组库::设置启用(模组目录, 文件夹, 目标启用) {
            Ok(()) => {
                if 目标启用 {
                    报告.enabled += 1;
                } else {
                    报告.disabled += 1;
                }
            }
            Err(错误) => 报告.errors.push(format!("{文件夹}: {错误}")),
        }
    }
    for (小写名, 原始名称) in &目标启用项 {
        if !当前状态.contains_key(小写名) {
            报告.missing.push((*原始名称).to_string());
        }
    }
    Ok(报告)
}
