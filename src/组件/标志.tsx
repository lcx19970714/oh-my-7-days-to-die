interface 标志属性 {
  尺寸?: number;
  类名?: string;
}

export function 标志({ 尺寸 = 24, 类名 }: 标志属性) {
  return (
    <svg
      width={尺寸}
      height={尺寸}
      viewBox="0 0 1024 1024"
      className={类名}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="1024" height="1024" rx="224" fill="#0B0C0D" />
      <rect
        x="40"
        y="40"
        width="944"
        height="944"
        rx="196"
        fill="none"
        stroke="#2A2520"
        strokeWidth="8"
      />
      <g transform="translate(18 26)" opacity="0.5">
        <rect x="278" y="286" width="470" height="108" fill="#6E3718" />
        <path d="M636 394 H748 L548 792 H420 Z" fill="#6E3718" />
      </g>
      <rect x="278" y="286" width="470" height="108" fill="#E9A15B" />
      <path d="M636 394 H748 L548 792 H420 Z" fill="#E9A15B" />
      <rect
        x="278"
        y="286"
        width="470"
        height="14"
        fill="#F4C08A"
        opacity="0.6"
      />
      <circle cx="758" cy="758" r="26" fill="#8FAE7D" />
    </svg>
  );
}
