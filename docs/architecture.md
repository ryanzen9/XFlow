# XFilter architecture

本文描述 MVP 当前实现。

## Runtime data flow

```text
X / Twitter DOM
      │
      ▼
Content Script ── normalized post text ──► Background Service Worker
      │                                         │
      │                                         ├─ Review Service
      │                                         ├─ Provider Registry
      │                                         └─ Selected Jev Adapter
      │                                                    │
      ◄──────── probability + matched strategy ────────────┘
      │
      ▼
Blur Veil state machine
```

Content Script 负责发现帖子、提取文本和渲染遮罩，不持有 API Key。后台负责策略选择、外部请求、配置迁移和自动同步。

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

应用配置包括总开关、评论区开关、主题、当前渠道、模型昵称和策略集合。所有写入都通过版本化持久层：

```text
ConfigurationDocument
├── schemaVersion
├── configVersion
├── updatedAt
└── config
```

版本元数据不出现在 Dashboard 的可编辑 JSON 中。启用 S3 同步后，本地版本较新则 PUT，远程版本较新则 GET 并应用，版本相同则不覆盖。Endpoint 权限只在用户保存 S3 设置时申请；启动和定时后台同步不会弹出权限请求。

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
