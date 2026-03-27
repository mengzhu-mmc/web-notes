# React SSR 实现原理

## 面试高频考点

- SSR 和 CSR 的区别是什么？各自适用什么场景？
- React SSR 的核心 API 有哪些？
- 什么是 Hydration（注水）？为什么需要它？
- React 18 的流式 SSR 解决了什么问题？
- React Server Components（RSC）和 SSR 有什么区别？
- SSR 中如何处理数据获取？如何避免 Hydration Mismatch？

---

## 一、CSR vs SSR vs SSG 对比

| 渲染方式 | 首屏速度 | SEO | 服务器压力 | 适用场景 |
|---------|---------|-----|----------|---------|
| CSR（客户端渲染） | 慢（需下载 JS） | 差 | 低 | 后台管理系统、交互复杂的 SPA |
| SSR（服务端渲染） | 快 | 好 | 高 | 电商、新闻、需要 SEO 的页面 |
| SSG（静态生成） | 最快 | 最好 | 极低 | 博客、文档、内容不频繁变化的页面 |
| ISR（增量静态再生） | 快 | 好 | 低 | 内容定期更新的页面（Next.js 特有） |

---

## 二、SSR 核心 API

### 服务端 API（react-dom/server）

```js
// React 18 推荐：流式传输，可以更快发送首字节
import { renderToPipeableStream } from 'react-dom/server';

// 旧方式：一次性生成完整 HTML 字符串（阻塞式）
import { renderToString } from 'react-dom/server';

// 生成不带 data-reactid 的纯静态 HTML（用于纯展示，不需要 hydration）
import { renderToStaticMarkup } from 'react-dom/server';
```

### 客户端 API（react-dom/client）

```js
// React 18：复用服务端 HTML，只挂载事件监听器
import { hydrateRoot } from 'react-dom/client';

// 旧方式（React 17 及之前）
import { hydrate } from 'react-dom';
```

---

## 三、基础 SSR 实现步骤

### 第一步：服务端渲染 HTML

```js
// server.js
import express from 'express';
import { renderToString } from 'react-dom/server';
import App from '../src/App';

const app = express();

app.get('*', (req, res) => {
  const appString = renderToString(<App />);
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>SSR Demo</title>
      </head>
      <body>
        <div id="root">${appString}</div>
        <script src="/client-bundle.js"></script>
      </body>
    </html>
  `;
  res.send(html);
});

app.listen(3000);
```

### 第二步：客户端入口改造

```js
// client.js
import { hydrateRoot } from 'react-dom/client';
import App from './App';

// 使用 hydrateRoot 而不是 createRoot
// React 会复用已有的 DOM，只绑定事件监听器
hydrateRoot(document.getElementById('root'), <App />);
```

### 第三步：双端构建配置

```js
// webpack.server.js
module.exports = {
  target: 'node',           // 输出 Node.js 环境代码
  entry: './src/server.js',
  output: { filename: 'server.bundle.js' },
  // ...
};

// webpack.client.js
module.exports = {
  target: 'web',            // 输出浏览器环境代码
  entry: './src/client.js',
  output: { filename: 'client-bundle.js' },
  // ...
};
```

---

## 四、Hydration（注水）原理

### 什么是 Hydration

Hydration 是指客户端 React 接管服务端生成的静态 HTML，将其变为可交互应用的过程。

```
服务端：React 组件 → HTML 字符串（静态，无事件）
                          ↓ 发送给浏览器
浏览器：显示 HTML（用户看到内容，但无法交互）
                          ↓ 下载 JS
客户端：hydrateRoot() → React 遍历 DOM，绑定事件监听器
                          ↓
        页面变为可交互（TTI）
```

### Hydration 的工作原理

`hydrateRoot` 不会重新创建 DOM，而是：
1. 遍历服务端生成的 DOM 树
2. 与 React 组件树进行对比（reconciliation）
3. 为每个 DOM 节点绑定对应的事件处理器
4. 建立 Fiber 树，接管后续的更新

### Hydration Mismatch（注水不匹配）

当服务端渲染的 HTML 与客户端 React 期望的结构不一致时，会产生 Hydration Mismatch 警告，React 会丢弃服务端 HTML 重新渲染（性能损耗）。

**常见原因：**

```jsx
// ❌ 错误：使用了只在客户端有效的值
function App() {
  return <div>{new Date().toLocaleString()}</div>; // 服务端和客户端时间不同
}

// ❌ 错误：使用了 window/document（服务端不存在）
function App() {
  return <div>{window.innerWidth}</div>; // 服务端报错
}

// ❌ 错误：随机值
function App() {
  return <div>{Math.random()}</div>; // 每次不同
}
```

**解决方案：**

```jsx
// ✅ 方案1：使用 useEffect 在客户端更新
function App() {
  const [time, setTime] = useState('');
  useEffect(() => {
    setTime(new Date().toLocaleString()); // 只在客户端执行
  }, []);
  return <div>{time}</div>;
}

// ✅ 方案2：suppressHydrationWarning（慎用）
function App() {
  return <div suppressHydrationWarning>{new Date().toLocaleString()}</div>;
}

// ✅ 方案3：将客户端专属内容包裹在 ClientOnly 组件中
function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? children : null;
}
```

---

## 五、SSR 中的数据获取

`useEffect` 不在服务端执行，需要特殊处理数据获取。

### 方案一：路由组件静态方法（传统方案）

```js
// 给路由组件添加静态方法
function UserPage({ user }) {
  return <div>{user.name}</div>;
}

// 服务端调用此方法获取数据
UserPage.loadData = (store) => {
  return store.dispatch(fetchUser());
};
```

```js
// server.js
const matchedRoutes = matchRoutes(routes, req.url);
const promises = matchedRoutes
  .filter(({ route }) => route.component.loadData)
  .map(({ route }) => route.component.loadData(store));

await Promise.all(promises);

const appString = renderToString(
  <Provider store={store}>
    <StaticRouter location={req.url}>
      <App />
    </StaticRouter>
  </Provider>
);

// 将数据注入 HTML，避免客户端重复请求
const html = `
  <script>window.__INITIAL_STATE__ = ${JSON.stringify(store.getState())}</script>
  <div id="root">${appString}</div>
`;
```

```js
// client.js - 使用服务端注入的初始数据
const preloadedState = window.__INITIAL_STATE__;
const store = createStore(reducer, preloadedState);
hydrateRoot(document.getElementById('root'), <App store={store} />);
```

### 方案二：Next.js 的数据获取方式

```js
// getServerSideProps：每次请求都在服务端执行
export async function getServerSideProps(context) {
  const user = await fetchUser(context.params.id);
  return { props: { user } };
}

// getStaticProps：构建时执行（SSG）
export async function getStaticProps() {
  const posts = await fetchPosts();
  return { props: { posts }, revalidate: 60 }; // ISR：60秒后重新生成
}
```

---

## 六、React 18 流式 SSR

### 传统 SSR 的问题

传统 `renderToString` 是同步阻塞的：必须等所有数据获取完成，才能开始渲染 HTML；必须等整个 HTML 生成完毕，才能发送给浏览器；必须等整个 JS 下载完成，才能开始 Hydration。

### 流式 SSR 的解决方案

React 18 的 `renderToPipeableStream` + `Suspense` 实现了流式传输：

```js
// server.js
import { renderToPipeableStream } from 'react-dom/server';

app.get('*', (req, res) => {
  const { pipe } = renderToPipeableStream(
    <App />,
    {
      bootstrapScripts: ['/client-bundle.js'],
      onShellReady() {
        // Shell（非 Suspense 包裹的部分）准备好后立即开始发送
        res.setHeader('Content-Type', 'text/html');
        pipe(res);
      },
      onError(error) {
        console.error(error);
      }
    }
  );
});
```

```jsx
// App.jsx - 用 Suspense 包裹慢速组件
function App() {
  return (
    <html>
      <body>
        <Header />  {/* 立即渲染 */}
        <Suspense fallback={<Spinner />}>
          <SlowDataComponent />  {/* 数据准备好后流式插入 */}
        </Suspense>
        <Footer />  {/* 立即渲染 */}
      </body>
    </html>
  );
}
```

**流式 SSR 的效果：**

```
传统 SSR：
  等待所有数据 → 生成完整 HTML → 发送 → 下载 JS → Hydration

流式 SSR：
  立即发送 Shell（Header + Spinner + Footer）
  → 数据准备好后，流式插入 SlowDataComponent 的 HTML
  → 选择性 Hydration（优先 Hydrate 用户交互的部分）
```

### 选择性 Hydration（Selective Hydration）

React 18 还支持选择性 Hydration：不需要等待所有 JS 下载完成才开始 Hydration，可以对已下载的部分先进行 Hydration。如果用户点击了某个还未 Hydrate 的区域，React 会优先 Hydrate 该区域。

---

## 七、React Server Components（RSC）

### RSC 与 SSR 的区别

| | SSR | RSC |
|--|-----|-----|
| 运行时机 | 每次请求时在服务端运行 | 构建时或请求时在服务端运行 |
| 发送内容 | HTML 字符串 | React 组件树（序列化格式） |
| 客户端 JS | 需要下载完整组件代码 | 服务端组件代码不发送到客户端 |
| 状态/交互 | 通过 Hydration 恢复 | 服务端组件无状态，客户端组件有状态 |
| 数据获取 | 需要特殊处理（loadData 等） | 直接在组件中 async/await |

### RSC 的核心优势

```jsx
// Server Component：直接访问数据库，代码不发送到客户端
// app/page.tsx（Next.js App Router）
async function ProductPage({ params }) {
  // 直接在服务端查询数据库，无需 API 层
  const product = await db.product.findUnique({ where: { id: params.id } });

  return (
    <div>
      <h1>{product.name}</h1>
      {/* 客户端组件：需要交互 */}
      <AddToCartButton productId={product.id} />
    </div>
  );
}

// Client Component：标记 'use client'，有状态和事件
'use client';
function AddToCartButton({ productId }) {
  const [added, setAdded] = useState(false);
  return (
    <button onClick={() => setAdded(true)}>
      {added ? '已加入购物车' : '加入购物车'}
    </button>
  );
}
```

---

## 八、SSR 路由处理

```jsx
// 服务端使用 StaticRouter（无状态，传入当前 URL）
import { StaticRouter } from 'react-router-dom/server';

app.get('*', (req, res) => {
  const html = renderToString(
    <StaticRouter location={req.url}>
      <App />
    </StaticRouter>
  );
  res.send(html);
});

// 客户端使用 BrowserRouter（有状态，监听 history）
import { BrowserRouter } from 'react-router-dom';

hydrateRoot(
  document.getElementById('root'),
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

---

## 九、完整 SSR 流程图

```
用户请求
    ↓
Node.js 服务器接收请求
    ↓
匹配路由，调用 loadData 获取数据
    ↓
renderToString / renderToPipeableStream
    ↓
生成 HTML（含初始数据 window.__INITIAL_STATE__）
    ↓
发送给浏览器
    ↓
浏览器显示 HTML（FP / FCP）← 用户看到内容
    ↓
下载 client-bundle.js
    ↓
hydrateRoot() 执行 Hydration
    ↓
页面可交互（TTI）← 用户可以操作
```

---

## 十、实际建议

了解 SSR 原理很重要，但生产环境强烈建议使用成熟框架：

- **Next.js**：React 官方推荐，支持 SSR/SSG/ISR/RSC，App Router 是未来方向
- **Remix**：以数据加载为核心，嵌套路由，适合数据密集型应用
- **Astro**：Islands 架构，适合内容型网站，默认零 JS

自己实现 SSR 的场景：深度定制需求、学习目的、已有 Node.js 服务需要集成。
