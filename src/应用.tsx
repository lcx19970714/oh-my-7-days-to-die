import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Loader2, PackageOpen } from "lucide-react";

import { 侧边栏 } from "./组件/侧边栏";
import { 标题栏 } from "./组件/标题栏";
import { 确认弹窗, 弹窗 } from "./组件/弹窗";
import { 消息提示, type 提示条目, type 提示类型 } from "./组件/消息提示";
import { 模组详情 } from "./组件/模组详情";
import { 标志 } from "./组件/标志";
import { 备份页 } from "./页面/备份页";
import { 来源页 } from "./页面/来源页";
import { 配置档页 } from "./页面/配置档页";
import { 设置页 } from "./页面/设置页";
import { 模组库页 } from "./页面/模组库页";
import { 总览页 } from "./页面/总览页";
import {
  接口,
  监听安装进度,
  是桌面环境,
  打开链接,
  打开路径,
  选择文件夹,
  选择压缩包,
} from "./数据/接口";
import type {
  BackupEntry,
  Bootstrap,
  InstallProgress,
  ModEntry,
  ModDetails,
  Profile,
  Settings,
  Theme,
  页面键,
} from "./数据/类型";

interface 确认状态 {
  标题: string;
  说明: string;
  确认文字: string;
  危险?: boolean;
  动作: () => Promise<void>;
}

function 错误文本(错误: unknown): string {
  if (typeof 错误 === "string") return 错误;
  if (错误 instanceof Error) return 错误.message;
  return String(错误);
}

function 默认配置档名(): string {
  const 日期 = new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return `配置档 ${日期}`;
}

const 可用页面: 页面键[] = [
  "overview",
  "mods",
  "profiles",
  "backups",
  "discover",
  "settings",
];

function 从哈希读取页面(): 页面键 {
  const 值 = window.location.hash.replace(/^#\/?/, "");
  return 可用页面.includes(值 as 页面键) ? (值 as 页面键) : "overview";
}

const 应用窗口 = 是桌面环境 ? getCurrentWindow() : null;
type 拖拽方向 =
  | "East"
  | "NorthEast"
  | "NorthWest"
  | "South"
  | "SouthEast"
  | "SouthWest"
  | "West";

const 缩放手柄: Array<[string, 拖拽方向]> = [
  ["west", "West"],
  ["east", "East"],
  ["south", "South"],
  ["south-west", "SouthWest"],
  ["south-east", "SouthEast"],
  ["north-west", "NorthWest"],
  ["north-east", "NorthEast"],
];

export default function 应用() {
  const [启动数据, set启动数据] = useState<Bootstrap | null>(null);
  const [加载错误, set加载错误] = useState<string | null>(null);
  const [页面, set页面] = useState<页面键>(() => 从哈希读取页面());
  const [忙碌, set忙碌] = useState(false);
  const [待处理, set待处理] = useState<Set<string>>(new Set());
  const [提示列表, set提示列表] = useState<提示条目[]>([]);
  const [抽屉, set抽屉] = useState<{ 模组: ModEntry } | null>(null);
  const [详情, set详情] = useState<ModDetails | null>(null);
  const [详情加载中, set详情加载中] = useState(false);
  const [确认, set确认] = useState<确认状态 | null>(null);
  const [创建配置档打开, set创建配置档打开] = useState(false);
  const [配置档名称, set配置档名称] = useState("");
  const [安装进度, set安装进度] = useState<InstallProgress | null>(null);
  const [拖动中, set拖动中] = useState(false);
  const [搜索信号, set搜索信号] = useState(0);
  const [主题, set主题] = useState<Theme>("dark");

  const 当前模组目录 = 启动数据?.settings.modsDir ?? null;

  const 推提示 = useCallback(
    (类型: 提示类型, 标题: string, 详情?: string) => {
      const 标识 = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      set提示列表((列表) => [
        ...列表.slice(-3),
        { id: 标识, 类型, 标题, 详情 },
      ]);
      window.setTimeout(
        () => {
          set提示列表((列表) => 列表.filter((条目) => 条目.id !== 标识));
        },
        类型 === "error" ? 8000 : 4500,
      );
    },
    [],
  );

  const 载入数据 = useCallback(async () => {
    set加载错误(null);
    try {
      const 数据 = await 接口.启动数据();
      set启动数据(数据);
      set主题(数据.settings.theme);
    } catch (错误) {
      set加载错误(错误文本(错误));
    }
  }, []);

  useEffect(() => {
    void 载入数据();
  }, [载入数据]);

  useEffect(() => {
    window.history.replaceState(null, "", `#${页面}`);
  }, [页面]);

  useEffect(() => {
    const 哈希处理 = () => set页面(从哈希读取页面());
    window.addEventListener("hashchange", 哈希处理);
    return () => window.removeEventListener("hashchange", 哈希处理);
  }, []);

  useEffect(() => {
    const 查询 = window.matchMedia("(prefers-color-scheme: dark)");
    const 应用主题 = () => {
      const 实际 =
        主题 === "system" ? (查询.matches ? "dark" : "light") : 主题;
      document.documentElement.dataset.theme = 实际;
      document.documentElement.style.colorScheme = 实际;
    };
    应用主题();
    查询.addEventListener("change", 应用主题);
    return () => 查询.removeEventListener("change", 应用主题);
  }, [主题]);

  useEffect(() => {
    let 取消: (() => void) | undefined;
    void 监听安装进度((进度) => {
      set安装进度(进度);
      if (进度.phase === "done") {
        window.setTimeout(() => set安装进度(null), 800);
      }
    }).then((函数) => {
      取消 = 函数;
    });
    return () => 取消?.();
  }, []);

  const 刷新 = useCallback(
    async (显示错误 = true) => {
      try {
        const 快照 = await 接口.获取快照(当前模组目录);
        set启动数据((当前) =>
          当前 ? { ...当前, snapshot: 快照 } : 当前,
        );
      } catch (错误) {
        if (显示错误) {
          推提示("error", "刷新失败", 错误文本(错误));
        }
      }
    },
    [当前模组目录, 推提示],
  );

  const 应用设置 = async (新设置: Settings, 成功提示?: string) => {
    set忙碌(true);
    try {
      const 数据 = await 接口.保存设置(新设置);
      set启动数据(数据);
      set主题(数据.settings.theme);
      if (成功提示) 推提示("success", 成功提示);
    } catch (错误) {
      推提示("error", "保存设置失败", 错误文本(错误));
      if (启动数据) set主题(启动数据.settings.theme);
    } finally {
      set忙碌(false);
    }
  };

  const 切换模组 = useCallback(
    async (模组: ModEntry, 已启用: boolean) => {
      if (忙碌) return;
      set待处理((当前) => new Set(当前).add(模组.folder));
      try {
        await 接口.设置启用(模组.folder, 已启用, 当前模组目录);
        await 刷新(false);
        if (抽屉?.模组.folder === 模组.folder) {
          const 新详情 = await 接口.获取模组详情(
            模组.folder,
            已启用,
            当前模组目录,
          );
          set详情(新详情);
          set抽屉({ 模组: 新详情.entry });
        }
        推提示(
          "success",
          已启用 ? "已启用模组" : "已停用模组",
          模组.displayName,
        );
      } catch (错误) {
        推提示(
          "error",
          已启用 ? "启用失败" : "停用失败",
          错误文本(错误),
        );
        await 刷新(false);
      } finally {
        set待处理((当前) => {
          const 下一个 = new Set(当前);
          下一个.delete(模组.folder);
          return 下一个;
        });
      }
    },
    [忙碌, 当前模组目录, 抽屉, 刷新, 推提示],
  );

  const 打开详情 = useCallback(
    async (模组: ModEntry) => {
      set抽屉({ 模组 });
      set详情(null);
      set详情加载中(true);
      try {
        const 数据 = await 接口.获取模组详情(
          模组.folder,
          模组.enabled,
          当前模组目录,
        );
        set详情(数据);
        set抽屉({ 模组: 数据.entry });
      } catch (错误) {
        推提示("error", "读取模组详情失败", 错误文本(错误));
      } finally {
        set详情加载中(false);
      }
    },
    [当前模组目录, 推提示],
  );

  const 关闭详情 = useCallback(() => {
    set抽屉(null);
    set详情(null);
  }, []);

  // 切换页面时收起档案抽屉，避免导航后详情仍压在新页面上。
  useEffect(() => {
    set抽屉(null);
    set详情(null);
  }, [页面]);

  useEffect(() => {
    if (!抽屉 || !启动数据) return;
    const 最新 = 启动数据.snapshot.mods.find(
      (模组) => 模组.folder === 抽屉.模组.folder,
    );
    if (最新 && 最新.enabled !== 抽屉.模组.enabled) {
      set抽屉({ 模组: 最新 });
    }
  }, [启动数据, 抽屉]);

  const 安装路径 = useCallback(
    async (路径列表: string[]) => {
      if (路径列表.length === 0 || 忙碌) return;
      const 快照目录 = 启动数据?.snapshot.modsDir
        .replace(/[\\/]+$/, "")
        .toLowerCase();
      const 有效路径 = 路径列表.filter((路径) => {
        const 规范化 = 路径.replace(/[\\/]+$/, "").toLowerCase();
        return !快照目录 || 规范化 !== 快照目录;
      });
      if (有效路径.length !== 路径列表.length) {
        推提示(
          "error",
          "不能把 Mods 根目录当作模组安装",
          "请选择单个模组文件夹，或直接拖入 ZIP。",
        );
      }
      if (有效路径.length === 0) return;
      set忙碌(true);
      set安装进度({
        phase: "install",
        label: "准备安装",
        current: 0,
        total: 1,
        percent: 0,
      });
      try {
        const 报告 = await 接口.安装(有效路径, 当前模组目录);
        await 刷新(false);
        if (报告.installed.length > 0) {
          推提示(
            "success",
            `已安装 ${报告.installed.length} 个模组`,
            报告.replaced.length > 0
              ? `已备份并替换：${报告.replaced.join("、")}`
              : undefined,
          );
        }
        if (报告.errors.length > 0) {
          推提示(
            "error",
            `${报告.errors.length} 个安装任务失败`,
            报告.errors.slice(0, 3).join("；"),
          );
        }
        if (报告.installed.length === 0 && 报告.errors.length === 0) {
          推提示("info", "没有安装任何模组");
        }
      } catch (错误) {
        推提示("error", "安装失败", 错误文本(错误));
      } finally {
        set忙碌(false);
        window.setTimeout(() => set安装进度(null), 600);
      }
    },
    [忙碌, 当前模组目录, 启动数据?.snapshot.modsDir, 刷新, 推提示],
  );

  const 安装引用 = useRef(安装路径);
  useEffect(() => {
    安装引用.current = 安装路径;
  }, [安装路径]);

  useEffect(() => {
    if (!是桌面环境) return;
    let 取消: (() => void) | undefined;
    void getCurrentWebview()
      .onDragDropEvent((事件) => {
        const 载荷 = 事件.payload;
        if (载荷.type === "enter" || 载荷.type === "over") {
          set拖动中(true);
        } else if (载荷.type === "drop") {
          set拖动中(false);
          if (载荷.paths.length > 0) {
            void 安装引用.current(载荷.paths);
          }
        } else {
          set拖动中(false);
        }
      })
      .then((函数) => {
        取消 = 函数;
      })
      .catch(() => undefined);
    return () => 取消?.();
  }, []);

  useEffect(() => {
    const 按键处理 = (事件: KeyboardEvent) => {
      const 目标 = 事件.target as HTMLElement | null;
      const 正在输入 =
        目标?.tagName === "INPUT" ||
        目标?.tagName === "TEXTAREA" ||
        目标?.isContentEditable;
      if (
        !正在输入 &&
        (事件.ctrlKey || 事件.metaKey) &&
        事件.key.toLowerCase() === "k"
      ) {
        事件.preventDefault();
        set页面("mods");
        set搜索信号((当前) => 当前 + 1);
      }
    };
    window.addEventListener("keydown", 按键处理);
    return () => window.removeEventListener("keydown", 按键处理);
  }, []);

  const 安装模组 = async () => {
    try {
      const 路径列表 = await 选择压缩包();
      if (路径列表.length > 0) await 安装路径(路径列表);
    } catch (错误) {
      推提示("error", "无法打开文件选择器", 错误文本(错误));
    }
  };

  const 安装文件夹 = async () => {
    try {
      const 路径 = await 选择文件夹("选择包含 ModInfo.xml 的模组文件夹");
      if (路径) await 安装路径([路径]);
    } catch (错误) {
      推提示("error", "无法打开文件夹选择器", 错误文本(错误));
    }
  };
  const 请求删除模组 = (模组: ModEntry) => {
    set确认({
      标题: `将“${模组.displayName}”移入备份？`,
      说明:
        "文件夹会从 Mods 移走并保存到备份页，不会永久删除。需要时可以恢复。",
      确认文字: "移入备份",
      危险: true,
      动作: async () => {
        set忙碌(true);
        try {
          await 接口.删除模组(模组.folder, 模组.enabled, 当前模组目录);
          if (抽屉?.模组.folder === 模组.folder) 关闭详情();
          await 刷新(false);
          set确认(null);
          推提示("success", "已移入备份", 模组.displayName);
        } catch (错误) {
          推提示("error", "移入备份失败", 错误文本(错误));
        } finally {
          set忙碌(false);
        }
      },
    });
  };

  const 请求应用配置档 = (配置档: Profile) => {
    set确认({
      标题: `应用“${配置档.name}”？`,
      说明: `会启用档案里的 ${配置档.mods.length} 个模组，并停用其余模组。改动会立即写入 Mods 目录。`,
      确认文字: "应用配置档",
      动作: async () => {
        set忙碌(true);
        try {
          const 报告 = await 接口.应用配置档(
            配置档.id,
            当前模组目录,
          );
          await 刷新(false);
          set确认(null);
          if (报告.errors.length > 0) {
            推提示(
              "error",
              "部分模组切换失败",
              报告.errors.slice(0, 3).join("；"),
            );
          } else {
            推提示(
              "success",
              "配置档已应用",
              `启用 ${报告.enabled} 个 · 停用 ${报告.disabled} 个`,
            );
          }
          if (报告.missing.length > 0) {
            推提示(
              "info",
              `${报告.missing.length} 个模组不在磁盘上`,
              报告.missing.slice(0, 4).join("、"),
            );
          }
        } catch (错误) {
          推提示("error", "应用配置档失败", 错误文本(错误));
        } finally {
          set忙碌(false);
        }
      },
    });
  };

  const 请求删除配置档 = (配置档: Profile) => {
    set确认({
      标题: `删除配置档“${配置档.name}”？`,
      说明: "只删除这份启用状态记录，不会删除任何模组文件。",
      确认文字: "删除配置档",
      危险: true,
      动作: async () => {
        set忙碌(true);
        try {
          await 接口.删除配置档(配置档.id);
          await 刷新(false);
          set确认(null);
          推提示("success", "配置档已删除", 配置档.name);
        } catch (错误) {
          推提示("error", "删除配置档失败", 错误文本(错误));
        } finally {
          set忙碌(false);
        }
      },
    });
  };

  const 打开创建配置档 = () => {
    set配置档名称(默认配置档名());
    set创建配置档打开(true);
  };

  const 提交配置档 = async () => {
    const 名称 = 配置档名称.trim();
    if (!名称) return;
    set忙碌(true);
    try {
      await 接口.保存配置档(名称, 当前模组目录);
      await 刷新(false);
      set创建配置档打开(false);
      推提示("success", "配置档已保存", 名称);
    } catch (错误) {
      推提示("error", "保存配置档失败", 错误文本(错误));
    } finally {
      set忙碌(false);
    }
  };

  const 请求恢复备份 = (备份: BackupEntry) => {
    set确认({
      标题: `恢复“${备份.displayName}”？`,
      说明:
        "文件夹会从备份移回 Mods 并启用。如果 Mods 里已有同名目录，恢复会被拒绝。",
      确认文字: "恢复备份",
      动作: async () => {
        set忙碌(true);
        try {
          const 文件夹 = await 接口.恢复备份(备份.id, 当前模组目录);
          await 刷新(false);
          set确认(null);
          推提示("success", "已恢复模组", 文件夹);
        } catch (错误) {
          推提示("error", "恢复失败", 错误文本(错误));
        } finally {
          set忙碌(false);
        }
      },
    });
  };

  const 请求删除备份 = (备份: BackupEntry) => {
    set确认({
      标题: `永久删除“${备份.displayName}”的备份？`,
      说明: "只会删除备份副本，已经安装的模组不受影响。此操作不可撤销。",
      确认文字: "永久删除",
      危险: true,
      动作: async () => {
        set忙碌(true);
        try {
          await 接口.删除备份(备份.id);
          await 刷新(false);
          set确认(null);
          推提示("success", "备份已永久删除");
        } catch (错误) {
          推提示("error", "删除备份失败", 错误文本(错误));
        } finally {
          set忙碌(false);
        }
      },
    });
  };

  const 启动游戏 = async () => {
    set忙碌(true);
    try {
      await 接口.启动游戏();
      推提示("success", "游戏已启动", "首次启动可能需要几秒。");
      window.setTimeout(() => void 刷新(false), 2500);
    } catch (错误) {
      推提示("error", "启动游戏失败", 错误文本(错误));
    } finally {
      set忙碌(false);
    }
  };

  const 检测游戏安装 = async (): Promise<string | null> => {
    try {
      const 信息 = await 接口.检测游戏();
      if (信息?.path) {
        推提示("success", "已找到游戏", 信息.path);
        return 信息.path;
      }
      推提示("info", "没有自动找到游戏", "请手动选择 7 Days to Die 目录。");
      return null;
    } catch (错误) {
      推提示("error", "检测游戏失败", 错误文本(错误));
      return null;
    }
  };

  const 立即更新 = (新设置: Settings) => {
    set主题(新设置.theme);
    void 应用设置(新设置);
  };

  const 保存路径 = (游戏路径: string | null, 模组目录: string | null) => {
    if (!启动数据) return;
    void 应用设置(
      { ...启动数据.settings, gamePath: 游戏路径, modsDir: 模组目录 },
      "路径已保存",
    );
  };

  const 重新扫描 = async () => {
    set忙碌(true);
    await 刷新();
    set忙碌(false);
    推提示("success", "已重新扫描 Mods 目录");
  };

  const 执行打开路径 = async (路径: string) => {
    try {
      await 打开路径(路径);
    } catch (错误) {
      推提示("error", "无法打开路径", 错误文本(错误));
    }
  };

  const 执行打开链接 = async (网址: string) => {
    try {
      const 地址 = new URL(网址);
      if (地址.protocol !== "http:" && 地址.protocol !== "https:") {
        throw new Error("只允许打开 http / https 链接");
      }
      await 打开链接(网址);
    } catch (错误) {
      推提示("error", "无法打开链接", 错误文本(错误));
    }
  };

  const 内容 = 启动数据 ? (
    <>
      <标题栏 版本={启动数据.version} />
      <div className="shell">
        <侧边栏
          当前页={页面}
          切换页面={set页面}
          快照={启动数据.snapshot}
          版本={启动数据.version}
          启动游戏={启动游戏}
          忙碌={忙碌}
        />
        <main className="main">
          {拖动中 ? (
            <div className="drop-overlay">
              <PackageOpen size={34} strokeWidth={1.2} />
              <h2>松开以安装</h2>
              <p>ZIP 或文件夹，自动识别其中的 ModInfo.xml。</p>
            </div>
          ) : null}
          <div className="viewport" key={页面}>
            {页面 === "overview" ? (
              <总览页
                快照={启动数据.snapshot}
                备份目录={启动数据.backupsDir}
                忙碌={忙碌}
                正在安装={安装进度 !== null}
                启动游戏={启动游戏}
                安装模组={() => void 安装模组()}
                打开模组库={() => set页面("mods")}
                打开设置={() => set页面("settings")}
                打开路径={(路径) => void 执行打开路径(路径)}
                打开模组={(模组) => void 打开详情(模组)}
              />
            ) : null}
            {页面 === "mods" ? (
              <模组库页
                快照={启动数据.snapshot}
                忙碌={忙碌}
                正在安装={安装进度 !== null}
                搜索信号={搜索信号}
                待处理={待处理}
                安装模组={() => void 安装模组()}
                安装文件夹={() => void 安装文件夹()}
                切换模组={(模组, 已启用) => void 切换模组(模组, 已启用)}
                打开详情={(模组) => void 打开详情(模组)}
              />
            ) : null}
            {页面 === "profiles" ? (
              <配置档页
                配置档列表={启动数据.snapshot.profiles}
                模组列表={启动数据.snapshot.mods}
                忙碌={忙碌}
                创建配置档={打开创建配置档}
                应用配置档={请求应用配置档}
                删除配置档={请求删除配置档}
              />
            ) : null}
            {页面 === "backups" ? (
              <备份页
                备份列表={启动数据.snapshot.backups}
                备份目录={启动数据.backupsDir}
                忙碌={忙碌}
                恢复备份={请求恢复备份}
                删除备份={请求删除备份}
                打开路径={(路径) => void 执行打开路径(路径)}
              />
            ) : null}
            {页面 === "discover" ? (
              <来源页
                打开链接={(网址) => void 执行打开链接(网址)}
                安装模组={(路径) => 安装路径(路径)}
              />
            ) : null}
            {页面 === "settings" ? (
              <设置页
                设置={启动数据.settings}
                游戏={启动数据.snapshot.game}
                实际模组目录={启动数据.snapshot.modsDir}
                数据目录={启动数据.dataDir}
                备份目录={启动数据.backupsDir}
                备份总字节={启动数据.snapshot.backups.reduce(
                  (合计, 备份) => 合计 + 备份.sizeBytes,
                  0,
                )}
                版本={启动数据.version}
                忙碌={忙碌}
                保存路径={保存路径}
                立即更新={立即更新}
                检测游戏={检测游戏安装}
                选择游戏目录={() =>
                  选择文件夹("选择 7 Days to Die 游戏目录")
                }
                选择模组目录={() => 选择文件夹("选择 Mods 目录")}
                重新扫描={() => void 重新扫描()}
                打开路径={(路径) => void 执行打开路径(路径)}
              />
            ) : null}
          </div>
        </main>
      </div>

      <模组详情
        打开={抽屉 !== null}
        模组={抽屉?.模组 ?? null}
        详情={详情}
        加载中={详情加载中}
        处理中={抽屉 ? 待处理.has(抽屉.模组.folder) : false}
        关闭={关闭详情}
        切换={(模组, 已启用) => void 切换模组(模组, 已启用)}
        移入备份={(模组) => 请求删除模组(模组)}
        打开路径={(路径) => void 执行打开路径(路径)}
        打开链接={(网址) => void 执行打开链接(网址)}
      />

      <确认弹窗
        标题={确认?.标题 ?? ""}
        说明={确认?.说明 ?? ""}
        确认文字={确认?.确认文字 ?? "确认"}
        打开={确认 !== null}
        危险={确认?.危险}
        加载={忙碌}
        关闭={() => set确认(null)}
        确认={() => {
          if (确认) void 确认.动作();
        }}
      />

      <弹窗
        标题="新建配置档"
        说明="保存当前启用的模组集合。之后可以一键切回这个状态。"
        打开={创建配置档打开}
        关闭={() => set创建配置档打开(false)}
        宽度={420}
        底部={
          <>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => set创建配置档打开(false)}
              disabled={忙碌}
            >
              取消
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => void 提交配置档()}
              disabled={忙碌 || !配置档名称.trim()}
            >
              保存配置档
            </button>
          </>
        }
        儿童={
          <>
            <label className="field field--stack">
              <span>名称</span>
              <input
                className="input"
                value={配置档名称}
                onChange={(事件) => set配置档名称(事件.target.value)}
                onKeyDown={(事件) => {
                  if (事件.key === "Enter") void 提交配置档();
                }}
                maxLength={40}
                autoFocus
              />
            </label>
            <p className="field-hint">
              会记录当前启用的 {启动数据.snapshot.stats.enabled} 个模组；同名的配置档会被更新。
            </p>
          </>
        }
      />

      <消息提示
        列表={提示列表}
        关闭={(标识) =>
          set提示列表((列表) => 列表.filter((条目) => 条目.id !== 标识))
        }
      />

      {安装进度 && 安装进度.phase !== "done" ? (
        <div className="install-panel" role="status">
          <div className="install-panel__top">
            <span>
              <Loader2 size={14} className="spin" />
              {安装进度.phase === "extract" ? "解压压缩包" : "安装模组"}
            </span>
            <span className="mono">{Math.round(安装进度.percent)}%</span>
          </div>
          <p>{安装进度.label}</p>
          <div className="progress">
            <span style={{ width: `${安装进度.percent}%` }} />
          </div>
          <span className="install-panel__meta mono">
            {安装进度.current} / {安装进度.total}
          </span>
        </div>
      ) : null}
    </>
  ) : (
    <>
      <标题栏 版本="0.1.0" />
      <div className={`boot ${加载错误 ? "boot--error" : ""}`}>
        <标志 尺寸={54} />
        {加载错误 ? (
          <>
            <h1>没能启动</h1>
            <p className="boot__error">{加载错误}</p>
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                set启动数据(null);
                void 载入数据();
              }}
            >
              重试
            </button>
          </>
        ) : (
          <>
            <h1>七日杀 Mod 管家</h1>
            <p>正在读取 Mods 目录…</p>
            <div className="boot__track">
              <span />
            </div>
          </>
        )}
      </div>
    </>
  );

  return (
    <div className="app">
      {是桌面环境 ? (
        <div className="resize-layer" aria-hidden="true">
          {缩放手柄.map(([类名, 方向]) => (
            <div
              key={类名}
              className={`resize-handle resize-handle--${类名}`}
              onMouseDown={(事件) => {
                事件.preventDefault();
                void 应用窗口?.startResizeDragging(方向).catch(() => undefined);
              }}
            />
          ))}
        </div>
      ) : null}
      {内容}
    </div>
  );
}
