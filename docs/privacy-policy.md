---
layout: default
title: XFlow 隐私政策
permalink: /privacy-policy/zh-CN/
---

# XFlow 隐私政策

**生效日期：2026 年 9 月 23 日**  
**适用范围：XFlow 浏览器扩展 0.1.0**  
**发布者：Ryan Zeng**

[English version](https://ryanzen9.github.io/XFlow/privacy-policy/)

XFlow 帮助你在 X / Twitter 的时间线和评论区，按自己设定的策略判断并遮蔽内容。本政策说明扩展处理哪些数据、数据流向何处，以及如何删除这些数据。XFlow 项目没有用于接收帖子内容、过滤记录或凭据的开发者服务器；扩展会按你的设置直接连接所选第三方服务。

## 处理的数据及用途

| 数据                                                          | 用途与存放位置                                                                                                                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X / Twitter 当前页面中可见的帖子 ID 和正文                    | 在你启用相应过滤范围且配置了 Provider Key 后，用于判断帖子是否符合已启用的过滤策略。扩展只处理支持的 X / Twitter 页面，不读取其他网站的浏览历史。                                            |
| 策略名称、判断规则及相关配置                                  | 用于构造判断请求并呈现结果；配置保存在浏览器本机。                                                                                                                                           |
| 过滤活动                                                      | 仅在内容实际被遮蔽后记录。包括内容 ID、最多 500 字符的正文预览、作者、X 帖子 URL、页面范围、媒体类型、过滤时间、设备标识、命中策略及揭示或误判状态（若有）。活动和累计统计保存在浏览器本机。 |
| Provider API Key                                              | 保存在浏览器扩展的 `chrome.storage.local`，用于向你选中的 Provider 鉴权。                                                                                                                    |
| S3 Endpoint、Bucket、Object Key、访问密钥和可选 Session Token | 仅在你配置 S3 同步时保存在 `chrome.storage.local`，用于向你指定的 Endpoint 签名和发送请求。                                                                                                  |
| 界面语言、主题及其他设置                                      | 用于提供扩展功能和界面；界面语言保存在本机，不进入 S3 同步文档。                                                                                                                             |

XFlow 不读取 X 登录 Cookie 或 Session，不保存页面 HTML、DOM、媒体文件或完整浏览路径。当前版本没有广告、开发者遥测或开发者分析服务。

## 数据发送给谁

**你选中的 Jev Provider。** 扩展只向当前选中的 OpenRouter、Vercel AI Gateway 或 TypeSafe 发送待判断帖子的 ID、正文、适用策略的名称与规则，以及该 Provider 的 API Key。请求用于返回过滤判断；失败时不会自动转发到另一家 Provider。Provider 及其可能使用的上游模型服务按各自条款和隐私政策处理请求。请在选择前阅读 [OpenRouter 隐私政策](https://openrouter.ai/privacy/)、[Vercel 隐私声明](https://vercel.com/legal/privacy-notice)及 [AI 产品条款](https://vercel.com/legal/ai-product-terms)，或 [TypeSafe 隐私政策](https://typesafe.ai/legal/privacy-policy)。使用 Provider 可能产生第三方费用。

**你配置的 S3 Endpoint（可选）。** 只有你在数据页配置连接、授予该 Endpoint 的访问权限并启用同步后，扩展才会向其发送或读取同步文档。文档包含过滤配置（包括策略与提示词）、活动记录及统计，因此可能包含帖子预览、作者和 X 帖子 URL。文档不包含 Provider API Key、S3 访问密钥或 Session Token。S3 签名请求的请求头会向该 Endpoint 提供 Access Key ID 和可选 Session Token；Secret Access Key 仅在本机生成签名，不直接发送。扩展会在启用时同步，并在配置变更、浏览器启动及约每 15 分钟的定时检查时尝试同步。S3 服务的存储、备份和保留规则由你选用的服务及账户设置决定。

除上述必要传输外，XFlow 项目不会将这些数据出售、用于广告，或提供给其他接收方。若你主动在公开 Issue 或支持沟通中提供信息，该沟通由相应平台处理；请勿提交密钥或敏感帖子内容。

## 保存期限与删除

- 过滤活动详情保留约 30 天；之后移除正文预览、作者、URL 和策略详情。去重所需的内容身份最多保留约 12 周，之后折叠为按设备汇总的累计计数。期限由扩展在读取或更新活动数据时执行，不代表第三方服务中的数据会同时删除。
- 在 Dashboard 的日志页选择“清理日志”，可立即移除作者、正文预览、原文链接和命中策略；内容标识、每日统计和累计数量仍会保留。若 S3 同步已启用，扩展会尝试同步这一清理状态。
- 在 Dashboard 的通用页选择“清除活动数据”，可清除本机活动详情和累计计数。若 S3 同步已启用，扩展会尝试把清除状态同步到远程文档，以防旧记录在后续同步中恢复；远程更新需要连接成功。
- 在 API Keys 页可逐个清除本机 Provider Key。清除 Key 不会撤销 Provider 账户中的密钥，你也可在对应 Provider 控制台撤销。
- 在数据页可停用自动 S3 同步。停用不会删除本机的 S3 连接配置，也不会删除已写入 S3 的对象；如需删除远程副本，请在自己的 S3 服务中删除对象，并检查该服务的版本与备份。
- 卸载扩展可通过浏览器移除本机扩展数据；Provider 和 S3 中已经处理或保存的数据需依各服务的政策和账户控制另行管理。

## 安全与权限

与 Provider 及正式使用的 S3 Endpoint 的连接使用 HTTPS。Provider Key 和 S3 凭据不会提供给 X 页面上的 Content Script，也不会写入可编辑配置 JSON 或新的 S3 同步文档。它们在 `chrome.storage.local` 中**没有额外静态加密**；能访问该浏览器配置文件的人可能获得这些本机数据。请保护浏览器配置文件、Provider 账户及 S3 凭据。

扩展访问 X / Twitter 页面是为了读取待判断内容并显示可揭示的遮罩；访问 Provider 主机是为了完成你选择的判断服务。S3 主机访问由你在保存 Endpoint 时单独授权。`storage` 权限用于保存上述本机数据；`alarms` 权限用于启用 S3 后的定时同步。

## Chrome Web Store Limited Use

XFlow 对从浏览器和 Chrome 扩展 API 获得的信息的使用遵守 [Chrome Web Store 用户数据政策的 Limited Use 要求](https://developer.chrome.com/docs/webstore/program-policies/limited-use)：只为上述面向用户的内容过滤、活动记录及用户选择的同步功能处理所需数据；只为提供这些功能而传输数据；不出售数据，不用于个性化或定向广告。XFlow 开发者默认无法读取扩展本机数据；只有在你主动提供特定内容用于支持，或法律及安全要求等政策允许的情况下，才可能由人员查看你提供的数据。

## 变更与联系

如数据处理方式有重大变化，项目会更新本政策并在扩展界面或发布说明中提示。政策版本以本页顶部的生效日期为准。

关于隐私、数据删除或本政策的问题，请发送邮件至 [ry4nzeng@gmail.com](mailto:ry4nzeng@gmail.com)，也可通过 [XFlow GitHub Issues](https://github.com/ryanzen9/XFlow/issues) 联系项目维护者。请勿在公开 Issue 中发送密钥或敏感内容。
