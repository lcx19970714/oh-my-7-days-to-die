use std::path::Path;
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Manager};

use crate::安装::安装模组包;
use crate::备份::{创建备份, 删除备份 as 删除备份数据, 恢复备份 as 恢复备份数据};
use crate::模组库::{self, 上下文};
use crate::模组信息::读取模组信息;
use crate::配置档::{
    保存配置档 as 写入配置档, 删除配置档 as 移除配置档, 应用配置档 as 执行配置档,
};
use crate::设置::Settings;
use crate::数据模型::{
    ApplyReport, BackupEntry, Bootstrap, InstallReport, ModDetails, Profile, Snapshot,
};
use crate::工具::{文件名文本, 查找子项, 读取子目录};
use crate::游戏::{检测游戏 as 查找游戏, 启动游戏 as 启动游戏进程, GameInfo};

pub struct 写锁(pub Arc<Mutex<()>>);

async fn 串行执行<T, F>(应用: AppHandle, 任务: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce(&AppHandle) -> Result<T, String> + Send + 'static,
{
    let 锁 = 应用.state::<写锁>().0.clone();
    let 结果 = tauri::async_runtime::spawn_blocking(move || {
        let _守卫 = 锁.lock().unwrap_or_else(|中毒| 中毒.into_inner());
        任务(&应用)
    })
    .await
    .map_err(|错误| format!("后台任务失败：{错误}"))?;
    结果
}

fn 构建启动数据(应用: &AppHandle, 覆盖目录: Option<&str>) -> Result<Bootstrap, String> {
    let 上下文 = 上下文::加载(应用)?;
    let 快照 = 模组库::扫描(&上下文, 覆盖目录)?;
    Ok(Bootstrap {
        settings: 上下文.设置.clone(),
        snapshot: 快照,
        data_dir: 上下文.路径.配置目录.to_string_lossy().to_string(),
        backups_dir: 上下文.路径.备份目录.to_string_lossy().to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

#[tauri::command]
pub async fn 启动数据(应用: AppHandle) -> Result<Bootstrap, String> {
    串行执行(应用, |应用| 构建启动数据(应用, None)).await
}

#[tauri::command]
pub async fn 获取快照(
    应用: AppHandle,
    mods_dir: Option<String>,
) -> Result<Snapshot, String> {
    串行执行(应用, move |应用| {
        let 上下文 = 上下文::加载(应用)?;
        模组库::扫描(&上下文, mods_dir.as_deref())
    })
    .await
}

fn 规范化设置(mut 设置: Settings) -> Result<Settings, String> {
    if let Some(原始路径) = 设置.game_path.take() {
        let 修剪后 = 原始路径.trim().to_string();
        if !修剪后.is_empty() {
            if !Path::new(&修剪后).is_dir() {
                return Err("游戏目录不存在，请重新选择".into());
            }
            设置.game_path = Some(修剪后);
        }
    }
    if let Some(原始路径) = 设置.mods_dir.take() {
        let 修剪后 = 原始路径.trim().to_string();
        if !修剪后.is_empty() {
            if !Path::new(&修剪后).is_dir() {
                // 选择了一个尚未创建的目录（例如首次使用用户数据目录）时，替用户建好。
                std::fs::create_dir_all(&修剪后)
                    .map_err(|错误| format!("无法创建 Mods 目录：{错误}"))?;
            }
            设置.mods_dir = Some(修剪后);
        }
    }
    if !matches!(设置.theme.as_str(), "dark" | "light" | "system") {
        设置.theme = "dark".into();
    }
    Ok(设置)
}

#[tauri::command]
pub async fn 保存设置(应用: AppHandle, settings: Settings) -> Result<Bootstrap, String> {
    串行执行(应用, move |应用| {
        let 上下文 = 上下文::加载(应用)?;
        let 设置 = 规范化设置(settings)?;
        设置.保存(&上下文.路径)?;
        构建启动数据(应用, None)
    })
    .await
}

#[tauri::command]
pub async fn 检测游戏安装(应用: AppHandle) -> Result<Option<GameInfo>, String> {
    串行执行(应用, move |_应用| {
        Ok(Some(GameInfo::从安装信息(查找游戏().as_ref())))
    })
    .await
}

#[tauri::command]
pub async fn 安装模组(
    应用: AppHandle,
    paths: Vec<String>,
    mods_dir: Option<String>,
) -> Result<InstallReport, String> {
    串行执行(应用, move |应用| {
        let 上下文 = 上下文::加载(应用)?;
        let 目标目录 = 模组库::当前模组目录(&上下文, mods_dir.as_deref());
        let 报告 = 安装模组包(
            应用,
            &上下文.路径,
            &目标目录,
            &paths,
            上下文.设置.auto_backup,
        );
        Ok(报告)
    })
    .await
}

#[tauri::command]
pub async fn 启用模组(
    应用: AppHandle,
    folder: String,
    enabled: bool,
    mods_dir: Option<String>,
) -> Result<(), String> {
    串行执行(应用, move |应用| {
        let 上下文 = 上下文::加载(应用)?;
        let 目标目录 = 模组库::当前模组目录(&上下文, mods_dir.as_deref());
        模组库::设置启用(&目标目录, &folder, enabled)
    })
    .await
}

#[tauri::command]
pub async fn 删除模组(
    应用: AppHandle,
    folder: String,
    enabled: bool,
    mods_dir: Option<String>,
) -> Result<BackupEntry, String> {
    串行执行(应用, move |应用| {
        let 上下文 = 上下文::加载(应用)?;
        let 目标目录 = 模组库::当前模组目录(&上下文, mods_dir.as_deref());
        let 基础目录 = if enabled {
            目标目录
        } else {
            模组库::停用目录(&目标目录)
        };
        let 模组目录 = crate::工具::解析子目录(&基础目录, &folder)?;
        let 信息 = 读取模组信息(&模组目录).info;
        创建备份(&上下文.路径, &模组目录, "delete", 信息.as_ref())
    })
    .await
}

#[tauri::command]
pub async fn 恢复备份(
    应用: AppHandle,
    id: String,
    mods_dir: Option<String>,
) -> Result<String, String> {
    串行执行(应用, move |应用| {
        let 上下文 = 上下文::加载(应用)?;
        let 目标目录 = 模组库::当前模组目录(&上下文, mods_dir.as_deref());
        恢复备份数据(&上下文.路径, &id, &目标目录)
    })
    .await
}

#[tauri::command]
pub async fn 删除备份(应用: AppHandle, id: String) -> Result<(), String> {
    串行执行(应用, move |应用| {
        let 上下文 = 上下文::加载(应用)?;
        删除备份数据(&上下文.路径, &id)
    })
    .await
}

#[tauri::command]
pub async fn 保存配置档(
    应用: AppHandle,
    name: String,
    mods_dir: Option<String>,
) -> Result<Profile, String> {
    串行执行(应用, move |应用| {
        let 上下文 = 上下文::加载(应用)?;
        let 目标目录 = 模组库::当前模组目录(&上下文, mods_dir.as_deref());
        let 模组列表: Vec<String> = 读取子目录(&目标目录)
            .into_iter()
            .filter(|目录| 查找子项(目录, "ModInfo.xml").is_some())
            .map(|目录| 文件名文本(&目录))
            .collect();
        写入配置档(&上下文.路径, &name, &模组列表)
    })
    .await
}

#[tauri::command]
pub async fn 应用配置档(
    应用: AppHandle,
    id: String,
    mods_dir: Option<String>,
) -> Result<ApplyReport, String> {
    串行执行(应用, move |应用| {
        let 上下文 = 上下文::加载(应用)?;
        let 目标目录 = 模组库::当前模组目录(&上下文, mods_dir.as_deref());
        执行配置档(&上下文.路径, &id, &目标目录)
    })
    .await
}

#[tauri::command]
pub async fn 删除配置档(应用: AppHandle, id: String) -> Result<(), String> {
    串行执行(应用, move |应用| {
        let 上下文 = 上下文::加载(应用)?;
        移除配置档(&上下文.路径, &id)
    })
    .await
}

#[tauri::command]
pub async fn 获取模组详情(
    应用: AppHandle,
    folder: String,
    enabled: bool,
    mods_dir: Option<String>,
) -> Result<ModDetails, String> {
    串行执行(应用, move |应用| {
        let 上下文 = 上下文::加载(应用)?;
        let 目标目录 = 模组库::当前模组目录(&上下文, mods_dir.as_deref());
        模组库::模组详情(&目标目录, &folder, enabled)
    })
    .await
}

#[tauri::command]
pub async fn 启动游戏(应用: AppHandle) -> Result<(), String> {
    串行执行(应用, move |应用| {
        let 上下文 = 上下文::加载(应用)?;
        let 游戏 = 上下文
            .游戏
            .as_ref()
            .ok_or_else(|| "未找到游戏安装，请先在设置里指定游戏目录".to_string())?;
        启动游戏进程(游戏, 上下文.设置.eac)
    })
    .await
}
