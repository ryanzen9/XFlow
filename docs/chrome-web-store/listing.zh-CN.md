# 简体中文商店文案 · XFlow 0.1.0

## 名称

XFlow

## 简短描述

Jev For your X：按自定义策略筛选并遮罩 X 时间线与评论区的内容，减少推广等干扰，打造更合心意的浏览体验。

## 详细描述

XFlow（Jev For your X）帮助你更有意识地阅读 X / Twitter。它依据你创建的过滤策略，判断首页时间线和评论区中可见的帖子；命中时以可揭示的遮罩覆盖内容，减少推广等干扰，而不删除原帖。

你可以在 OpenRouter、Vercel AI Gateway 和 TypeSafe 中选择一个 Jev Provider，并提供自己的 API Key。为了获得过滤判断，XFlow 会把待判断帖子的 ID、正文以及适用策略的名称和规则发送给当前选中的 Provider。使用 Provider 可能产生第三方费用；请求失败时不会自动转发给另一家 Provider。

你可以通过 Popup 控制首页和评论区过滤，通过 Dashboard 编辑策略、在本机预览遮罩样式、查看 Activity，并管理 Provider Key。Activity 保存在本机，也可选择同步到自己的 S3 Endpoint；Dashboard 的日志和 Activity 清理操作不会删除独立的用户反馈规则。

可选的 S3 同步允许你使用自行配置的 Endpoint，在设备间同步过滤配置、Activity 和用户反馈形成的长期规则。只有在配置 Endpoint、授予访问权限并启用同步后才会运行。同步文档不包含 Provider API Key、S3 凭据或语义向量，但可能包含策略文本、帖子预览、作者、URL、Activity 状态、规范化帖子正文、语义词、帖子及作者 ID、判断结果和设备 ID。反馈规则在 0.1.0 中不会自动过期；你可以不启用 S3 同步。

XFlow 是独立项目，与 X Corp.、OpenRouter、Vercel 或 TypeSafe 不存在隶属、认可或赞助关系。这些名称仅用于标识兼容服务。

隐私政策：https://ryanzen9.github.io/XFlow/privacy.html

## 单一用途 · Privacy practices

XFlow 根据用户创建的过滤策略，通过用户选中的 Jev Provider 判断 X / Twitter 首页时间线和评论区中可见的帖子，并为命中内容显示可揭示的遮罩。

## 0.1.0 更新说明

首次 Chrome Web Store 发布：支持首页和评论区过滤、可揭示遮罩、带本机预览的策略编辑器、Activity Dashboard、三个可选 Jev Provider，以及由用户自行配置的 S3 同步。需要 Chrome 123 或更新版本；过滤判断需要用户自己的 Provider API Key，可能产生第三方费用。

## 编辑核对

- 简短描述低于 Chrome Web Store 132 字符上限。
- 推广内容是否被遮罩取决于用户启用的策略；文案不承诺移除所有广告。
- 文案仅描述现有功能，并明确预览是本机模拟。
- 自备 Provider Key、潜在第三方费用和无官方隶属关系均已说明。
