# React 路由模式详解：HashRouter vs BrowserRouter vs React Router v6

## 面试高频考点

- HashRouter 和 BrowserRouter 的区别？
- BrowserRouter 刷新为什么会 404？
- React Router v6 有哪些重大变化？
- 如何实现嵌套路由和动态路由？
- 路由懒加载如何实现？
- 编程式导航怎么用？

---

## 一、HashRouter vs BrowserRouter

### 1.1 核心区别

HashRouter 使用 URL 中的 `#` 符号（如 `/#/user`），BrowserRouter 使用 HTML5 History API 实现真实路径（如 `/user`）。

### 1.2 刷新 404 问题的本质

React 单页应用只有一个 `index.html` 文件，"页面跳转"只是 JavaScript 替换 DOM 内容。当用户按下刷新键时，浏览器会忽略 React（JS 还没运行），直接向服务器发起真实的 HTTP 请求。服务器在硬盘上找不到 `/user` 对应的文件，就返回 404。

HashRouter 不存在这个问题，因为 `#` 后面的内容永远不会发送给服务器，服务器收到的永远是 `/`。

**为什么开发环境没遇到过？**

开发工具（Webpack Dev Server、Vite Dev Server）默认开启了 `historyApiFallback: true`，自动将找不到的路径重定向到 `index.html`。

### 1.3 服务器配置（URL Rewrite）

"服务器配置"的本质是 URL 重写（Rewrite），而非重定向（Redirect）。重写是服务器内部处理，浏览器完全不知情；重定向会改变浏览器地址栏 URL。

```nginx
# Nginx 配置
location / {
    root   /usr/share/nginx/html;
    index  index.html;
    try_files $uri $uri/ /index.html;
}
```

`try_files` 的逻辑：先找文件（`$uri`），再找目录（`$uri/`），都找不到就返回 `/index.html`，状态码依然是 200 OK，地址栏保持不变。

### 1.4 其他关键区别

| 维度 | HashRouter | BrowserRouter |
|------|-----------|---------------|
| URL 形式 | `/#/user` | `/user` |
| 原生锚点 | 冲突，需手动处理 | 原生支持 |
| State 传参 | 依赖 sessionStorage，较脆弱 | 依赖 History API，健壮 |
| 服务器日志 | 只看见 `/` | 能看见完整路径 |
| SEO | 差 | 优 |
| 底层原理 | `window.location.hash` + `onhashchange` | `history.pushState` + `onpopstate` |
| 服务器配置 | 不需要 | 需要配置 URL 重写 |

> 除非受限于环境（无服务器权限、离线运行、兼容古董浏览器），否则永远默认使用 BrowserRouter。

---

## 二、React Router v6 核心变化

React Router v6 相比 v5 有重大改动，面试常考"v5 和 v6 的区别"。

### 2.1 主要变化对比

| 特性 | v5 | v6 |
|------|----|----|
| 路由组件 | `<Switch>` | `<Routes>` |
| 路由匹配 | 需要 `exact` 精确匹配 | 默认精确匹配，无需 `exact` |
| 嵌套路由 | 在子组件内写 `<Route>` | 集中在父路由配置，用 `<Outlet>` 占位 |
| 重定向 | `<Redirect to="/home">` | `<Navigate to="/home" />` |
| 编程式导航 | `useHistory()` | `useNavigate()` |
| 路由参数 | `useParams()` | `useParams()`（不变） |
| 相对路径 | 不支持 | 支持相对路径 |

### 2.2 基础用法

```jsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">首页</Link>
        <Link to="/about">关于</Link>
        <Link to="/user/123">用户</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/user/:id" element={<User />} />
        <Route path="*" element={<NotFound />} />  {/* 404 兜底 */}
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 三、动态路由（路由参数）

### 3.1 URL 参数（params）

```jsx
// 路由定义
<Route path="/user/:id" element={<UserDetail />} />

// 组件内获取
import { useParams } from 'react-router-dom';

function UserDetail() {
  const { id } = useParams();
  return <div>用户 ID: {id}</div>;
}
```

### 3.2 查询参数（search params）

```jsx
// URL: /search?keyword=react&page=2
import { useSearchParams } from 'react-router-dom';

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('keyword'); // 'react'
  const page = searchParams.get('page');       // '2'

  // 更新查询参数
  const handlePageChange = (newPage) => {
    setSearchParams({ keyword, page: newPage });
  };

  return <div>搜索: {keyword}，第 {page} 页</div>;
}
```

### 3.3 路由 state 传参（不显示在 URL 中）

```jsx
// 跳转时传递 state
import { useNavigate } from 'react-router-dom';

function ProductList() {
  const navigate = useNavigate();
  
  const goToDetail = (product) => {
    navigate('/product/detail', {
      state: { product }  // 不会出现在 URL 中
    });
  };
}

// 目标页面接收
import { useLocation } from 'react-router-dom';

function ProductDetail() {
  const location = useLocation();
  const { product } = location.state || {};
  return <div>{product?.name}</div>;
}
```

---

## 四、嵌套路由

v6 的嵌套路由是最大亮点，通过 `<Outlet>` 实现子路由渲染占位。

```jsx
// 路由配置（集中式）
function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardLayout />}>
        {/* 子路由，路径自动拼接为 /dashboard/overview */}
        <Route index element={<Overview />} />          {/* 默认子路由 */}
        <Route path="overview" element={<Overview />} />
        <Route path="settings" element={<Settings />} />
        <Route path="user/:id" element={<UserDetail />} />
      </Route>
    </Routes>
  );
}

// 父组件：用 <Outlet> 指定子路由渲染位置
function DashboardLayout() {
  return (
    <div className="dashboard">
      <aside>
        <Link to="overview">概览</Link>
        <Link to="settings">设置</Link>
      </aside>
      <main>
        <Outlet />  {/* 子路由在这里渲染 */}
      </main>
    </div>
  );
}
```

**`index` 路由**：当父路由路径精确匹配时渲染的默认子路由，相当于 v5 的 `exact` 默认页。

---

## 五、编程式导航

```jsx
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    await login();
    navigate('/dashboard');           // 跳转
    navigate('/dashboard', { replace: true }); // 替换历史记录（不能后退）
    navigate(-1);                     // 后退一步
    navigate(1);                      // 前进一步
    navigate(-2);                     // 后退两步
  };
}
```

---

## 六、路由懒加载

结合 `React.lazy` 和 `Suspense` 实现按需加载，减小首屏 bundle 体积。

```jsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// 懒加载组件
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
}
```

**原理**：`React.lazy` 返回一个动态 `import()` 的 Promise，Webpack/Vite 会将懒加载的组件打包成独立 chunk，只有路由匹配时才加载对应 JS 文件。

---

## 七、路由守卫（权限控制）

React Router 没有内置路由守卫，需要自己封装高阶组件。

```jsx
// 封装 PrivateRoute 组件
import { Navigate, useLocation } from 'react-router-dom';

function PrivateRoute({ children }) {
  const isAuthenticated = useAuth(); // 自定义 hook 获取登录状态
  const location = useLocation();

  if (!isAuthenticated) {
    // 未登录，重定向到登录页，并记录来源路径
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// 使用
<Route
  path="/dashboard"
  element={
    <PrivateRoute>
      <Dashboard />
    </PrivateRoute>
  }
/>

// 登录成功后跳回原页面
function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleLogin = async () => {
    await login();
    navigate(from, { replace: true }); // 跳回原来要访问的页面
  };
}
```

---

## 八、useRoutes Hook（路由配置对象化）

v6 支持用 JavaScript 对象配置路由，更适合动态路由场景（如根据权限动态生成菜单）。

```jsx
import { useRoutes } from 'react-router-dom';

const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      {
        path: 'dashboard',
        element: <PrivateRoute><Dashboard /></PrivateRoute>,
        children: [
          { path: 'overview', element: <Overview /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
];

function App() {
  const element = useRoutes(routes);
  return element;
}
```

---

## 九、面试常见问题

**Q: React Router 的实现原理是什么？**

本质是监听 URL 变化，然后根据当前 URL 渲染对应组件。BrowserRouter 监听 `popstate` 事件（浏览器前进/后退）和拦截 `pushState`/`replaceState` 调用；HashRouter 监听 `hashchange` 事件。URL 变化后，`<Routes>` 遍历所有 `<Route>`，找到匹配的路由并渲染对应 `element`。

**Q: Link 和 a 标签的区别？**

`<a>` 标签会触发浏览器的完整页面刷新，重新加载所有资源。`<Link>` 内部调用 `history.pushState` 更新 URL，不触发页面刷新，React 重新渲染匹配的组件，实现无刷新跳转。

**Q: 如何获取当前路由信息？**

```jsx
import { useLocation, useParams, useSearchParams } from 'react-router-dom';

function MyComponent() {
  const location = useLocation();    // { pathname, search, hash, state }
  const params = useParams();        // URL 动态参数
  const [searchParams] = useSearchParams(); // 查询参数
  
  console.log(location.pathname);    // 当前路径
}
```
