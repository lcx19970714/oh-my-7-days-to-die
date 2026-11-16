import { ArrowUpRight, Clipboard, Download, ExternalLink, Search, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { 弹窗 } from "../组件/弹窗";
import { 选择压缩包 } from "../数据/接口";

interface 来源页属性 {
  打开链接: (网址: string) => void;
  安装模组: (路径: string[]) => Promise<void>;
}

const 来源列表 = [
  {
    名称: "7risha 七日杀社区",
    域名: "7risha.com",
    网址: "https://www.7risha.com/",
    说明: "浏览社区文章与模组资源；使用原站账号登录、下载及参与讨论。下载 ZIP 后可直接导入管家。",
  },
  {
    名称: "Nexus Mods",
    域名: "nexusmods.com/7daystodie",
    网址: "https://www.nexusmods.com/7daystodie",
    说明: "最大的模组库。免费账号需要手动下载 ZIP，再用管家安装；不要用 Vortex 部署到错误目录。",
  },
  {
    名称: "7daystodiemods.com",
    域名: "7daystodiemods.com",
    网址: "https://7daystodiemods.com/",
    说明: "按分类整理的社区目录，Modlet 与 Overhaul 都有，下载通常是 ZIP。",
  },
  {
    名称: "The Fun Pimps 论坛",
    域名: "community.thefunpimps.com",
    网址: "https://community.thefunpimps.com/forums/",
    说明: "官方 Modding 分区，适合找更新说明、兼容性讨论和作者原始发布帖。",
  },
  {
    名称: "GitHub",
    域名: "github.com/topics/7-days-to-die",
    网址: "https://github.com/topics/7-days-to-die",
    说明: "Undead Legacy、Darkness Falls 等大型项目的源码与 Releases，适合追版本。",
  },
];

const 安装模式 = [
  {
    名称: "Modlet",
    说明:
      "小型改动，通常是 XML 补丁。文件夹放进 Mods 就能生效，多个 Modlet 可以共存。",
  },
  {
    名称: "Overhaul",
    说明:
      "大型重制，体积从几百 MB 到数 GB，会改写大量 Config 与资源。通常不能与其他 Overhaul 同时启用，切换前请新建存档。",
  },
  {
    名称: "代码模组",
    说明:
      "文件夹里带 DLL。需要 0_TFP_Harmony 前置，并且因为文件夹名排序，Harmony 必须最先加载。",
  },
  {
    名称: "服务端模组",
    说明:
      "只装在服务器上，例如动物生成。客户端不需要安装，但服务器和客户端版本要匹配。",
  },
];

const 加载步骤 = [
  "游戏启动时扫描两处 Mods：用户数据目录与游戏安装目录。",
  "每个子文件夹必须是独立的模组，ModInfo.xml 直接放在文件夹里。",
  "按文件夹名的字母顺序加载；数字前缀会排在字母前面。",
  "Mod 只在启动时读取，安装或启停后要重启游戏；开 EAC 时不会加载。",
];

export function 来源页({ 打开链接, 安装模组 }: 来源页属性) {
  const [搜索词, set搜索词] = useState("");
  const [回复弹窗, set回复弹窗] = useState(false);
  const [回复草稿, set回复草稿] = useState("");
  const [复制完成, set复制完成] = useState(false);
  const 搜索网址 = `https://www.7risha.com/?s=${encodeURIComponent(搜索词.trim())}`;

  const 下载并安装 = async () => {
    const 路径 = await 选择压缩包();
    if (路径.length) await 安装模组(路径);
  };

  const 复制草稿 = async () => {
    await navigator.clipboard.writeText(回复草稿);
    set复制完成(true);
    window.setTimeout(() => set复制完成(false), 2000);
  };

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head__copy">
          <h1>模组来源</h1>
          <p>
            从社区发现资源，在原站完成登录、下载和讨论；ZIP 下载后由管家安全安装并纳入备份管理。
          </p>
        </div>
      </header>

      <section className="section community-panel">
        <div className="section__head">
          <h2>7risha 社区</h2>
          <span className="section__meta">原站账号 · 用户授权</span>
        </div>
        <div className="community-search">
          <label className="searchbox community-search__input">
            <Search size={15} aria-hidden="true" />
            <input
              value={搜索词}
              onChange={(事件) => set搜索词(事件.target.value)}
              onKeyDown={(事件) => {
                if (事件.key === "Enter") 打开链接(搜索网址);
              }}
              placeholder="搜索社区文章或模组"
              aria-label="搜索 7risha 社区文章"
            />
          </label>
          <button
            className="button button--primary"
            type="button"
            onClick={() => 打开链接(搜索词.trim() ? 搜索网址 : "https://www.7risha.com/")}
          >
            <Search size={14} /> 搜索文章
          </button>
          <button
            className="button button--ghost"
            type="button"
            onClick={() => 打开链接("https://www.7risha.com/")}
          >
            <ExternalLink size={14} /> 登录 / 浏览
          </button>
        </div>
        <div className="community-actions">
          <button className="button button--ghost" type="button" onClick={下载并安装}>
            <Download size={14} /> 选择已下载 ZIP 并安装
          </button>
          <button className="button button--ghost" type="button" onClick={() => set回复弹窗(true)}>
            <Clipboard size={14} /> 编写回复草稿
          </button>
        </div>
        <p className="footnote">
          登录和评论在 7risha 原站完成。管家不会读取密码或代替你提交回复；请仅下载作者公开提供且允许再分发/使用的文件。
        </p>
      </section>

      <弹窗
        标题="回复草稿"
        说明="写好后复制到 7risha 的回复框，由你检查并提交。"
        打开={回复弹窗}
        关闭={() => set回复弹窗(false)}
        底部={
          <>
            <button type="button" className="button button--ghost" onClick={() => set回复弹窗(false)}>关闭</button>
            <button type="button" className="button button--primary" onClick={() => void 复制草稿()} disabled={!回复草稿.trim()}>
              <Clipboard size={14} /> {复制完成 ? "已复制" : "复制回复"}
            </button>
            <button type="button" className="button button--ghost" onClick={() => 打开链接("https://www.7risha.com/")}>
              <ExternalLink size={14} /> 打开原站
            </button>
          </>
        }
        儿童={
          <textarea
            className="community-reply"
            value={回复草稿}
            onChange={(事件) => set回复草稿(事件.target.value)}
            placeholder="输入你想回复的内容…"
            rows={7}
            autoFocus
          />
        }
      />

      <section className="section">
        <div className="section__head">
          <h2>其他模组来源</h2>
          <span className="section__meta">{来源列表.length} 个入口</span>
        </div>
        <div className="source-list">
          {来源列表.map((来源, 序号) => (
            <button
              key={来源.名称}
              type="button"
              className="source-row"
              onClick={() => 打开链接(来源.网址)}
            >
              <span className="source-row__index mono">
                {String(序号 + 1).padStart(2, "0")}
              </span>
              <span className="source-row__main">
                <strong>{来源.名称}</strong>
                <span className="source-row__domain mono">{来源.域名}</span>
                <span className="source-row__desc">{来源.说明}</span>
              </span>
              <ArrowUpRight size={16} className="source-row__arrow" />
            </button>
          ))}
        </div>
      </section>

      <div className="overview-grid overview-grid--wide">
        <section className="section">
          <div className="section__head">
            <h2>安装模式</h2>
          </div>
          <dl className="definition-list">
            {安装模式.map((模式) => (
              <div key={模式.名称}>
                <dt>{模式.名称}</dt>
                <dd>{模式.说明}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="section">
          <div className="section__head">
            <h2>游戏如何读取</h2>
          </div>
          <ol className="step-list">
            {加载步骤.map((步骤, 序号) => (
              <li key={步骤}>
                <span className="step-list__index mono">
                  {String(序号 + 1).padStart(2, "0")}
                </span>
                <span>{步骤}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="warning-band">
        <ShieldAlert size={17} />
        <div>
          <strong>EAC 与多人游戏</strong>
          <p>
            安装 Mod 后通常需要关闭 EAC；连接开启 EAC 的服务器会被拒绝。进入多人服务器前，
            先确认服务器允许哪些 Mod，以及是否要求客户端安装同样的版本。
          </p>
        </div>
      </div>

      <p className="footnote">
        管家负责本地文件的扫描、启停、ZIP 安装和备份；第三方网站的账号与内容由其各自运营方负责。
      </p>
    </div>
  );
}
