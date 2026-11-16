import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronRight,
  PackageOpen,
  Plus,
  Search,
  X,
} from "lucide-react";

import type { ModEntry, Snapshot } from "../数据/类型";
import { 开关 } from "../组件/开关";

type 筛选键 = "all" | "enabled" | "disabled" | "issues";
type 排序键 = "load" | "name" | "size";

const 筛选记忆键 = "wasteland-mod-manager.mods-filter.v1";

function 读取上次筛选(): 筛选键 {
  try {
    const 保存值 = localStorage.getItem(筛选记忆键);
    if (
      保存值 === "all" ||
      保存值 === "enabled" ||
      保存值 === "disabled" ||
      保存值 === "issues"
    ) {
      return 保存值;
    }
  } catch {
    // 浏览器禁用存储时，仍可正常使用模组筛选。
  }
  return "all";
}

interface 模组库页属性 {
  快照: Snapshot;
  忙碌: boolean;
  正在安装: boolean;
  搜索信号: number;
  待处理: Set<string>;
  安装模组: () => void;
  安装文件夹: () => void;
  切换模组: (模组: ModEntry, 已启用: boolean) => void;
  打开详情: (模组: ModEntry) => void;
}

export function 模组库页({
  快照,
  忙碌,
  正在安装,
  搜索信号,
  待处理,
  安装模组,
  安装文件夹,
  切换模组,
  打开详情,
}: 模组库页属性) {
  const [搜索, set搜索] = useState("");
  const [筛选, set筛选] = useState<筛选键>(读取上次筛选);
  const [排序, set排序] = useState<排序键>("load");
  const 搜索框 = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (搜索信号 > 0) 搜索框.current?.focus();
  }, [搜索信号]);

  useEffect(() => {
    try {
      localStorage.setItem(筛选记忆键, 筛选);
    } catch {
      // 存储不可用时，当前会话内的筛选仍然有效。
    }
  }, [筛选]);

  const 冲突文件夹 = useMemo(
    () => new Set(快照.conflicts.flatMap((冲突) => 冲突.mods)), 
    [快照.conflicts],
  );

  const 计数 = useMemo(() => {
    const 全部 = 快照.mods.length;
    const 启用 = 快照.mods.filter((模组) => 模组.enabled).length;
    const 停用 = 全部 - 启用;
    const 问题 = 快照.mods.filter(
      (模组) => 冲突文件夹.has(模组.folder) || !模组.modInfoOk,
    ).length;
    return { 全部, 启用, 停用, 问题 };
  }, [快照.mods, 冲突文件夹]);

  const 可见模组 = useMemo(() => {
    const 关键字 = 搜索.trim().toLowerCase();
    let 结果 = 快照.mods.filter((模组) => {
      if (筛选 === "enabled" && !模组.enabled) return false;
      if (筛选 === "disabled" && 模组.enabled) return false;
      if (
        筛选 === "issues" &&
        !冲突文件夹.has(模组.folder) &&
        模组.modInfoOk
      ) {
        return false;
      }
      if (!关键字) return true;
      return (
        模组.displayName.toLowerCase().includes(关键字) ||
        模组.folder.toLowerCase().includes(关键字) ||
        (模组.author ?? "").toLowerCase().includes(关键字) ||
        (模组.internalName ?? "").toLowerCase().includes(关键字)
      );
    });
    结果 = [...结果].sort((甲, 乙) => {
      if (排序 === "name") return 甲.displayName.localeCompare(乙.displayName, "zh-CN");
      if (排序 === "size") return 乙.sizeBytes - 甲.sizeBytes;
      if (甲.enabled !== 乙.enabled) return 甲.enabled ? -1 : 1;
      if (甲.enabled && 乙.enabled) return 甲.loadIndex - 乙.loadIndex;
      return 甲.displayName.localeCompare(乙.displayName, "zh-CN");
    });
    return 结果;
  }, [快照.mods, 搜索, 筛选, 排序, 冲突文件夹]);

  const 筛选标签: Array<{ 键: 筛选键; 名称: string; 数量: number }> = [
    { 键: "all", 名称: "全部", 数量: 计数.全部 },
    { 键: "enabled", 名称: "已启用", 数量: 计数.启用 },
    { 键: "disabled", 名称: "已停用", 数量: 计数.停用 },
    { 键: "issues", 名称: "有问题", 数量: 计数.问题 },
  ];

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__copy">
          <h1>模组库</h1>
          <p>
            {计数.启用} 个已启用 · {计数.停用} 个已停用 · 清单按文件夹名排序，
            也就是游戏的加载顺序。
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={安装文件夹}
            disabled={忙碌 || 正在安装}
          >
            安装文件夹
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={安装模组}
            disabled={忙碌 || 正在安装}
          >
            <Plus size={15} />
            安装 ZIP
          </button>
        </div>
      </header>

      <div className="toolbar">
        <label className="search">
          <Search size={15} />
          <input
            ref={搜索框}
            value={搜索}
            onChange={(事件) => set搜索(事件.target.value)}
            placeholder="搜索名称、作者或文件夹"
            spellCheck={false}
          />
          {搜索 ? (
            <button
              type="button"
              className="search__clear"
              onClick={() => set搜索("")}
              aria-label="清除搜索"
            >
              <X size={13} />
            </button>
          ) : (
            <kbd>Ctrl K</kbd>
          )}
        </label>

        <div className="segmented" role="tablist" aria-label="筛选模组">
          {筛选标签.map((标签) => (
            <button
              key={标签.键}
              type="button"
              role="tab"
              aria-selected={筛选 === 标签.键}
              className={`segmented__item ${筛选 === 标签.键 ? "is-active" : ""}`}
              onClick={() => set筛选(标签.键)}
            >
              {标签.名称}
              <span className="segmented__count">{标签.数量}</span>
            </button>
          ))}
        </div>

        <label className="select">
          <ArrowUpDown size={14} />
          <select
            value={排序}
            onChange={(事件) => set排序(事件.target.value as 排序键)}
            aria-label="排序方式"
          >
            <option value="load">加载顺序</option>
            <option value="name">名称</option>
            <option value="size">体积</option>
          </select>
        </label>
      </div>

      {快照.mods.length === 0 ? (
        <div className="dropzone dropzone--empty">
          <PackageOpen size={30} strokeWidth={1.2} />
          <h2>把第一个模组放进来</h2>
          <p>
            拖入 ZIP，或选择已经解压的模组文件夹。管家会自动找到里面包含{" "}
            <code>ModInfo.xml</code> 的目录，并在覆盖旧版本前备份。
          </p>
          <div className="dropzone__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={安装模组}
            >
              选择 ZIP
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={安装文件夹}
            >
              选择文件夹
            </button>
          </div>
          <span className="dropzone__hint mono">
            Mods / &lt;模组名&gt; / ModInfo.xml
          </span>
        </div>
      ) : (
        <div className="ledger" role="table" aria-label="模组列表">
          <div className="ledger__head" role="row">
            <span role="columnheader">#</span>
            <span role="columnheader">模组</span>
            <span role="columnheader">版本</span>
            <span role="columnheader">作者</span>
            <span role="columnheader">状态</span>
            <span aria-hidden="true" />
          </div>

          {可见模组.length === 0 ? (
            <div className="ledger__empty">
              <p>没有匹配的模组。</p>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  set搜索("");
                  set筛选("all");
                }}
              >
                清除筛选
              </button>
            </div>
          ) : (
            可见模组.map((模组) => {
              const 有冲突 = 冲突文件夹.has(模组.folder);
              const 处理中 = 待处理.has(模组.folder);
              return (
                <div
                  key={模组.folder}
                  className={`mod-row ${模组.enabled ? "" : "is-disabled"} ${
                    处理中 ? "is-pending" : ""
                  }`}
                  role="row"
                  onClick={() => 打开详情(模组)}
                >
                  <span className="mod-row__index mono" role="cell">
                    {模组.enabled
                      ? String(模组.loadIndex).padStart(2, "0")
                      : "—"}
                  </span>
                  <div className="mod-row__main" role="cell">
                    <button
                      type="button"
                      className="mod-row__name"
                      onClick={(事件) => {
                        事件.stopPropagation();
                        打开详情(模组);
                      }}
                    >
                      {模组.displayName}
                    </button>
                    <div className="mod-row__sub">
                      <span className="mono">{模组.folder}</span>
                      {模组.hasDll ? <span className="tag">代码</span> : null}
                      {有冲突 ? (
                        <span className="tag tag--warn">
                          <AlertTriangle size={11} /> 冲突
                        </span>
                      ) : null}
                      {!模组.modInfoOk ? (
                        <span className="tag tag--danger">未识别</span>
                      ) : null}
                    </div>
                  </div>
                  <span className="mod-row__version mono" role="cell">
                    {模组.version ? `v${模组.version}` : "—"}
                  </span>
                  <span className="mod-row__author" role="cell">
                    {模组.author ?? "—"}
                  </span>
                  <div className="mod-row__state" role="cell">
                    <开关
                      选中={模组.enabled}
                      变更={(选中) => 切换模组(模组, 选中)}
                      禁用={处理中 || 忙碌}
                      标签={`${模组.enabled ? "停用" : "启用"} ${模组.displayName}`}
                      尺寸="sm"
                    />
                    <span>{处理中 ? "处理中" : 模组.enabled ? "启用" : "停用"}</span>
                  </div>
                  <span className="mod-row__chevron" aria-hidden="true">
                    <ChevronRight size={15} />
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      <p className="footnote">
        启用/停用会把文件夹移到同级 <code>Mods_Disabled</code>，不会让游戏误加载。
        修改后需要重启游戏。
      </p>
    </div>
  );
}
