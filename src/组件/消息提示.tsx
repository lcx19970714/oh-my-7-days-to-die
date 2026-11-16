import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type 提示类型 = "success" | "error" | "info";

export interface 提示条目 {
  id: string;
  类型: 提示类型;
  标题: string;
  详情?: string;
}

interface 消息提示属性 {
  列表: 提示条目[];
  关闭: (id: string) => void;
}

const 图标 = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

export function 消息提示({ 列表, 关闭 }: 消息提示属性) {
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {列表.map((条目) => {
        const 图标组件 = 图标[条目.类型];
        return (
          <div
            key={条目.id}
            className={`toast toast--${条目.类型}`}
            role="status"
          >
            <图标组件 size={17} className="toast__icon" />
            <div className="toast__content">
              <strong>{条目.标题}</strong>
              {条目.详情 ? <p>{条目.详情}</p> : null}
            </div>
            <button
              type="button"
              className="toast__close"
              onClick={() => 关闭(条目.id)}
              aria-label="关闭提示"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
