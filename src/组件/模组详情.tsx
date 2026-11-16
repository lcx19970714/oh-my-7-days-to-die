import { useEffect } from "react";
import {
  AlertTriangle,
  ExternalLink,
  FileCode2,
  FolderOpen,
  Trash2,
  X,
} from "lucide-react";

import { 格式化字节 } from "../数据/格式化";
import type { ModDetails, ModEntry } from "../数据/类型";
import { 开关 } from "./开关";

interface 模组详情属性 {
  打开: boolean;
  模组: ModEntry | null;
  详情: ModDetails | null;
  加载中: boolean;
  处理中: boolean;
  关闭: () => void;
  切换: (模组: ModEntry, 已启用: boolean) => void;
  移入备份: (模组: ModEntry) => void;
  打开路径: (路径: string) => void;
  打开链接: (网址: string) => void;
}

export function 模组详情({
  打开,
  模组,
  详情,
  加载中,
  处理中,
  关闭,
  切换,
  移入备份,
  打开路径,
  打开链接,
}: 模组详情属性) {
  useEffect(() => {
    if (!打开) return;
    const 按键处理 = (事件: KeyboardEvent) => {
      if (事件.key === "Escape") 关闭();
    };
    window.addEventListener("keydown", 按键处理);
    return () => window.removeEventListener("keydown", 按键处理);
  }, [打开, 关闭]);

  if (!打开 || !模组) return null;

  const 冲突 = 详情?.conflicts ?? [];
  const 文件 = 详情?.files ?? [];
  const 总文件数 = 详情?.totalFiles ?? 模组.fileCount;

  return (
    <div
      className="drawer-scrim"
      onMouseDown={(事件) => {
        if (事件.target === 事件.currentTarget) 关闭();
      }}
    >
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${模组.displayName} 的详情`}
      >
        <header className="drawer__head">
          <div className="drawer__statusline">
            <span className={`dot ${模组.enabled ? "dot--ok" : "dot--muted"}`} />
            <span>
              {模组.enabled
                ? `已启用 · 加载顺序 ${String(模组.loadIndex).padStart(2, "0")}`
                : "已停用"}
            </span>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={关闭}
            aria-label="关闭详情"
          >
            <X size={17} />
          </button>
        </header>

        <div className="drawer__scroll">
          <div className="drawer__title">
            <h2>{模组.displayName}</h2>
            <span className="mono">{模组.folder}</span>
          </div>

          <div className="drawer__toggle">
            <div>
              <strong>在游戏中启用</strong>
              <p>
                {模组.enabled
                  ? "下次启动游戏时加载。停用会把文件夹移到 Mods_Disabled。"
                  : "启用会把文件夹移回 Mods，下次启动游戏时加载。"}
              </p>
            </div>
            <开关
              选中={模组.enabled}
              变更={(选中) => 切换(模组, 选中)}
              禁用={处理中}
              标签={`${模组.enabled ? "停用" : "启用"} ${模组.displayName}`}
            />
          </div>

          {模组.description ? (
            <p className="drawer__description">{模组.description}</p>
          ) : (
            <p className="drawer__description drawer__description--muted">
              这个模组没有提供描述。
            </p>
          )}

          {模组.modInfoIssue ? (
            <div className="inline-warning">
              <AlertTriangle size={15} />
              <span>{模组.modInfoIssue}</span>
            </div>
          ) : null}

          <dl className="meta-grid">
            <div>
              <dt>版本</dt>
              <dd className="mono">{模组.version ? `v${模组.version}` : "—"}</dd>
            </div>
            <div>
              <dt>作者</dt>
              <dd>{模组.author ?? "—"}</dd>
            </div>
            <div>
              <dt>体积</dt>
              <dd className="mono">{格式化字节(模组.sizeBytes)}</dd>
            </div>
            <div>
              <dt>文件</dt>
              <dd className="mono">{总文件数.toLocaleString("zh-CN")} 个</dd>
            </div>
            <div>
              <dt>内部名</dt>
              <dd className="mono">{模组.internalName ?? "—"}</dd>
            </div>
            <div>
              <dt>类型</dt>
              <dd>
                {模组.hasDll ? "代码模组" : 模组.hasXml ? "XML 模组" : "资源模组"}
              </dd>
            </div>
          </dl>

          {模组.website ? (
            <button
              type="button"
              className="drawer__link"
              onClick={() => 打开链接(模组.website!)}
            >
              <ExternalLink size={14} />
              <span className="mono">{模组.website}</span>
            </button>
          ) : null}

          {冲突.length > 0 ? (
            <section className="drawer__section">
              <div className="drawer__section-head">
                <h3>文件冲突</h3>
                <span>{冲突.length} 处</span>
              </div>
              <div className="conflict-list">
                {冲突.map((冲突项) => (
                  <div className="conflict-row" key={冲突项.path}>
                    <AlertTriangle size={13} />
                    <div>
                      <span className="mono">{冲突项.path}</span>
                      <p>
                        同时被{" "}
                        {冲突项.mods
                          .filter((名称) => 名称 !== 模组.folder)
                          .join("、")}{" "}
                        写入
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="drawer__section">
            <div className="drawer__section-head">
              <h3>文件</h3>
              <span>
                {加载中
                  ? "读取中…"
                  : `显示 ${文件.length} / ${总文件数.toLocaleString("zh-CN")}`}
              </span>
            </div>
            {加载中 ? (
              <div className="file-skeleton">
                <span />
                <span />
                <span />
              </div>
            ) : 文件.length === 0 ? (
              <p className="drawer__empty">没有可显示的文件。</p>
            ) : (
              <ul className="file-list">
                {文件.map((条目) => (
                  <li key={条目.path}>
                    <FileCode2 size={13} />
                    <span className="mono">{条目.path}</span>
                    <span className="mono file-list__size">
                      {格式化字节(条目.sizeBytes)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="drawer__foot">
          <button
            type="button"
            className="button button--ghost"
            onClick={() => 打开路径(模组.path)}
          >
            <FolderOpen size={14} />
            打开文件夹
          </button>
          <button
            type="button"
            className="button button--ghost button--danger-text"
            onClick={() => 移入备份(模组)}
            disabled={处理中}
          >
            <Trash2 size={14} />
            移入备份
          </button>
        </footer>
      </aside>
    </div>
  );
}
