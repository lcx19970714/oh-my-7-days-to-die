#[path = "安装.rs"]
mod 安装;
#[path = "备份.rs"]
mod 备份;
#[path = "命令.rs"]
mod 命令;
#[path = "工具.rs"]
mod 工具;
#[path = "模组库.rs"]
mod 模组库;
#[path = "模组信息.rs"]
mod 模组信息;
#[path = "配置档.rs"]
mod 配置档;
#[path = "设置.rs"]
mod 设置;
#[path = "数据模型.rs"]
mod 数据模型;
#[path = "游戏.rs"]
mod 游戏;

use std::sync::{Arc, Mutex};

use 命令::写锁;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(写锁(Arc::new(Mutex::new(()))))
        .invoke_handler(tauri::generate_handler![
            命令::启动数据,
            命令::获取快照,
            命令::保存设置,
            命令::检测游戏安装,
            命令::安装模组,
            命令::启用模组,
            命令::删除模组,
            命令::恢复备份,
            命令::删除备份,
            命令::保存配置档,
            命令::应用配置档,
            命令::删除配置档,
            命令::获取模组详情,
            命令::启动游戏,
        ])
        .run(tauri::generate_context!())
        .expect("error while running 七日杀 Mod 管家");
}
