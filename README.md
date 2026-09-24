<p align="center">
  <img src="logo.png" alt="XFlow" width="160" />
</p>

<p align="center">
  <strong>简体中文</strong> · <a href="README.en.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/ryanzen9/XFlow/actions/workflows/ci.yml"><img src="https://github.com/ryanzen9/XFlow/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
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

<p align="center">
  <a href="https://ryanzen9.github.io/XFlow/">项目官网</a> · <a href="https://ryanzen9.github.io/XFlow/privacy.html">隐私政策</a>
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
| `02` | Blur Veil                 | 保留帖子原始尺寸和 DOM，以模糊遮罩、Hover 信息及点击或键盘揭示降低干扰。                 |
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
- 日志页可单独清理作者、内容预览、原文链接和命中策略，保留每日统计与累计数量。
- 全部清除会写入 `clearedAt` 墓碑，避免旧设备或远程对象恢复已清除记录。

## S3 同步

S3 使用 path-style URL：`{endpoint}/{bucket}/{objectKey}`。首次保存 Endpoint 时扩展会请求可选主机权限；启用后会在配置写入、浏览器启动和每 15 分钟定时检查时同步。生产清单只声明 `https://*/*`，因此使用 `http://localhost` 或 `http://127.0.0.1` 的本地 S3 需要先执行 `bun run build:dev`。

- 本地配置版本更新或远程对象不存在：推送本地配置。
- 远程配置版本更新：拉取并应用远程配置。
- Activity 在任一方向都按稳定内容 ID 合并；归档计数按设备取最大值，状态按 `Filtered → Revealed → Marked Incorrect` 单调合并。

用户标注、用户创建的模板/语义规则和作者规则属于长期知识，会随配置文档同步；多设备合并按标注 ID 取并集，同一标注按 `updatedAt` 与设备 ID 决定最后写入。配置版本与知识修订号独立推进，知识更新不会让旧配置覆盖其他设备上的新策略。普通 Jev 缓存、语义向量和临时运行状态只保存在本机 IndexedDB，不上传 S3，也不参与实时过滤请求。

Bucket 需要允许扩展来源执行 GET、PUT 和 CORS 预检。

## 本地决策与用户标注

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

## 隐私与权限

完整说明见 [XFlow 隐私政策](https://ryanzen9.github.io/XFlow/privacy-policy/zh-CN/)（[English](https://ryanzen9.github.io/XFlow/privacy-policy/)；[仓库源文件](docs/privacy-policy.md)）。

- 只有已启用范围内、从 X 页面提取的文本会发送到当前选中的 Provider。
- Provider API Key 与 S3 凭据保存在 `chrome.storage.local`，目前没有额外加密。
- Content Script 只能读取不含密钥的 `chrome.storage.session` 设置镜像。
- 配置 JSON 和远程 S3 文档不包含 Provider API Key 或 S3 凭据。
- Activity 保存内容 ID、短文本预览、作者、对应 X 帖子 URL、过滤时间、命中策略和必要状态；不保存 HTML、DOM、Cookie、Session、媒体文件或完整浏览路径。
- 固定主机权限仅包含 X / Twitter 与三个 Provider；S3 Endpoint 通过用户操作授予可选权限。
- 生产 `manifest.json` 不声明任何 localhost / 127.0.0.1 来源；本地 http 调试来源只由 `bun run build:dev` 注入。

生产清单要求 Chrome 123 或更高版本：界面配色通过 `light-dark()` 解析。扩展名称、描述与工具栏提示来自 `_locales/en` 与 `_locales/zh_CN`，图标为 `icons/` 下四个独立尺寸的 PNG。

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
bun run build:dev       # 生成 dist/，额外注入 localhost 调试来源
bun run check           # 完整质量门禁
bun run release:check   # 完整质量门禁 + 打包校验，产出可上传 ZIP
bun run release:package # 只做生产构建与打包校验
bun run release:verify  # 连续打包两次并逐字节比较
bun run benchmark:cache # 测试并展示分层缓存命中率与性能影响
bun run preview:dashboard
bun run preview:site
bun run preview:tokens
```

缓存基准的样本与探针集中在 `scripts/cache-benchmark-dataset.ts`，覆盖 Exact、Normalized、Template、Semantic 与 Miss 五类缓存路径，以及社区通知、交通、旅行、烹饪、户外、园艺、科学和中西文内容。合成工作负载保持固定的 80/20 命中与未命中比例；本地查询耗时来自 Bun 高精度计时器，Jev 调用减少率来自实际缓存命中结果。端到端耗时对比属于单条顺序请求模型，默认假设每次 Jev 调用为 600ms，可通过 `sh scripts/cache-benchmark.sh --requests=2000 --jev-latency-ms=800` 调整；使用 `--json` 可输出机器可读结果。该脚本不会读取真实凭据或发起网络请求。

真实 TypeSafe 模式通过官方 `@typesafe-ai/sdk` 处理 20–50 条内置脱敏样本，并分别验证 Exact、Normalized、Template 与 Semantic 四类流量。在交互式 TTY 中，界面会随冷请求、缓存写入和每个 warm 批次刷新，显示进行中的 SDK 请求、整体和分层缓存命中率、缓存占用与耗时；非交互运行仍在结束时输出报告，`--json` 保持纯 JSON 输出。由于生产批次上限为 5，冷阶段会产生 4–10 次真实 Provider 请求，之后使用每轮不同的探针验证缓存是否完全避免远程请求：

```bash
sh scripts/cache-benchmark.sh --live-typesafe --samples=24 --warm-runs=3
```

#### TypeSafe 实测效果（2026-09-23）

一次 `jev-latest` 实测使用 24 条冷样本和 3 轮 warm 探针，结果如下：

| 指标            |                                                 实测结果 |
| --------------- | -------------------------------------------------------: |
| 冷阶段          |                                   5 次 SDK 批次，2.44 秒 |
| warm 阶段       |                  72/72 本地缓存命中，平均每轮 6.009 毫秒 |
| 避免的 SDK 调用 |          15/20（75%）；warm 阶段的 15 次预期调用全部避免 |
| 预期缓存层命中  | Exact、Normalized、Template、Semantic 均为 18/18（100%） |
| 延迟变化        |                        冷阶段与 warm 单轮相比减少 99.75% |
| 缓存载荷        |                          增加约 101.20 KiB，共 92 条记录 |

这些数据来自一次实测，用于展示缓存预热后的收益，不代表所有 Provider 延迟。`Traffic-type accuracy` 衡量探针是否命中预期缓存层，不代表模型分类准确率；本轮 `blur` / `allow` 分布和 56.9% 平均概率也没有人工标签作为正确性基准。报告中的 3.5% 是缓存载荷相对 2.86 MiB 运行时扩展文件的比例；缓存字节数为序列化载荷估算，不等同于浏览器实际磁盘占用。

未设置 `TYPESAFE_API_KEY` 时，交互式终端会隐藏输入 Key；CI 可使用环境变量传入。Key 只存在于当前进程内存，不会打印、保存到扩展存储或写入报告。不要使用 `--key=...`，以免密钥进入 Shell 历史或进程列表。报告包含各类型命中率、SDK 调用减少率、真实延迟、构建包逻辑体积，以及缓存 IndexedDB 序列化载荷的前后变化；浏览器文件系统开销会因平台而异。`--posts=20..50` 仍作为 `--samples` 的兼容别名，`--json` 可输出机器可读结果。

Dashboard 预览使用隔离的 localStorage Mock，不读取已安装扩展的数据，也不会请求模型。设计 token 索引页位于 `http://127.0.0.1:43993/`，可切换 Light / Dark 并查看解析值。

## 发布打包

```bash
bun run release:check     # 质量门禁 + 打包校验，产出可上传 ZIP
bun run release:package   # 仅生产构建 + 打包校验
bun run release:verify    # 连续打包两次并逐字节比较，验证可复现
```

`release:check` 与 `release:package` 都会先清空 `dist/` 与 `output/release/`，再以 `--release` 重新构建（不生成 source map），然后：

- 断言权限、manifest / package 版本一致性、本地化键与图标尺寸，并确认包内文件恰好是 manifest 与扩展页面引用到的那些。
- 扫描产物中的 `eval(`、`new Function(`、`importScripts(`、`sourceMappingURL`、远程页面资源与 localhost 来源。
- 生成 `output/release/xflow-<version>.zip`，ZIP 根目录直接包含 `manifest.json`，不包含 `dist/` 外层目录。
- 用内置 ZIP 校验加系统 `unzip -t` / `unzip -Z1` 交叉验证，输出 SHA-256 与逐文件清单。

ZIP 内记录的时间戳固定为 2020-01-01，条目按路径排序，且只依赖 Bun 与 `node:zlib`，因此同一份提交在任何机器上都会生成完全相同的字节。`output/`、`*.zip`、`*.crx`、`*.pem` 均被 Git 忽略。

## 持续集成与发布自动化

| 工作流                                                           | 触发                              | 作用                                                                                       |
| ---------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml)           | 推送到 `main`、Pull Request、手动 | 质量门禁（格式、Lint、类型、测试、生产构建）；另一个并行任务打包并证明归档可复现           |
| [`.github/workflows/release.yml`](.github/workflows/release.yml) | 推送 `v*` 标签、手动              | 校验标签与版本一致，跑完整发布门禁，再次验证可复现，上传 ZIP 并创建**草稿** GitHub Release |

- 两个工作流都只用 Bun：`oven-sh/setup-bun` 从 `package.json` 的 `packageManager` 读取版本，依赖用 `bun install --frozen-lockfile` 安装。
- 所有 Action 固定到提交 SHA，并在行尾注释标注对应版本，避免可变标签被改写。
- 打包任务连续打包两次并逐字节比较，任何引入时间戳或随机标识的依赖都会让 CI 失败。
- 推送 `v0.1.0` 这类标签后会自动创建草稿 Release，附带 ZIP、`.sha256` 与 `.files.txt`；公开发布仍需人工确认。手动触发只构建与校验，不会创建 Release。
- 手动触发（`workflow_dispatch`）要求工作流文件已存在于默认分支，因此 `release.yml` 的标签触发与手动触发都在合并到 `main` 之后生效。

项目官网预览与 GitHub Pages 发布方式见[官网说明](docs/project-page.md)。

## Roadmap

- [x] 分层内容决策缓存、用户标注与重复判断去重
- [x] 扩展界面国际化
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
