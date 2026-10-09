<a id="top"></a>

<p align="center">
  <img src="logo-dark.png" alt="XFlow" width="160" />
</p>

<p align="center">
  <a href="#简体中文">简体中文</a> · <a href="#english">English</a>
</p>
<p align="center">
  <a href="https://github.com/ryanzen9/XFlow/actions/workflows/ci.yml"><img src="https://github.com/ryanzen9/XFlow/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/version-0.1.1-525252?style=flat-square&labelColor=0a0a0a" alt="Version 0.1.1" />
  <img src="https://img.shields.io/badge/Manifest-V3-525252?style=flat-square&labelColor=0a0a0a" alt="Manifest V3" />
</p>

<p align="center">
  Jev For your X：自定义过滤 X / Twitter 中的广告，情绪化，政治内容等内容。打造清爽的 X 浏览体验。
</p>
<p align="center">
  Jev For your X: customize filtering of ads, emotional content, political content, and more on X / Twitter. Enjoy a cleaner X browsing experience.
</p>


<p align="center">
  <a href="https://ryanzen9.github.io/XFlow/">项目官网</a> ｜ <a href="https://ryanzen9.github.io/XFlow/privacy.html">隐私政策</a> ｜
  <a href="https://chromewebstore.google.com/detail/xflow/jelihbmknilmpbgjjjcmcbchmjloghnj">Chrome 商店</a>
</p>

<p align="center">
  <a href="https://ryanzen9.github.io/XFlow/">Project website</a> · <a href="https://ryanzen9.github.io/XFlow/privacy-en.html">Privacy policy</a> ·
  <a href="https://chromewebstore.google.com/detail/xflow/jelihbmknilmpbgjjjcmcbchmjloghnj">Chrome Web Store</a>
</p>

# 简体中文

- [界面预览](#zh-preview)
- [为什么是 XFlow](#zh-why-xflow)
- [工作方式](#zh-how-it-works)
- [从商店安装](#zh-install-store)
- [从源码安装（开发者）](#zh-install-source)
- [Provider](#zh-providers)
- [策略与交互](#zh-policies)
- [Activity、Badge 与数据保留](#zh-activity)
- [S3 同步](#zh-s3)
- [隐私与权限](#zh-privacy)
- [实测与回归（2026-10-09）](#zh-typesafe-results)
- [资源](#zh-resources)

<a id="zh-preview"></a>

## 界面预览

<p align="center">
  <img src="docs/assets/strategy-editor.webp" alt="深色主题下的 XFlow 广告与自定义内容过滤策略编辑器" width="100%" />
</p>

<table>
  <tr>
    <td width="72%"><img src="docs/assets/dashboard-activity.webp" alt="深色主题下的独立过滤概览、12 周热力图、每周回顾与近期记录" /></td>
    <td width="28%"><img src="docs/assets/veil-preview.webp" alt="深色主题下的过滤结果本机预览、命中率与阈值控制" /></td>
  </tr>
  <tr>
    <td align="center"><sub>独立概览：12 周 Activity、周报与近期记录</sub></td>
    <td align="center"><sub>不调用模型的过滤结果预览</sub></td>
  </tr>
</table>

<p align="center">
  <img src="docs/assets/popup-light.webp" alt="XFlow 浅色主题 Popup，过滤计数和紧凑监控开关" width="320" />
  <img src="docs/assets/popup-dark.webp" alt="XFlow 深色主题 Popup，过滤计数和紧凑监控开关" width="320" />
</p>

截图更新于 2026-10-07，使用生产界面与隔离模拟数据，不包含凭据，不调用 Provider。Popup 为简体中文，其余为英文界面。更多预览：[API Keys 与健康检查](docs/assets/provider-settings.webp) · [Jev 请求日志](docs/assets/jev-request-log.webp)。

<a id="zh-why-xflow"></a>

## 为什么是 XFlow

|      | 能力                      | 当前行为                                                                                 |
| ---- | ------------------------- | ---------------------------------------------------------------------------------------- |
| `01` | 快速精准                  | 基于 Jev 快速精准识别广告、推广、垃圾信息及诈骗诱导。                                    |
| `02` | 自定义策略                | 为时间线和评论区分别配置多条规则、提示词。                                               |
| `03` | 多渠道                    | 支持 OpenRouter、Vercel AI Gateway 或 TypeSafe 官方渠道。                                |
| `04` | 本地优先                  | 全部数据优先保存本机，源代码开源，确保用户隐私。Api Key 留存本机，坚决不入网。           |
| `05` | Versioned S3 sync         | 支持 S3 协议，跨设备同步状态。                                                           |
| `06` | Local credential boundary | Provider Key 与 S3 凭据只留在扩展本机存储，不进入 Content Script、配置 JSON 或 S3 文档。 |

<a id="zh-how-it-works"></a>

## 工作方式

```text
X / Twitter DOM
      │
      ▼
Content Script ── 标准化文本 ──► Background Service Worker
      │                                  │
      │                                  ├─ 策略编排与优先级
      │                                  └─ 当前选中的 Jev Provider
      │                                               │
      ◄──────── 命中概率 + 最终策略 ───────────────────┘
      │
      ▼
Blur Veil 状态机 ── Hover / Reveal / Re-obscure
      │
      └─ Filtered 事件 ──► Activity / Badge / 可选 S3 合并
```

Content Script 只负责发现帖子、提取必要文本与元数据、渲染遮罩和上报已实际过滤的事件。外部请求、密钥、迁移、Activity 去重和同步都留在后台 Service Worker。

<a id="zh-install-store"></a>

## 从商店安装

在 [Chrome Web Store 的 XFlow 页面](https://chromewebstore.google.com/detail/xflow/jelihbmknilmpbgjjjcmcbchmjloghnj) 点击“添加至 Chrome”，然后打开扩展的 Dashboard，在 **API Keys** 中保存至少一个 Provider Key 并设为当前渠道。打开或刷新 `https://x.com/home` 即可使用已启用的过滤策略。

<a id="zh-install-source"></a>

## 从源码安装（开发者）

要求：

- [Bun](https://bun.sh/) 1.3.13 或兼容版本
- Chrome、Edge 或其他支持 Manifest V3 的 Chromium 浏览器
- 至少一个受支持 Provider 的 API Key

```bash
git clone https://github.com/ryanzen9/XFlow.git
cd XFlow
bun install
bun run check
```

`bun run check` 会依次执行格式检查、Lint、TypeScript、Bun 测试和生产构建，产物位于 `dist/`。

然后：

1. 打开 `chrome://extensions` 并启用“开发者模式”。
2. 点击“加载已解压的扩展程序”，选择项目中的 `dist/`。
3. 打开 XFlow Dashboard，在 **API Keys** 中保存至少一个渠道凭证并设为当前渠道。
4. 打开或刷新 `https://x.com/home`。

每次重新构建后，需要在扩展管理页重新加载扩展，并刷新已打开的 X 页面。

<a id="zh-providers"></a>

## Provider

| 渠道              | 模型                | Adapter API                     |
| ----------------- | ------------------- | ------------------------------- |
| OpenRouter        | `typesafe/jev-1.13` | `@openrouter/sdk` Decisions API |
| Vercel AI Gateway | `typesafe-ai/jev`   | AI SDK `experimental_evaluate`  |
| TypeSafe          | `jev-latest`        | `@typesafe-ai/sdk` System One   |

渠道始终由用户明确选择。请求失败时，XFlow 不会自动将内容转发到另一个 Provider，以避免意外的数据流向或费用变化。

API Keys 页面可对每个渠道发起一次最小 Jev 健康检查，用于验证已保存密钥与接口是否可用。健康检查会产生一次真实 Provider 请求，可能计入第三方用量。

<a id="zh-policies"></a>

## 策略与交互

- 时间线和评论区拥有独立策略表，分别从 P1 开始排序。
- 第一条达到自身阈值的策略成为最终命中；高优先级未命中后才采用后续结果。
- Dashboard 的 Hit Rate 表示触发遮罩所需的最低命中概率，可用数字、滑块或低（80%）、中（70%）、严格（50%）快捷值调整；已有配置仍兼容旧的 `sensitivity` 字段。
- 保存策略会先平滑揭示受影响页面的旧遮罩，再按新配置重新分析，因此可能产生新的 API 请求。
- Hover 文案支持策略名称、hitrate、阈值、模型昵称、模型 ID 和页面场景变量。
- Hover 样式可在默认、文字强调和高对比之间切换，也可继续编辑自定义 CSS。
- 自定义 CSS 只接受列出的遮罩选择器和视觉属性，不会把任意页面 CSS 注入 X。

<a id="zh-activity"></a>

## Activity、Badge 与数据保留

- Popup 展示今日和累计过滤数；Toolbar Badge 只统计当前 Tab 当前页面生命周期内的唯一内容，0 时隐藏。
- Dashboard 提供过去 12 周 Heatmap、最近 7 天趋势、当前自然周回顾和最近 30 天筛选历史。
- 日志页同时保留最近 30 天、最多 200 条 Jev 请求元数据，包括渠道、模型、耗时、项目/问题数量与结果；不保存 API Key 或帖子正文，并可单独清除。后台启动及每日维护会移除过期记录。
- 只有明确选择 **Not supposed to be filtered** 才会标记错误；临时 Reveal 不会自动视为误判。
- 详细历史在 30 天后压缩；事件身份在 12 周后折叠为按设备合并的紧凑计数，以维持累计值并限制存储增长。
- 日志页可单独清理作者、内容预览、原文链接和命中策略，保留每日统计与累计数量。
- 全部清除会写入 `clearedAt` 墓碑，避免旧设备或远程对象恢复已清除记录。

<a id="zh-s3"></a>

## S3 同步

S3 使用 path-style URL：`{endpoint}/{bucket}/{objectKey}`。首次保存 Endpoint 时扩展会请求可选主机权限；启用后会在配置写入、浏览器启动和每 15 分钟定时检查时同步。生产清单只声明 `https://*/*`，因此使用 `http://localhost` 或 `http://127.0.0.1` 的本地 S3 需要先执行 `bun run build:dev`。

- 本地配置版本更新或远程对象不存在：推送本地配置。
- 远程配置版本更新：拉取并应用远程配置。
- Activity 在任一方向都按稳定内容 ID 合并；归档计数按设备取最大值，状态按 `Filtered → Revealed → Marked Incorrect` 单调合并。

用户标注、用户创建的模板/语义规则和作者规则属于长期知识，会随配置文档同步；多设备合并按标注 ID 取并集，同一标注按 `updatedAt` 与设备 ID 决定最后写入。配置版本与知识修订号独立推进，知识更新不会让旧配置覆盖其他设备上的新策略。普通 Jev 缓存、语义向量和临时运行状态只保存在本机 IndexedDB，不上传 S3，也不参与实时过滤请求。

Bucket 需要允许扩展来源执行 GET、PUT 和 CORS 预检。

<a id="zh-privacy"></a>

## 隐私与权限

完整说明见 [XFlow 隐私政策](https://ryanzen9.github.io/XFlow/privacy.html)（[English](https://ryanzen9.github.io/XFlow/privacy-en.html)；[仓库源文件](docs/privacy-policy.md)）。

<a id="zh-typesafe-results"></a>

## 实测与回归（2026-10-09）

XFlow 0.1.1 使用 Bun 1.3.13 完成复测。真实 TypeSafe 实测通过官方 SDK 调用 `jev-latest`，包含 24 条脱敏冷样本和 3 轮 warm 探针；[本次测量数据](docs/benchmarks/2026-10-09.json)记录版本、来源提交与各项结果。

| 重点指标        | 本次结果                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------- |
| 自动化验证      | 262 项 Bun 测试 + 5 项浏览器回归全部通过，扩展与网站生产构建通过。                        |
| 真实 SDK 冷阶段 | 5 次 SDK 批次处理 24 条样本，共 1.905 秒。                                                |
| warm 缓存命中   | 72/72（100%），平均每轮 6.467 ms；Exact、Normalized、Template、Semantic 各命中 18/18。    |
| 避免的 SDK 调用 | 15/20（75%），warm 阶段新增 SDK 调用为 0。                                                |
| 本地缓存查询    | 2,000 次合成请求，平均 0.221 ms、P95 0.488 ms，错误缓存层命中为 0。                       |
| 缓存载荷        | 增加 101.30 KiB、共 92 条记录，约为 4.03 MiB 运行时构建文件（不含 source maps）的 2.46%。 |

这是一次实测。缓存使用 Bun 环境的内存后备；载荷为序列化估算，浏览器 IndexedDB 磁盘开销与 X 页面端到端耗时需另行测量。四层命中率衡量预期缓存路径，模型分类准确率需要人工作答基准。合成请求的 80% 命中率由数据集设定，其中的 800 ms/Jev 是建模参数。

### 真实 SDK 实测进度

![真实 TypeSafe SDK 实测的冷调用、缓存写入、warm 探针和最终结果](docs/assets/typesafe-benchmark-2026-10-09.gif)

GIF 来自同一次真实运行的 56 个进度帧，放慢展示短于 100 ms 的阶段，最终结果停留 4 秒；耗时以表格和测量数据为准。密钥通过隐藏输入提供，只留在进程内存，没有写入文件、扩展存储或录制。

### 界面回归预览

![隔离模拟数据下的 XFlow 概览、趋势、策略列表和编辑器操作](docs/assets/dashboard-regression-2026-10-09.gif)

界面 GIF 使用隔离模拟数据，不调用 Provider，展示概览、趋势、策略列表和编辑器。五项浏览器回归覆盖 Dashboard 页面、策略编辑、通知、健康检查界面及 Popup，共 647 次断言通过。

复测命令：

```bash
bun run check
bun run benchmark:cache --requests=2000 --jev-latency-ms=800 --json
bun run benchmark:cache --live-typesafe --samples=24 --warm-runs=3
```

未设置 `TYPESAFE_API_KEY` 时，交互式终端会隐藏输入 Key；CI 可通过环境变量提供。不要使用 `--key=...`，以免密钥进入 Shell 历史或进程列表。Dashboard 预览使用隔离的 localStorage Mock，不读取已安装扩展的数据，也不会请求模型。

<a id="zh-resources"></a>

## 资源

- [隐私政策 · 简体中文](docs/privacy-policy.md) · [English](docs/privacy-policy.en.md)

[返回顶部](#top) · [English](#english)

---

# English

- [Preview](#en-preview)
- [Why XFlow](#en-why-xflow)
- [How it works](#en-how-it-works)
- [Install from the Chrome Web Store](#en-install-store)
- [Install from source (developers)](#en-install-source)
- [Providers](#en-providers)
- [Policies and interaction](#en-policies)
- [Activity, badge, and retention](#en-activity)
- [S3 synchronization](#en-s3)
- [Privacy and permissions](#en-privacy)
- [Benchmarks and regression tests (2026-10-09)](#en-typesafe-results)
- [Resources](#en-resources)

<a id="en-preview"></a>

## Preview

<p align="center">
  <img src="docs/assets/strategy-editor.webp" alt="XFlow ad and custom content filtering strategy editor in the dark theme" width="100%" />
</p>

<table>
  <tr>
    <td width="72%"><img src="docs/assets/dashboard-activity.webp" alt="XFlow filtering overview, 12-week heatmap, weekly review and recent records in the dark theme" /></td>
    <td width="28%"><img src="docs/assets/veil-preview.webp" alt="Local filtering result preview with hit-rate and threshold controls in the dark theme" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Overview: 12-week Activity, weekly review and recent records</sub></td>
    <td align="center"><sub>A local filtering result preview that never calls a model</sub></td>
  </tr>
</table>

<p align="center">
  <img src="docs/assets/popup-light.webp" alt="XFlow light-theme Popup with filtering counts and compact controls" width="320" />
  <img src="docs/assets/popup-dark.webp" alt="XFlow dark-theme Popup with filtering counts and compact controls" width="320" />
</p>

Updated October 7, 2026 from the production UI using isolated sample data without credentials or provider calls. Popup captures use Simplified Chinese; other captures use English. More previews: [API Keys and health checks](docs/assets/provider-settings.webp) · [Jev request log](docs/assets/jev-request-log.webp).

<a id="en-why-xflow"></a>

## Why XFlow

|      | Capability                | Current behavior                                                                                                                           |
| ---- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `01` | Fast and accurate         | Jev quickly and accurately identifies ads, promotions, spam, and scams.                                                                    |
| `02` | Custom policies           | Configure separate rules and prompts for timelines and replies.                                                                            |
| `03` | Multiple providers        | Supports OpenRouter, Vercel AI Gateway, and the official TypeSafe provider.                                                                |
| `04` | Local first               | All data is stored locally first, and the source code is open to protect user privacy. API keys stay on the device and are never uploaded. |
| `05` | Versioned S3 sync         | Supports the S3 protocol to synchronize state across devices.                                                                              |
| `06` | Local credential boundary | Keep provider keys and S3 credentials in extension-local storage, outside Content Scripts, editable JSON, and S3 documents.                |

<a id="en-how-it-works"></a>

## How it works

```text
X / Twitter DOM
      │
      ▼
Content Script ── normalized text ──► Background Service Worker
      │                                      │
      │                                      ├─ policy orchestration
      │                                      └─ selected Jev provider
      │                                                   │
      ◄──────── probability + matched policy ─────────────┘
      │
      ▼
Blur Veil state machine ── Hover / Reveal / Re-obscure
      │
      └─ Filtered event ──► Activity / Badge / optional S3 merge
```

The Content Script only discovers posts, extracts the minimum required text and metadata, renders the veil, and reports events that actually entered the filtered state. External requests, credentials, migrations, activity deduplication, and synchronization remain in the background Service Worker.

<a id="en-install-store"></a>

## Install from the Chrome Web Store

Select **Add to Chrome** on the [XFlow store page](https://chromewebstore.google.com/detail/xflow/jelihbmknilmpbgjjjcmcbchmjloghnj). Then open the Dashboard, save a supported provider key under **API Keys**, and select that provider. Open or refresh `https://x.com/home` to use enabled filtering strategies.

<a id="en-install-source"></a>

## Install from source (developers)

Requirements:

- [Bun](https://bun.sh/) 1.3.13 or a compatible release
- Chrome, Edge, or another Manifest V3 Chromium browser
- An API key for at least one supported provider

```bash
git clone https://github.com/ryanzen9/XFlow.git
cd XFlow
bun install
bun run check
```

`bun run check` runs formatting checks, linting, TypeScript, Bun tests, and the production build. Output is written to `dist/`.

Then:

1. Open `chrome://extensions` and enable **Developer mode**.
2. Select **Load unpacked** and choose the project's `dist/` directory.
3. Open the XFlow Dashboard, save at least one credential under **API Keys**, and select that provider.
4. Open or refresh `https://x.com/home`.

After rebuilding, reload the extension from the extensions page and refresh any open X tabs.

<a id="en-providers"></a>

## Providers

| Provider          | Model               | Adapter API                     |
| ----------------- | ------------------- | ------------------------------- |
| OpenRouter        | `typesafe/jev-1.13` | `@openrouter/sdk` Decisions API |
| Vercel AI Gateway | `typesafe-ai/jev`   | AI SDK `experimental_evaluate`  |
| TypeSafe          | `jev-latest`        | `@typesafe-ai/sdk` System One   |

The active provider is always an explicit user choice. XFlow does not silently forward content to another provider after a failure, avoiding unexpected data routing or cost changes.

The API Keys page can send a minimal Jev health check to each provider to verify the saved credential and endpoint. This is a real provider request and may count toward third-party usage or charges.

<a id="en-policies"></a>

## Policies and interaction

- Timelines and replies have independent policy queues, each ordered from P1.
- The first policy whose probability reaches its own threshold wins; lower-priority results are considered only after higher-priority misses.
- Dashboard Hit Rate is the minimum match probability needed to veil a post. Adjust it with a number, slider, or Low (80%), Medium (70%), and Strict (50%) presets. Existing settings remain compatible with the legacy `sensitivity` field.
- Saving a policy first reveals existing veils smoothly, then re-evaluates affected content with the new configuration. This may create new API requests.
- Hover templates can reference the policy name, hit rate, threshold, model nickname, model ID, and surface.
- Switch Hover styles between Default, Text emphasis, and High contrast, or keep editing custom CSS.
- Custom CSS is restricted to documented veil selectors and visual properties; arbitrary page CSS is never injected into X.

<a id="en-activity"></a>

## Activity, badge, and retention

- The Popup shows today's and all-time filter totals. The toolbar badge counts unique content only for the current page lifecycle in the current tab and stays hidden at zero.
- The Dashboard provides a 12-week heatmap, seven-day trend, current calendar-week review, and 30 days of filter history.
- The Log page also keeps up to 200 Jev request metadata entries for 30 days, including provider, model, duration, item/question counts, and outcome. It never stores API Keys or post text, can be cleared separately, and prunes expired records at background startup and during daily maintenance.
- An event is marked incorrect only after **Not supposed to be filtered** is explicitly selected. A temporary reveal is not automatically treated as a mistake.
- Detailed history is compacted after 30 days. Event identity is folded into compact per-device counts after 12 weeks, retaining all-time totals while bounding storage.
- The Log page can clear authors, content previews, original links, and matched strategies while retaining daily statistics and all-time totals.
- Clearing activity writes a `clearedAt` tombstone so an older device or remote object cannot restore deleted records.

<a id="en-s3"></a>

## S3 synchronization

S3 uses a path-style URL: `{endpoint}/{bucket}/{objectKey}`. XFlow requests optional host access when an endpoint is first saved. Once enabled, it synchronizes after config writes, at browser startup, and every 15 minutes. The production manifest only declares `https://*/*`, so a local S3 endpoint on `http://localhost` or `http://127.0.0.1` requires `bun run build:dev` first.

- A newer local config, or a missing remote object, pushes the local document.
- A newer remote config is pulled and applied.
- Activity merges by stable content ID in either direction. Archived counts use the per-device maximum, and status advances monotonically through `Filtered → Revealed → Marked Incorrect`.

User feedback, user-created template/semantic rules, and author rules are durable knowledge synchronized with the configuration document. Multi-device merges take the union by feedback ID; conflicts for the same feedback entry are resolved by `updatedAt` and device ID. Configuration versions and knowledge revisions advance independently, so knowledge updates cannot cause an older configuration to overwrite newer policies on another device. Regular Jev cache entries, semantic vectors, and temporary runtime state remain in local IndexedDB. They are not uploaded to S3 or included in real-time filtering requests.

The bucket must allow GET, PUT, and CORS preflight requests from the extension origin.

<a id="en-privacy"></a>

## Privacy and permissions

See the full [XFlow Privacy Policy](https://ryanzen9.github.io/XFlow/privacy-en.html) ([简体中文](https://ryanzen9.github.io/XFlow/privacy.html); [source](docs/privacy-policy.en.md)).

<a id="en-typesafe-results"></a>

## Benchmarks and regression tests (2026-10-09)

XFlow 0.1.1 was retested with Bun 1.3.13. The live TypeSafe benchmark calls `jev-latest` through the official SDK with 24 sanitized cold samples and three warm rounds. The [measurement data](docs/benchmarks/2026-10-09.json) records the version, source commit, and results.

| Key metric           | Observed result                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Automated validation | All 262 Bun tests and 5 browser regressions passed; extension and website production builds passed.          |
| Live SDK cold phase  | 5 SDK batches evaluated 24 samples in 1.905 s.                                                               |
| Warm cache hits      | 72/72 (100%), averaging 6.467 ms per round; Exact, Normalized, Template, and Semantic each hit 18/18 probes. |
| SDK calls avoided    | 15/20 (75%), with 0 additional SDK calls during warm rounds.                                                 |
| Local cache lookups  | 2,000 synthetic requests averaged 0.221 ms, with a 0.488 ms P95 and 0 unexpected cache-layer matches.        |
| Cache payload        | 101.30 KiB added across 92 records, about 2.46% of the 4.03 MiB runtime build files excluding source maps.   |

These figures come from one run. The cache uses Bun's in-memory fallback, and payload bytes are a serialized estimate; browser IndexedDB disk usage and end-to-end X page latency need separate measurements. Layer hit rates measure intended cache routing; model classification accuracy requires human-labeled ground truth. The synthetic dataset fixes the hit rate at 80%, and its 800 ms/Jev value is a modeling parameter.

### Live SDK benchmark progress

![Real TypeSafe SDK cold calls, cache seeding, warm probes, and final results](docs/assets/typesafe-benchmark-2026-10-09.gif)

The GIF contains 56 progress frames from the same live run. Stages shorter than 100 ms are slowed for readability, and the final result stays visible for four seconds; use the table and measurement data for timings. The key was provided through hidden input and remained in process memory, outside files, extension storage, and recordings.

### UI regression preview

![XFlow overview, trend, strategy list, and editor using isolated mock data](docs/assets/dashboard-regression-2026-10-09.gif)

The UI GIF uses isolated mock data without provider calls and shows the overview, trend, strategy list, and editor. Five browser regressions cover Dashboard pages, strategy editing, notifications, health-check controls, and the Popup, with 647 assertions passing.

Reproduce the benchmarks:

```bash
bun run check
bun run benchmark:cache --requests=2000 --jev-latency-ms=800 --json
bun run benchmark:cache --live-typesafe --samples=24 --warm-runs=3
```

An interactive terminal prompts for the key with hidden input when `TYPESAFE_API_KEY` is unset; CI may supply it through that environment variable. Avoid `--key=...`, which could expose the key in shell history or process listings. The Dashboard preview uses an isolated localStorage mock without reading installed extension data or calling a model.

<a id="en-resources"></a>

## Resources

- [Privacy policy · English](docs/privacy-policy.en.md) · [简体中文](docs/privacy-policy.md)

[Back to top](#top) · [简体中文](#简体中文)
