import { Component, type ErrorInfo, type ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { 标志 } from "./标志";

interface 错误边界属性 {
  儿童: ReactNode;
}

interface 错误边界状态 {
  错误: string | null;
}

export class 错误边界 extends Component<错误边界属性, 错误边界状态> {
  state: 错误边界状态 = { 错误: null };

  static getDerivedStateFromError(错误: unknown): 错误边界状态 {
    return {
      错误: 错误 instanceof Error ? 错误.message : String(错误),
    };
  }

  componentDidCatch(错误: Error, 信息: ErrorInfo) {
    console.error("界面渲染失败", 错误, 信息.componentStack);
  }

  render() {
    if (this.state.错误) {
      return (
        <div className="crash">
          <标志 尺寸={48} />
          <h1>界面出错了</h1>
          <p>渲染时遇到未处理的问题。Mods 文件没有被改动。</p>
          <pre>{this.state.错误}</pre>
          <div className="crash__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => window.location.reload()}
            >
              重新加载界面
            </button>
            {"__TAURI_INTERNALS__" in window ? (
              <button
                type="button"
                className="button button--ghost"
                onClick={() => {
                  void getCurrentWindow()
                    .close()
                    .catch(() => undefined);
                }}
              >
                关闭窗口
              </button>
            ) : null}
          </div>
        </div>
      );
    }
    return this.props.儿童;
  }
}
