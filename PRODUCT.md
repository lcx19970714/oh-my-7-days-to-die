# Product

<!-- impeccable:product-schema 1 -->

## Platform

windows (Tauri 2 desktop app)

## Stack

用户指定：Rust + Tauri + TypeScript。前端实现委托给我：React 19 + Vite + 手写 CSS design tokens（不引入 UI 组件库）。

## Users

中文《七日杀》(7 Days to Die) PC 玩家。典型场景：装了 5–60 个 Modlet 或大型 Overhaul，从 Nexus Mods、7daystodiemods.com、官方论坛或 GitHub 下载 ZIP，手动解压到 `Mods` 目录；分不清游戏目录与 `%APPDATA%` 两处 Mods，害怕覆盖旧版本、坏档、多人服务器被 EAC 拦截。用户不是程序员，但看得懂版本号、文件夹和冲突提示。

## Product Purpose

把散落的 ZIP、文件夹和两处 Mods 目录，变成一份可读、可启停、可回滚的清单。成功标准：用户能在 10 秒内回答“游戏在哪、现在启用了几 个 Mod、有没有问题”，并在一次点击内安全地安装、停用、切换配置档或恢复旧版本。

## Positioning

不是下载站，也不是游戏启动器的替代品，而是本地 Mod 的“战地账本”：按游戏真实的文件夹加载顺序呈现，所有破坏性操作先落备份，配置档像存档一样一键切换。它承认 7DTD 的粗糙现实（两处目录、大小写、旧版 ModInfo），并把这种现实翻译成清楚的界面。

## Operating Context

- 游戏通过 Steam 安装；Mods 可位于 `%APPDATA%\7DaysToDie\Mods` 或 `<Steam>\steamapps\common\7 Days To Die\Mods`，两处都会被加载。
- 游戏按文件夹名的字母顺序加载 Mod；`0_TFP_Harmony` 通常必须最先加载。
- 游戏运行时会占用 Mod 文件；修改后需要重启游戏。
- 使用 Mod 通常需要关闭 EAC；EAC 开启时多人服务器会拒绝带 Mod 的客户端。
- Mod 主要来源：Nexus Mods、7daystodiemods.com、The Fun Pimps 官方论坛、GitHub（大型 Overhaul）。
- 大型 Overhaul 会替换大量 XML 与资源，体积可达数 GB；安装/备份需要进度反馈。
- 简体中文 Windows，路径可能包含中文与空格。

## Capabilities and Constraints

已确认要做的能力：

- 自动检测 Steam 游戏目录（注册表 + libraryfolders.vdf）与用户数据 Mods 目录。
- 扫描 ModInfo.xml v1/v2（含属性式、元素式、文本式与常见损坏 XML 的降级解析）。
- 启用/停用（移动到同级 `Mods_Disabled`，不依赖改名，不让游戏误加载）。
- 从 ZIP（可含多个 Mod）或文件夹安装；安全解压、识别嵌套根目录、覆盖前自动备份。
- 配置档保存/应用/删除；应用时报告缺失 Mod。
- 备份列表、恢复、永久删除；删除 Mod 默认进备份而非直接消失。
- 冲突检测（启用 Mod 之间相同相对路径的文件）、重复内部名、Harmony 缺失、目录不可写等健康检查。
- 启动游戏（EAC 关闭/开启两种入口）、打开目录。
- 深浅色主题；中文界面；安装进度事件；拖拽 ZIP 安装。

约束：

- 仅 Windows 优先；不实现 Nexus OAuth 下载（免费账号仍需网页下载，管理器负责本地安装）。
- 不支持 7z/RAR 内置解压（提示用户转为 ZIP 或文件夹）。
- 不修改游戏本体文件；不提供盗版/绕过 EAC 的能力。
- 所有示例数据必须标明为合成数据。

## Brand Commitments

用户要求：简约、优雅、现代化。中文优先；深色为默认（夜间游戏场景），提供浅色。避免游戏 UI 常见的脏锈迹、血迹、厚重金属质感与像素字体。

## Evidence on Hand

没有真实用户数据、真实 Mod 包或游戏安装可用于演示；UI 中的示例模组均为合成数据。真实产品截图需在运行时截取。

## Product Principles

1. **先看清楚，再动手。** 任何页面首先回答“现在是什么状态”，其次才是操作。
2. **破坏性操作必须可逆。** 覆盖、删除、应用配置档都先备份，并明确告诉用户备份在哪。
3. **尊重游戏的规则，而不是隐藏它。** 加载顺序、双目录、EAC、重启生效都直接呈现。
4. **密度服务于扫描。** 用清单与细线组织信息，不用一堆等大卡片。
5. **错误要给出下一步。** 每个失败都说明原因与可执行的恢复动作。

## Accessibility & Inclusion

键盘可完成导航、搜索、启停与关闭抽屉；焦点可见；正文对比度 ≥ 4.5:1；动画尊重 `prefers-reduced-motion`。
