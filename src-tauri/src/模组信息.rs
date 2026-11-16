use std::fs;
use std::path::Path;

use crate::工具::查找子项;

#[derive(Debug, Clone, Default)]
pub struct ParsedModInfo {
    pub name: Option<String>,
    pub display_name: Option<String>,
    pub version: Option<String>,
    pub author: Option<String>,
    pub description: Option<String>,
    pub website: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct ModInfoRead {
    pub info: Option<ParsedModInfo>,
    pub issue: Option<String>,
}

/// 同时兼容旧版 `<ModInfo>` 与 A21+ `<xml>` 布局读取 ModInfo.xml。
/// 当文件不是严格 XML 时，降级为宽松的属性/元素扫描。
pub fn 读取模组信息(目录: &Path) -> ModInfoRead {
    let Some(路径) = 查找子项(目录, "ModInfo.xml") else {
        return ModInfoRead {
            info: None,
            issue: Some("缺少 ModInfo.xml，游戏不会加载这个文件夹".into()),
        };
    };
    let 字节 = match fs::read(&路径) {
        Ok(字节) => 字节,
        Err(错误) => {
            return ModInfoRead {
                info: None,
                issue: Some(format!("无法读取 ModInfo.xml：{错误}")),
            }
        }
    };
    let 文本 = String::from_utf8_lossy(&字节)
        .trim_start_matches('\u{feff}')
        .to_string();

    if let Ok(文档) = roxmltree::Document::parse(&文本) {
        let 根节点 = 文档.root_element();
        let mut 信息 = ParsedModInfo {
            name: 取字段(根节点, "Name"),
            display_name: 取字段(根节点, "DisplayName"),
            version: 取字段(根节点, "Version"),
            author: 取字段(根节点, "Author"),
            description: 取字段(根节点, "Description"),
            website: 取字段(根节点, "Website"),
        };
        if 信息.display_name.is_none() {
            信息.display_name = 信息.name.clone();
        }
        let 有字段 = 信息.name.is_some()
            || 信息.display_name.is_some()
            || 信息.version.is_some()
            || 信息.author.is_some();
        if !有字段 {
            return ModInfoRead {
                info: Some(信息),
                issue: Some("ModInfo.xml 中没有读到名称或版本".into()),
            };
        }
        return ModInfoRead {
            info: Some(信息),
            issue: None,
        };
    }

    let mut 信息 = ParsedModInfo {
        name: 宽松取值(&文本, "Name"),
        display_name: 宽松取值(&文本, "DisplayName"),
        version: 宽松取值(&文本, "Version"),
        author: 宽松取值(&文本, "Author"),
        description: 宽松取值(&文本, "Description"),
        website: 宽松取值(&文本, "Website"),
    };
    if 信息.display_name.is_none() {
        信息.display_name = 信息.name.clone();
    }
    let 有字段 = 信息.name.is_some()
        || 信息.display_name.is_some()
        || 信息.version.is_some()
        || 信息.author.is_some();
    ModInfoRead {
        info: Some(信息),
        issue: if 有字段 {
            Some("ModInfo.xml 不是严格合法的 XML，已用宽松模式读取".into())
        } else {
            Some("ModInfo.xml 无法解析，也没有读到可用字段".into())
        },
    }
}

fn 取字段(节点: roxmltree::Node<'_, '_>, 字段名: &str) -> Option<String> {
    for 属性 in 节点.attributes() {
        if 属性.name().eq_ignore_ascii_case(字段名) {
            if let Some(值) = 清理文本(属性.value()) {
                return Some(值);
            }
        }
    }
    for 子节点 in 节点.descendants().filter(|节点| 节点.is_element()) {
        if 子节点.tag_name().name().eq_ignore_ascii_case(字段名) {
            for 属性 in 子节点.attributes() {
                if 属性.name().eq_ignore_ascii_case("value") {
                    if let Some(值) = 清理文本(属性.value()) {
                        return Some(值);
                    }
                }
            }
            if let Some(值) = 子节点.text().and_then(清理文本) {
                return Some(值);
            }
        }
    }
    None
}

fn 清理文本(值: &str) -> Option<String> {
    let 修剪后 = 值.trim();
    if 修剪后.is_empty() {
        None
    } else {
        Some(修剪后.to_string())
    }
}

fn 宽松取值(文本: &str, 字段名: &str) -> Option<String> {
    let 小写文本 = 文本.to_ascii_lowercase();
    let 小写字段 = 字段名.to_ascii_lowercase();

    // 任意位置的属性形式，例如 <ModInfo Name="Foo"> 或 <Name value="Foo" />
    if let Some(值) = 属性值(&小写文本, 文本, &小写字段) {
        return 清理文本(&值);
    }

    let mut 游标 = 0usize;
    let 开标签 = format!("<{小写字段}");
    while let Some(偏移) = 小写文本[游标..].find(&开标签) {
        let 起点 = 游标 + 偏移;
        let 标签名之后 = 起点 + 开标签.len();
        let 边界正确 = 小写文本[标签名之后..]
            .chars()
            .next()
            .map(|字符| 字符 == '>' || 字符 == '/' || 字符.is_whitespace())
            .unwrap_or(false);
        if !边界正确 {
            游标 = 标签名之后;
            continue;
        }
        let Some(标签长度) = 文本[起点..].find('>') else {
            break;
        };
        let 标签 = &文本[起点..起点 + 标签长度];
        if let Some(值) = 属性值(&标签.to_ascii_lowercase(), 标签, "value") {
            return 清理文本(&值);
        }
        let 内容起点 = 起点 + 标签长度 + 1;
        let 闭合标签 = format!("</{小写字段}>");
        let 内容小写 = 小写文本[内容起点..].to_ascii_lowercase();
        if let Some(结束) = 内容小写.find(&闭合标签) {
            return 清理文本(&解码实体(&文本[内容起点..内容起点 + 结束]));
        }
        游标 = 标签名之后;
    }
    None
}

fn 属性值(小写文本: &str, 原文: &str, 字段名: &str) -> Option<String> {
    let 关键字 = format!("{字段名}=");
    let mut 游标 = 0usize;
    while let Some(偏移) = 小写文本[游标..].find(&关键字) {
        let 位置 = 游标 + 偏移;
        // 查找 Name= 时不要误命中 DisplayName=。
        let 前边界正确 = 位置 == 0
            || (!小写文本.as_bytes()[位置 - 1].is_ascii_alphanumeric()
                && 小写文本.as_bytes()[位置 - 1] != b'_');
        let mut 引号位置 = 位置 + 关键字.len();
        while 引号位置 < 小写文本.len() && 小写文本.as_bytes()[引号位置].is_ascii_whitespace() {
            引号位置 += 1;
        }
        if !前边界正确 || 引号位置 >= 原文.len() {
            游标 = 位置 + 关键字.len();
            continue;
        }
        let 引号 = 原文.as_bytes()[引号位置] as char;
        if 引号 != '"' && 引号 != '\'' {
            游标 = 位置 + 关键字.len();
            continue;
        }
        let 值起点 = 引号位置 + 1;
        if let Some(结束) = 原文[值起点..].find(引号) {
            return Some(解码实体(&原文[值起点..值起点 + 结束]));
        }
        break;
    }
    None
}

fn 解码实体(文本: &str) -> String {
    let mut 结果 = String::with_capacity(文本.len());
    let mut 剩余 = 文本;
    while let Some(位置) = 剩余.find('&') {
        结果.push_str(&剩余[..位置]);
        剩余 = &剩余[位置..];
        let Some(结束) = 剩余.find(';') else {
            结果.push_str(剩余);
            return 结果;
        };
        let 实体 = &剩余[1..结束];
        let 解码结果 = match 实体 {
            "amp" => Some('&'),
            "lt" => Some('<'),
            "gt" => Some('>'),
            "quot" => Some('"'),
            "apos" => Some('\''),
            _ if 实体.starts_with("#x") || 实体.starts_with("#X") => {
                u32::from_str_radix(&实体[2..], 16)
                    .ok()
                    .and_then(char::from_u32)
            }
            _ if 实体.starts_with('#') => 实体[1..].parse::<u32>().ok().and_then(char::from_u32),
            _ => None,
        };
        match 解码结果 {
            Some(字符) => {
                结果.push(字符);
                剩余 = &剩余[结束 + 1..];
            }
            None => {
                结果.push('&');
                剩余 = &剩余[1..];
            }
        }
    }
    结果.push_str(剩余);
    结果
}

pub fn 显示名称(信息: Option<&ParsedModInfo>, 文件夹名: &str) -> String {
    信息
        .and_then(|信息| 信息.display_name.clone())
        .or_else(|| 信息.and_then(|信息| 信息.name.clone()))
        .unwrap_or_else(|| 文件夹名.to_string())
}

#[cfg(test)]
mod 测试 {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn 写入模组(目录: &Path, xml: &str) {
        fs::create_dir_all(目录).unwrap();
        fs::write(目录.join("ModInfo.xml"), xml).unwrap();
    }

    #[test]
    fn 解析新版属性格式() {
        let 临时目录 = tempdir().unwrap();
        let 目录 = 临时目录.path().join("TestMod");
        写入模组(
            &目录,
            r#"<?xml version="1.0" encoding="UTF-8"?>
<xml>
  <Name value="Author_TestMod" />
  <DisplayName value="Test Mod" />
  <Version value="1.2.3" />
  <Author value="Author" />
  <Description value="Hello &amp; welcome" />
  <Website value="https://example.com" />
</xml>"#,
        );
        let 读取结果 = 读取模组信息(&目录);
        assert!(读取结果.issue.is_none());
        let 信息 = 读取结果.info.unwrap();
        assert_eq!(信息.display_name.as_deref(), Some("Test Mod"));
        assert_eq!(信息.version.as_deref(), Some("1.2.3"));
        assert_eq!(信息.description.as_deref(), Some("Hello & welcome"));
    }

    #[test]
    fn 解析旧版模组信息() {
        let 临时目录 = tempdir().unwrap();
        let 目录 = 临时目录.path().join("Legacy");
        写入模组(
            &目录,
            r#"<ModInfo>
  <Name value="Legacy" />
  <Description value="Old but good" />
  <Author value="Someone" />
  <Version value="0.1" />
</ModInfo>"#,
        );
        let 读取结果 = 读取模组信息(&目录);
        assert!(读取结果.issue.is_none());
        let 信息 = 读取结果.info.unwrap();
        assert_eq!(信息.name.as_deref(), Some("Legacy"));
        assert_eq!(信息.display_name.as_deref(), Some("Legacy"));
    }

    #[test]
    fn 解析根属性与文本节点() {
        let 临时目录 = tempdir().unwrap();
        let 目录 = 临时目录.path().join("Attrs");
        写入模组(
            &目录,
            r#"<ModInfo Name="AttrMod" Version="2.0" Author="A">
  <DisplayName>Attribute Mod</DisplayName>
</ModInfo>"#,
        );
        let 读取结果 = 读取模组信息(&目录);
        let 信息 = 读取结果.info.unwrap();
        assert_eq!(信息.name.as_deref(), Some("AttrMod"));
        assert_eq!(信息.display_name.as_deref(), Some("Attribute Mod"));
        assert_eq!(信息.version.as_deref(), Some("2.0"));
    }

    #[test]
    fn 宽松读取损坏的xml() {
        let 临时目录 = tempdir().unwrap();
        let 目录 = 临时目录.path().join("Broken");
        写入模组(
            &目录,
            r#"<xml>
  <Name value="BrokenMod" />
  <DisplayName value="Broken & Mod" />
  <Version value="1.0" />
</xml>"#,
        );
        let 读取结果 = 读取模组信息(&目录);
        let 信息 = 读取结果.info.unwrap();
        assert_eq!(信息.name.as_deref(), Some("BrokenMod"));
        assert_eq!(信息.version.as_deref(), Some("1.0"));
        assert!(读取结果.issue.is_some());
    }

    #[test]
    fn 缺少模组信息会报告() {
        let 临时目录 = tempdir().unwrap();
        let 读取结果 = 读取模组信息(临时目录.path());
        assert!(读取结果.info.is_none());
        assert!(读取结果.issue.unwrap().contains("ModInfo.xml"));
    }
}
