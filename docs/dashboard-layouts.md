# Dashboard layouts

Dashboard 使用 Astryx Neutral。模板用于确定布局与交互结构，内容来自扩展的真实设置和本地 Activity；不复制模板的示例数据、额外配置项或内联样式。

## CLI references

本次使用以下 CLI 查询模板、布局、动效和组件 API：

```bash
bunx astryx build "Dashboard settings panels, analytics dashboard, filterable strategy and log tables"
bunx astryx template settings-sidebar  # Settings Panels
bunx astryx template dashboard         # Analytics Dashboard
bunx astryx template table-filter      # Filterable Table
bunx astryx template ToolbarTableFilter
bunx astryx docs layout
bunx astryx docs motion
bunx astryx component Section
bunx astryx component Toolbar
bunx astryx component TextInput
bunx astryx component Selector
bunx astryx component Table
bunx astryx component Collapsible
```

## Page contracts

| 页面     | 模板模式                     | 宽度与结构                                                                      |
| -------- | ---------------------------- | ------------------------------------------------------------------------------- |
| 概览     | Analytics Dashboard          | 上限 1180；4 个指标 → 图表/周报 → 最近 5 条记录                                 |
| 通用     | Settings Panels              | 上限 840；200 宽的分组标题与字段并排，1280 以下堆叠                             |
| API Keys | Settings Panels              | 上限 960；1280 以上 280 宽渠道列表与详情并排，以下堆叠                          |
| 策略     | Filterable Table             | 上限 1180；范围标签、搜索/状态/计数、完整优先级表格                             |
| 策略详情 | Settings Panels              | 上限 1180；字段与预览按各 360 最小宽度排布，不足则堆叠                          |
| 数据     | Settings Panels              | 上限 1180；JSON 与 S3 面板按各 320 最小宽度排布；S3 地址字段按 180 最小宽度分列 |
| 日志     | Analytics + Filterable Table | 上限 1180；指标与日图 → 搜索/状态 → 分页分组记录 → 存储操作                     |

SideNav 在 `md` 以下变成带焦点管理的 MobileNav。`LayoutHeader` 与 `LayoutContent` 共享 `padding={6}`；表格的最小列宽由自身横向滚动容纳。主页面保持一个滚动内容区，页头的通用/策略提交按钮一直可达。

Section 自动延伸到父容器边缘。设置分组重新应用相同 padding；Toolbar 的 Neutral 内层 padding 用 token 工具类补偿。Heading、指标、分组和筛选栏保持一条内容基线。

## Interactions

- 概览的内容范围选择同步过滤指标、图表、周报和近期记录。读取中或读取失败时不把未知计数显示为 0；正常操作失败保留已经读取的数据。
- 查询按 NFKC 归一化、忽略大小写，多个词联合匹配。策略搜索名称和规则；日志搜索正文、作者、策略和内容 ID。
- 策略筛选保留原始优先级和完整列表索引；移动、切换、删除与保存不会丢失隐藏项。
- 日志查询或状态变化回到第一页；结果减少时分页会收敛到有效页，计数只统计当前结果。
- 搜索有原生清除按钮；无匹配结果可一次清除全部筛选。空列表继续提供相应的空状态。
- 通用设置与策略通过原生 HTML `form` 关联页头保存；字段验证、Enter 提交、忙碌状态和未保存提醒继续生效。
- Provider 和 S3 凭据保持本地存储、默认隐藏。JSON 工具在面板标题旁；Session Token 与完整同步说明按需展开。

## Motion

页面导航、数据查询、图表数据和指标即时更新。折叠、抽屉、Selector、Tooltip 和 Toast 使用 Astryx 内建行为与 Neutral motion tokens（fast 125ms，medium 300ms，标准 easing），不添加页面或表格的入场动画。策略预览继续只在显式指针重播时运行完整 veil 动效，并遵循 reduced motion。

## Verification

`bun run check` 是提交门禁。两个可选 Bun 浏览器回归见 README，使用隔离模拟存储，覆盖范围联动、完整列表优先级保存、搜索清除、状态筛选、分页重置、固定页头、窄屏、主题/语言、reduced motion 和通知重放。
