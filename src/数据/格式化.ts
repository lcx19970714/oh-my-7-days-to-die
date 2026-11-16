export function 格式化字节(字节: number): string {
  if (!Number.isFinite(字节) || 字节 <= 0) return "0 B";
  const 单位 = ["B", "KB", "MB", "GB", "TB"];
  const 指数 = Math.min(
    单位.length - 1,
    Math.floor(Math.log(字节) / Math.log(1024)),
  );
  const 数值 = 字节 / 1024 ** 指数;
  const 小数位 = 指数 === 0 ? 0 : 数值 >= 100 ? 0 : 数值 >= 10 ? 1 : 2;
  return `${数值.toFixed(小数位)} ${单位[指数]}`;
}

export function 格式化日期(毫秒: number): string {
  if (!毫秒) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(毫秒));
}

export function 完整日期(毫秒: number): string {
  if (!毫秒) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(毫秒));
}

export function 相对时间(毫秒: number): string {
  if (!毫秒) return "—";
  const 差值 = Date.now() - 毫秒;
  if (差值 < 60_000) return "刚刚";
  if (差值 < 3_600_000) return `${Math.floor(差值 / 60_000)} 分钟前`;
  if (差值 < 86_400_000) return `${Math.floor(差值 / 3_600_000)} 小时前`;
  if (差值 < 604_800_000) return `${Math.floor(差值 / 86_400_000)} 天前`;
  return 格式化日期(毫秒);
}

export function 文件名(路径: string): string {
  const 规范化 = 路径.replace(/[\\/]+$/, "");
  const 片段 = 规范化.split(/[\\/]/);
  return 片段[片段.length - 1] || 路径;
}

export function 父路径(路径: string): string {
  const 规范化 = 路径.replace(/[\\/]+$/, "");
  const 位置 = Math.max(规范化.lastIndexOf("\\"), 规范化.lastIndexOf("/"));
  return 位置 > 0 ? 规范化.slice(0, 位置) : 规范化;
}

export function 合并类名(
  ...值: Array<string | false | null | undefined>
): string {
  return 值.filter(Boolean).join(" ");
}

export function 模组数量(数量: number): string {
  return `${数量} 个模组`;
}
