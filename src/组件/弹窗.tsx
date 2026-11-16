import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface 弹窗属性 {
  标题: string;
  说明?: string;
  打开: boolean;
  关闭: () => void;
  底部?: ReactNode;
  宽度?: number;
  儿童?: ReactNode;
}

export function 弹窗({
  标题,
  说明,
  打开,
  关闭,
  底部,
  宽度,
  儿童,
}: 弹窗属性) {
  useEffect(() => {
    if (!打开) return;
    const 按键处理 = (事件: KeyboardEvent) => {
      if (事件.key === "Escape") {
        // 让弹窗优先消费 Esc，避免同一按键把背后的抽屉也关掉。
        事件.stopImmediatePropagation();
        关闭();
      }
    };
    window.addEventListener("keydown", 按键处理, true);
    return () => window.removeEventListener("keydown", 按键处理, true);
  }, [打开, 关闭]);

  if (!打开) return null;
  return (
    <div
      className="scrim"
      onMouseDown={(事件) => {
        if (事件.target === 事件.currentTarget) 关闭();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={标题}
        style={宽度 ? { width: 宽度 } : undefined}
        onMouseDown={(事件) => 事件.stopPropagation()}
      >
        <header className="modal__head">
          <div>
            <h2>{标题}</h2>
            {说明 ? <p>{说明}</p> : null}
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={关闭}
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </header>
        {儿童 ? <div className="modal__body">{儿童}</div> : null}
        {底部 ? <footer className="modal__foot">{底部}</footer> : null}
      </div>
    </div>
  );
}

interface 确认弹窗属性 {
  标题: string;
  说明: string;
  确认文字: string;
  打开: boolean;
  危险?: boolean;
  加载?: boolean;
  关闭: () => void;
  确认: () => void;
  儿童?: ReactNode;
}

export function 确认弹窗({
  标题,
  说明,
  确认文字,
  打开,
  危险 = false,
  加载 = false,
  关闭,
  确认,
  儿童,
}: 确认弹窗属性) {
  return (
    <弹窗
      标题={标题}
      说明={说明}
      打开={打开}
      关闭={关闭}
      宽度={430}
      儿童={儿童}
      底部={
        <>
          <button
            type="button"
            className="button button--ghost"
            onClick={关闭}
            disabled={加载}
          >
            取消
          </button>
          <button
            type="button"
            className={`button ${危险 ? "button--danger" : "button--primary"}`}
            onClick={确认}
            disabled={加载}
          >
            {加载 ? "处理中…" : 确认文字}
          </button>
        </>
      }
    />
  );
}
