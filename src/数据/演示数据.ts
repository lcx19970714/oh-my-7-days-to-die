import type {
  ApplyReport,
  BackupEntry,
  Bootstrap,
  Conflict,
  HealthIssue,
  InstallReport,
  ModDetails,
  ModEntry,
  Profile,
  Settings,
} from "./类型";

const 用户模组目录 = "C:\\Users\\main\\AppData\\Roaming\\7DaysToDie\\Mods";
const 游戏目录 = "D:\\SteamLibrary\\steamapps\\common\\7 Days To Die";
const 游戏模组目录 = `${游戏目录}\\Mods`;
const 数据目录 = "C:\\Users\\main\\AppData\\Roaming\\com.wasteland.modmanager";
const 备份目录 = `${数据目录}\\backups`;

export const 是演示模式 =
  typeof window !== "undefined" &&
  !("__TAURI_INTERNALS__" in window) &&
  import.meta.env.DEV;

const 现在 = Date.now();
const 一天 = 86_400_000;

function 创建模组(
  输入: Partial<ModEntry> & { folder: string; displayName: string },
): ModEntry {
  return {
    path: `${用户模组目录}\\${输入.folder}`,
    enabled: true,
    loadIndex: 0,
    internalName: 输入.folder,
    version: "1.0.0",
    author: null,
    description: null,
    website: null,
    sizeBytes: 0,
    fileCount: 0,
    hasDll: false,
    hasXml: true,
    modInfoOk: true,
    modInfoIssue: null,
    ...输入,
  };
}

const 初始模组列表: ModEntry[] = [
  创建模组({
    folder: "0_TFP_Harmony",
    displayName: "TFP Harmony",
    internalName: "0_TFP_Harmony",
    version: "2.3.0",
    author: "The Fun Pimps",
    description:
      "所有代码模组的前置。必须启用，并且因为文件夹以 0 开头，它会最先加载。",
    website: "https://community.thefunpimps.com/",
    sizeBytes: 1_310_720,
    fileCount: 32,
    hasDll: true,
  }),
  创建模组({
    folder: "SMX_UI_Core",
    displayName: "SMX UI — Core",
    internalName: "SMXcore",
    version: "1.4.1",
    author: "Sirillion",
    description:
      "SMX 界面框架的核心。提供 HUD、背包与菜单的布局重写；需要放在其他 SMX 组件之前。",
    sizeBytes: 8_808_038,
    fileCount: 210,
  }),
  创建模组({
    folder: "SMX_UI_Compass",
    displayName: "SMX UI — Compass",
    internalName: "SMXcompass",
    version: "1.4.0",
    author: "Sirillion",
    description: "把原版罗盘替换成更紧凑的 SMX 样式。",
    sizeBytes: 1_153_433,
    fileCount: 24,
  }),
  创建模组({
    folder: "War3zuk_AIOMod",
    displayName: "War3zuk AIO",
    internalName: "War3zuk_AIOMod",
    version: "5.2.0",
    author: "War3zuk",
    description:
      "大型整合包：新增武器、载具、工作台与敌人。会修改大量 Config 文件，与其他大改模组容易冲突。",
    website: "https://www.nexusmods.com/7daystodie",
    sizeBytes: 149_000_000,
    fileCount: 4200,
    hasDll: true,
  }),
  创建模组({
    folder: "UndeadLegacy_Core",
    displayName: "Undead Legacy — Core",
    internalName: "UndeadLegacy",
    version: "3.1.0",
    author: "Subquake",
    description:
      "全面重制的 Overhaul：技能、物品、UI、进度系统。与大多数其他 Overhaul 不兼容，切换前请新建存档。",
    sizeBytes: 1_930_000_000,
    fileCount: 8600,
    enabled: false,
    hasDll: true,
  }),
  创建模组({
    folder: "CraftFromContainers",
    displayName: "Craft From Containers",
    internalName: "CraftFromContainers",
    version: "1.0.6",
    author: "KhaineGB",
    description: "制作时自动使用附近箱子里的材料，不需要来回搬东西。",
    sizeBytes: 24_576,
    fileCount: 12,
  }),
  创建模组({
    folder: "Bdubs_Vehicles",
    displayName: "Bdub's Vehicles",
    internalName: "BdubsVehicles",
    version: "1.2.3",
    author: "Bdubyah",
    description: "新增吉普、摩托与改装件，需要额外的工作台配方。",
    sizeBytes: 39_845_000,
    fileCount: 640,
  }),
  创建模组({
    folder: "Telrics_FoodSpoilage",
    displayName: "Telric's Food Spoilage",
    internalName: "TelricsFoodSpoilage",
    version: "2.0.1",
    author: "Telric",
    description: "食物会随时间腐坏，罐头与腌制品保质期更长。",
    sizeBytes: 65_536,
    fileCount: 18,
  }),
  创建模组({
    folder: "ZombieReach_Remover",
    displayName: "Zombie Reach Remover",
    internalName: "ZombieReachRemover",
    version: "1.1.0",
    author: "community",
    description: "移除僵尸攻击时夸张的命中距离，让近战判断更符合视觉。",
    sizeBytes: 12_288,
    fileCount: 6,
    enabled: false,
  }),
  创建模组({
    folder: "ServerSideAnimals",
    displayName: "Server Side Animals",
    internalName: "ServerSideAnimals",
    version: "1.0.0",
    author: "Snufkin",
    description: "服务端生成动物，客户端不需要安装。",
    sizeBytes: 2_306_867,
    fileCount: 41,
    hasDll: true,
  }),
  创建模组({
    folder: "NoTraderTeleport",
    displayName: "No Trader Teleport",
    internalName: "NoTraderTeleport",
    version: "1.0.2",
    author: "community",
    description: "关闭商人的传送功能，适合硬核服务器。",
    sizeBytes: 8_192,
    fileCount: 5,
    enabled: false,
  }),
  创建模组({
    folder: "UI_Compass_Rework",
    displayName: "Compass Rework",
    internalName: "CompassRework",
    version: "0.9.0",
    author: "Riles",
    description: "重新绘制罗盘刻度与兴趣点图标。与 SMX Compass 写入同一个图集文件。",
    sizeBytes: 921_600,
    fileCount: 8,
  }),
  创建模组({
    folder: "Old_Loot_Overhaul",
    displayName: "Old Loot Overhaul",
    internalName: null,
    version: null,
    author: null,
    description: null,
    sizeBytes: 4_096,
    fileCount: 1,
    enabled: false,
    modInfoOk: false,
    modInfoIssue: "缺少 ModInfo.xml，游戏不会加载这个文件夹",
  }),
  创建模组({
    folder: "Wasteland_Weather",
    displayName: "Wasteland Weather",
    internalName: "WastelandWeather",
    version: "1.3.2",
    author: "Dust",
    description: "更长的暴雨、沙尘与辐射风暴，夜晚更暗。",
    sizeBytes: 3_145_728,
    fileCount: 36,
  }),
];

const 冲突组 = [
  {
    path: "config/items.xml",
    mods: ["War3zuk_AIOMod", "Telrics_FoodSpoilage"],
  },
  {
    path: "uiatlases/uiatlas/compass.png",
    mods: ["SMX_UI_Compass", "UI_Compass_Rework"],
  },
  {
    path: "config/vehicles.xml",
    mods: ["Bdubs_Vehicles", "War3zuk_AIOMod"],
  },
];

const 初始配置档: Profile[] = [
  {
    id: "p-vanilla",
    name: "纯净生存",
    mods: [
      "0_TFP_Harmony",
      "CraftFromContainers",
      "Telrics_FoodSpoilage",
      "ServerSideAnimals",
    ],
    createdAt: 现在 - 一天 * 9,
    updatedAt: 现在 - 一天 * 2,
  },
  {
    id: "p-visual",
    name: "视觉强化",
    mods: [
      "0_TFP_Harmony",
      "SMX_UI_Core",
      "SMX_UI_Compass",
      "UI_Compass_Rework",
      "Wasteland_Weather",
    ],
    createdAt: 现在 - 一天 * 6,
    updatedAt: 现在 - 一天,
  },
  {
    id: "p-war3zuk",
    name: "War3zuk 整合",
    mods: [
      "0_TFP_Harmony",
      "War3zuk_AIOMod",
      "Bdubs_Vehicles",
      "CraftFromContainers",
      "ServerSideAnimals",
    ],
    createdAt: 现在 - 一天 * 4,
    updatedAt: 现在 - 一天 * 4,
  },
];

const 初始备份: BackupEntry[] = [
  {
    id: "20261112_213010_War3zuk_AIOMod",
    folder: "War3zuk_AIOMod",
    displayName: "War3zuk AIO",
    version: "5.1.0",
    reason: "replace",
    createdAt: 现在 - 一天 * 2,
    sizeBytes: 148_000_000,
  },
  {
    id: "20261110_190422_UndeadLegacy_Core",
    folder: "UndeadLegacy_Core",
    displayName: "Undead Legacy — Core",
    version: "3.0.4",
    reason: "delete",
    createdAt: 现在 - 一天 * 4,
    sizeBytes: 1_930_000_000,
  },
  {
    id: "20261108_112233_SMX_UI_Core",
    folder: "SMX_UI_Core",
    displayName: "SMX UI — Core",
    version: "1.4.0",
    reason: "replace",
    createdAt: 现在 - 一天 * 6,
    sizeBytes: 8_700_000,
  },
];

function 构建快照(
  模组列表: ModEntry[],
  配置档列表: Profile[],
  备份列表: BackupEntry[],
) {
  重排加载序号(模组列表);
  const 启用列表 = 模组列表.filter((模组) => 模组.enabled);
  const 冲突列表: Conflict[] = 冲突组
    .filter((组) =>
      组.mods.every((名称) => 启用列表.some((模组) => 模组.folder === 名称)),
    )
    .map((组) => ({ path: 组.path, mods: [...组.mods] }));
  const 无效模组 = 模组列表.filter((模组) => !模组.modInfoOk);
  const 问题列表: HealthIssue[] = [];
  if (冲突列表.length > 0) {
    问题列表.push({
      id: "conflicts",
      severity: "warning",
      title: `${冲突列表.length} 处文件冲突`,
      detail:
        "多个启用模组写入了同一个相对路径，后加载的会覆盖先加载的；打开模组详情可以查看具体文件。",
    });
  }
  if (无效模组.length > 0) {
    问题列表.push({
      id: "invalid-modinfo",
      severity: "warning",
      title: `${无效模组.length} 个文件夹缺少 ModInfo.xml`,
      detail: `${无效模组.map((模组) => 模组.folder).join("、")} 不会被游戏加载。`,
    });
  }
  问题列表.push({
    id: "other-library-user",
    severity: "info",
    title: "另一处 Mods 目录里还有模组",
    detail: `${游戏模组目录} 中有 3 个模组。游戏会同时加载这两处目录，建议只保留一处，避免重复或版本打架。`,
  });

  return {
    modsDir: 用户模组目录,
    disabledDir: `${用户模组目录}_Disabled`,
    mods: 模组列表,
    conflicts: 冲突列表,
    issues: 问题列表,
    game: {
      installed: true,
      path: 游戏目录,
      exe: `${游戏目录}\\7DaysToDie.exe`,
      eacExe: `${游戏目录}\\7DaysToDie_EAC.exe`,
      steamBuild: "25210000",
      running: false,
      gameModsDir: 游戏模组目录,
      userModsDir: 用户模组目录,
    },
    locations: [
      {
        path: 用户模组目录,
        kind: "user",
        exists: true,
        modCount: 模组列表.length,
        enabledCount: 启用列表.length,
        writable: true,
      },
      {
        path: 游戏模组目录,
        kind: "game",
        exists: true,
        modCount: 3,
        enabledCount: 3,
        writable: true,
      },
    ],
    profiles: 配置档列表,
    backups: 备份列表,
    stats: {
      total: 模组列表.length,
      enabled: 启用列表.length,
      disabled: 模组列表.length - 启用列表.length,
      codeMods: 启用列表.filter((模组) => 模组.hasDll).length,
      conflicts: 冲突列表.length,
      totalBytes: 模组列表.reduce((合计, 模组) => 合计 + 模组.sizeBytes, 0),
    },
    scannedAt: Date.now(),
  };
}

function 重排加载序号(模组列表: ModEntry[]) {
  const 启用列表 = 模组列表
    .filter((模组) => 模组.enabled)
    .sort((甲, 乙) => 甲.folder.localeCompare(乙.folder));
  启用列表.forEach((模组, 序号) => {
    模组.loadIndex = 序号 + 1;
  });
  模组列表.forEach((模组) => {
    if (!模组.enabled) 模组.loadIndex = 0;
  });
}

const 设置: Settings = {
  gamePath: 游戏目录,
  modsDir: 用户模组目录,
  theme: "dark",
  eac: false,
  autoBackup: true,
};

let 演示状态: Bootstrap = {
  settings: 设置,
  snapshot: 构建快照(
    克隆(初始模组列表),
    克隆(初始配置档),
    克隆(初始备份),
  ),
  dataDir: 数据目录,
  backupsDir: 备份目录,
  version: "0.1.0",
};

function 刷新演示状态() {
  演示状态 = {
    ...演示状态,
    snapshot: 构建快照(
      演示状态.snapshot.mods,
      演示状态.snapshot.profiles,
      演示状态.snapshot.backups,
    ),
  };
}

function 克隆<T>(值: T): T {
  return structuredClone(值);
}

function 等待(毫秒: number) {
  return new Promise((完成) => setTimeout(完成, 毫秒));
}

function 查找模组(文件夹: string): ModEntry | undefined {
  return 演示状态.snapshot.mods.find((模组) => 模组.folder === 文件夹);
}

function 生成文件列表(模组: ModEntry): { path: string; sizeBytes: number }[] {
  const 文件 = [
    { path: "ModInfo.xml", sizeBytes: 512 },
    {
      path: "Config/items.xml",
      sizeBytes: Math.max(1024, Math.round(模组.sizeBytes * 0.18)),
    },
    {
      path: "Config/vehicles.xml",
      sizeBytes: Math.max(512, Math.round(模组.sizeBytes * 0.06)),
    },
    {
      path: "Config/spawning.xml",
      sizeBytes: Math.max(256, Math.round(模组.sizeBytes * 0.02)),
    },
    { path: "Mods/1-Core/ModInfo.xml", sizeBytes: 420 },
    { path: "UIAtlases/UIAtlas/compass.png", sizeBytes: 240_000 },
  ];
  if (模组.hasDll) {
    文件.push({
      path: `${模组.folder}.dll`,
      sizeBytes: Math.max(8192, Math.round(模组.sizeBytes * 0.4)),
    });
  }
  return 文件;
}

export async function 演示接口<T>(
  命令: string,
  参数?: Record<string, unknown>,
): Promise<T> {
  await 等待(命令 === "安装模组" ? 900 : 120);
  const 文件夹 = String(参数?.folder ?? "");
  const 标识 = String(参数?.id ?? "");

  switch (命令) {
    case "启动数据":
      return 克隆(演示状态) as T;
    case "获取快照":
      return 克隆(演示状态.snapshot) as T;
    case "保存设置": {
      const 新设置 = 参数?.settings as Settings;
      演示状态.settings = {
        ...演示状态.settings,
        ...新设置,
        gamePath: 新设置.gamePath || null,
        modsDir: 新设置.modsDir || null,
      };
      return 克隆(演示状态) as T;
    }
    case "检测游戏安装":
      return 克隆(演示状态.snapshot.game) as T;
    case "启用模组": {
      const 目标 = 查找模组(文件夹);
      if (目标) 目标.enabled = Boolean(参数?.enabled);
      刷新演示状态();
      return undefined as T;
    }
    case "安装模组": {
      const 路径列表 = (参数?.paths as string[]) ?? [];
      const 报告: InstallReport = { installed: [], replaced: [], errors: [] };
      for (const 路径 of 路径列表) {
        if (!/\.zip$/i.test(路径)) {
          报告.errors.push(
            `${路径.split(/[\\/]/).pop()}：演示模式只模拟 ZIP 安装`,
          );
          continue;
        }
        const 原始名 =
          路径.split(/[\\/]/).pop()?.replace(/\.zip$/i, "") ?? "New Mod";
        const 名称 = 原始名.replace(/[<>:"/\\|?*]/g, "_");
        if (查找模组(名称)) {
          报告.replaced.push(名称);
        }
        const 条目 = 创建模组({
          folder: 名称,
          displayName: 原始名,
          version: "1.0.0",
          description: "刚刚通过管家安装的示例模组。",
          sizeBytes: 12_000_000,
          fileCount: 16,
          enabled: true,
        });
        演示状态.snapshot.mods = 演示状态.snapshot.mods.filter(
          (模组) => 模组.folder !== 名称,
        );
        演示状态.snapshot.mods.push(条目);
        报告.installed.push({
          folder: 名称,
          displayName: 原始名,
          version: "1.0.0",
        });
      }
      刷新演示状态();
      return 报告 as T;
    }
    case "删除模组": {
      const 目标 = 查找模组(文件夹);
      if (!目标) throw new Error("模组不存在");
      演示状态.snapshot.mods = 演示状态.snapshot.mods.filter(
        (模组) => 模组.folder !== 文件夹,
      );
      const 条目: BackupEntry = {
        id: `${Date.now()}_${文件夹}`,
        folder: 文件夹,
        displayName: 目标.displayName,
        version: 目标.version,
        reason: "delete",
        createdAt: Date.now(),
        sizeBytes: 目标.sizeBytes,
      };
      演示状态.snapshot.backups.unshift(条目);
      刷新演示状态();
      return 条目 as T;
    }
    case "恢复备份": {
      const 条目 = 演示状态.snapshot.backups.find((备份) => 备份.id === 标识);
      if (!条目) throw new Error("备份不存在");
      演示状态.snapshot.backups = 演示状态.snapshot.backups.filter(
        (备份) => 备份.id !== 标识,
      );
      if (!查找模组(条目.folder)) {
        演示状态.snapshot.mods.push(
          创建模组({
            folder: 条目.folder,
            displayName: 条目.displayName,
            version: 条目.version,
            sizeBytes: 条目.sizeBytes,
            enabled: true,
          }),
        );
      }
      刷新演示状态();
      return 条目.folder as T;
    }
    case "删除备份":
      演示状态.snapshot.backups = 演示状态.snapshot.backups.filter(
        (备份) => 备份.id !== 标识,
      );
      return undefined as T;
    case "保存配置档": {
      const 名称 = String(参数?.name ?? "").trim();
      if (!名称) throw new Error("配置档名称不能为空");
      const 启用列表 = 演示状态.snapshot.mods
        .filter((模组) => 模组.enabled)
        .map((模组) => 模组.folder);
      const 已有 = 演示状态.snapshot.profiles.find(
        (配置档) => 配置档.name === 名称,
      );
      let 配置档: Profile;
      if (已有) {
        已有.mods = 启用列表;
        已有.updatedAt = Date.now();
        配置档 = 已有;
      } else {
        配置档 = {
          id: `p${Date.now()}`,
          name: 名称,
          mods: 启用列表,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        演示状态.snapshot.profiles.unshift(配置档);
      }
      return 克隆(配置档) as T;
    }
    case "应用配置档": {
      const 配置档 = 演示状态.snapshot.profiles.find(
        (配置档) => 配置档.id === 标识,
      );
      if (!配置档) throw new Error("配置档不存在");
      const 目标集合 = new Set(配置档.mods);
      let 已启用 = 0;
      let 已停用 = 0;
      for (const 模组 of 演示状态.snapshot.mods) {
        const 应为启用 = 目标集合.has(模组.folder);
        if (应为启用 !== 模组.enabled) {
          模组.enabled = 应为启用;
          if (应为启用) 已启用 += 1;
          else 已停用 += 1;
        }
      }
      刷新演示状态();
      return {
        enabled: 已启用,
        disabled: 已停用,
        missing: [],
        errors: [],
      } as ApplyReport as T;
    }
    case "删除配置档":
      演示状态.snapshot.profiles = 演示状态.snapshot.profiles.filter(
        (配置档) => 配置档.id !== 标识,
      );
      return undefined as T;
    case "获取模组详情": {
      const 目标 = 查找模组(文件夹);
      if (!目标) throw new Error("模组不存在");
      const 详情: ModDetails = {
        entry: 克隆(目标),
        files: 生成文件列表(目标),
        conflicts: 演示状态.snapshot.conflicts.filter((冲突) =>
          冲突.mods.includes(文件夹),
        ),
        totalFiles: 目标.fileCount,
      };
      return 详情 as T;
    }
    case "启动游戏":
      return undefined as T;
    default:
      throw new Error(`演示模式未实现命令：${命令}`);
  }
}
