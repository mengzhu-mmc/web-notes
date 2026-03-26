# HTML & CSS 高频面试题

---

## HTML 高频题

### Q1：语义化标签有哪些？为什么要用语义化标签？

**常见语义化标签：**
`<header>` 页头、`<nav>` 导航、`<main>` 主内容、`<article>` 文章、`<section>` 区块、`<aside>` 侧边栏、`<footer>` 页脚、`<figure>` 图文组合、`<time>` 时间

**为什么用：**
1. **SEO**：搜索引擎能更好地理解页面结构和内容权重
2. **无障碍（a11y）**：屏幕阅读器依赖语义化标签辅助盲人用户
3. **可维护性**：代码可读性更高，团队协作更清晰
4. **浏览器默认样式**：部分语义标签有合适的默认样式

---

### Q2：`src` 和 `href` 的区别？

| 属性 | 用途 | 加载行为 |
|------|------|---------|
| `src` | 引入资源（img、script、iframe） | **阻塞**解析，替换当前元素 |
| `href` | 建立关联（link、a） | **并行**加载，不阻塞解析 |

`<script src>` 会阻塞 HTML 解析（所以推荐放 body 底部或加 `async/defer`）。
`<link href>` 加载 CSS 不阻塞 HTML 解析，但会阻塞渲染（CSSOM 构建完才渲染）。

---

### Q3：`script` 标签的 `async` 和 `defer` 区别？

```
普通 script：  ──HTML解析── | 暂停 | ──下载+执行── | ──继续解析──
async script：  ──HTML解析──（并行下载） | 暂停 | ──执行── | ──继续解析──
defer script：  ──HTML解析──（并行下载）─────────── | ──执行──（HTML解析完后）
```

| | async | defer |
|--|-------|-------|
| 下载时机 | 并行下载 | 并行下载 |
| 执行时机 | 下载完立即执行（不保证顺序） | HTML解析完后按顺序执行 |
| 适用场景 | 独立脚本（统计、广告） | 依赖 DOM 或有执行顺序的脚本 |

---

### Q4：`meta` 标签有哪些常见用途？

```html
<!-- 字符编码 -->
<meta charset="UTF-8">

<!-- 移动端视口 -->
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- SEO 描述 -->
<meta name="description" content="页面描述">
<meta name="keywords" content="关键词1,关键词2">

<!-- 禁止搜索引擎索引 -->
<meta name="robots" content="noindex, nofollow">

<!-- HTTP 等效（设置缓存控制） -->
<meta http-equiv="Cache-Control" content="no-cache">

<!-- 刷新/跳转 -->
<meta http-equiv="refresh" content="5;url=https://example.com">

<!-- Open Graph（社交分享卡片） -->
<meta property="og:title" content="标题">
<meta property="og:image" content="图片URL">
```

---

### Q5：`iframe` 的使用场景和缺点？

**场景**：嵌入第三方内容（地图、视频、支付弹窗）、沙箱隔离、微前端（qiankun 基座）

**缺点**：
1. 阻塞父页面的 onload 事件
2. 无法被搜索引擎抓取（SEO 不友好）
3. 与父页面通信麻烦（需 `postMessage`）
4. 安全性问题（需配合 `sandbox` 属性限制）

---

### Q6：如何理解 HTML 的块级元素和行内元素？

| | 块级元素 | 行内元素 | 行内块元素 |
|--|---------|---------|----------|
| 示例 | div、p、h1-h6、ul、li | span、a、em、strong | img、input、button |
| 宽度 | 默认撑满父元素 | 由内容决定 | 由内容决定 |
| 设置宽高 | ✅ | ❌ | ✅ |
| 换行 | 独占一行 | 不换行 | 不换行 |
| margin/padding | 上下左右均有效 | 左右有效，上下无效 | 均有效 |

---

## CSS 高频题

### Q7：说说 CSS 优先级计算规则

权重从高到低：

| 选择器类型 | 权重值 |
|-----------|--------|
| `!important` | 最高（覆盖一切） |
| 内联样式 `style=""` | 1-0-0-0 |
| ID 选择器 `#id` | 0-1-0-0 |
| 类/伪类/属性 `.class` `:hover` `[attr]` | 0-0-1-0 |
| 标签/伪元素 `div` `::before` | 0-0-0-1 |
| 通配符 `*`、关系符 `>`、`+`、`~` | 0-0-0-0 |

**计算规则**：统计各类选择器数量，按位比较，高位优先。  
例：`#nav .item span` = 0-1-1-1，`#nav #title` = 0-2-0-0，后者更高。

**同等优先级**：后声明的覆盖先声明的（层叠顺序）。

---

### Q8：BFC 是什么？怎么触发？有什么用？

**BFC（块格式化上下文）**：一块独立的渲染区域，内部布局不影响外部，外部也不影响内部。

**触发条件（任一即可）：**
- `overflow` 不为 `visible`（`hidden`、`auto`、`scroll`）
- `float` 不为 `none`
- `position` 为 `absolute` 或 `fixed`
- `display` 为 `flex`、`grid`、`inline-block`、`table-cell`

**作用：**
1. **清除浮动**：子元素浮动导致父元素高度塌陷 → 父元素触发 BFC
2. **阻止外边距折叠**：两个 BFC 之间的 margin 不会合并
3. **防止文字环绕浮动元素**：BFC 区域不会与浮动元素重叠

---

### Q9：说说 Flex 布局中 `flex: 1` 是什么意思？

`flex: 1` 是 `flex: 1 1 0%` 的简写：
- `flex-grow: 1`：有剩余空间时等比放大
- `flex-shrink: 1`：空间不足时可以缩小
- `flex-basis: 0%`：初始大小为 0，完全由剩余空间分配

**使用场景**：让多个子项等分父容器的宽度。

**vs `flex: auto`（`flex: 1 1 auto`）**：auto 的基准是内容本身的宽度，内容多的子项会占更多空间，不是等分。

---

### Q10：CSS 实现水平垂直居中有哪些方法？（见 `居中方案大全.md`）

常用回答顺序：
1. **Flex**：`display: flex; justify-content: center; align-items: center`（首选）
2. **Grid**：`display: grid; place-items: center`
3. **absolute + transform**：`top: 50%; left: 50%; transform: translate(-50%, -50%)`（宽高未知时）
4. **absolute + margin: auto**：四个方向设 0，宽高已知（经典方案）

---

### Q11：移动端 1px 问题是什么？怎么解决？（见 `移动端适配与1px问题.md`）

**原因**：高清屏 DPR > 1，CSS `1px` 对应多个物理像素，显示比设计稿粗。

**最优解**：伪元素 + `transform: scale(0.5)`

```css
.item::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 100%; height: 1px;
  background: #e5e5e5;
  transform: scaleY(0.5);
  transform-origin: 0 0;
}
```

---

### Q12：`position` 有哪些值？`sticky` 是怎么工作的？

| 值 | 相对于 | 脱离文档流 |
|----|--------|-----------|
| `static` | 正常流（默认） | ❌ |
| `relative` | 自身原始位置 | ❌ |
| `absolute` | 最近的非 static 祖先 | ✅ |
| `fixed` | 视口（viewport） | ✅ |
| `sticky` | 滚动容器 | ❌（在两者之间切换） |

**sticky 工作原理**：  
元素在正常流中，滚动到阈值（如 `top: 0`）时"粘住"，像 fixed；离开父容器范围时恢复正常流。  
⚠️ 父元素不能有 `overflow: hidden/auto`，否则 sticky 失效。

---

### Q13：`display: none`、`visibility: hidden`、`opacity: 0` 的区别？

| | display: none | visibility: hidden | opacity: 0 |
|-|:---:|:---:|:---:|
| 占据空间 | ❌ | ✅ | ✅ |
| 响应事件 | ❌ | ❌ | ✅（能点击！） |
| 触发重排 | ✅（移除/添加） | ❌ | ❌ |
| 子元素继承 | - | 可用 `visible` 覆盖 | 不可覆盖 |
| transition | ❌ 不支持动画 | ✅ | ✅ |

---

### Q14：重排（reflow）和重绘（repaint）的区别？如何避免？

**重排**：元素的几何信息变化（位置、尺寸），需要重新计算布局，性能开销大。  
**重绘**：只是视觉样式变化（颜色、背景），不影响布局，开销小。  
**重排一定触发重绘，重绘不一定触发重排。**

**触发重排的操作**：改变宽高、位置、字体大小、读取 `offsetWidth`/`scrollTop` 等（强制同步布局）。

**避免重排的技巧**：
- 批量修改样式（用 class 替代逐条 style 修改）
- 使用 `transform` 替代 `top/left`（不触发重排，走合成层）
- 脱离文档流后再操作（absolute/fragment）
- `requestAnimationFrame` 批量读写

---

### Q15：说说 CSS 预处理器（Less/Sass）和 PostCSS 的区别？

| | CSS 预处理器（Less/Sass） | PostCSS |
|-|--------------------------|---------|
| 阶段 | 编译前处理（写的时候） | 编译后处理（输出前） |
| 功能 | 变量、嵌套、混入、继承 | 自动前缀、px转vw、CSS新特性降级 |
| 思路 | 扩展 CSS 语法 | 插件化转换 CSS AST |
| 常见工具 | Sass/Less/Stylus | Autoprefixer/postcss-px-to-viewport |

它们可以同时使用：先用 Sass 写，再用 PostCSS 处理输出。

---

### Q16：`Grid` 和 `Flex` 如何选择？

| | Flex | Grid |
|-|------|------|
| 维度 | 一维（行或列） | 二维（行和列同时） |
| 适用 | 导航栏、工具栏、卡片列表 | 复杂页面布局、仪表盘 |
| 子项控制 | 子项控制自身排列 | 父容器定义区域，子项填入 |
| 兼容性 | IE11+ | IE10（有限支持） |

**经验**：组件内部对齐用 Flex；页面级布局用 Grid；两者经常配合使用。

---

### Q17：`em`、`rem`、`vw`、`%` 的区别？

| 单位 | 相对于 |
|------|--------|
| `em` | 当前元素的 `font-size`（嵌套会累乘！） |
| `rem` | 根元素（`html`）的 `font-size` |
| `vw` | 视口宽度的 1% |
| `vh` | 视口高度的 1% |
| `%` | 父元素对应属性的百分比（`width %` 相对父宽，`line-height %` 相对自身 font-size） |
| `px` | 绝对单位（CSS 像素） |

**`em` 陷阱**：`font-size: 1.2em` 嵌套三层后变成 `1.2³ = 1.728x`，rem 不会有这个问题。

---

### Q18：CSS 动画 `transition` 和 `animation` 的区别？

| | transition | animation |
|-|-----------|-----------|
| 触发方式 | 需要状态变化触发（hover、class切换） | 可自动播放 |
| 关键帧 | 只有开始和结束两帧 | 可定义多个关键帧（@keyframes） |
| 循环 | 不能循环 | 可以循环（`animation-iteration-count`） |
| 控制粒度 | 简单 | 细粒度控制（暂停、延迟、步进） |
| 性能 | `transform`/`opacity` 走合成层，性能好 | 同上 |

**性能优化**：优先用 `transform`（translate/scale/rotate）和 `opacity` 做动画，不触发重排。
