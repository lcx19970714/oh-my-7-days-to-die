interface 开关属性 {
  选中: boolean;
  变更: (选中: boolean) => void;
  禁用?: boolean;
  标签: string;
  尺寸?: "sm" | "md";
}

export function 开关({
  选中,
  变更,
  禁用 = false,
  标签,
  尺寸 = "md",
}: 开关属性) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={选中}
      aria-label={标签}
      className={`toggle toggle--${尺寸} ${选中 ? "is-on" : ""}`}
      disabled={禁用}
      onClick={(事件) => {
        事件.stopPropagation();
        变更(!选中);
      }}
    >
      <span className="toggle__knob" />
    </button>
  );
}
