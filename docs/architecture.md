# XFlow architecture

本文描述 MVP 当前实现。XFlow 的目标是按默认策略过滤广告与推广，并让用户自定义其他内容的过滤规则；Blur Veil 是命中结果在页面上的呈现机制。

## Runtime data flow

```text
X / Twitter DOM
      │
      ▼
Content Script ── batched post text ──► Background Service Worker
      │                                      │
      │                                      ├─ User decisions
      │                                      ├─ IndexedDB cache layers
      │                                      ├─ Review Service
      │                                      ├─ Provider Registry
      │                                      └─ Selected Jev Adapter (fallback)
      │                                                    │
      ◄──── decision + source + probability + strategy ────┘
      │
      ▼
Blur Veil state machine
      │ filtered / revealed
      ▼
Activity Service ──► local event store ──► Popup / General / Log
      │
      └─ per-tab page identity ──► Toolbar Badge
```

Content Script 负责发现帖子、提取最小历史元数据和渲染遮罩，不持有 API Key。只有遮罩实际挂载、内容真正进入 Filtered 状态后，才向后台 Activity Service 发送事件。后台负责全局去重、页面 Badge、策略选择、外部请求、配置迁移和自动同步。

Provider 请求完成后，Background 仅把渠道、模型、请求类型、耗时、项目/问题数量和成功或归一化错误类型写入本机 Jev 请求日志。健康检查复用同一 Provider Adapter 发起一个最小判断请求，因此同时验证 API Key、渠道接口和模型访问；它不会携带 X 帖子内容。

## Local-first decision pipeline

```text
User explicit decision
        ↓ miss
Author rule
        ↓ miss
User template / semantic rule
        ↓ miss
Exact cache
        ↓ miss
Normalized cache
        ↓ miss
Template cache (at least two consistent samples)
        ↓ miss
Semantic cache (high similarity + consistent neighbours)
        ↓ miss
Jev → persist reusable local results
```

文本先经过 Unicode、大小写、空白、重复标点与 URL tracking 参数归一化。模板层另外抽象 URL、Mention、Cashtag 和数字，但保留正负号与百分号，避免把 `+10%` 和 `-10%` 合并。语义层在 Background 中生成固定维度的本地特征哈希向量，以语言和 Policy 预筛候选，再使用余弦相似度、置信度与 Top-K 一致性决定是否复用；不调用远程 Embedding 服务。

Policy 指纹包含 surface、Provider、策略 ID、启用状态、优先级、Prompt 和敏感度。运行缓存以 Policy 指纹分区，配置改变后自然 miss；单条隐藏或允许在 `/status/{id}` 可用时按稳定 Tweet ID 保存并直接更新 UI，只有生成式页面 fallback ID 时仅作用于当前页面，不写入自动缓存或相似内容学习，也不会被新的 Jev 结果覆盖。

## Source boundaries

| Directory               | Responsibility                                                                 |
| ----------------------- | ------------------------------------------------------------------------------ |
| `src/background`        | Service Worker、消息权限、策略编排、Activity/Badge、Provider Adapter、自动同步 |
| `src/content`           | URL/DOM 监听、最小元数据提取、Blur Veil、Activity 事件与状态机                 |
| `src/dashboard`         | 通用设置、Activity 概览、日志历史、周报、API Keys、策略和 S3 配置              |
| `src/popup`             | 过滤计数为主，实时开关与当前渠道以次级列表呈现，附 Dashboard 入口              |
| `src/shared`            | 消息协议、配置 schema、Activity 派生/合并、迁移和 S3 核心逻辑                  |
| `src/ui` / `src/styles` | 跨入口 UI utility、主题与国际化逻辑和 Tailwind token                           |
| `src/themes/neutral`    | 可编辑的 Astryx Neutral 主题源码与由 CLI 生成的 CSS/JS                         |

Popup 与 Dashboard 的入口均由 `AstryxThemeRoot` 包裹。它通过 `src/ui/theme-mode.ts` 订阅现有的 Light / Dark 设置；`applyTheme()` 更新浏览器根节点和订阅者，因此两套界面使用同一个模式。Astryx 组件读取 `src/themes/neutral/neutralTheme.ts` 定义的 token；尚未迁移的界面继续读取 `src/styles/token.css` 和 Tailwind bridge。Dashboard 已迁移到 Astryx：AppShell / SideNav 管理导航和窄屏抽屉，Layout 管理页面区域，Table 与 CollapsibleGroup 呈现策略和日志，AlertDialog 管理清理确认与焦点恢复。Dashboard 与 Popup 的样式均只使用 Neutral 主题和 Astryx Tailwind bridge。Popup 使用 Item / Switch 呈现紧凑监控行，计数和反馈区域保留稳定的高度预算；`src/ui/AstryxLocale.tsx` 为两个入口提供 Astryx 控件的语言覆盖。Dashboard 在语言上下文内提供 LayerProvider，让 Toast 确认反馈继承主题和语言；需要处理的错误保留在页面内。两个入口的 CSS 显式声明 reset、Tailwind 与 Astryx 的层顺序。`src/styles/figtree.css` 把 Neutral 主题声明的 Figtree 指向扩展内的字体文件；构建脚本从安装包复制字体与 OFL 许可证到 `dist/fonts/`。本地预览服务另提供 `/__preview__/foundation.html` 验证 Astryx 控件，不将该页面打入扩展。

Dashboard 的全局 `StatusToast` 位于按页面重建的 `LayoutContent` 之外，只在反馈内容变化时触发。页面切换仍会重置内容区滚动；`StatusError` 在内容区保留可处理的错误，导航不会重放之前的成功通知。

Dashboard 默认打开独立概览页：Activity 指标、热力图/趋势、周报和近期记录共享内容范围筛选。通用设置不再包含分析图表。通用设置与策略表单通过原生 `form` 关联页头提交按钮；筛选只改变展示结果，策略编辑、排序和保存始终使用完整列表。`src/shared/collection-filters.ts` 保存不依赖浏览器的搜索与状态筛选逻辑，页面内维护临时查询状态，筛选条件不写入配置或 S3。布局与模板约定见 [Dashboard layouts](dashboard-layouts.md)。

## Review and provider layers

`Review Service` 接收当前页面类型与标准化帖子，为该页面选出已启用策略并按优先级构造判断。`Provider Registry` 只加载用户明确选中的渠道，不进行隐式回退：

| Provider          | Adapter API                     | Model ID            |
| ----------------- | ------------------------------- | ------------------- |
| OpenRouter        | `@openrouter/sdk` Decisions API | `typesafe/jev-1.13` |
| Vercel AI Gateway | AI SDK `experimental_evaluate`  | `typesafe-ai/jev`   |
| TypeSafe          | `@typesafe-ai/sdk` System One   | `jev-latest`        |

每个 Adapter 返回统一的 `Record<questionId, probability>`。Review Service 再按 P1、P2… 顺序选出第一条达到自身阈值的策略，因此更换渠道不会改变 UI 状态机或优先级语义。

## Trust boundary

- `providerSecrets` 和 S3 凭据只存于 `chrome.storage.local`，并限制为可信扩展上下文。
- Content Script 只读取发布到 `chrome.storage.session` 的安全设置镜像。
- API Key 管理消息必须同时匹配当前扩展 ID 与扩展 URL；来自 X 页面的 Content Script 无法读写密钥。
- Dashboard 只接收“是否已配置”和末四位提示，不接收已保存的完整 API Key。
- Provider 健康检查与 Jev 请求日志消息只接受可信扩展页面；Content Script 无法发起健康检查或读取日志。
- 配置 JSON 与 S3 远程文档不包含 Provider Key 或 S3 凭据。
- Activity 只接受来自 X/Twitter Content Script 的记录消息；读取、错误标记和清除只接受可信扩展页面。
- 历史不保存 HTML、DOM、Cookie、Session、媒体文件、Tracking 参数或无关网络数据。
- Jev 请求日志不保存 API Key、请求 state/questions、帖子正文或 Provider 原始错误，只保留本机诊断元数据。

这些本机凭据没有额外加密，安全性依赖浏览器扩展存储和操作系统账户边界。

## Persistence

应用配置包括总开关、评论区开关、主题、当前渠道、模型昵称、策略集合和可同步用户知识。所有写入都通过版本化持久层：

```text
ConfigurationDocument
├── schemaVersion
├── configVersion
├── knowledgeRevision
├── updatedAt
├── config
├── knowledge
    └── userDecisions
└── activity
    ├── clearedAt
    ├── historyClearedAt
    └── events[]
```

运行时以 IndexedDB `xflow-decisions` 为本机判定数据源，包含 `userDecisions`、`exactCache`、`normalizedCache`、`templateCache` 和 `semanticCache`；其前方保留 300 条进程内热数据以减少重复 IndexedDB 查询。`semanticCache` 通过 `[policyVersion, language]` 复合索引预筛候选，不扫描其他 Policy 或语言分区。普通缓存 TTL 为 7 天，并按 LRU 控制总量；只将单条标注、用户模板/语义规则和作者规则镜像到版本化配置文档。启用 S3 同步后，长期知识按 ID 合并，同一对象执行确定性的 Last Write Wins；配置版本和知识修订使用独立时钟，并通过跨扩展上下文锁串行化合并写入；向量在目标设备由同步样本重建，Exact、Template、Semantic 运行缓存不会上传。Endpoint 权限只在用户保存 S3 设置时申请；启动和定时后台同步不会弹出权限请求，S3 不参与逐条内容的实时判定。

Popup 与 Dashboard 的界面语言使用独立的本机键 `xflow.uiLocale`。它只控制静态标签、状态提示、日期与数字格式，不翻译或改写策略名称、提示词、Hover 模板、CSS、模型昵称和配置 JSON 等用户内容。Dashboard 的 `DashboardLocale` 将现有语言状态传给 Astryx InternationalizationProvider，并提供实际使用的控件辅助标签翻译。Astryx 拥有字段的生成 ID 与 label 关联，业务校验用 `data-field` 定位输入框以恢复焦点。该键不属于 `AppSettings`，因此不会增加 `configVersion`，也不会进入可编辑配置、S3 文档或 Content Script 的安全设置镜像。

语言切换只重新渲染界面文案，不触发配置或 S3 的重新读取，因此 Data 页面中的未保存草稿保持原样。共享校验器和后台服务可以保留内部错误语义，但 UI 必须通过已知错误映射或 locale-neutral code 选择当前语言的用户文案；不得直接显示后台返回的中文错误字符串。

Jev 请求日志使用独立的 `jevRequestLog` 本机键，保留最近 30 天且最多 200 条，支持在 Dashboard 单独清除。Background 初始化、浏览器启动及每日 Alarm 都会执行过期清理，因此即使没有新请求或用户未打开 Dashboard，过期记录也不会无限滞留。它不属于 `AppSettings`、版本化配置文档或 Activity，因此不会更新 `configVersion`，也不会上传 S3。

Activity 事件 ID 来自稳定 X 内容 ID；没有稳定 ID 时优先使用移除查询参数与锚点后的 canonical URL，最后才使用作者与文本的 SHA-256。Today、Heatmap 和 Trend 从近期去重事件派生，因此刷新、DOM 重建、路由切换和重复同步不会增加累计值。详情字段在 30 天后压缩；事件身份在 12 周后折叠为按设备单调合并的紧凑计数，避免本地存储无限增长，同时维持 All Time。日志页可以单独清除作者、摘要、原文链接与命中策略而保留统计；`historyClearedAt` 墓碑清除早于它的同步副本详情，已存在事件的 `detailsCleared` 标记还能防止时钟超前的副本恢复详情。`clearedAt` 墓碑则防止多设备同步恢复已完全清除的事件。清理操作保留已有的较新墓碑。

Toolbar Badge 与全局统计分离。后台在 `chrome.storage.session` 中按 Tab 保存页面 token 与本页已见事件 ID；新页面或刷新创建新 token 并清零，Tab 间计数互不影响，0 使用空 Badge。

版本元数据不出现在 Dashboard 的可编辑 JSON 中。启用 S3 同步后，应用配置仍按 `configVersion` 决定方向，Activity 则在任何方向都按稳定事件 ID 合并，归档计数按设备取最大值，状态按 `Filtered → Revealed → Marked Incorrect` 单调合并。远程读取完成后会重新读取并合并最新本地 Activity，避免同步期间的新事件被旧快照覆盖。Endpoint 权限只在用户保存 S3 设置时申请；启动和每 15 分钟同步不会弹出权限请求，也不会进入逐条过滤热路径。

## Manifest and permissions

`manifest.json` 是唯一的生产清单来源，由 `scripts/manifest.ts` 读取、校验并写入 `dist/`：

- 固定权限只有 `storage` 与 `alarms`；固定主机权限只有 X / Twitter 与三个 Provider。
- 可选主机权限只有 `https://*/*`。S3 Endpoint 的精确 Origin 在用户保存设置时通过 `chrome.permissions.request` 申请，启动与定时同步不会触发权限请求。
- `http://localhost/*` 与 `http://127.0.0.1/*` 只由 `bun run build:dev` 注入开发清单，生产包和发布校验禁止出现任何开发来源。
- `minimum_chrome_version` 为 `123`：界面配色依赖 `light-dark()`；`color-mix()`、`toSorted`、`:has()` 与 `findLast` 的要求都更低，`URL.canParse` 由 `typeof` 检查保护。
- 名称、描述与工具栏提示使用 `__MSG_*__`，文案位于 `_locales/en` 与 `_locales/zh_CN`。
- `icons/icon-{16,32,48,128}.png` 是提交到仓库的独立尺寸 PNG；构建只复制，不重新生成。

`scripts/manifest.test.ts` 断言权限清单、manifest / package 版本一致性、图标像素尺寸与本地化键集合；构建在写入清单前会运行同一组校验，因此开发权限无法进入发布包。

## Blur Veil state machine

```text
Idle → Classifying ─┬→ Visible
                    └→ Obscuring → Obscured
                                      │
                                      ▼
                                  Revealing → Revealed
                                      ▲           │
                                      └─ Reobscuring
```

禁用过滤或修改策略时也通过过渡状态揭示内容。遮罩不会删除、折叠或改变 X 原始帖子的 DOM 尺寸。详细交互约束见 [Blur Veil 设计](blur-veil-design.md)。

## Build outputs

`scripts/build.ts` 生成四个浏览器入口：

- `background.js`：Manifest V3 Service Worker，ES module。
- `content.js` / `content.css`：注入 X 页面的脚本和隔离样式。
- `popup.js` / `popup.css`：扩展弹窗。
- `dashboard.js` / `dashboard.css`：扩展选项页。

`manifest.json` 经 `scripts/manifest.ts` 校验后写入 `dist/`，`icons/` 与 `_locales/` 一并复制；`popup.html`、`dashboard.html`、`logo.png` 和 `logo-dark.png` 直接复制。`dist/` 是可重建产物，不纳入版本控制。

修改 `src/themes/neutral/neutralTheme.ts` 后运行 `bun run theme:build`。`bun run build` 与 `bun run build:dev` 先运行 `theme:check`，防止使用过期的生成文件；生成文件由 Astryx CLI 管理，不由 Oxfmt 或 Oxlint 改写。

## Release packaging

`bun run release:package` 清空 `dist/` 与 `output/release/` 后以 `--release` 重建（`sourcemap: "none"`），再交给 `scripts/release.ts`：

1. `planRelease()` 只读取即将打包的字节，断言权限、版本一致性、本地化键与图标尺寸，并要求包内文件集合与 manifest、扩展页面及 CSS 引用和声明的字体许可集合完全相等——多一个文件或少一个文件都会失败。CSS 引用 Figtree 时必须随包携带 `fonts/OFL.txt`，不放宽其他未引用资源的检查。
2. 同一批字节再按扩展名执行禁用模式扫描，`eval(`、`new Function(`、`importScripts(`、`sourceMappingURL`、远程页面资源与 localhost 来源都会阻断发布。规则表见 `FORBIDDEN_ARCHIVE_RULES` 与 `FORBIDDEN_PATTERNS`。
3. `scripts/archive.ts` 用 `node:zlib` 生成 ZIP：条目按路径排序、`manifest.json` 固定在首位、时间戳固定为 2020-01-01，因此同一份 `dist/` 产生完全相同的字节。写入前会用内置读取器逐条回读并校验 CRC-32，写入后由系统 `unzip -t` / `unzip -Z1` 独立确认。
4. 产物为 `output/release/xflow-<version>.zip` 及其 `.sha256` 与 `.files.txt`；`output/`、`*.zip`、`*.crx`、`*.pem` 均被 Git 忽略。

`bun run release:check` 先运行完整质量门禁，只有全部通过才会打包，因此被上传的产物一定是通过检查的那一份。

`bun run release:verify` 连续调用两次 `packageRelease()`（每次都清空并重建），再逐字节比较 `output/release/` 下的全部产物，把“同一提交生成同一归档”从人工约定变成可执行断言。

## CI and release automation

| Workflow                        | 触发                            | 作用                                                                                            |
| ------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`      | `main` 推送、Pull Request、手动 | 质量门禁任务执行 `bun run check`；并行的打包任务执行 `bun run release:verify`                   |
| `.github/workflows/release.yml` | `v*` 标签、手动                 | 校验标签与 `package.json` 版本一致，执行 `release:check` 与 `release:verify` 后创建草稿 Release |

两个工作流都不需要仓库密钥：版本来自 `package.json` 的 `packageManager`，Release 只用 `GITHUB_TOKEN`（`contents: write`）。所有 Action 固定到提交 SHA。手动触发 `release.yml` 不会创建 Release，可用于演练打包流程；`workflow_dispatch` 要求工作流文件已在默认分支，因此该工作流在合并到 `main` 后生效。

同一提交在 macOS 本地与 GitHub Ubuntu runner 上产出的归档 SHA-256 完全一致，可复现性由 CI 每次运行持续保证。

## Version preview assets

`bun run preview:assets` builds the production extension, starts an isolated localhost mock server, and uses named agent-browser sessions to capture the Dashboard and Popup. `scripts/capture-previews.ts` owns synthetic fixtures and the versioned asset inventory. `scripts/qa/store-popup-frame.tsx` supplies a browser-rendered Astryx presentation frame containing the real Popup iframe; it is served only under `/__preview__/store-popup.html` and never bundled into the extension.

Requested documentation images are encoded as WebP in `docs/assets/`; raw PNG captures, store upload artwork and their ZIP remain ignored in `output/previews/<version>/`. `docs/previews/<version>.json` records source/main commits, capture time, locale, theme, dimensions and SHA-256. The website copies the same strategy-editor asset. No real provider credentials or requests are involved. See [Preview assets](previews/README.md) for regeneration and the release screenshot order.
