import { Layers, Plus, Trash2 } from "lucide-react";

import { 相对时间 } from "../数据/格式化";
import type { ModEntry, Profile } from "../数据/类型";

interface 配置档页属性 {
  配置档列表: Profile[];
  模组列表: ModEntry[];
  忙碌: boolean;
  创建配置档: () => void;
  应用配置档: (配置档: Profile) => void;
  删除配置档: (配置档: Profile) => void;
}

export function 配置档页({
  配置档列表,
  模组列表,
  忙碌,
  创建配置档,
  应用配置档,
  删除配置档,
}: 配置档页属性) {
  const 全部文件夹 = new Set(模组列表.map((模组) => 模组.folder));
  const 当前启用 = new Set(
    模组列表.filter((模组) => 模组.enabled).map((模组) => 模组.folder),
  );
  const 名称映射 = new Map(模组列表.map((模组) => [模组.folder, 模组.displayName]));
  const 排序映射 = new Map(模组列表.map((模组) => [模组.folder, 模组.loadIndex]));

  const 是否当前 = (配置档: Profile) =>
    配置档.mods.length === 当前启用.size &&
    配置档.mods.every((名称) => 当前启用.has(名称));

  const 预览名称 = (配置档: Profile) =>
    配置档.mods
      .slice()
      .sort((甲, 乙) => (排序映射.get(甲) ?? 999) - (排序映射.get(乙) ?? 999))
      .slice(0, 3)
      .map((名称) => 名称映射.get(名称) ?? 名称)
      .join(" · ");

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__copy">
          <h1>配置档</h1>
          <p>
            把一组启用状态存成档案，在纯净生存、视觉包和大型整合之间一键切换。
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="button button--primary"
            onClick={创建配置档}
            disabled={忙碌}
          >
            <Plus size={15} />
            从当前状态创建
          </button>
        </div>
      </header>

      <section className="profile-current">
        <div className="profile-current__icon">
          <Layers size={18} />
        </div>
        <div className="profile-current__copy">
          <strong>当前启用 {当前启用.size} 个模组</strong>
          <p>
            {当前启用.size === 0
              ? "现在没有任何启用的模组。"
              : [...当前启用]
                  .sort(
                    (甲, 乙) =>
                      (排序映射.get(甲) ?? 999) - (排序映射.get(乙) ?? 999),
                  )
                  .slice(0, 4)
                  .map((名称) => 名称映射.get(名称) ?? 名称)
                  .join(" · ")}
            {当前启用.size > 4 ? ` 等 ${当前启用.size} 个` : ""}
          </p>
        </div>
        <button
          type="button"
          className="button button--ghost"
          onClick={创建配置档}
          disabled={忙碌}
        >
          存为配置档
        </button>
      </section>

      <div className="section__head section__head--spaced">
        <h2>已保存</h2>
        <span className="section__meta">{配置档列表.length} 个</span>
      </div>

      {配置档列表.length === 0 ? (
        <div className="empty-block">
          <h2>还没有配置档</h2>
          <p>
            先把模组调成你喜欢的样子，再点“从当前状态创建”。之后切换配置档时，
            管家只会移动模组文件夹，不会改动游戏本体。
          </p>
          <button
            type="button"
            className="button button--primary"
            onClick={创建配置档}
            disabled={忙碌}
          >
            创建第一个配置档
          </button>
        </div>
      ) : (
        <div className="profile-list">
          {配置档列表.map((配置档) => {
            const 缺失 = 配置档.mods.filter((名称) => !全部文件夹.has(名称));
            const 当前 = 是否当前(配置档);
            const 预览 = 预览名称(配置档);
            return (
              <article className="profile-row" key={配置档.id}>
                <span className="profile-row__count mono">
                  {String(配置档.mods.length).padStart(2, "0")}
                </span>
                <div className="profile-row__main">
                  <div className="profile-row__title">
                    <h3>{配置档.name}</h3>
                    {当前 ? <span className="tag tag--ok">当前</span> : null}
                    {缺失.length > 0 ? (
                      <span className="tag tag--danger">缺少 {缺失.length}</span>
                    ) : null}
                  </div>
                  <p className="profile-row__mods">
                    {配置档.mods.length === 0
                      ? "空配置档"
                      : `${预览}${配置档.mods.length > 3 ? ` 等 ${配置档.mods.length} 个` : ""}`}
                  </p>
                  <span className="profile-row__time">
                    更新于 {相对时间(配置档.updatedAt)}
                  </span>
                </div>
                <div className="profile-row__actions">
                  <button
                    type="button"
                    className={`button ${当前 ? "button--ghost" : "button--primary"}`}
                    onClick={() => 应用配置档(配置档)}
                    disabled={忙碌 || 当前}
                  >
                    {当前 ? "正在使用" : "应用"}
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button--danger"
                    onClick={() => 删除配置档(配置档)}
                    disabled={忙碌}
                    aria-label={`删除配置档 ${配置档.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="footnote">
        应用配置档会启用档案内的模组、停用其余模组；缺失的模组会被列出，不会中断其他模组的切换。
      </p>
    </div>
  );
}
