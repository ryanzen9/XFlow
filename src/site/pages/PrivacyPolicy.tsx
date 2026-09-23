import type { ReactNode } from "react";

type Language = "zh" | "en";

const githubPrivacy = "https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement";
const openRouterPrivacy = "https://openrouter.ai/privacy/";
const vercelPrivacy = "https://vercel.com/legal/privacy-notice";
const vercelAiTerms = "https://vercel.com/legal/ai-product-terms";
const typeSafePrivacy = "https://typesafe.ai/legal/privacy-policy";
const chromeLimitedUse = "https://developer.chrome.com/docs/webstore/program-policies/limited-use";
const issues = "https://github.com/ryanzen9/XFlow/issues";

function Link({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href}>{children}</a>;
}

function ChinesePolicy() {
  return (
    <article className="policy" aria-labelledby="policy-title">
      <a className="back-link" href="./">
        ← 返回 XFlow
      </a>
      <h1 id="policy-title">XFlow 隐私政策</h1>
      <p className="policy__date">生效日期：2026 年 9 月 23 日 · 适用版本：0.1.0 · 发布者：Ryan Zeng</p>
      <p className="policy__language">
        <Link href="./privacy-en.html">English version</Link>
      </p>

      <section>
        <h2>网站访问</h2>
        <p>
          本站由 GitHub Pages 提供静态托管。XFlow 页面代码不会写入
          Cookie，也不使用分析脚本、追踪像素、表单或自有后端。GitHub 可能依据其{" "}
          <Link href={githubPrivacy}>隐私声明</Link>处理访问请求和服务运行数据。
        </p>
      </section>

      <section>
        <h2>处理的数据及用途</h2>
        <ul>
          <li>
            X / Twitter 当前支持页面中可见的帖子 ID 和正文：在你启用相应过滤范围并配置 Provider Key
            后，用于按已启用策略判断帖子；不会读取其他网站的浏览历史。
          </li>
          <li>策略名称、判断规则及相关配置：用于构造判断请求和呈现结果；配置保存在浏览器本机。</li>
          <li>
            过滤活动：仅在内容实际被遮蔽后记录，可能包含内容 ID、最多 500 字符的正文预览、作者、帖子
            URL、页面范围、媒体类型、过滤时间、设备标识、命中策略及揭示或误判状态。
          </li>
          <li>
            Provider API Key 与可选的 S3 凭据：保存在扩展的 <code>chrome.storage.local</code>
            ，供所选服务鉴权或签名请求使用。
          </li>
          <li>界面语言、主题及其他设置：用于提供扩展功能；界面语言保存在本机，不进入 S3 同步文档。</li>
        </ul>
        <p>
          XFlow 不读取 X 登录 Cookie 或 Session，不保存页面
          HTML、DOM、媒体文件或完整浏览路径。当前版本没有广告、开发者遥测或开发者分析服务。
        </p>
      </section>

      <section>
        <h2>数据发送给谁</h2>
        <p>
          <strong>你选中的 Jev Provider。</strong>扩展只向当前选中的 OpenRouter、Vercel AI Gateway 或 TypeSafe
          发送待判断帖子的 ID、正文、适用策略的名称与规则，以及该 Provider 的 API
          Key。请求用于返回过滤判断；失败时不会自动转发到另一家 Provider。Provider
          及其可能使用的上游模型服务按各自条款和隐私政策处理请求。请在选择前阅读{" "}
          <Link href={openRouterPrivacy}>OpenRouter 隐私政策</Link>、<Link href={vercelPrivacy}>Vercel 隐私声明</Link>及{" "}
          <Link href={vercelAiTerms}>AI 产品条款</Link>，或 <Link href={typeSafePrivacy}>TypeSafe 隐私政策</Link>。使用
          Provider 可能产生第三方费用。
        </p>
        <p>
          <strong>你配置的 S3 Endpoint（可选）。</strong>只有你配置连接、授予该 Endpoint
          的访问权限并启用同步后，扩展才会读写同步文档。文档包含过滤配置（包括策略与提示词）、活动记录及统计，因此可能包含帖子预览、作者和帖子
          URL；不包含 Provider API Key、S3 访问密钥或 Session Token。签名请求会向 Endpoint 提供 Access Key ID 和可选
          Session Token；Secret Access Key 仅在本机生成签名，不直接发送。启用同步后，扩展会在配置变更、浏览器启动及约每
          15 分钟的定时检查时尝试同步。存储、备份和保留规则由你选用的服务及账户设置决定。
        </p>
        <p>
          除上述必要传输外，XFlow 项目不会出售这些数据、用于广告，或提供给其他接收方。请勿在公开 Issue
          或支持沟通中提交密钥或敏感帖子内容。
        </p>
      </section>

      <section>
        <h2>保存期限与删除</h2>
        <ul>
          <li>
            过滤活动详情保留约 30 天；之后移除正文预览、作者、URL 和策略详情。去重所需的内容身份最多保留约 12
            周，之后折叠为按设备汇总的累计计数。第三方服务中的数据不会因此自动删除。
          </li>
          <li>
            在 Dashboard
            的日志页选择“清理日志”，可立即移除作者、正文预览、原文链接和命中策略；内容标识、每日统计和累计数量会保留。启用
            S3 后，扩展会尝试同步清理状态。
          </li>
          <li>
            在 Dashboard 的通用页选择“清除活动数据”，可清除本机活动详情和累计计数。启用 S3
            后，扩展会尝试同步清除状态，以防旧记录在之后的同步中恢复。
          </li>
          <li>在 API Keys 页可逐个清除本机 Provider Key；这不会撤销 Provider 账户中的密钥。</li>
          <li>
            停用 S3 同步不会删除本机连接配置或已写入 S3 的对象。远程副本需在你选用的 S3
            服务中删除，并检查该服务的版本与备份。
          </li>
          <li>
            卸载扩展可通过浏览器移除本机扩展数据；Provider 和 S3
            中已处理或保存的数据需按对应服务的政策和账户控制另行管理。
          </li>
        </ul>
      </section>

      <section>
        <h2>安全与权限</h2>
        <p>
          Provider Key 和 S3 凭据不会提供给 X 页面上的 Content Script，也不会写入可编辑配置 JSON 或新的 S3
          同步文档。它们在 <code>chrome.storage.local</code>{" "}
          中没有额外静态加密；能访问该浏览器配置文件的人可能获得这些本机数据。Provider 与 S3 Endpoint 使用 HTTPS；S3
          校验仅允许将 <code>http://localhost</code> 与 <code>http://127.0.0.1</code> 用于本机调试。扩展访问 X / Twitter
          页面用于读取待判断内容并显示可揭示的遮罩；S3 主机访问由你在保存 Endpoint 时单独授权。<code>storage</code>{" "}
          用于保存本机数据；<code>alarms</code> 用于启用 S3 后的定时同步。
        </p>
      </section>

      <section>
        <h2>Chrome Web Store Limited Use</h2>
        <p>
          XFlow 对从浏览器和 Chrome 扩展 API 获得的信息的使用遵守{" "}
          <Link href={chromeLimitedUse}>Chrome Web Store 用户数据政策的 Limited Use 要求</Link>
          ：只为上述面向用户的过滤、活动记录及用户选择的同步功能处理所需数据；只为提供这些功能而传输数据；不出售数据，不用于个性化或定向广告。开发者默认无法读取扩展本机数据；只有在你主动提供特定内容用于支持，或法律及安全要求等政策允许的情况下，才可能由人员查看你提供的数据。
        </p>
      </section>

      <section>
        <h2>变更与联系</h2>
        <p>
          如数据处理方式有重大变化，项目会更新本政策并在扩展界面或发布说明中提示。关于隐私、数据删除或本政策的问题，请发送邮件至{" "}
          <Link href="mailto:ry4nzeng@gmail.com">ry4nzeng@gmail.com</Link>，也可通过{" "}
          <Link href={issues}>XFlow GitHub Issues</Link> 联系维护者。请勿在公开 Issue 中发送密钥或敏感内容。
        </p>
      </section>
    </article>
  );
}

function EnglishPolicy() {
  return (
    <article className="policy" aria-labelledby="policy-title">
      <a className="back-link" href="./">
        ← Back to XFlow
      </a>
      <h1 id="policy-title">XFlow Privacy Policy</h1>
      <p className="policy__date">Effective date: September 23, 2026 · Version: 0.1.0 · Publisher: Ryan Zeng</p>
      <p className="policy__language">
        <Link href="./privacy.html">简体中文版</Link>
      </p>

      <section>
        <h2>Website visits</h2>
        <p>
          This site is statically hosted by GitHub Pages. XFlow's page code does not write cookies or use analytics
          scripts, tracking pixels, forms, or a custom backend. GitHub may process request and operational data under
          its <Link href={githubPrivacy}>Privacy Statement</Link>.
        </p>
      </section>

      <section>
        <h2>Data processed and why</h2>
        <ul>
          <li>
            Visible post IDs and text on supported X / Twitter pages: used to evaluate posts against enabled strategies
            when you enable a filtering surface and configure a Provider Key. The extension does not read browsing
            history on other sites.
          </li>
          <li>
            Strategy names, criteria, and related settings: used to form evaluation requests and present results;
            settings are stored locally in the browser.
          </li>
          <li>
            Filter activity: recorded only after content is veiled. It may include a content ID, a text preview of up to
            500 characters, author, post URL, surface, media type, filter time, device identifier, matched strategy, and
            reveal or incorrect status.
          </li>
          <li>
            Provider API Keys and optional S3 credentials: stored in the extension's <code>chrome.storage.local</code>{" "}
            for authentication or request signing.
          </li>
          <li>
            Interface language, theme, and other settings: used to provide the extension; interface language stays local
            and is not part of the S3 sync document.
          </li>
        </ul>
        <p>
          XFlow does not read X login cookies or sessions or store page HTML, DOM, media files, or a complete browsing
          path. The current version has no ads, developer telemetry, or developer analytics service.
        </p>
      </section>

      <section>
        <h2>Who receives data</h2>
        <p>
          <strong>Your selected Jev Provider.</strong>The extension sends post IDs and text, applicable strategy names
          and criteria, and that Provider's API Key only to the currently selected OpenRouter, Vercel AI Gateway, or
          TypeSafe service. The request is used to return a filtering decision. A failed request is not automatically
          forwarded to another Provider. The Provider and any upstream model services it uses process requests under
          their own terms and privacy policies. Before choosing one, review the{" "}
          <Link href={openRouterPrivacy}>OpenRouter Privacy Policy</Link>,{" "}
          <Link href={vercelPrivacy}>Vercel Privacy Notice</Link> and <Link href={vercelAiTerms}>AI Product Terms</Link>
          , or the <Link href={typeSafePrivacy}>TypeSafe Privacy Policy</Link>. Provider use may incur third-party
          charges.
        </p>
        <p>
          <strong>Your configured S3 Endpoint (optional).</strong>The extension reads or writes a sync document only
          after you configure a connection, grant access to the Endpoint, and enable sync. The document includes filter
          configuration (including strategies and prompts), activity records, and statistics, so it may contain post
          previews, authors, and post URLs. It excludes Provider API Keys, S3 access credentials, and Session Tokens.
          Signed request headers give the Endpoint the Access Key ID and optional Session Token; the Secret Access Key
          is used locally to create the signature and is not sent directly. Once enabled, sync is attempted after
          configuration changes, at browser startup, and about every 15 minutes. Storage, backup, and retention depend
          on the service and account you choose.
        </p>
        <p>
          Apart from these necessary transfers, the XFlow project does not sell this data, use it for advertising, or
          provide it to other recipients. Do not submit keys or sensitive post content in public issues or support
          exchanges.
        </p>
      </section>

      <section>
        <h2>Retention and deletion</h2>
        <ul>
          <li>
            Activity details are kept for about 30 days; then text previews, authors, URLs, and strategy details are
            removed. Content identities used for deduplication remain for up to about 12 weeks before being folded into
            per-device lifetime counts. This does not delete data held by third parties.
          </li>
          <li>
            Use <strong>Clear logs</strong> on the Dashboard's Log page to remove authors, text previews, original
            links, and matched strategies immediately. Content IDs, daily statistics, and all-time totals remain. If S3
            sync is enabled, the extension attempts to sync the cleared state.
          </li>
          <li>
            Use <strong>Clear Activity Data</strong> on the Dashboard's General page to remove local activity details
            and totals. If S3 sync is enabled, the extension attempts to sync the cleared state so older records do not
            return later.
          </li>
          <li>Clear each local Provider Key on the API Keys page. This does not revoke the key at the Provider.</li>
          <li>
            Disabling S3 sync does not remove local connection settings or objects already written to S3. Delete remote
            copies in your S3 service and check its versions and backups.
          </li>
          <li>
            Uninstalling the extension lets the browser remove local extension data. Data already processed or stored by
            a Provider or S3 service must be managed under that service's policy and account controls.
          </li>
        </ul>
      </section>

      <section>
        <h2>Security and permissions</h2>
        <p>
          Provider Keys and S3 credentials are not exposed to Content Scripts on X pages and are not included in
          editable configuration JSON or new S3 sync documents. They receive no additional encryption at rest in{" "}
          <code>chrome.storage.local</code>; someone with access to your browser profile may be able to obtain this
          local data. Provider connections and S3 endpoints use HTTPS, except that S3 endpoint validation allows HTTP
          for <code>localhost</code> and <code>127.0.0.1</code> for local development. X / Twitter page access lets the
          extension read posts for evaluation and display revealable veils. You grant access to an S3 host separately
          when saving its Endpoint. The <code>storage</code> permission stores local data; <code>alarms</code> supports
          scheduled sync after you enable S3.
        </p>
      </section>

      <section>
        <h2>Chrome Web Store Limited Use</h2>
        <p>
          XFlow's use of information obtained from the browser and Chrome extension APIs follows the{" "}
          <Link href={chromeLimitedUse}>Limited Use requirements of the Chrome Web Store User Data Policy</Link>: it
          processes only data needed for the user-facing filtering, activity, and user-selected sync features described
          above; transfers data only to provide those features; does not sell data; and does not use data for
          personalized or targeted advertising. Developers cannot read local extension data by default. A person may
          review data you specifically provide for support or as otherwise permitted for legal or security reasons under
          the policy.
        </p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          If data practices change materially, the project will update this policy and notify users in the extension
          interface or release notes. For privacy, deletion, or policy questions, email{" "}
          <Link href="mailto:ry4nzeng@gmail.com">ry4nzeng@gmail.com</Link> or contact the maintainers through{" "}
          <Link href={issues}>XFlow GitHub Issues</Link>. Do not post keys or sensitive content in public issues.
        </p>
      </section>
    </article>
  );
}

export function PrivacyPolicy({ language }: { language: Language }) {
  return <main className="policy-page">{language === "zh" ? <ChinesePolicy /> : <EnglishPolicy />}</main>;
}
