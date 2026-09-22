# XFlow

XFlow 是一个基于 Jev 的 Manifest V3 浏览器扩展。支持配置自定义策略，屏蔽过滤 x 上的相关内容与评论。

- 数据安全可控：数据全程本地存储无留痕。使用 S3 对象存储协议，支持自定义的多设备同步。
- 多渠道支持：支持多渠道（OpenRouter、Vercel AI Gateway 和 TypeSafe 官方渠道）Api 相关配置。
- 多策略支持：支持灵活，高定制的策略管理和实时内容过滤和样式处理。
- 缓存优化：支持 命中缓存 以及 策略标记，减少 token 消耗提升响应速度。

## Quick Start

### 1. Chrome Installation

1. 打开 `chrome 扩展商店`，搜索 `XFlow` 并安装。
2. 打开 XFlow Dashboard，在「API Keys」中保存至少一个渠道凭证并选中该渠道。
3. 打开或刷新 `https://x.com/home`，XFlow 即可开始工作。

### 2. Chrome Developer Mode Installation

1. clone 该项目，在本地打开终端进入项目根目录。
2. 运行 `bun install` 安装依赖， 运行 `bun run build` 构建扩展。
3. 打开 `chrome://extensions`，开启“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择本项目的 `dist/` 目录。
5. 打开 XFlow Dashboard，在「API Keys」中保存至少一个渠道凭证并选中该渠道。
6. 打开或刷新 `https://x.com/home`，XFlow 即可开始工作。

## Features

[x] 流式监听时间线与评论区，过滤相关内容。
[x] 每个场景可以配置多条策略、提示词、敏感度和优先级，自定义样式。
[x] 支持 OpenRouter、Vercel AI Gateway 和 TypeSafe 官方渠道。
[] Popup、Dashboard 的样式优化与多语言支持。
[] 支持多设备同步, 支持 s3 协议。
[x] 支持 Policy 隔离的分层本地缓存，减少重复 Jev 调用和 token 消耗。
[x] 支持单条内容与相似内容的用户标注，用户决定优先于自动判定。
[] 策略命中日志以及命中数据看板的支持。

## Requirements

- [Bun](https://bun.sh/) 1.3.13 或兼容版本
- Chrome、Edge 或其他支持 Manifest V3 的 Chromium 浏览器
- 至少一个受支持渠道的 API Key

## Build and install

```bash
bun install
bun run check
```

`bun run check` 会依次执行格式检查、Lint、TypeScript、Bun 测试和生产构建。构建结果位于 `dist/`。

在 Chrome 中安装：

1. 打开 `chrome://extensions`，开启“开发者模式”。
2. 点击“加载已解压的扩展程序”，选择本项目的 `dist/` 目录。
3. 打开 XFlow Dashboard，在「API Keys」中保存至少一个渠道凭证并选中该渠道。
4. 打开或刷新 `https://x.com/home`。

每次重新构建后，需要在扩展管理页点击“重新加载”，并刷新已经打开的 X 页面。

## Configuration

### General

「通用」提供时间线、评论区总开关与模型昵称。开关立即生效；昵称只用于 Hover 展示，不改变实际模型。

### API Keys

三个渠道的 Key 可以独立保存、替换或清除。后台只调用当前明确选中的渠道，不会在失败时将内容自动转发到其他服务。界面仅展示 Key 的末四位，无法读回完整值。

| Provider          | Model               |
| ----------------- | ------------------- |
| OpenRouter        | `typesafe/jev-1.13` |
| Vercel AI Gateway | `typesafe-ai/jev`   |
| TypeSafe          | `jev-latest`        |

### Strategies

「策略」包含「时间线博文」和「评论区」两个 Tab，每个 Tab 都有独立策略表。后台按照 P1、P2… 顺序判断，采用第一条达到自身阈值的策略；高优先级未命中时才继续采用后续结果。

敏感度越高，触发遮罩所需概率越低。例如敏感度 70 对应 30% 阈值。保存策略会让所属场景先平滑揭示旧遮罩，再按新配置重新分析，因此可能产生新的 API 请求。

Hover 文案支持：

- `{{strategy.name}}`
- `{{strategy.hitrate}}`
- `{{strategy.threshold}}`
- `{{model.nickname}}`
- `{{model.id}}`
- `{{surface}}`

自定义 CSS 只允许 Dashboard 中列出的遮罩选择器和视觉属性，不会直接注入任意页面 CSS。

### Data and S3 sync

「数据」页只展示可修改的应用配置。`schemaVersion`、`configVersion`、`knowledgeRevision` 与 `updatedAt` 由持久化层维护，不能通过 JSON 编辑器覆盖。

S3 同步使用 path-style URL：`{endpoint}/{bucket}/{objectKey}`。首次启用时扩展会请求 Endpoint 权限；之后在配置写入、浏览器启动和每 15 分钟定时检查时自动同步：

- 本地版本较新或远程对象不存在：推送本地配置。
- 远程版本较新：拉取并应用远程配置。
- 版本相同：不覆盖。

用户标注、用户创建的模板/语义规则和作者规则属于长期知识，会随配置文档同步；多设备合并按标注 ID 取并集，同一标注按 `updatedAt` 与设备 ID 决定最后写入。配置版本与知识修订号独立推进，知识更新不会让旧配置覆盖其他设备上的新策略。普通 Jev 缓存、语义向量和临时运行状态只保存在本机 IndexedDB，不上传 S3，也不参与实时过滤请求。

Bucket 需要允许扩展来源执行 GET、PUT 和 CORS 预检。

### Local decisions and feedback

Background Worker 按“单条标注 → 作者规则 → 用户模板/语义规则 → 精确缓存 → 归一化缓存 → 模板缓存 → 语义缓存 → Jev”处理内容。缓存绑定当前页面策略与 Provider 的稳定指纹；策略内容、顺序、敏感度或 Provider 改变后，旧缓存不会跨版本复用。

每条检测到的内容右上角都有 `J` 入口；远程判定尚未返回或 Provider 未配置时也可以主动标注。菜单可查看命中率和来源，并选择：

- 仅隐藏当前 Tweet（存在稳定 Tweet ID 时持久化；缺少 `/status/{id}` 时只作用于当前页面，不写入自动缓存或相似内容学习）
- 显示当前 Tweet（按 Tweet ID 保存）
- 纠正当前策略判定
- 减少类似内容
- 屏蔽类似内容
- 屏蔽此作者
- 允许此作者内容

前两项只作用于当前内容；相似内容操作会同时形成可同步的用户模板/语义规则；作者操作形成可同步的作者规则。显式用户选择始终高于缓存和 Jev。普通缓存默认保留 7 天，并在后台按最近访问时间清理，总量最多保留 5,000 条；模板缓存至少需要两个高置信一致样本，自动语义复用采用本地特征哈希向量、余弦相似度和 Top-K 一致性检查。

## Privacy and permissions

- 只有启用范围内、从 X 页面提取的文本会发送到当前选中的 Provider。
- Provider API Key 与 S3 凭据保存在 `chrome.storage.local`，没有额外加密。
- Content Script 只能访问不含密钥的 session 设置镜像。
- 配置 JSON 和 S3 远程对象不包含 Provider API Key 或 S3 凭据。
- 固定主机权限仅包含 X/Twitter 与三个 Provider；任意 S3 HTTPS Endpoint 通过可选权限在用户操作下授予。

加载扩展前，请自行审阅 `manifest.json` 与所选 Provider 的数据政策。不要在测试、Issue、日志或截图中提交真实凭据。

## Development

```bash
bun run format          # 写入 Oxfmt 格式
bun run format:check    # 检查格式
bun run lint            # Oxlint，warning 视为失败
bun run lint:fix        # 修复可自动处理的规则
bun run typecheck       # TypeScript 静态检查
bun test                # Bun 单元测试
bun run build           # 构建 dist/
bun run check           # 完整质量门禁
bun run preview:dashboard
```

Dashboard 预览使用独立的 localStorage Mock，不读取已安装扩展的数据，也不会请求模型。`scripts/qa/` 中保留关键浏览器验收流程，供 Playwright CLI 在预览环境中执行；这些脚本只断言行为，不生成或提交截图。

## Project structure

```text
.
├── docs/
│   ├── architecture.md       # 数据流、信任边界与持久化
│   └── blur-veil-design.md   # 遮罩交互和动画规范
├── scripts/
│   ├── build.ts              # Bun 生产构建
│   ├── preview-dashboard.ts  # 无真实凭据的本地预览
│   └── qa/                   # 浏览器验收流程
├── src/
│   ├── background/           # Service Worker、Review Service、Provider Adapter
│   ├── content/              # DOM 提取、控制器、Blur Veil 与动画
│   ├── dashboard/            # 完整配置界面
│   ├── popup/                # 扩展弹窗
│   ├── shared/               # 协议、配置、持久化与纯函数
│   ├── styles/               # 共享主题 token
│   └── ui/                   # 共享 UI utility 与主题组件
├── dashboard.html
├── popup.html
└── manifest.json
```

更完整的模块关系、数据边界和状态机见 [架构文档](docs/architecture.md)。动画行为以 [Blur Veil 设计规范](docs/blur-veil-design.md) 为准。

## Known limitations

- X/Twitter DOM 变化可能导致内容提取失效，需要同步更新选择器与测试夹具。
- 本仓库尚未添加开源许可证；公开仓库不等于自动授予复制、修改或分发权利。
- 如有侵权，请及时联系我们删除相关内容。
