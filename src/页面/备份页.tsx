import { Archive, ArchiveRestore, FolderOpen, Trash2 } from "lucide-react";

import { 格式化字节, 格式化日期 } from "../数据/格式化";
import type { BackupEntry } from "../数据/类型";

interface 备份页属性 {
  备份列表: BackupEntry[];
  备份目录: string;
  忙碌: boolean;
  恢复备份: (备份: BackupEntry) => void;
  删除备份: (备份: BackupEntry) => void;
  打开路径: (路径: string) => void;
}

function 原因文字(原因: string): string {
  if (原因 === "replace") return "覆盖前";
  if (原因 === "delete") return "删除前";
  return "手动";
}

export function 备份页({
  备份列表,
  备份目录,
  忙碌,
  恢复备份,
  删除备份,
  打开路径,
}: 备份页属性) {
  const 总字节 = 备份列表.reduce((合计, 备份) => 合计 + 备份.sizeBytes, 0);

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__copy">
          <h1>备份</h1>
          <p>
            覆盖和删除都会先把原文件夹移到这里。恢复会把文件夹移回 Mods，再删除这条备份。
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={() => 打开路径(备份目录)}
          >
            <FolderOpen size={15} />
            打开备份目录
          </button>
        </div>
      </header>

      <div className="section__head section__head--spaced">
        <h2>存档</h2>
        <span className="section__meta">
          {备份列表.length} 条 · {格式化字节(总字节)}
        </span>
      </div>

      {备份列表.length === 0 ? (
        <div className="empty-block">
          <Archive size={26} strokeWidth={1.2} />
          <h2>还没有备份</h2>
          <p>
            安装同名模组时旧版本会被自动备份；在模组详情里“移入备份”也会出现在这里。
            备份放在应用数据目录，不会污染游戏目录。
          </p>
          <span className="empty-block__path mono">{备份目录}</span>
        </div>
      ) : (
        <div className="backup-list">
          <div className="backup-list__head">
            <span>时间</span>
            <span>模组</span>
            <span>原因</span>
            <span>体积</span>
            <span aria-hidden="true" />
          </div>
          {备份列表.map((备份) => (
            <div className="backup-row" key={备份.id}>
              <span className="backup-row__time mono">
                {格式化日期(备份.createdAt)}
              </span>
              <div className="backup-row__main">
                <strong>{备份.displayName}</strong>
                <span className="mono">
                  {备份.folder}
                  {备份.version ? ` · v${备份.version}` : ""}
                </span>
              </div>
              <span className={`reason reason--${备份.reason}`}>
                {原因文字(备份.reason)}
              </span>
              <span className="backup-row__size mono">
                {格式化字节(备份.sizeBytes)}
              </span>
              <div className="backup-row__actions">
                <button
                  type="button"
                  className="button button--small button--ghost"
                  onClick={() => 恢复备份(备份)}
                  disabled={忙碌}
                >
                  <ArchiveRestore size={14} />
                  恢复
                </button>
                <button
                  type="button"
                  className="icon-button icon-button--danger"
                  onClick={() => 删除备份(备份)}
                  disabled={忙碌}
                  aria-label={`永久删除 ${备份.displayName} 的备份`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="footnote">
        永久删除只删除备份副本，不影响已经安装的模组。恢复前请关闭游戏，避免文件被占用。
      </p>
    </div>
  );
}
