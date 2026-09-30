# 简体中文商店文案 · XFlow 0.1.0

## 名称

XFlow

## 简短描述

Jev For your X：用自定义策略过滤 X 时间线与评论区的广告及其他不想看的内容。

## 详细描述

XFlow（Jev For your X）帮助你过滤 X / Twitter 首页时间线与评论区中的广告、推广及其他不想看的内容。默认策略识别推广和垃圾信息；你也可以为不同区域自定义规则、阈值和优先级。命中的帖子可以随时重新显示。

你可以在 OpenRouter、Vercel AI Gateway 和 TypeSafe 中选择一个 Jev Provider，并提供自己的 API Key。为了获得过滤判断，XFlow 会把待判断帖子的 ID、正文以及适用策略的名称和规则发送给当前选中的 Provider。使用 Provider 可能产生第三方费用；请求失败时不会自动转发给另一家 Provider。

你可以通过 Popup 控制首页和评论区过滤，通过 Dashboard 编辑策略、在本机预览过滤结果的呈现方式、查看 Activity，并管理 Provider Key。Activity 保存在本机，也可选择同步到自己的 S3 Endpoint；Dashboard 的日志和 Activity 清理操作不会删除独立的用户反馈规则。

可选的 S3 同步允许你使用自行配置的 Endpoint，在设备间同步过滤配置、Activity 和用户反馈形成的长期规则。只有在配置 Endpoint、授予访问权限并启用同步后才会运行。同步文档不包含 Provider API Key、S3 凭据或语义向量，但可能包含策略文本、帖子预览、作者、URL、Activity 状态、规范化帖子正文、语义词、帖子及作者 ID、判断结果和设备 ID。反馈规则在 0.1.0 中不会自动过期；你可以不启用 S3 同步。

XFlow 是独立项目，与 X Corp.、OpenRouter、Vercel 或 TypeSafe 不存在隶属、认可或赞助关系。这些名称仅用于标识兼容服务。

隐私政策：https://ryanzen9.github.io/XFlow/privacy.html

## 单一用途 · Privacy practices

XFlow 使用可配置的过滤策略和用户选中的 Jev Provider，过滤 X / Twitter 首页时间线与评论区中的广告、推广及其他不想看的帖子；用户可随时重新显示命中的内容。

## 0.1.0 更新说明

首次 Chrome Web Store 发布：支持广告和推广内容过滤、可自定义的首页与评论区策略、本机结果预览、Activity Dashboard、三个可选 Jev Provider，以及由用户自行配置的 S3 同步。命中内容可重新显示。需要 Chrome 123 或更新版本；过滤判断需要用户自己的 Provider API Key，可能产生第三方费用。

## 编辑核对

- 简短描述低于 Chrome Web Store 132 字符上限。
- 广告是否命中取决于用户启用的策略；文案不承诺移除所有广告。
- 文案仅描述现有功能，并明确预览是本机模拟。
- 自备 Provider Key、潜在第三方费用和无官方隶属关系均已说明。
