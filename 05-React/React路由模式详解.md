# React 路由模式详解：HashRouter vs BrowserRouter

## 核心区别

HashRouter 使用 URL 中的 `#` 符号（如 `/#/user`），BrowserRouter 使用 HTML5 History API 实现真实路径（如 `/user`）。

## 刷新 404 问题的本质

### 为什么 BrowserRouter 刷新会 404

React 单页应用只有一个 `index.html` 文件，"页面跳转"只是 JavaScript 替换 DOM 内容。当用户按下刷新键时，浏览器会忽略 React（JS 还没运行），直接向服务器发起真实的 HTTP 请求。服务器在硬盘上找不到 `/user` 对应的文件，就返回 404。

HashRouter 不存在这个问题，因为 `#` 后面的内容永远不会发送给服务器，服务器收到的永远是 `/`。

### 为什么开发环境没遇到过

开发工具（Webpack Dev Server、Vite Dev Server）默认开启了 `historyApiFallback: true`，自动将找不到的路径重定向到 `index.html`。

## 服务器配置（URL Rewrite）

"服务器配置"的本质是 URL 重写（Rewrite），而非重定向（Redirect）。重写是服务器内部处理，浏览器完全不知情；重定向会改变浏览器地址栏 URL。

### Nginx 配置

```nginx
location / {
    root   /usr/share/nginx/html;
    index  index.html;
    try_files $uri $uri/ /index.html;
}
```

`try_files` 的逻辑：先找文件（`$uri`），再找目录（`$uri/`），都找不到就返回 `/index.html`，状态码依然是 200 OK，地址栏保持不变。

### 刷新后为什么还在原页面

服务器返回 `index.html` 内容但不改变 URL → React 启动后读取地址栏 → 发现是 `/about` → 渲染 About 组件。用户完全无感知。

## 其他关键区别

### 锚点定位冲突

BrowserRouter 完全支持原生锚点（`/about#contact`）。HashRouter 天然冲突，因为 `#` 已被路由占用，原生锚点定位通常失效。

### state 传参持久化

BrowserRouter 使用 History API 的 `pushState`，数据存在浏览器内置历史堆栈中，刷新后通常能保留。HashRouter 将 state 存在 `sessionStorage` 中，清除缓存或新标签页打开时会丢失。

### 服务器日志与统计

HashRouter 下服务器日志全是 `GET /`，无法区分用户访问了哪个页面。BrowserRouter 下服务器能看见完整路径（`GET /product/A`），支持精细的流量分析和缓存策略。

### SEO

HashRouter 对搜索引擎不友好，很多爬虫（特别是百度）对 Hash 路由支持差。BrowserRouter 每个 URL 都是独立资源路径，对爬虫友好。

### 底层监听事件

HashRouter 监听 `window.onhashchange`（兼容性极好，支持 IE8）。BrowserRouter 监听 `window.onpopstate`（HTML5 新特性）。

## 总结

| 维度 | HashRouter | BrowserRouter |
|------|-----------|---------------|
| 原生锚点 | 冲突，需手动处理 | 原生支持 |
| State 传参 | 依赖 sessionStorage，较脆弱 | 依赖 History API，健壮 |
| 服务器日志 | 只看见 `/` | 能看见完整路径 |
| SEO | 差 | 优 |
| 底层原理 | `window.location.hash` | `history.pushState` |

除非受限于环境（无服务器权限、离线运行、兼容古董浏览器），否则永远默认使用 BrowserRouter。
