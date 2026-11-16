import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Maximize2, Minimize2, Minus, X } from "lucide-react";

import { 是桌面环境, 是演示模式 } from "../数据/接口";
import { 标志 } from "./标志";

const 窗口 = 是桌面环境 ? getCurrentWindow() : null;

interface 标题栏属性 {
  版本: string;
}

export function 标题栏({ 版本 }: 标题栏属性) {
  const [最大化, set最大化] = useState(false);

  useEffect(() => {
    if (!窗口) return;
    let 取消监听: (() => void) | undefined;
    窗口
      .isMaximized()
      .then(set最大化)
      .catch(() => undefined);
    窗口
      .onResized(() => {
        窗口
          .isMaximized()
          .then(set最大化)
          .catch(() => undefined);
      })
      .then((取消) => {
        取消监听 = 取消;
      })
      .catch(() => undefined);
    return () => 取消监听?.();
  }, []);

  return (
    <header
      className="titlebar"
      data-tauri-drag-region
      onDoubleClick={() => {
        窗口?.toggleMaximize().catch(() => undefined);
      }}
    >
      <div className="titlebar__brand" data-tauri-drag-region>
        <标志 尺寸={22} />
        <div className="titlebar__wordmark" data-tauri-drag-region>
          <span className="titlebar__name">七日杀</span>
          <span className="titlebar__edition">MOD KIT</span>
        </div>
      </div>

      <div className="titlebar__meta" data-tauri-drag-region>
        <span className="titlebar__version">v{版本}</span>
        {是演示模式 ? (
          <span className="titlebar__demo" title="界面使用合成数据，便于预览">
            演示数据
          </span>
        ) : null}
      </div>

      <div
        className="window-controls"
        onDoubleClick={(事件) => 事件.stopPropagation()}
      >
        <button
          type="button"
          className="window-button"
          aria-label="最小化"
          onClick={() => 窗口?.minimize().catch(() => undefined)}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          className="window-button"
          aria-label={最大化 ? "还原" : "最大化"}
          onClick={() => 窗口?.toggleMaximize().catch(() => undefined)}
        >
          {最大化 ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
        <button
          type="button"
          className="window-button window-button--close"
          aria-label="关闭"
          onClick={() => 窗口?.close().catch(() => undefined)}
        >
          <X size={15} />
        </button>
      </div>
    </header>
  );
}
