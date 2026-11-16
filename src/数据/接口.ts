import { invoke as 桌面调用 } from "@tauri-apps/api/core";
import { listen as 监听事件 } from "@tauri-apps/api/event";
import { open as 打开对话框 } from "@tauri-apps/plugin-dialog";
import {
  openPath as 打开本地路径,
  openUrl as 打开网页地址,
} from "@tauri-apps/plugin-opener";

import { 演示接口, 是演示模式 } from "./演示数据";
import type {
  ApplyReport,
  BackupEntry,
  Bootstrap,
  GameInfo,
  InstallProgress,
  InstallReport,
  ModDetails,
  Profile,
  Snapshot,
  Settings,
} from "./类型";

export { 是演示模式 };

export const 是桌面环境 =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function 调用接口<T>(
  命令: string,
  参数?: Record<string, unknown>,
): Promise<T> {
  if (是演示模式) return 演示接口<T>(命令, 参数);
  return 桌面调用<T>(命令, 参数);
}

export const 接口 = {
  启动数据: () => 调用接口<Bootstrap>("启动数据"),
  获取快照: (模组目录?: string | null) =>
    调用接口<Snapshot>("获取快照", 模组目录 ? { modsDir: 模组目录 } : {}),
  保存设置: (设置: Settings) =>
    调用接口<Bootstrap>("保存设置", { settings: 设置 }),
  检测游戏: () => 调用接口<GameInfo | null>("检测游戏安装"),
  安装: (路径列表: string[], 模组目录?: string | null) =>
    调用接口<InstallReport>("安装模组", {
      paths: 路径列表,
      ...(模组目录 ? { modsDir: 模组目录 } : {}),
    }),
  设置启用: (文件夹: string, 已启用: boolean, 模组目录?: string | null) =>
    调用接口<void>("启用模组", {
      folder: 文件夹,
      enabled: 已启用,
      ...(模组目录 ? { modsDir: 模组目录 } : {}),
    }),
  删除模组: (文件夹: string, 已启用: boolean, 模组目录?: string | null) =>
    调用接口<BackupEntry>("删除模组", {
      folder: 文件夹,
      enabled: 已启用,
      ...(模组目录 ? { modsDir: 模组目录 } : {}),
    }),
  恢复备份: (标识: string, 模组目录?: string | null) =>
    调用接口<string>("恢复备份", {
      id: 标识,
      ...(模组目录 ? { modsDir: 模组目录 } : {}),
    }),
  删除备份: (标识: string) => 调用接口<void>("删除备份", { id: 标识 }),
  保存配置档: (名称: string, 模组目录?: string | null) =>
    调用接口<Profile>("保存配置档", {
      name: 名称,
      ...(模组目录 ? { modsDir: 模组目录 } : {}),
    }),
  应用配置档: (标识: string, 模组目录?: string | null) =>
    调用接口<ApplyReport>("应用配置档", {
      id: 标识,
      ...(模组目录 ? { modsDir: 模组目录 } : {}),
    }),
  删除配置档: (标识: string) =>
    调用接口<void>("删除配置档", { id: 标识 }),
  获取模组详情: (
    文件夹: string,
    已启用: boolean,
    模组目录?: string | null,
  ) =>
    调用接口<ModDetails>("获取模组详情", {
      folder: 文件夹,
      enabled: 已启用,
      ...(模组目录 ? { modsDir: 模组目录 } : {}),
    }),
  启动游戏: () => 调用接口<void>("启动游戏"),
};

export async function 选择压缩包(): Promise<string[]> {
  if (是演示模式) {
    return ["C:\\Users\\main\\Downloads\\Wasteland_Weather_1.3.2.zip"];
  }
  const 结果 = await 打开对话框({
    multiple: true,
    title: "选择模组压缩包",
    filters: [{ name: "ZIP 模组包", extensions: ["zip"] }],
  });
  if (!结果) return [];
  return Array.isArray(结果) ? 结果 : [结果];
}

export async function 选择文件夹(标题: string): Promise<string | null> {
  if (是演示模式) return "D:\\SteamLibrary\\steamapps\\common\\7 Days To Die";
  const 结果 = await 打开对话框({
    directory: true,
    multiple: false,
    title: 标题,
  });
  return typeof 结果 === "string" ? 结果 : null;
}

export async function 打开路径(路径: string): Promise<void> {
  if (!路径) return;
  if (是演示模式) return;
  await 打开本地路径(路径);
}

export async function 打开链接(网址: string): Promise<void> {
  if (!网址) return;
  if (是演示模式) {
    window.open(网址, "_blank", "noopener,noreferrer");
    return;
  }
  await 打开网页地址(网址);
}

export async function 监听安装进度(
  处理函数: (进度: InstallProgress) => void,
): Promise<() => void> {
  if (是演示模式 || !是桌面环境) return () => {};
  const 取消监听 = await 监听事件<InstallProgress>(
    "install-progress",
    (事件) => {
      处理函数(事件.payload);
    },
  );
  return 取消监听;
}
