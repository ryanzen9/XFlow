<p align="center">
  <img src="logo.png" alt="XFlow" width="160" />
</p>

<p align="center">
  <strong>简体中文</strong> · <a href="README.en.md">English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-525252?style=flat-square&labelColor=0a0a0a" alt="Version 0.1.0" />
  <img src="https://img.shields.io/badge/Manifest-V3-525252?style=flat-square&labelColor=0a0a0a" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/React-19-525252?style=flat-square&labelColor=0a0a0a" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-525252?style=flat-square&labelColor=0a0a0a" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Bun-1.3-525252?style=flat-square&labelColor=0a0a0a" alt="Bun 1.3" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-525252?style=flat-square&labelColor=0a0a0a" alt="Tailwind CSS 4" />
</p>

<p align="center">
  一个面向 X / Twitter 的策略驱动内容过滤扩展。
</p>

> 当前版本尚未发布到 Chrome Web Store，请通过开发者模式安装。

## 界面预览

<p align="center">
  <img src="docs/assets/strategy-editor.webp" alt="深色主题下的 XFlow 策略编辑器与本地 Blur Veil 实时预览" width="100%" />
</p>

<table>
  <tr>
    <td width="72%"><img src="docs/assets/dashboard-activity.webp" alt="浅色主题下的 Activity Heatmap、趋势和每周回顾" /></td>
    <td width="28%"><img src="docs/assets/veil-preview.webp" alt="深色主题下的 Blur Veil 本地预览、命中率与阈值控制" /></td>
  </tr>
  <tr>
    <td align="center"><sub>本地 Activity、30 天历史与 12 周趋势</sub></td>
    <td align="center"><sub>不调用模型的 Blur Veil 实时预览</sub></td>
  </tr>
</table>

截图来自隔离的 Dashboard Mock Storage，不包含真实凭据，也不会向 Provider 发起请求。

## 为什么是 XFlow

|      | 能力                      | 当前行为                                                                                 |
| ---- | ------------------------- | ---------------------------------------------------------------------------------------- |
| `01` | Policy engine             | 为时间线和评论区分别配置多条策略、提示词、Hit Rate 与 P1 → Pn 优先级。                   |
| `02` | Blur Veil                 | 保留帖子原始尺寸和 DOM，以渐进遮罩、Hover 信息及点击或键盘揭示降低干扰。                 |
| `03` | Multi-provider Jev        | 显式选择 OpenRouter、Vercel AI Gateway 或 TypeSafe；失败时不进行隐式渠道降级。           |
| `04` | Local-first activity      | 在本机记录去重后的过滤事件，提供今日/累计计数、Heatmap、趋势、周报、历史与页面 Badge。   |
| `05` | Versioned S3 sync         | 可选同步配置和 Activity；配置按版本决定方向，事件按稳定 ID 合并，清除状态由墓碑保护。    |
| `06` | Local credential boundary | Provider Key 与 S3 凭据只留在扩展本机存储，不进入 Content Script、配置 JSON 或 S3 文档。 |
| `07` | Token-driven UI           | Popup 与 Dashboard 使用同一套设计 token，支持高对比 Light / Dark 主题和 reduced motion。 |

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

Content Script 只负责发现帖子、提取必要文本与元数据、渲染遮罩和上报已实际过滤的事件。外部请求、密钥、迁移、Activity 去重和同步都留在后台 Service Worker。完整边界见 [架构文档](docs/architecture.md)。

## 快速开始

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

## Provider

| 渠道              | 模型                | Adapter API                     |
| ----------------- | ------------------- | ------------------------------- |
| OpenRouter        | `typesafe/jev-1.13` | `@openrouter/sdk` Decisions API |
| Vercel AI Gateway | `typesafe-ai/jev`   | AI SDK `experimental_evaluate`  |
| TypeSafe          | `jev-latest`        | `@typesafe-ai/sdk` System One   |

渠道始终由用户明确选择。请求失败时，XFlow 不会自动将内容转发到另一个 Provider，以避免意外的数据流向或费用变化。

## 策略与交互

- 时间线和评论区拥有独立策略表，分别从 P1 开始排序。
- 第一条达到自身阈值的策略成为最终命中；高优先级未命中后才采用后续结果。
- Dashboard 的 Hit Rate 表示触发遮罩所需的最低命中概率，可用数字、滑块或低（80%）、中（70%）、严格（50%）快捷值调整；已有配置仍兼容旧的 `sensitivity` 字段。
- 保存策略会先平滑揭示受影响页面的旧遮罩，再按新配置重新分析，因此可能产生新的 API 请求。
- Hover 文案支持策略名称、hitrate、阈值、模型昵称、模型 ID 和页面场景变量。
- Hover 样式可在默认、文字强调和高对比之间切换，也可继续编辑自定义 CSS。
- 自定义 CSS 只接受列出的遮罩选择器和视觉属性，不会把任意页面 CSS 注入 X。

交互与动画约束见 [Blur Veil 设计规范](docs/blur-veil-design.md)。

## Activity、Badge 与数据保留

- Popup 展示今日和累计过滤数；Toolbar Badge 只统计当前 Tab 当前页面生命周期内的唯一内容，0 时隐藏。
- Dashboard 提供过去 12 周 Heatmap、最近 7 天趋势、当前自然周回顾和最近 30 天筛选历史。
- 只有明确选择 **Not supposed to be filtered** 才会标记错误；临时 Reveal 不会自动视为误判。
- 详细历史在 30 天后压缩；事件身份在 12 周后折叠为按设备合并的紧凑计数，以维持累计值并限制存储增长。
- 全部清除会写入 `clearedAt` 墓碑，避免旧设备或远程对象恢复已清除记录。

## S3 同步

S3 使用 path-style URL：`{endpoint}/{bucket}/{objectKey}`。首次保存 Endpoint 时扩展会请求可选主机权限；启用后会在配置写入、浏览器启动和每 15 分钟定时检查时同步。

- 本地配置版本更新或远程对象不存在：推送本地配置。
- 远程配置版本更新：拉取并应用远程配置。
- Activity 在任一方向都按稳定内容 ID 合并；归档计数按设备取最大值，状态按 `Filtered → Revealed → Marked Incorrect` 单调合并。

Bucket 需要允许扩展来源执行 GET、PUT 和 CORS 预检。

## 隐私与权限

完整说明见 [XFlow 隐私政策](docs/privacy-policy.md)（[English](docs/privacy-policy.en.md)）。

- 只有已启用范围内、从 X 页面提取的文本会发送到当前选中的 Provider。
- Provider API Key 与 S3 凭据保存在 `chrome.storage.local`，目前没有额外加密。
- Content Script 只能读取不含密钥的 `chrome.storage.session` 设置镜像。
- 配置 JSON 和远程 S3 文档不包含 Provider API Key 或 S3 凭据。
- Activity 保存内容 ID、短文本预览、作者、对应 X 帖子 URL、过滤时间、命中策略和必要状态；不保存 HTML、DOM、Cookie、Session、媒体文件或完整浏览路径。
- 固定主机权限仅包含 X / Twitter 与三个 Provider；S3 Endpoint 通过用户操作授予可选权限。

加载扩展前，请自行审阅 [`manifest.json`](manifest.json) 与所选 Provider 的数据政策。不要在 Issue、日志、测试或截图中提交真实凭据。

## 开发

项目统一使用 Bun：

```bash
bun run format          # Oxfmt 写入格式
bun run format:check    # 检查格式
bun run lint            # Oxlint，warning 视为失败
bun run lint:fix        # 修复可自动处理的规则
bun run typecheck       # TypeScript 静态检查
bun test                # Bun 单元测试
bun run build           # 生成 dist/
bun run check           # 完整质量门禁
bun run preview:dashboard
bun run preview:tokens
```

Dashboard 预览使用隔离的 localStorage Mock，不读取已安装扩展的数据，也不会请求模型。设计 token 索引页位于 `http://127.0.0.1:43993/`，可切换 Light / Dark 并查看解析值。

## Roadmap

- [ ] 分层内容决策缓存与重复判断去重
- [ ] 扩展界面国际化
- [ ] Chrome Web Store 发布

## 文档

- [架构、信任边界与持久化](docs/architecture.md)
- [Blur Veil 交互与动画](docs/blur-veil-design.md)
- [设计 token 分层与主题](docs/design-tokens.md)
- [视觉与交互原则](design.md)
- [English README](README.en.md)

## 已知限制与许可证

- X / Twitter DOM 变化可能导致内容提取失效，需要同步更新选择器与测试夹具。
- 本仓库尚未添加开源许可证；公开可见不代表自动授予复制、修改或分发权利。
