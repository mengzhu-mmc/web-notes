> ⚠️ 已蒸馏至正式笔记，此文件归档备用。

# 豆包对话提取 - 浏览器与工程化

> 来源：豆包历史对话，提取时间：2026-03-17

---

## Webpack打包流程

### 核心知识点
- Webpack 打包是一个从配置读取到文件输出的完整流程
- 核心对象：`Compiler`（控制全局流程）
- 插件通过 Tapable 钩子在各阶段介入

### 打包流程（8步）

1. **合并配置**：读取 `webpack.config.js` 和命令行参数，生成最终配置
2. **创建编译对象**：初始化 `Compiler` 核心对象，加载插件，准备开始编译
3. **从入口开始解析**：根据 `entry` 找到入口文件，开始构建依赖图谱
4. **Loader 编译模块**：对 JS、CSS、图片等模块依次使用对应 loader 转译
5. **递归解析所有依赖**：深度遍历 `import/require`，把所有依赖模块都处理一遍
6. **生成 Chunk 代码块**：根据入口和依赖关系，把模块分组打包成若干 Chunk
7. **插件执行优化**：插件在编译各阶段介入，做压缩、提取、优化等工作
8. **输出到文件系统**：按 `output` 配置，把最终 bundle 写入指定目录

### 极简流程图
```
初始化参数 → 创建 Compiler → 确定入口 → Loader 编译模块
→ 递归解析依赖 → 生成 Chunk → 插件优化 → 输出 bundle
```

### 面试要点
- 核心是构建**依赖图谱**，从入口递归解析所有依赖
- Loader：转译单个模块（文件级别）
- Plugin：在编译生命周期各阶段钩入做扩展（全局级别）
- 最耗时步骤：递归解析依赖 + Loader 编译

---

## WebSocket 介绍及应用场景

### 核心知识点
- WebSocket 是基于 TCP 的**全双工、持久化**网络通信协议
- 解决 HTTP 无法服务端主动推送、每次请求重建连接的痛点
- 通过 HTTP 101 握手后切换协议，之后不再遵循 HTTP 请求-响应规则

### 与 HTTP 核心差异
| 特性 | HTTP | WebSocket |
|------|------|-----------|
| 通信模式 | 半双工（请求-响应） | 全双工（双向实时） |
| 连接状态 | 无状态（每次独立） | 有状态（持久连接） |
| 服务端主动性 | 无法主动推送 | 可主动推送 |
| 连接开销 | 每次请求建立/断开 | 仅一次握手 |
| 头部开销 | 较大 | 极小 |

### 握手流程
1. 客户端发送 HTTP GET 请求，携带 `Upgrade: websocket`
2. 服务端返回 `101 Switching Protocols`
3. 协议切换成功，开始全双工通信

### 典型使用场景
- **即时通信**：在线聊天、直播弹幕、在线客服
- **实时数据推送**：股票行情、设备监控、赛事比分
- **在线协作**：腾讯文档、Figma（协同文档/设计）
- **实时游戏**：网页对战游戏
- **直播辅助**：礼物推送、在线人数（视频流本身用 HLS/FLV）

### 替代方案对比
| 方案 | 通信模式 | 实时性 | 适用场景 |
|------|---------|--------|---------|
| WebSocket | 全双工 | 极高 | 双向实时交互 |
| SSE | 单向（服务端推） | 较高 | 仅服务端推送（行情/监控） |
| 长轮询 | 半双工 | 中等 | 老旧系统兼容 |
| 普通轮询 | 半双工 | 低 | 低实时性简单场景 |

### TCP 对 WebSocket 实时性的影响
- TCP 拥塞控制：拥塞时收缩发送窗口，导致实时数据延迟积压
- Nagle 算法：将小数据包攒成大包发送，导致 200ms 延迟
- **优化方案**：`TCP_NODELAY` 禁用 Nagle 算法

```js
// Node.js（ws 库）禁用 Nagle
wss.on('connection', (ws) => {
  ws._socket.setNoDelay(true);
});
```

### 面试要点
- WebSocket 基于 TCP 而非 UDP，因为核心场景需要**可靠传输**
- 在线协作传输的是极小操作指令（几十字节），不是全量文档
- 直播画面用 FLV/HLS 或 WebRTC，互动（弹幕/礼物）用 WebSocket

---

## express与Cache-Control的关系

### 核心知识点
- **express 本身不自带任何缓存策略**，只负责提供静态文件
- `Cache-Control` 才是真正控制浏览器强缓存的 HTTP 响应头
- express 的静态文件服务，内部自动生成 Cache-Control 头

### 强缓存：Expires vs Cache-Control

| 特性 | Expires（HTTP/1.0） | Cache-Control（HTTP/1.1） |
|------|--------------------|-----------------------------|
| 时间格式 | 绝对时间 | 相对时间（秒） |
| 本地时间影响 | ✅ 受影响（时间不准则失效） | ❌ 不受影响 |
| 优先级 | 低 | 高（同时存在时只认 Cache-Control） |
| 功能 | 简单 | 丰富（max-age/no-cache/no-store/public/private） |

**结论**：同时写 Expires 和 Cache-Control，只为兼容超旧浏览器，实际生效的只有 Cache-Control。

### 协商缓存：ETag vs Last-Modified

**优先级**：`ETag > Last-Modified`

| 特性 | Last-Modified | ETag |
|------|--------------|------|
| 精度 | 秒级 | 文件内容哈希，精确 |
| 误判情况 | 内容未变但修改时间变 → 误重载 | 内容不变 ETag 不变 |
| HTTP 请求头 | If-Modified-Since | If-None-Match |
| 匹配返回 | 304 Not Modified | 304 Not Modified |

**浏览器请求流程**：
1. 发送 `If-None-Match: 原Etag` + `If-Modified-Since: 原时间`
2. 服务端**先比对 ETag**，匹配则 304
3. ETag 不匹配才看 Last-Modified

### 缓存策略最佳实践
```js
// express 静态资源配置
app.use(express.static('public', {
  maxAge: '1y' // 内部生成 Cache-Control: max-age=31536000
}));
```

```
// 强缓存（静态资源加 hash 文件名，实现永久缓存）
Cache-Control: max-age=31536000, immutable

// HTML 文件不缓存（始终协商）
Cache-Control: no-cache

// 协商缓存
ETag: "abc123"
Last-Modified: Wed, 17 Mar 2026 10:00:00 GMT
```

### 面试要点
- express 是工具，Cache-Control 是 HTTP 标准
- 强缓存：浏览器不发请求，直接用本地缓存（200 from cache）
- 协商缓存：浏览器发请求，服务端判断是否变化（304 or 200）
- ETag 基于文件内容，比 Last-Modified 更准确

---

## 前端页面优化（静态资源+网络请求）

### 核心思路
- 静态资源：**更小、更少、更快、更稳**
- 网络请求：**少发、早发、快回、并行**

### 一、静态资源优化

**1. 资源体积压缩**
- JS/CSS：压缩、混淆、去掉注释/console/死代码
- 图片：WebP/AVIF、适当尺寸、懒加载、雪碧图、Base64 小图标
- 字体：子集化、只加载用到的字符、WOFF2 格式

**2. 资源合并与拆分**
- 按路由/组件做代码分割（Code Splitting）
- 第三方库单独打包，利用长期缓存
- Tree Shaking：剔除未使用代码

**3. 缓存策略（最关键）**
- 强缓存：`Cache-Control: max-age=xxx`
- 静态资源加 **hash 文件名**，实现永久缓存
- 协商缓存：`ETag` / `Last-Modified`

**4. 加载顺序优化**
- 关键 CSS 内联，避免阻塞渲染
- JS 用 `async`/`defer`，避免阻塞解析
- 首屏内容优先，其他懒加载

### 二、网络请求优化

**1. 减少请求数量**
- 接口合并、批量请求
- 本地缓存：LocalStorage / SessionStorage / IndexedDB

**2. 减少请求体积**
- 接口用 gzip / brotli 压缩
- 返回字段按需，不全量返回
- 图片/文件走 CDN

**3. 网络链路优化**
- 使用 CDN 就近访问（减少网络时延、降低源站压力）
- DNS 预解析：`<link rel="dns-prefetch" href="//example.com">`
- 预连接：`<link rel="preconnect">`
- HTTP/2、HTTP/3 多路复用

**4. 加载体验优化**
- 接口防抖、节流
- 分页、滚动加载
- 骨架屏 / Loading 状态

### CDN 为什么快？
> CDN 通过分布式节点缓存静态资源，让用户就近访问，减少网络时延和源站压力，所以加载更快。

### 面试一句话总结
- 静态资源：压缩、合并、缓存、懒加载、优先首屏
- 网络请求：少请求、压体积、快链路、稳体验

---

## 触发BFC的方式

### 什么是 BFC？
- BFC（Block Formatting Context）块级格式化上下文
- BFC 内部的布局不影响外部，外部也不影响内部
- 主要用途：清除浮动、防止 margin 折叠、阻止文字环绕

### 触发 BFC 的方式
1. **根元素**：`<html>` 自动创建 BFC
2. **float 非 none**：`float: left / right`
3. **position 脱离文档流**：`position: absolute / fixed`
4. **overflow 非 visible**：`overflow: hidden / auto / scroll`（最常用）
5. **display 特殊值**：
   - `inline-block / table-cell / table-caption`
   - `flex / inline-flex / grid / inline-grid`
   - `flow-root`（现代推荐，无副作用）
6. **contain 属性**：`contain: layout / content / strict`
7. **多列容器**：设置 `column-count / column-width`
8. **弹性/网格项目**：flex/grid 容器内的直接子元素

### 最佳实践
```css
/* 现代推荐：无副作用 */
.bfc-container {
  display: flow-root;
}

/* 传统方式：兼容性好，但会隐藏溢出内容 */
.bfc-container {
  overflow: hidden;
}
```

### BFC 的应用场景

```html
<!-- 1. 清除浮动（解决父元素高度塌陷） -->
<div style="display: flow-root;">
  <div style="float: left;">浮动子元素</div>
</div>

<!-- 2. 防止 margin 折叠（两个相邻元素 margin 不合并） -->
<div style="display: flow-root; margin-bottom: 20px;"></div>
<div style="display: flow-root; margin-top: 20px;"></div>
```

### 面试要点
- BFC 核心：内部布局与外部隔离
- 最常用触发方式：`overflow: hidden` 或 `display: flow-root`
- `flow-root` 是专门用来创建 BFC 的，无副作用，现代推荐

---

## 重排重绘的操作与优化

### 核心概念
| 概念 | 触发条件 | 开销 |
|------|---------|------|
| **重排（Reflow）** | 元素几何尺寸/位置变化，重新计算布局 | 最大 |
| **重绘（Repaint）** | 颜色、背景等变化，不改变布局 | 中等 |
| **合成（Composite）** | 只改变 transform/opacity，GPU 处理 | 最小 |

### 会触发重排的操作
- 添加/删除/修改 DOM 元素
- 修改：`width/height/padding/margin/border/top/left`
- 修改字体大小、字体
- 读取布局属性（强制刷新队列）：`offsetWidth/offsetHeight/clientWidth/scrollTop/getComputedStyle`
- 窗口 resize、页面滚动

### 只触发重绘（不重排）
- `color / background-color / visibility / box-shadow / border-style（不改尺寸）`

### 减少重排重绘的优化方法

**1. 批量修改样式**
```js
// ❌ 坏：逐条修改
el.style.width = '100px';
el.style.height = '200px';

// ✅ 好：统一加 className
el.className = 'updated-style';
```

**2. 避免频繁读取布局属性**
```js
// ❌ 坏：读写交替，每次循环都强制重排
for (let i = 0; i < 100; i++) {
  div.style.left = div.offsetLeft + 10 + 'px';
}

// ✅ 好：读一次缓存
const left = div.offsetLeft;
for (let i = 0; i < 100; i++) {
  div.style.left = left + i * 10 + 'px';
}
```

**3. 使用 CSS3 硬件加速（最重要）**
```css
/* 用 transform/opacity 做动画，走合成线程，不重排不重绘 */
.animated {
  will-change: transform;
  transform: translateZ(0);
}
```

**4. 离线操作 DOM**
```js
// 先隐藏，操作完再显示
el.style.display = 'none';
// ...大量 DOM 操作...
el.style.display = 'block';

// 或使用文档片段
const fragment = document.createDocumentFragment();
// ...批量添加...
document.body.appendChild(fragment);
```

**5. 动画元素脱离文档流**
```css
/* position: fixed/absolute 不会带动周围元素重排 */
.animation { position: fixed; }
```

### 脱离文档流 vs transform 新建图层

| 特性 | 脱离文档流（absolute/fixed/float） | transform（新建图层） |
|------|----------------------------------|---------------------|
| 占不占位置 | ❌ 不占 | ✅ 占原位置 |
| 会不会重排 | ✅ 会 | ❌ 不会 |
| GPU 加速 | ❌ 无 | ✅ 有 |

### 浏览器渲染三阶段
```
Layout（重排）→ Paint（重绘）→ Composite（合成）
```
- 合成线程：把多个图层叠加送到屏幕
- `transform/opacity` 只走合成，不阻塞主线程，性能最高

### opacity 的特殊性
- `opacity < 1` → 强制创建独立图层 → 先触发一次重绘，之后只合成
- 不是完全不重绘，但只重绘一次，后续纯 GPU 合成 → 依然是高性能属性

### 面试要点
- 改位置大小 → 重排；改颜色 → 重绘；改 transform/opacity → 只合成
- 动画优先用 `transform/opacity`，走合成线程不阻塞主线程
- `will-change` 提前告知浏览器创建图层，但不要滥用（大面积使用会爆内存）

---

## 首页白屏优化手段分类讲解

### 白屏原因
- 大量 JS 需要下载/解析/执行
- 关键资源加载慢（未用 CDN、未压缩）
- 纯 CSR（客户端渲染）首屏需等 JS 执行完才有内容

### 优化手段（6大类）

**1. 资源加载优化（最常见最有效）**
- 压缩资源：JS/CSS/HTML 压缩、图片 WebP/AVIF
- 路由懒加载、组件懒加载、图片懒加载
- 使用 CDN 就近加速
- 减少请求数：雪碧图、内联小资源

**2. 构建与打包优化**
- Code Splitting：按路由/组件拆包
- Tree Shaking：剔除未使用代码
- 替换大库（Moment → Day.js）、按需引入
- Vite 预构建、dll Plugin 缓存依赖

**3. 渲染层面优化（解决白屏最直接）**
- **SSR（服务端渲染）**：首屏直接返回带内容 HTML，无白屏
- **SSG（静态站点生成）**：构建时生成 HTML，首屏秒出
- **骨架屏 Skeleton**：快速占位，降低用户感知白屏时间
- **Loading 状态**：优先渲染 Loading，避免完全空白

**4. 网络与缓存优化**
- HTTP 强缓存 + 协商缓存
- Service Worker 离线缓存
- DNS 预解析、预连接
- `preload`（关键资源）、`prefetch`（未来资源）

**5. 运行时与执行优化**
- `defer` / `async` 异步加载 JS，不阻塞 HTML 解析
- 减少长任务 Long Task，使用 Web Worker
- 避免渲染阻塞：减少同步 DOM 操作

**6. 首屏指标优化（可量化）**
- LCP（最大内容绘制）：优先加载首屏图片/内容
- FCP（首次内容绘制）：尽快让页面出现内容
- TTI（可交互时间）：尽快让页面能点能用

### CSS 白屏优化
```css
/* content-visibility: auto 让浏览器跳过屏外渲染 */
.list-item {
  content-visibility: auto;
  contain-intrinsic-size: 1px 300px; /* 预设高度，防止布局抖动 */
}
```

### CSS 性能优化三件套
| 属性 | 作用 | 适用场景 |
|------|------|---------|
| `transform` | 动画走合成线程，不重排重绘 | 所有动画效果 |
| `contain: strict` | 内部变化不影响外部，缩小渲染范围 | 长列表、独立模块 |
| `will-change` | 提前创建图层，提升流畅度 | 即将动画的元素（用完移除） |

### 记忆口诀
```
压包、拆包、懒加载
缓存、预载、上骨架
异步、非阻、做SSR
```

### 面试要点
- 白屏核心原因：资源大/慢 + 纯 CSR 渲染 + JS 阻塞
- 最直接手段：SSR/SSG + 骨架屏 + 资源懒加载 + CDN
- 可量化：LCP、FCP、TTI 三个核心指标

---
