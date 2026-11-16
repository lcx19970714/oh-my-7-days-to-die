import { useEffect, useState } from "react";
import {
  FolderOpen,
  HardDrive,
  RotateCw,
  Save,
  ScanSearch,
} from "lucide-react";

import { 格式化字节 } from "../数据/格式化";
import type { GameInfo, Settings, Theme } from "../数据/类型";
import { 开关 } from "../组件/开关";

interface 设置页属性 {
  设置: Settings;
  游戏: GameInfo;
  实际模组目录: string;
  数据目录: string;
  备份目录: string;
  备份总字节: number;
  版本: string;
  忙碌: boolean;
  保存路径: (游戏路径: string | null, 模组目录: string | null) => void;
  立即更新: (设置: Settings) => void;
  检测游戏: () => Promise<string | null>;
  选择游戏目录: () => Promise<string | null>;
  选择模组目录: () => Promise<string | null>;
  重新扫描: () => void;
  打开路径: (路径: string) => void;
}

const 主题选项: Array<{ 值: Theme; 名称: string; 说明: string }> = [
  { 值: "dark", 名称: "深色", 说明: "默认，夜里不刺眼" },
  { 值: "light", 名称: "浅色", 说明: "白天或亮处使用" },
  { 值: "system", 名称: "跟随系统", 说明: "跟随 Windows" },
];

export function 设置页({
  设置,
  游戏,
  实际模组目录,
  数据目录,
  备份目录,
  备份总字节,
  版本,
  忙碌,
  保存路径,
  立即更新,
  检测游戏,
  选择游戏目录,
  选择模组目录,
  重新扫描,
  打开路径,
}: 设置页属性) {
  const [游戏路径, set游戏路径] = useState(设置.gamePath ?? "");
  const [模组目录, set模组目录] = useState(设置.modsDir ?? "");
  const [检测中, set检测中] = useState(false);

  useEffect(() => {
    set游戏路径(设置.gamePath ?? "");
  }, [设置.gamePath]);

  useEffect(() => {
    set模组目录(设置.modsDir ?? "");
  }, [设置.modsDir]);

  const 有改动 =
    游戏路径 !== (设置.gamePath ?? "") || 模组目录 !== (设置.modsDir ?? "");

  const 主题值: Theme = 设置.theme;

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__copy">
          <h1>设置</h1>
          <p>游戏位置、管理的 Mods 目录与启动方式。路径修改后需要保存并重新扫描。</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={重新扫描}
            disabled={忙碌}
          >
            <RotateCw size={14} />
            重新扫描
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => 保存路径(游戏路径 || null, 模组目录 || null)}
            disabled={!有改动 || 忙碌}
          >
            <Save size={14} />
            保存路径
          </button>
        </div>
      </header>

      <section className="settings-block">
        <header>
          <h2>游戏与目录</h2>
          <p>游戏会同时加载用户数据目录与游戏目录下的 Mods；这里选择管家要管理的一处。</p>
        </header>

        <div className="field-row">
          <div className="field-row__label">
            <label htmlFor="游戏路径">游戏目录</label>
            <span>7 Days to Die 的安装位置</span>
          </div>
          <div className="field-row__control">
            <div className="field">
              <input
                id="游戏路径"
                className="input mono"
                value={游戏路径}
                onChange={(事件) => set游戏路径(事件.target.value)}
                placeholder="D:\SteamLibrary\steamapps\common\7 Days To Die"
                spellCheck={false}
              />
              <button
                type="button"
                className="button button--small button--ghost"
                onClick={async () => {
                  const 路径 = await 选择游戏目录();
                  if (路径) set游戏路径(路径);
                }}
                disabled={忙碌}
              >
                浏览
              </button>
              <button
                type="button"
                className="button button--small button--ghost"
                onClick={async () => {
                  set检测中(true);
                  try {
                    const 路径 = await 检测游戏();
                    if (路径) {
                      set游戏路径(路径);
                    } else {
                      重新扫描();
                    }
                  } finally {
                    set检测中(false);
                  }
                }}
                disabled={忙碌 || 检测中}
              >
                <ScanSearch size={14} />
                {检测中 ? "检测中…" : "自动检测"}
              </button>
            </div>
            <p className="field-hint">
              {游戏.installed
                ? `已识别${游戏.steamBuild ? ` · Steam 构建 ${游戏.steamBuild}` : ""}`
                : "尚未识别。也可以直接填写路径。"}
            </p>
          </div>
        </div>

        <div className="field-row">
          <div className="field-row__label">
            <label htmlFor="模组目录">管理的 Mods 目录</label>
            <span>启用、安装与备份都以这里为准</span>
          </div>
          <div className="field-row__control">
            <div className="field">
              <input
                id="模组目录"
                className="input mono"
                value={模组目录}
                onChange={(事件) => set模组目录(事件.target.value)}
                placeholder="C:\Users\you\AppData\Roaming\7DaysToDie\Mods"
                spellCheck={false}
              />
              <button
                type="button"
                className="button button--small button--ghost"
                onClick={async () => {
                  const 路径 = await 选择模组目录();
                  if (路径) set模组目录(路径);
                }}
                disabled={忙碌}
              >
                浏览
              </button>
            </div>
            <div className="field-hint field-hint--actions">
              <button
                type="button"
                className="text-button"
                onClick={() => set模组目录(游戏.userModsDir)}
              >
                使用用户数据目录
              </button>
              {游戏.gameModsDir ? (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => set模组目录(游戏.gameModsDir ?? "")}
                >
                  使用游戏目录
                </button>
              ) : null}
            </div>
            {!模组目录 ? (
              <p className="field-hint">
                现在自动使用：<span className="mono">{实际模组目录}</span>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="settings-block">
        <header>
          <h2>外观</h2>
          <p>主题会立即保存。深色是默认，适合夜间游戏。</p>
        </header>
        <div className="theme-grid">
          {主题选项.map((选项) => (
            <button
              key={选项.值}
              type="button"
              className={`theme-option ${主题值 === 选项.值 ? "is-active" : ""}`}
              onClick={() => 立即更新({ ...设置, theme: 选项.值 })}
              disabled={忙碌}
              aria-pressed={主题值 === 选项.值}
            >
              <span className={`theme-swatch theme-swatch--${选项.值}`} />
              <span>
                <strong>{选项.名称}</strong>
                <small>{选项.说明}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-block">
        <header>
          <h2>启动与备份</h2>
          <p>这两个开关会立即生效。</p>
        </header>
        <div className="switch-row">
          <div>
            <strong>使用 EAC 启动游戏</strong>
            <p>装 Mod 时通常应关闭；只有连接允许的官方服务器时才打开。</p>
          </div>
          <开关
            选中={设置.eac}
            变更={(选中) => 立即更新({ ...设置, eac: 选中 })}
            禁用={忙碌}
            标签="使用 EAC 启动游戏"
          />
        </div>
        <div className="switch-row">
          <div>
            <strong>覆盖或删除前自动备份</strong>
            <p>关闭后，安装同名模组会被拒绝，删除也会直接失败。建议保持开启。</p>
          </div>
          <开关
            选中={设置.autoBackup}
            变更={(选中) => 立即更新({ ...设置, autoBackup: 选中 })}
            禁用={忙碌}
            标签="自动备份"
          />
        </div>
      </section>

      <section className="settings-block">
        <header>
          <h2>数据</h2>
          <p>设置、配置档和备份都在应用数据目录，不写进游戏目录。</p>
        </header>
        <div className="data-grid">
          <div className="data-card">
            <HardDrive size={17} />
            <div>
              <span>应用数据</span>
              <p className="mono">{数据目录}</p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => 打开路径(数据目录)}
              aria-label="打开应用数据目录"
            >
              <FolderOpen size={15} />
            </button>
          </div>
          <div className="data-card">
            <HardDrive size={17} />
            <div>
              <span>备份 · {格式化字节(备份总字节)}</span>
              <p className="mono">{备份目录}</p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => 打开路径(备份目录)}
              aria-label="打开备份目录"
            >
              <FolderOpen size={15} />
            </button>
          </div>
        </div>
      </section>

      <section className="settings-block settings-block--about">
        <header>
          <h2>关于</h2>
        </header>
        <div className="about-row">
          <div>
            <strong>七日杀 Mod 管家</strong>
            <p>本地 Mod 清单 · v{版本}</p>
          </div>
          <span className="mono about-row__stack">TAURI 2 · RUST · REACT</span>
        </div>
        <p className="footnote">
          所有文件操作都在本机完成。本工具不下载 Mod、不修改游戏本体，也不绕过 EAC。
        </p>
      </section>
    </div>
  );
}
