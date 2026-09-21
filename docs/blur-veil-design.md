# Blur Veil 交互与状态机设计

## 1. 核心设计原则

过滤后的 Post 不消失、不折叠、不改变尺寸。

原始 Post：

```text
┌────────────────────────────────────┐
│ Avatar  Username @user             │
│                                    │
│ Post content                       │
│                                    │
│ Image / Video                      │
│                                    │
│ Reply  Repost  Like  Views         │
└────────────────────────────────────┘
```

过滤后仍然保持：

```text
┌────────────────────────────────────┐
│                                    │
│       原 Post 保持原始尺寸          │
│       但内容被柔和模糊              │
│                                    │
│          Filtered                  │
│        Click to reveal             │
│                                    │
└────────────────────────────────────┘
```

因此整个 Timeline 的几何结构完全不变化。

用户不会遇到：

```text
Post 突然缩短
Post 消失
页面向上跳动
滚动位置改变
```

过滤只发生在视觉层。

---

# 2. 最终视觉概念

整个效果可以理解成：

> 在原 Post 上缓慢覆盖一层半透明的磨砂玻璃。

不是：

```text
Post → blur()
```

简单粗暴地瞬间模糊。

而是：

```text
原 Post
↓
轻微降低对比度
↓
模糊逐渐增强
↓
覆盖一层与 X 背景协调的 translucent veil
↓
中央出现极弱的 Filtered 提示
```

最终形成：

```text
┌────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░ 原内容仍存在，但不可读 ░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                    │
│            Filtered                │
│          Show post                 │
│                                    │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└────────────────────────────────────┘
```

重点是：

> 用户知道这里存在一条 Post，但视觉注意力不会被其内容吸引。

---

# 3. 状态机重新设计

建议状态：

```text
Idle
  ↓
Classifying
  ├──────────────→ Visible
  │
  └──────────────→ Obscuring
                       ↓
                    Obscured
                       ↓
                 Revealing
                       ↓
                    Revealed
                       ↓
                 Reobscuring
                       ↓
                    Obscured
```

完整定义：

```text
Idle
Classifying
Visible
Obscuring
Obscured
Revealing
Revealed
Reobscuring
```

这里不再存在：

```text
Collapsing
Collapsed
```

因为布局永远不变化。

---

# 4. Idle

Post 刚出现。

UI：

完全保持 X 原生状态。

```text
opacity      1
blur         0
overlay      0
scale        1
height       unchanged
```

不出现：

```text
Analyzing
Loading
Spinner
AI
```

---

# 5. Classifying

正在进行分类。

视觉上默认仍然完全正常。

```text
Post
↓
正常展示
↓
后台完成判断
```

不建议在这个阶段预模糊。

否则所有 Post 都会产生轻微：

```text
清晰 → 清晰
```

或：

```text
半透明 → 恢复
```

这种无意义动画。

因此：

```text
Classifying ≈ Visible
```

用户无感。

---

# 6. Visible

分类结果未达到过滤阈值。

Post 完全保持原状。

扩展不留下：

```text
Safe
Not spam
Checked
AI verified
```

任何视觉痕迹。

---

# 7. Obscuring

这是最重要的状态。

当 Post 被判断需要过滤后，不立即：

```text
filter: blur(12px)
```

而是进行一个渐进式视觉退出过程。

建议总时长：

```text
280–380ms
```

分三个同步阶段。

---

# 8. Obscuring 第一阶段：对比度降低

前约：

```text
0–120ms
```

变化：

```text
contrast: 1 → 0.85
saturate: 1 → 0.8
opacity: 1 → 0.92
```

Blur 此时非常弱：

```text
blur: 0 → 2px
```

用户感受到的是：

> 内容开始退到背景。

而不是突然失焦。

---

# 9. Obscuring 第二阶段：Blur 增强

约：

```text
80–280ms
```

Blur 平滑增加：

```text
2px
↓
4px
↓
8px
↓
12px
```

最终建议：

```text
blur(10px ~ 14px)
```

根据 X 当前字号，一般 12px 左右已经足够让文字不可直接阅读。

同时：

```text
opacity: 0.92 → 0.78
contrast: 0.85 → 0.7
```

但不要让 Post 彻底消失。

仍然应该能大致辨认：

```text
头像位置
图片结构
文字区域
Action Bar
```

只是无法轻易阅读内容。

---

# 10. Obscuring 第三阶段：Veil 淡入

与此同时，在整个 Post 上方出现一层透明遮罩：

```text
overlay opacity:
0 → 1
```

遮罩本身不是纯白或纯黑。

它应该继承 X 当前背景。

例如视觉关系：

```text
Light Mode
→ translucent white / neutral

Dim
→ translucent dark blue-gray

Lights Out
→ translucent black
```

遮罩建议有：

```text
backdrop feeling
```

但不要做成明显玻璃卡片。

没有：

```text
border
box-shadow
border-radius
```

因为它仍然属于原 Post。

---

# 11. Obscuring 的动画节奏

整个效果：

```text
0ms
Post 完全正常

60ms
内容对比度开始下降

120ms
出现轻微 Blur

200ms
Blur 明显增强

280ms
内容已经基本不可阅读

320ms
Veil 完全稳定

340ms
Filtered UI 淡入完成
```

最终约：

```text
320–380ms
```

结束。

---

# 12. Obscured

稳定过滤状态。

原 Post：

```text
尺寸不变
位置不变
内容不变
DOM 不变
```

只是视觉上：

```text
blurred
dimmed
veiled
```

推荐效果：

```text
content blur       12px
content opacity    0.75~0.82
contrast           0.65~0.75
saturation         0.7~0.85
veil opacity       根据主题动态决定
```

---

# 13. 中央提示 UI

过滤后的 Post 中央可以出现极轻的交互层。

推荐：

```text
Filtered

Show post
```

或者更简洁：

```text
Filtered · Show
```

对于 X 风格，我更推荐单行：

```text
Filtered post · Show
```

不要做成按钮卡片。

不要：

```text
[ SHOW POST ]
```

也不要：

```text
⚠ Spam detected
```

推荐视觉：

```text
Filtered post
Show
```

其中：

```text
Filtered post
→ secondary text

Show
→ primary / X accent interaction color
```

---

# 14. 提示 UI 的位置

不建议绝对居中整个 Post。

因为某些 Post 很高：

```text
长图
视频
长文本
```

用户可能要滚动才能找到按钮。

更推荐固定在当前 Post 可视区域附近。

但如果只考虑最简单、自然的版本：

> 放在 Post 内容区域中央偏上。

例如：

```text
约 Post 高度 40% 位置
```

这样不会挡住 Action Bar，也不会过度靠近用户名。

---

# 15. Hover 状态

Obscured 状态下，用户把鼠标移到 Post：

Veil 可以轻微减弱：

```text
veil opacity
100% → 90%
```

Blur 基本不变。

同时 Show 的可见度增强：

```text
opacity:
0.75 → 1
```

可出现：

```text
Likely spam · Show
```

如果启用高级信息：

```text
Likely spam · 98% · Show
```

但概率默认不展示。

---

# 16. 不建议 Hover 自动揭示内容

不要：

```text
鼠标移上去
→ blur 自动消失
```

因为用户很容易只是移动鼠标经过。

这会导致：

```text
内容不断清晰/模糊
```

造成视觉闪烁。

应该要求明确交互：

```text
点击 Show
```

---

# 17. Revealing

用户点击：

```text
Show
```

进入 Revealing。

动画必须与 Obscuring 高度对称。

不是突然：

```text
blur(12px) → blur(0)
```

而是：

```text
Veil Fade Out
+
Blur Fade Out
+
Contrast Restore
```

建议：

```text
280–380ms
```

---

# 18. Revealing 第一阶段：提示 UI 消失

点击后：

```text
Filtered post · Show
```

先淡出。

时间：

```text
80–120ms
```

这可以避免：

```text
文字一直浮在逐渐清晰的 Post 上
```

---

# 19. Revealing 第二阶段：Veil 退场

遮罩：

```text
opacity 1 → 0
```

约：

```text
180–260ms
```

并与 Blur 同时开始减弱。

效果像：

> 磨砂玻璃逐渐变透明。

---

# 20. Revealing 第三阶段：Blur 对称解除

Blur：

```text
12px
↓
8px
↓
4px
↓
2px
↓
0
```

同时：

```text
contrast:
0.7 → 1

saturation:
0.8 → 1

opacity:
0.8 → 1
```

最终：

```text
完全恢复原 Post
```

---

# 21. Reveal 时间线

例如：

```text
0ms
用户点击 Show

80ms
Filtered UI 基本消失

120ms
Veil 开始明显透明

200ms
Blur 12px → 6px

280ms
Blur 6px → 2px

340ms
Blur = 0

360ms
完全恢复
```

整体与隐藏动画形成视觉对称。

---

# 22. Revealed

恢复后：

```text
原始 Post 100% 保留
```

没有任何：

```text
Previously filtered
AI revealed
Spam 98%
```

用户现在拥有查看权。

本次生命周期内默认：

```text
不再次自动模糊
```

---

# 23. Revealed 状态是否允许重新隐藏

这里建议提供一种很轻的入口。

例如鼠标 Hover Post 的右上角或扩展菜单时：

```text
Hide again
```

用户点击后：

```text
Revealed
↓
Reobscuring
↓
Obscured
```

但不建议在 Post 正文上常驻一个：

```text
Hide
```

按钮。

否则普通浏览会增加视觉噪音。

---

# 24. Reobscuring

这是 Reveal 的反向状态。

用户主动：

```text
Hide again
```

后：

```text
原内容
↓
Blur 渐入
↓
Veil 渐入
↓
Filtered UI 出现
```

可以使用与第一次 Obscuring 相同的动效。

---

# 25. 点击整个遮罩还是点击 Show

推荐：

```text
整个 Post 的 Veil 都可以点击 Reveal
```

同时视觉上保留：

```text
Show post
```

提示。

原因是命中区域更大。

用户不用精准点击文字。

行为：

```text
Click anywhere on veil
→ Reveal
```

但是：

```text
Post 原始按钮在 Obscured 状态下不可操作
```

否则用户可能：

```text
看不清内容
但误点 Like / Repost
```

---

# 26. Obscured 状态下的原始交互

应该暂时阻止：

```text
Like
Reply
Repost
Bookmark
Media click
Link click
Profile click
```

因为视觉层已经告诉用户：

> 当前内容处于隐藏状态。

第一层点击应该始终是：

```text
Reveal
```

Reveal 后：

```text
原始 Post 所有交互恢复
```

---

# 27. 媒体内容

图片、视频同样参与 Blur。

例如：

```text
文字
图片
头像
用户名
Action Bar
```

全部进入统一视觉遮罩。

但建议：

```text
Post 外边框
Timeline 分隔线
```

不要 Blur。

这样页面结构仍然清晰。

---

# 28. Avatar 是否模糊

建议模糊。

否则用户仍可能通过：

```text
Avatar
Username
```

快速识别并产生注意力。

但如果你希望过滤只针对内容而非作者，可以配置为：

```text
Header 保持清晰
Body + Media 模糊
```

我更推荐第一版：

> 整个 Post 内容区域统一处理。

视觉更完整。

---

# 29. Action Bar

Reply / Like / Repost 也建议一起：

```text
降低 opacity
+
Blur
```

否则底部图标仍然显得像可操作区域。

整个 Post 应该作为一个统一状态：

```text
Obscured
```

而不是：

```text
内容模糊
按钮正常
```

---

# 30. 不改变 Post 高度

这是整个设计的硬约束。

以下任何状态：

```text
Idle
Classifying
Visible
Obscuring
Obscured
Revealing
Revealed
```

都必须满足：

```text
height = original height
width = original width
layout position = unchanged
```

因此：

```text
Timeline scroll position
```

不会因为过滤产生变化。

---

# 31. 多条连续垃圾内容

例如：

```text
Spam Post A
Spam Post B
Spam Post C
Normal Post D
```

最终：

```text
┌────────────────────────────┐
│ blurred                    │
│ Filtered post · Show       │
└────────────────────────────┘

┌────────────────────────────┐
│ blurred                    │
│ Filtered post · Show       │
└────────────────────────────┘

┌────────────────────────────┐
│ blurred                    │
│ Filtered post · Show       │
└────────────────────────────┘

Normal Post D
```

虽然占用空间没有减少，但视觉信息密度显著降低。

这与 Collapse 方案目标不同：

```text
Collapse
→ 节省空间

Blur Veil
→ 保持空间，降低注意力
```

这是你现在选择的核心产品取舍。

---

# 32. 为什么这种方案适合 X

它解决了三个主要问题。

第一：

```text
无 Layout Shift
```

Timeline 不跳。

第二：

```text
Context 保留
```

用户仍能知道：

> 原本这里存在一条 Post。

第三：

```text
Reveal 自然
```

不需要重新插入 DOM，也不需要重新恢复组件尺寸。

只是视觉状态变化。

---

# 33. Filter Confidence 与视觉强度

不建议让：

```text
spamProbability
```

直接控制 Blur 数值。

比如：

```text
0.81 → blur 6px
0.92 → blur 10px
0.99 → blur 16px
```

这种设计会产生大量不同视觉状态。

最终 Timeline 看起来不统一。

推荐：

```text
低于 threshold
→ Visible

高于 threshold
→ 统一 Obscured
```

概率只决定：

```text
是否触发过滤
```

不决定：

```text
模糊多少
```

---

# 34. 可选的两级遮罩

如果确实需要体现不确定程度，可以只有两个等级。

例如：

```text
0.80–0.95
Soft Obscure

>= 0.95
Full Obscure
```

Soft：

```text
blur 8px
veil 较弱
```

Full：

```text
blur 12px
veil 较强
```

但我仍然建议第一版全部统一。

---

# 35. 高速滚动

如果用户快速滚动：

动画不能成为性能负担。

体验上可以：

```text
高速滚动
→ 已过滤 Post 直接进入接近 Obscured 的状态
```

减少完整过渡。

用户停止滚动后，新触发的过滤恢复完整动画。

避免：

```text
十几条 Post 同时执行复杂 Blur 动画
```

造成明显视觉波动。

---

# 36. 用户正在阅读时

如果一条 Post 已经处于：

```text
视口中央
```

且停留了一段时间，随后模型才返回 Spam：

不建议立刻完整 Blur。

因为效果会变成：

```text
用户正在读
↓
内容突然看不清
```

这是非常强的打断。

推荐规则：

```text
如果 Post 已经处于 active reading zone
→ 延迟进入 Obscuring
```

例如等：

```text
Post 离开视口中心
```

再模糊。

或者只在顶部出现非常弱的状态提示：

```text
Likely spam
```

不立即遮挡。

---

# 37. 预分析成功的最佳体验

理想情况是：

```text
Post 尚未进入主要视口
↓
Jev 已返回
↓
Post 已进入 Obscured
↓
用户滚到它
```

用户第一次看到的就是：

```text
Blurred Post
```

完全没有：

```text
清晰
↓
突然模糊
```

这是最终应该优先追求的体验。

---

# 38. Error / Timeout

如果 Jev 请求失败：

```text
Visible
```

如果 Timeout：

```text
Visible
```

不显示：

```text
AI unavailable
Failed to classify
Retry
```

原则仍然是：

```text
Fail open
```

模型不可用不能影响正常浏览。

---

# 39. Reduced Motion

Reduced Motion 模式下：

不要完全取消 Blur Filter。

因为 Blur 本身不是“运动”，而是内容状态。

只减少 transition。

例如：

```text
Visible
↓
120ms
Obscured
```

Reveal：

```text
Obscured
↓
120ms
Visible
```

去掉复杂的分阶段动画。

---

# 40. Light / Dim / Lights Out

Blur 强度可以一致。

变化主要发生在 Veil。

Light：

```text
浅色透明 Veil
```

Dim：

```text
蓝灰色透明 Veil
```

Lights Out：

```text
黑色透明 Veil
```

最终效果应该像：

> X 自己在当前主题上盖了一层原生的隐私遮罩。

---

# 41. 鼠标指针反馈

Obscured 状态：

```text
cursor: pointer
```

因为整块 Post 可以 Reveal。

Hover 时：

```text
Veil 稍微减弱
Show post 稍微增强
```

这是唯一需要的交互反馈。

---

# 42. Reveal 后鼠标位置

用户点击中央 Reveal 后：

不要导致：

```text
鼠标当前位置立刻触发底下的 Like / Link
```

Reveal 这一次点击只负责：

```text
Reveal
```

不能穿透给原 Post。

用户需要第二次点击才能操作原内容。

这是很重要的交互保护。

---

# 43. 建议最终文案

默认状态：

```text
Filtered post
Show
```

或者：

```text
Likely spam
Show post
```

我更推荐：

```text
Filtered post
Show
```

原因是它最中性。

不要直接写：

```text
Spam
```

除非判断已经非常确定。

---

# 44. 高级模式

如果用户打开：

```text
Show filter details
```

可以变成：

```text
Likely spam · 98%
Show post
```

或者：

```text
Engagement bait · 94%
Show
```

但这些都不应该是默认体验。

---

# 45. 最终状态视觉总结

## Visible

```text
┌────────────────────────────────────┐
│ 原始 X Post                        │
└────────────────────────────────────┘
```

---

## Obscuring

```text
┌────────────────────────────────────┐
│ 原始 Post                          │
│       ↓ contrast                   │
│       ↓ saturation                 │
│       ↑ blur                       │
│       ↑ veil                       │
└────────────────────────────────────┘
```

---

## Obscured

```text
┌────────────────────────────────────┐
│ ░░░░░░░ blurred content ░░░░░░░░ │
│                                    │
│          Filtered post             │
│              Show                  │
│                                    │
│ ░░░░░░░ blurred content ░░░░░░░░ │
└────────────────────────────────────┘
```

---

## Revealing

```text
┌────────────────────────────────────┐
│ veil ↓                             │
│ blur ↓                             │
│ contrast ↑                         │
│ saturation ↑                       │
└────────────────────────────────────┘
```

---

## Revealed

```text
┌────────────────────────────────────┐
│ 原始 X Post                        │
└────────────────────────────────────┘
```

---

# 46. 最终动画时间

隐藏：

```text
Contrast/Saturation shift
0–180ms

Blur
40–320ms

Veil
60–320ms

Filtered UI
180–360ms
```

总时长：

```text
约 320–380ms
```

显示：

```text
Filtered UI fade out
0–100ms

Veil fade out
40–280ms

Blur fade out
40–340ms

Contrast restore
80–340ms
```

总时长：

```text
约 300–360ms
```

两者体感保持对称。

---

# 47. 最终产品体验

完整生命周期：

```text
用户滚动 X

↓
Post 正常出现

↓
后台分类

├─ 正常
│    ↓
│  什么都不发生
│
└─ 命中过滤
     ↓
   内容逐渐失焦
     ↓
   Veil 自然覆盖
     ↓
   Filtered post / Show
     ↓
   用户点击
     ↓
   Veil 退去
     ↓
   Blur 平滑解除
     ↓
   原 Post 完全恢复
```

整个过程中：

```text
Post 高度不变
Post 宽度不变
Post 内容不变
Timeline 位置不变
DOM 内容不被替换
```

变化的只有：

```text
视觉可读性
视觉权重
交互可达性
```

最终目标不是“隐藏一条 Post”。

而是：

> 让不需要的信息优雅地退出注意力中心，同时始终保留用户主动查看它的能力。
