use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;
use zip::ZipArchive;

use crate::备份;
use crate::模组库::停用目录;
use crate::模组信息::{显示名称, 读取模组信息};
use crate::设置::AppPaths;
use crate::数据模型::{InstallProgress, InstallReport, InstalledMod};
use crate::工具::{安全文件夹名, 查找子项, 文件名文本, 路径相同, 读取子目录};

const 最大条目数: usize = 100_000;
const 单文件上限: u64 = 4 * 1024 * 1024 * 1024;
const 总解压上限: u64 = 16 * 1024 * 1024 * 1024;

struct 临时目录(PathBuf);

impl Drop for 临时目录 {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

struct 安装任务 {
    根目录: PathBuf,
    名称: String,
}

pub fn 安装模组包(
    应用: &AppHandle,
    路径: &AppPaths,
    模组目录: &Path,
    输入列表: &[String],
    自动备份: bool,
) -> InstallReport {
    let mut 报告 = InstallReport::default();
    if 输入列表.is_empty() {
        报告.errors.push("没有选择任何文件或文件夹".into());
        return 报告;
    }
    fs::create_dir_all(模组目录).ok();
    if !模组目录.is_dir() {
        报告
            .errors
            .push(format!("无法创建 Mods 目录：{}", 模组目录.to_string_lossy()));
        return 报告;
    }

    let mut 已安装名称: Vec<String> = Vec::new();

    for 输入 in 输入列表 {
        let 路径项 = PathBuf::from(输入);
        let Some(元数据) = fs::metadata(&路径项).ok() else {
            报告
                .errors
                .push(format!("找不到：{}", 路径项.to_string_lossy()));
            continue;
        };
        let 备用名 = if 元数据.is_dir() {
            文件名文本(&路径项)
        } else {
            路径项
                .file_stem()
                .map(|名称| 名称.to_string_lossy().to_string())
                .unwrap_or_else(|| "mod".into())
        };

        let 临时守卫: Option<临时目录>;
        let 解压根目录: PathBuf;
        if 元数据.is_dir() {
            解压根目录 = 路径项.clone();
            临时守卫 = None;
        } else {
            let 扩展名 = 路径项
                .extension()
                .map(|扩展名| 扩展名.to_string_lossy().to_lowercase())
                .unwrap_or_default();
            if 扩展名 != "zip" {
                报告.errors.push(format!(
                    "{}：只支持 .zip 压缩包或文件夹（.7z / .rar 请先解压）",
                    路径项
                        .file_name()
                        .map(|名称| 名称.to_string_lossy().to_string())
                        .unwrap_or_default()
                ));
                continue;
            }
            let 临时路径 =
                std::env::temp_dir().join(format!("wasteland-{}", uuid::Uuid::new_v4()));
            if let Err(错误) = fs::create_dir_all(&临时路径) {
                报告
                    .errors
                    .push(format!("无法创建临时目录：{错误}"));
                continue;
            }
            let 守卫 = 临时目录(临时路径.clone());
            if let Err(错误) = 解压压缩包(应用, &路径项, &临时路径) {
                报告.errors.push(format!(
                    "{}：{错误}",
                    路径项
                        .file_name()
                        .map(|名称| 名称.to_string_lossy().to_string())
                        .unwrap_or_default()
                ));
                continue;
            }
            解压根目录 = 临时路径;
            临时守卫 = Some(守卫);
        }

        let 根目录列表 = 查找模组根目录(&解压根目录);
        if 根目录列表.is_empty() {
            报告.errors.push(format!(
                "{}：没有找到包含 ModInfo.xml 的模组文件夹",
                路径项
                    .file_name()
                    .map(|名称| 名称.to_string_lossy().to_string())
                    .unwrap_or_default()
            ));
            continue;
        }

        let 任务列表: Vec<安装任务> = 根目录列表
            .into_iter()
            .map(|根目录| {
                let 原始名称 = if 路径相同(&根目录, &解压根目录) || 路径相同(&根目录, &路径项) {
                    备用名.clone()
                } else {
                    文件名文本(&根目录)
                };
                安装任务 {
                    根目录,
                    名称: 原始名称,
                }
            })
            .collect();

        for 任务 in 任务列表 {
            let 模组目录真实 = dunce::canonicalize(模组目录)
                .unwrap_or_else(|_| 模组目录.to_path_buf());
            let 根真实 = dunce::canonicalize(&任务.根目录)
                .unwrap_or_else(|_| 任务.根目录.clone());
            if 根真实.starts_with(&模组目录真实) {
                报告.errors.push(format!(
                    "{}：不能从当前 Mods 目录内部安装，请直接在模组库中启用它",
                    任务.名称
                ));
                continue;
            }
            let 名称 = match 安全文件夹名(&任务.名称) {
                Ok(名称) => 名称,
                Err(错误) => {
                    报告.errors.push(format!("{}：{错误}", 任务.名称));
                    continue;
                }
            };
            if 已安装名称
                .iter()
                .any(|已有| 已有.eq_ignore_ascii_case(&名称))
            {
                报告
                    .errors
                    .push(format!("{名称}：同一个压缩包里有两个同名模组"));
                continue;
            }

            let 启用目标 = 模组目录.join(&名称);
            let 停用目标 = 停用目录(模组目录).join(&名称);
            let mut 已有目录: Vec<PathBuf> = Vec::new();
            if 启用目标.exists() {
                已有目录.push(启用目标);
            }
            if 停用目标.exists() {
                已有目录.push(停用目标);
            }
            if !已有目录.is_empty() {
                if !自动备份 {
                    报告
                        .errors
                        .push(format!("{名称}：同名模组已存在，且自动备份已关闭"));
                    continue;
                }
                let mut 备份失败 = false;
                for 旧目录 in &已有目录 {
                    let 信息 = 读取模组信息(旧目录).info;
                    match 备份::创建备份(路径, 旧目录, "replace", 信息.as_ref()) {
                        Ok(_) => {
                            if !报告
                                .replaced
                                .iter()
                                .any(|已有| 已有.eq_ignore_ascii_case(&名称))
                            {
                                报告.replaced.push(名称.clone());
                            }
                        }
                        Err(错误) => {
                            备份失败 = true;
                            报告
                                .errors
                                .push(format!("{名称}：旧版本备份失败，未覆盖（{错误}）"));
                            break;
                        }
                    }
                }
                if 备份失败 {
                    continue;
                }
            }

            let 总文件数 = 统计文件数(&任务.根目录);
            let 提示 = format!("正在安装 {名称}");
            发送进度(应用, "install", &提示, 0, 总文件数.max(1));
            let 目标 = 模组目录.join(&名称);
            let mut 已完成 = 0usize;
            let 复制结果 = 复制文件树(&任务.根目录, &目标, &mut |_| {
                已完成 += 1;
                if 已完成 % 25 == 0 || 已完成 == 总文件数 {
                    发送进度(应用, "install", &提示, 已完成, 总文件数.max(1));
                }
            });
            if let Err(错误) = 复制结果 {
                let _ = fs::remove_dir_all(&目标);
                报告.errors.push(format!(
                    "{名称}：复制失败（{错误}）；旧版本如果被备份，可在“备份”页恢复"
                ));
                continue;
            }
            发送进度(
                应用,
                "install",
                &提示,
                总文件数.max(1),
                总文件数.max(1),
            );

            let 读取结果 = 读取模组信息(&目标);
            let 文件夹 = 文件名文本(&目标);
            已安装名称.push(文件夹.clone());
            报告.installed.push(InstalledMod {
                folder: 文件夹,
                display_name: 显示名称(读取结果.info.as_ref(), &名称),
                version: 读取结果.info.as_ref().and_then(|信息| 信息.version.clone()),
            });
        }

        drop(临时守卫);
    }

    报告.replaced.sort();
    报告.replaced.dedup();
    发送进度(应用, "done", "安装完成", 1, 1);
    报告
}

fn 发送进度(应用: &AppHandle, 阶段: &str, 提示: &str, 当前: usize, 总数: usize) {
    let 百分比 = if 总数 == 0 {
        0.0
    } else {
        (当前 as f32 / 总数 as f32 * 100.0).clamp(0.0, 100.0)
    };
    let _ = 应用.emit(
        "install-progress",
        InstallProgress {
            phase: 阶段.to_string(),
            label: 提示.to_string(),
            current: 当前,
            total: 总数,
            percent: 百分比,
        },
    );
}

fn 解压压缩包(应用: &AppHandle, 压缩包路径: &Path, 目标目录: &Path) -> Result<(), String> {
    let 文件 = fs::File::open(压缩包路径).map_err(|错误| format!("无法打开压缩包：{错误}"))?;
    let mut 压缩包 =
        ZipArchive::new(文件).map_err(|错误| format!("不是有效的 ZIP 压缩包：{错误}"))?;
    let 总条目数 = 压缩包.len();
    if 总条目数 > 最大条目数 {
        return Err("压缩包内文件数量异常，已拒绝解压".into());
    }
    let mut 累计字节 = 0u64;
    for 序号 in 0..总条目数 {
        let mut 条目 = 压缩包
            .by_index(序号)
            .map_err(|错误| format!("读取压缩包失败：{错误}"))?;
        let Some(相对路径) = 条目.enclosed_name() else {
            return Err("压缩包包含不安全的路径，已拒绝解压".into());
        };
        // macOS / git 的元数据不应让整个压缩包失败。
        if 相对路径.components().any(|分量| {
            let 名称 = 分量.as_os_str().to_string_lossy();
            名称.starts_with('.') || 名称.eq_ignore_ascii_case("__MACOSX")
        }) {
            continue;
        }
        let Some(相对路径) = 安全压缩包路径(&相对路径) else {
            return Err(format!(
                "压缩包包含不安全的路径：{}",
                相对路径.to_string_lossy()
            ));
        };
        let 输出路径 = 目标目录.join(&相对路径);
        if 条目.is_dir() {
            fs::create_dir_all(&输出路径).map_err(|错误| format!("创建目录失败：{错误}"))?;
            continue;
        }
        let 大小 = 条目.size();
        if 大小 > 单文件上限 {
            return Err("压缩包内的单个文件过大，已拒绝解压".into());
        }
        累计字节 = 累计字节.saturating_add(大小);
        if 累计字节 > 总解压上限 {
            return Err("压缩包解压后体积过大，已拒绝解压".into());
        }
        if let Some(父目录) = 输出路径.parent() {
            fs::create_dir_all(父目录).map_err(|错误| format!("创建目录失败：{错误}"))?;
        }
        let mut 输出文件 =
            fs::File::create(&输出路径).map_err(|错误| format!("写入文件失败：{错误}"))?;
        io::copy(&mut 条目, &mut 输出文件).map_err(|错误| format!("解压失败：{错误}"))?;
        if 序号 % 50 == 0 {
            发送进度(应用, "extract", "正在解压压缩包", 序号 + 1, 总条目数);
        }
    }
    发送进度(应用, "extract", "压缩包解压完成", 总条目数, 总条目数);
    Ok(())
}

fn 安全压缩包路径(路径: &Path) -> Option<PathBuf> {
    let mut 结果 = PathBuf::new();
    for 分量 in 路径.components() {
        let std::path::Component::Normal(段落) = 分量 else {
            return None;
        };
        let 原始 = 段落.to_string_lossy();
        let 清理后 = 安全文件夹名(&原始).ok()?;
        if 清理后 != 原始 {
            return None;
        }
        结果.push(段落);
    }
    if 结果.as_os_str().is_empty() {
        None
    } else {
        Some(结果)
    }
}

fn 查找模组根目录(根目录: &Path) -> Vec<PathBuf> {
    if 查找子项(根目录, "ModInfo.xml").is_some() {
        return vec![根目录.to_path_buf()];
    }
    let mut 结果 = Vec::new();
    let mut 队列: Vec<(PathBuf, usize)> = vec![(根目录.to_path_buf(), 0)];
    while let Some((目录, 深度)) = 队列.pop() {
        if 深度 > 0 && 查找子项(&目录, "ModInfo.xml").is_some() {
            结果.push(目录);
            continue;
        }
        if 深度 >= 4 {
            continue;
        }
        for 子目录 in 读取子目录(&目录) {
            队列.push((子目录, 深度 + 1));
        }
    }
    结果.sort_by_key(|路径| 路径.to_string_lossy().to_lowercase());
    结果.dedup();
    结果
}

fn 统计文件数(根目录: &Path) -> usize {
    WalkDir::new(根目录)
        .follow_links(false)
        .into_iter()
        .flatten()
        .filter(|条目| 条目.file_type().is_file())
        .count()
}

fn 复制文件树(
    来源: &Path,
    目标: &Path,
    每复制一个: &mut dyn FnMut(u64),
) -> Result<(), String> {
    fs::create_dir_all(目标).map_err(|错误| format!("无法创建目标目录：{错误}"))?;
    for 条目 in WalkDir::new(来源)
        .follow_links(false)
        .into_iter()
        .flatten()
    {
        let 相对路径 = 条目
            .path()
            .strip_prefix(来源)
            .map_err(|错误| format!("路径错误：{错误}"))?;
        if 相对路径.as_os_str().is_empty() {
            continue;
        }
        let 目标路径 = 目标.join(相对路径);
        let 类型 = 条目.file_type();
        if 类型.is_dir() {
            fs::create_dir_all(&目标路径).map_err(|错误| format!("创建目录失败：{错误}"))?;
        } else if 类型.is_file() {
            if let Some(父目录) = 目标路径.parent() {
                fs::create_dir_all(父目录).map_err(|错误| format!("创建目录失败：{错误}"))?;
            }
            let 字节数 = fs::copy(条目.path(), &目标路径).map_err(|错误| {
                format!("复制 {} 失败：{错误}", 相对路径.to_string_lossy())
            })?;
            每复制一个(字节数);
        }
    }
    Ok(())
}

#[cfg(test)]
mod 测试 {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn 能找到嵌套的模组根目录() {
        let 临时 = tempdir().unwrap();
        let 根目录 = 临时.path().join("Collection");
        fs::create_dir_all(根目录.join("GoodMod")).unwrap();
        fs::write(根目录.join("GoodMod").join("ModInfo.xml"), "<xml/>").unwrap();
        let 结果 = 查找模组根目录(临时.path());
        assert_eq!(结果.len(), 1);
        assert!(结果[0].ends_with("GoodMod"));
    }

    #[test]
    fn 拒绝不安全的压缩包路径() {
        assert!(安全压缩包路径(Path::new("../evil.txt")).is_none());
        assert!(安全压缩包路径(Path::new("ok/file.txt")).is_some());
        assert!(安全压缩包路径(Path::new("CON")).is_none());
    }
}
