import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FolderOpen,
  Info,
  OctagonAlert,
  Play,
  Plus,
  Settings2,
} from "lucide-react";

import { 格式化字节 } from "../数据/格式化";
import type { HealthIssue, ModEntry, Snapshot } from "../数据/类型";

interface 总览页属性 {
  快照: Snapshot;
  备份目录: string;
  忙碌: boolean;
  正在安装: boolean;
  启动游戏: () => void;
  安装模组: () => void;
  打开模组库: () => void;
  打开设置: () => void;
  打开路径: (路径: string) => void;
  打开模组: (模组: ModEntry) => void;
}

const 级别图标 = {
  error: OctagonAlert,
  warning: AlertTriangle,
  info: Info,
};

export function 总览页({
  快照,
  备份目录,
  忙碌,
  正在安装,
  启动游戏,
  安装模组,
  打开模组库,
  打开设置,
  打开路径,
  打开模组,
}: 总览页属性) {
  const { game, stats, issues, modsDir, disabledDir } = 快照;
  const 有问题 = issues.filter((问题) => 问题.severity !== "info");
  const 状态标题 = game.running
    ? "游戏正在运行"
    : game.installed
      ? "游戏已就绪"
      : "未连接游戏";
  const 状态说明 = game.running
    ? "退出游戏后再改动模组，改动会在下次启动时生效。"
    : game.installed
      ? `Steam 构建 ${game.steamBuild ?? "未知"} · ${格式化字节(stats.totalBytes)}`
      : "指定游戏目录后可以直接从这里启动，Mods 管理不受影响。";

  const 问题操作 = (问题: HealthIssue) => {
    if (问题.id === "game-missing" || 问题.id === "not-writable") {
      return (
        <button className="text-button" onClick={打开设置}>
          去设置 <ChevronRight size={13} />
        </button>
      );
    }
    if (问题.id.startsWith("other-library")) {
      return (
        <button className="text-button" onClick={打开设置}>
          管理目录 <ChevronRight size={13} />
        </button>
      );
    }
    if (问题.id === "mods-missing") {
      return (
        <button className="text-button" onClick={安装模组}>
          安装模组 <ChevronRight size={13} />
        </button>
      );
    }
    if (
      问题.id === "conflicts" ||
      问题.id === "invalid-modinfo" ||
      问题.id === "duplicate-name" ||
      问题.id === "harmony-missing" ||
      问题.id === "none-enabled"
    ) {
      return (
        <button className="text-button" onClick={打开模组库}>
          查看模组 <ChevronRight size={13} />
        </button>
      );
    }
    return null;
  };

  const 启用预览 = [...快照.mods]
    .filter((模组) => 模组.enabled)
    .sort((甲, 乙) => 甲.loadIndex - 乙.loadIndex)
    .slice(0, 4);

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__copy">
          <h1>总览</h1>
          <p>
            {stats.enabled} 个模组已启用
            {stats.conflicts > 0
              ? `，${stats.conflicts} 处文件冲突待处理`
              : "，没有发现文件冲突"}
            。
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={安装模组}
            disabled={忙碌 || 正在安装}
          >
            <Plus size={15} />
            安装模组
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={game.installed ? 启动游戏 : 打开设置}
            disabled={game.running || 忙碌}
          >
            {game.installed ? <Play size={14} fill="currentColor" /> : <Settings2 size={15} />}
            {game.running ? "游戏运行中" : game.installed ? "启动游戏" : "指定游戏目录"}
          </button>
        </div>
      </header>

      <section className={`ready ${game.installed ? "" : "ready--empty"}`}>
        <div className="ready__main">
          <div className="ready__statusline">
            <span
              className={`dot ${
                game.running ? "dot--warn" : game.installed ? "dot--ok" : "dot--muted"
              }`}
            />
            <h2>{状态标题}</h2>
          </div>
          <p className="ready__path" title={game.path ?? undefined}>
            {game.path ?? "尚未找到 7 Days to Die 的安装位置"}
          </p>
          <p className="ready__note">{状态说明}</p>
        </div>

        <div className="ready__facts" aria-label="模组统计">
          <div className="ready__fact">
            <span>已启用</span>
            <strong>{String(stats.enabled).padStart(2, "0")}</strong>
          </div>
          <div className="ready__fact">
            <span>已停用</span>
            <strong>{String(stats.disabled).padStart(2, "0")}</strong>
          </div>
          <div className="ready__fact">
            <span>冲突</span>
            <strong className={stats.conflicts > 0 ? "is-warn" : ""}>
              {String(stats.conflicts).padStart(2, "0")}
            </strong>
          </div>
          <div className="ready__fact">
            <span>代码模组</span>
            <strong>{String(stats.codeMods).padStart(2, "0")}</strong>
          </div>
        </div>

      </section>
      <section className="section">
        <div className="section__head">
          <h2>需要处理</h2>
          <span className="section__meta">
            {有问题.length > 0
              ? `${有问题.length} 项待办${
                  issues.length > 有问题.length
                    ? ` · ${issues.length - 有问题.length} 条提示`
                    : ""
                }`
              : "状态正常"}
          </span>
        </div>
        {issues.length === 0 ? (
          <div className="quiet-row">
            <CheckCircle2 size={16} />
            <span>没有发现需要处理的问题。可以开始游戏了。</span>
          </div>
        ) : (
          <div className="issue-list">
            {issues.map((问题) => {
              const 图标 = 级别图标[问题.severity];
              return (
                <div
                  key={问题.id}
                  className={`issue issue--${问题.severity}`}
                >
                  <span className="issue__mark">
                    <图标 size={15} />
                  </span>
                  <div className="issue__copy">
                    <strong>{问题.title}</strong>
                    <p>{问题.detail}</p>
                  </div>
                  {问题操作(问题)}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="overview-grid">
        <section className="section">
          <div className="section__head">
            <h2>环境</h2>
            <button className="text-button" onClick={打开设置}>
              管理路径 <ChevronRight size={13} />
            </button>
          </div>
          <dl className="path-list">
            {[
              { 标签: "Mods 目录", 路径: modsDir },
              { 标签: "停用目录", 路径: disabledDir },
              { 标签: "游戏 Mods", 路径: game.gameModsDir },
              { 标签: "备份", 路径: 备份目录 },
            ]
              .filter((项): 项 is { 标签: string; 路径: string } => Boolean(项.路径))
              .map((项) => (
                <div className="path-row" key={项.标签}>
                  <dt>{项.标签}</dt>
                  <dd className="mono" title={项.路径 ?? undefined}>
                    {项.路径}
                  </dd>
                  {项.路径?.includes("\\") || 项.路径?.includes("/") ? (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`打开${项.标签}`}
                      onClick={() => 打开路径(项.路径)}
                    >
                      <FolderOpen size={15} />
                    </button>
                  ) : (
                    <span className="path-row__spacer" />
                  )}
                </div>
              ))}
          </dl>
        </section>

        <section className="section">
          <div className="section__head">
            <h2>启用中的模组</h2>
            <button className="text-button" onClick={打开模组库}>
              全部 <ChevronRight size={13} />
            </button>
          </div>
          {启用预览.length === 0 ? (
            <div className="quiet-row">
              <span>还没有启用任何模组。</span>
            </div>
          ) : (
            <ul className="mini-list">
              {启用预览.map((模组) => (
                <li key={模组.folder}>
                  <button
                    type="button"
                    className="mini-list__item"
                    onClick={() => 打开模组(模组)}
                  >
                    <span className="mini-list__index mono">
                      {String(模组.loadIndex).padStart(2, "0")}
                    </span>
                    <span className="mini-list__name">{模组.displayName}</span>
                    <span className="mini-list__version mono">
                      {模组.version ? `v${模组.version}` : "—"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="footnote">
            加载顺序由文件夹名决定，清单里的 01–{String(stats.enabled).padStart(2, "0")}{" "}
            就是游戏实际读取的顺序。
          </p>
        </section>
      </div>
    </div>
  );
}
