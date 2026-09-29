# Developer Dashboard fields · XFlow 0.1.0

Use these answers with the production `0.1.0` ZIP. The Dashboard may change its labels or field layout; select the option matching the actual behavior and keep both locales and the [English](../privacy-policy.en.md) / [Chinese](../privacy-policy.md) privacy policies aligned. Do not put a real key in this repository.

## Single purpose

**English**

> XFlow evaluates visible X / Twitter posts in the Home timeline and replies against user-created filtering strategies through the user's selected Jev provider, then displays a revealable veil over matching content.

**简体中文**

> XFlow 根据用户创建的过滤策略，通过用户选中的 Jev Provider 判断 X / Twitter 首页时间线和评论区中可见的帖子，并为命中内容显示可揭示的遮罩。

## Permission justifications

| Permission / access                                                                      | English answer                                                                                                                                                                                                                                                                            | 简体中文说明                                                                                                                                                  |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                                                                                | Stores filtering settings, strategies, UI preferences, Activity, provider API keys, and optional S3 connection settings in the browser. Credentials stay in `chrome.storage.local` and are not placed in synced configuration documents.                                                  | 在浏览器本机保存过滤设置、策略、界面偏好、Activity、Provider API Key 和可选 S3 连接设置。凭据仅在 `chrome.storage.local` 中保存，不进入同步配置文档。         |
| `alarms`                                                                                 | When S3 sync is enabled, schedules an approximately 15-minute check to sync the user's configuration and Activity with their chosen endpoint.                                                                                                                                             | 用户启用 S3 同步后，约每 15 分钟检查并同步配置与 Activity 到用户指定的 Endpoint。                                                                             |
| `https://x.com/*`, `https://twitter.com/*` content script matches                        | Reads visible timeline posts and replies to apply the user's filtering strategies and render revealable veils on those pages.                                                                                                                                                             | 读取时间线和评论区中可见的帖子，以应用用户设置的过滤策略并在原页面显示可揭示遮罩。                                                                            |
| `https://openrouter.ai/*`, `https://ai-gateway.vercel.sh/*`, `https://api.typesafe.ai/*` | Sends the post ID and text plus applicable strategy names and criteria to the provider the user selects, using that provider's user-supplied API key, to obtain a filtering decision. No automatic fallback sends the request to another provider.                                        | 只向用户选中的 Provider 发送帖子 ID、正文及适用策略名称与规则，并使用用户提供的对应 API Key 获取过滤判断；不会自动转发给其他 Provider。                       |
| Optional `https://*/*`                                                                   | Supports user-defined HTTPS S3-compatible endpoints. XFlow requests access to the specific endpoint origin only when the user saves its settings, then uses it for optional configuration and Activity sync. The extension does not request blanket access to every site at install time. | 支持用户自定义 HTTPS S3 兼容 Endpoint。仅在用户保存该 Endpoint 设置时请求其精确 Origin 权限，之后用于可选的配置及 Activity 同步；安装时不会请求访问所有网站。 |

## Privacy practices answers

The extension processes these categories; include locally stored data when answering the Dashboard's user-data questions. Do not select a blanket “no data” answer just because XFlow has no developer-operated collection server.

| Category to disclose                | Actual data and purpose                                                                         | Destination / control                                                                                                                                                                                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personally identifiable information | Public X author usernames retained with filtered Activity records                               | Stored locally for the Activity view; included in the user's optional S3 sync document. Google includes usernames in this category, even when they appear in website content.                                                                                             |
| Website content                     | Visible X post IDs and text, applicable strategy names and criteria, short previews in Activity | Sent to the currently selected Jev provider for filtering; Activity details stored locally and included in optional user-enabled S3 sync.                                                                                                                                 |
| Web browsing activity               | X post URLs, surfaces, filter times, and content IDs in Activity                                | Stored locally; included in optional user-enabled S3 sync. This is limited to the pages and posts XFlow processes.                                                                                                                                                        |
| User activity                       | Filtering, reveal, and incorrect-mark status, Activity counts and history                       | Stored locally; included in optional user-enabled S3 sync.                                                                                                                                                                                                                |
| Authentication information          | Provider API keys and optional S3 access credentials                                            | Provider key is sent only to its selected provider. S3 Access Key ID and optional Session Token appear in signed requests to the chosen endpoint; Secret Access Key is used locally to sign and is not sent directly. Credentials are excluded from the S3 sync document. |

**English use statement:** Data is used to provide user-requested filtering, the Activity view, and optional user-configured S3 sync. XFlow does not sell data, use it for advertising, or operate a developer server that receives post content, Activity, or credentials. Third-party providers and a user-selected S3 service process data under their own policies. Users can clear local log details or Activity data and disable S3 sync in the Dashboard. Local credentials have no additional encryption at rest beyond the browser profile's storage protections.

**中文用途说明：** 数据仅用于用户请求的过滤、Activity 查看以及用户自行配置的可选 S3 同步。XFlow 不出售数据，不将数据用于广告，也没有接收帖子内容、Activity 或凭据的开发者服务器。第三方 Provider 和用户选中的 S3 服务按各自政策处理数据。用户可在 Dashboard 清理本机日志详情或 Activity 数据，并停用 S3 同步。本机凭据没有在浏览器配置文件存储机制之外再做静态加密。

**Privacy policy URL:** `https://ryanzen9.github.io/XFlow/privacy-policy/`

**Chinese privacy policy URL:** `https://ryanzen9.github.io/XFlow/privacy-policy/zh-CN/`

## Remote code

Select **No**. All executable JavaScript is bundled in the extension ZIP. Provider responses are filtering data and S3 responses are the user's configuration data. User-entered Hover CSS is parsed against fixed selector, property, and value allowlists and scoped before application. XFlow does not download or execute JavaScript from a remote server.

## Reviewer test instructions · draft

1. Install the exact `xflow-0.1.0.zip` prepared by the release workflow. Open the Dashboard from the extension Popup.
2. Choose one of the three Jev providers and enter a **temporary, low-limit, revocable reviewer API key** in the Dashboard's API Keys page. The reviewer key must be provided through a suitable private Dashboard field or another approved reviewer channel; never paste it into the listing, screenshots, PR, or repository. The owner must decide how to supply this key before submission.
3. In Strategies, inspect the built-in Home and reply strategies and the local veil preview. Open an X Home timeline or post replies page and observe filtering; select **Show** on a veiled post to reveal it. A live decision needs the selected provider key and may incur provider charges.
4. Open General to view Activity and Log to review recorded filtered posts. Use **Clear logs** or **Clear Activity Data** to verify deletion controls.
5. Optional S3: configure an endpoint the reviewer controls, grant access to that exact origin, enable sync, and inspect the Data page. S3 is not required to test the core filtering purpose.

The [Chrome Web Store test-instruction guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions) recommends telling reviewers how to access features that need credentials. The final reviewer key and any required account setup remain stage 6 tasks.
