import {
  Archive,
  Boxes,
  Compass,
  Layers,
  LayoutDashboard,
  Play,
  Settings as SettingsIcon,
} from "lucide-react";

import { 文件名 } from "../数据/格式化";
import type { 页面键, Snapshot } from "../数据/类型";

interface 侧边栏属性 {
  当前页: 页面键;
  切换页面: (页面: 页面键) => void;
  快照: Snapshot;
  版本: string;
  启动游戏: () => void;
  忙碌: boolean;
}

const 导航项 = [
  { 键: "overview" as const, 名称: "总览", 图标: LayoutDashboard },
  { 键: "mods" as const, 名称: "模组库", 图标: Boxes },
  { 键: "profiles" as const, 名称: "配置档", 图标: Layers },
  { 键: "backups" as const, 名称: "备份", 图标: Archive },
  { 键: "discover" as const, 名称: "来源", 图标: Compass },
  { 键: "settings" as const, 名称: "设置", 图标: SettingsIcon },
];

export function 侧边栏({
  当前页,
  切换页面,
  快照,
  版本,
  启动游戏,
  忙碌,
}: 侧边栏属性) {
  const 游戏 = 快照.game;
  const 状态文字 = 游戏.running
    ? "游戏运行中"
    : 游戏.installed
      ? "已就绪"
      : "未找到游戏";
  const 状态类 = 游戏.running
    ? "dot dot--warn"
    : 游戏.installed
      ? "dot dot--ok"
      : "dot dot--muted";

  return (
    <aside className="rail">
      <nav className="rail__nav" aria-label="主导航">
        <p className="rail__label">工作台</p>
        {导航项.map((项) => {
          const 图标 = 项.图标;
          const 激活 = 当前页 === 项.键;
          const 徽标 =
            项.键 === "mods" && 快照.stats.conflicts > 0
              ? 快照.stats.conflicts
              : null;
          return (
            <button
              key={项.键}
              type="button"
              className={`rail__item ${激活 ? "is-active" : ""}`}
              onClick={() => 切换页面(项.键)}
              aria-current={激活 ? "page" : undefined}
              aria-label={项.名称}
              title={项.名称}
            >
              <图标 size={17} strokeWidth={1.7} />
              <span className="rail__item-text">{项.名称}</span>
              {徽标 ? (
                <span className="rail__badge" title={`${徽标} 处冲突`}>
                  {徽标}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="rail__bottom">
        <button
          type="button"
          className="rail__game"
          onClick={() => 切换页面("settings")}
          title={游戏.path ? `7 Days to Die · ${状态文字}` : "设置游戏目录"}
        >
          <div className="rail__game-top">
            <span className={状态类} />
            <span>7 Days to Die</span>
          </div>
          <span className="rail__game-status">{状态文字}</span>
          <span className="rail__game-path">
            {游戏.path ? 文件名(游戏.path) : "尚未指定目录"}
          </span>
        </button>
        <button
          type="button"
          className="rail__launch"
          onClick={启动游戏}
          disabled={!游戏.installed || 游戏.running || 忙碌}
          title={游戏.running ? "游戏运行中" : "启动游戏"}
        >
          <Play size={14} fill="currentColor" />
          <span>{游戏.running ? "运行中" : "启动游戏"}</span>
        </button>
        <div className="rail__foot">
          <span>v{版本}</span>
          <span>本地模式</span>
        </div>
      </div>
    </aside>
  );
}
