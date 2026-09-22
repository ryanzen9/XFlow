# XFilter architecture

本文描述 MVP 当前实现。

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
```

Content Script 负责发现帖子、提取文本和渲染遮罩，不持有 API Key。后台负责策略选择、外部请求、配置迁移和自动同步。

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

Policy 指纹包含 surface、Provider、策略 ID、启用状态、优先级、Prompt 和敏感度。运行缓存以 Policy 指纹分区，配置改变后自然 miss；单条隐藏或允许按稳定 Tweet ID 保存并直接更新 UI，不写入自动缓存或相似内容学习，也不会被新的 Jev 结果覆盖。

## Source boundaries

| Directory               | Responsibility                                                 |
| ----------------------- | -------------------------------------------------------------- |
| `src/background`        | Service Worker、消息权限、策略编排、Provider Adapter、自动同步 |
| `src/content`           | URL/DOM 监听、文本提取、Blur Veil 组件与状态机                 |
| `src/dashboard`         | 通用设置、API Keys、策略编辑器、数据与 S3 配置                 |
| `src/popup`             | 实时开关、当前渠道状态和 Dashboard 入口                        |
| `src/shared`            | 消息协议、配置 schema、迁移、纯函数和 S3 核心逻辑              |
| `src/ui` / `src/styles` | 跨入口 UI utility、主题逻辑和 Tailwind token                   |

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
- 配置 JSON 与 S3 远程文档不包含 Provider Key 或 S3 凭据。

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
└── knowledge
    └── userDecisions
```

运行时以 IndexedDB `xflow-decisions` 为本机判定数据源，包含 `userDecisions`、`exactCache`、`normalizedCache`、`templateCache` 和 `semanticCache`；其前方保留 300 条进程内热数据以减少重复 IndexedDB 查询。`semanticCache` 通过 `[policyVersion, language]` 复合索引预筛候选，不扫描其他 Policy 或语言分区。普通缓存 TTL 为 7 天，并按 LRU 控制总量；只将单条标注、用户模板/语义规则和作者规则镜像到版本化配置文档。启用 S3 同步后，长期知识按 ID 合并，同一对象执行确定性的 Last Write Wins；配置版本和知识修订使用独立时钟，并通过跨扩展上下文锁串行化合并写入；向量在目标设备由同步样本重建，Exact、Template、Semantic 运行缓存不会上传。Endpoint 权限只在用户保存 S3 设置时申请；启动和定时后台同步不会弹出权限请求，S3 不参与逐条内容的实时判定。

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

`manifest.json`、`popup.html` 和 `dashboard.html` 一并复制到 `dist/`。`dist/` 是可重建产物，不纳入版本控制。
