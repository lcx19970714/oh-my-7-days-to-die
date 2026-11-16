# Surface — 主窗口

Mode: Operate
Primary target: `src/App.tsx`（单窗口六视图：总览 / 模组库 / 配置档 / 备份 / 来源 / 设置）

Audience: 中文 7DTD 玩家，夜间、第二块屏幕、游戏旁边使用。任务：确认状态、装/停 Mod、切换配置档、回滚。

## Direction contract

THESIS: 一张“战地清单”。它拒绝 Mod 管理器常见的等大卡片墙 + 统计数字仪表盘；用按游戏加载顺序编号的清单作为整个产品的主结构。

OWN-WORLD: 石墨黑底（#0B0C0D）、骨白文字（#ECEAE4）、单一余烬橙强调（#E9A15B）；1px 发丝线、2 位等宽编号、无圆角照片、无玻璃拟态、无锈迹纹理。浅色主题是同一套线框换成暖纸色。组件语言：清单行、字段表、状态刻度、右侧档案抽屉。

STORY: 用户先读到一句人话状态（“14 个模组已就绪，2 处需要处理”），看到待办清单，再进入模组库逐行处理；所有危险操作都有备份与明确后果。

FIRST VIEWPORT: 左侧 232px 导航轨（品牌、六个入口、底部游戏状态与启动按钮）；右侧主区顶部是 32px 标题与一句话摘要，下面是全宽“战备”横幅（游戏状态、Mods 目录、启用/停用/冲突三个内联数字、主按钮“启动游戏”），再下面是“需要处理”清单与“环境”字段表。没有统计卡片，没有眉标（kicker）。

FORM: 清单 / 账本（ledger），排在我七项候选的第 1 位。seed key: `field-ledger`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
