# React SSR 实现原理

## 核心思想

服务端渲染（SSR）的核心是在服务器端将 React 组件渲染成 HTML 字符串发送给浏览器，浏览器显示内容后再加载 JavaScript 进行"注水"（Hydration），使页面变为可交互的应用。

## 核心 API

服务端使用 `react-dom/server` 包：`renderToString()` 将组件渲染为静态 HTML 字符串（基础方法），`renderToPipeableStream()` 是 React 18 推荐的流式传输方式，可以更快发送首字节。

客户端使用 `react-dom/client` 包：`hydrateRoot()` 复用服务端下发的 HTML 结构，挂载事件监听器，接管页面控制权。

## 实现步骤

### 第一步：搭建服务端

使用 Node.js 服务器（如 Express）拦截页面请求，将 React 组件渲染为 HTML 并返回：

```javascript
import { renderToString } from 'react-dom/server';
import App from '../src/App';

app.get('*', (req, res) => {
  const appString = renderToString(<App />);
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <div id="root">${appString}</div>
        <script src="/client-bundle.js"></script>
      </body>
    </html>
  `;
  res.send(html);
});
```

### 第二步：客户端入口改造

客户端使用 `hydrateRoot` 替代 `createRoot`，告诉 React 页面上已有 HTML，只需挂载事件监听器：

```javascript
import { hydrateRoot } from 'react-dom/client';
import App from './App';

hydrateRoot(document.getElementById('root'), <App />);
```

### 第三步：构建配置

需要两套 Webpack 配置。Server Config 输出到 Node.js 环境（`target: 'node'`），Client Config 输出到浏览器环境（`target: 'web'`）。

## SSR 中的难点

### 数据获取

`useEffect` 不会在服务端执行。解决方案是给路由组件添加静态方法（如 `loadData`），服务端匹配 URL 对应的路由组件后调用该方法获取数据，等待 Promise 完成后将数据作为 props 传给组件渲染。同时需要将数据注入到 HTML 的 `<script>` 标签中（`window.__INITIAL_DATA__`），避免客户端 hydration mismatch。

### 路由处理

服务端使用 `StaticRouter`（传入 `req.url`），客户端使用 `BrowserRouter`：

```javascript
// 服务端
<StaticRouter location={req.url}><App /></StaticRouter>

// 客户端
<BrowserRouter><App /></BrowserRouter>
```

## 完整流程

请求到达 → 服务端请求数据 → 服务端渲染 HTML（带数据）→ 发送给浏览器 → 浏览器显示内容（FP/FCP）→ 下载 JS → React 注水（Hydration）→ 页面可交互（TTI）。

## 实际建议

了解 SSR 原理很重要，但生产环境强烈建议使用成熟框架。Next.js 提供开箱即用的 SSR 支持（`getServerSideProps` 或 React Server Components），自动处理打包、路由、数据同步和 Hydration 问题。
