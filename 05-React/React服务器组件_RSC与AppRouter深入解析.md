# React Server Components (RSC) 与 Next.js App Router 深入解析

## 核心心智模型

React Server Components (RSC) 是一种在**构建时和服务器端**运行的组件，它们永远不会被下载到客户端（浏览器），因此不会增加客户端打包的体积。我们可以将其理解为：**返回界面的无头 API**。

> **设计初衷与解决的问题：**
> 过去我们面临一个艰难的选择：
>
> 1. 要么在客户端渲染（CSR），导致首屏加载慢（Waterfall 请求问题）、 bundle size 大。
> 2. 要么在服务器端渲染（SSR），但在 SSR 中，所有的组件代码最终还是会被发送到客户端进行 Hydration（注水），以让它们具有交互性，这使得客户端加载的 JS 代码量依然很大。
>
> RSC 解决的核心问题是：**将静态内容和交互内容彻底解耦，让不需要交互的组件完全留在服务端，零客户端 JS 产物体积，同时利用服务端靠近数据源的优势直接获取数据。**

## Server Components vs Client Components

在 Next.js (App Router) 中，**所有的组件默认都是 Server Components**。只有当组件需要交互或使用浏览器 API 时，才需要通过在文件顶部声明 `"use client"` 将其标记为 Client Component。

### 1. Server Components (RSC)

- **运行环境：** 仅在服务端。
- **能做什么：**
  - 直接读取后端数据源（数据库、文件系统、内部微服务）。
  - 处理重型依赖或大体积的 NPM 包（如 markdown 渲染、语法高亮），而不会增加客户端 bundle size。
  - 保护敏感数据（如 API keys、访问令牌）。
- **不能做什么：**
  - 使用 React 状态和生命周期 Hooks (`useState`, `useEffect`, `useReducer`, `useLayoutEffect` 等)。
  - 绑定 DOM 事件监听器 (`onClick`, `onChange` 等)。
  - 使用浏览器独有的 API（如 `window`, `document`, `localStorage`）。

### 2. Client Components

- **运行环境：** 在服务端预渲染 (SSR)，然后在客户端执行 Hydration 变得可交互。
- **能做什么：**
  - 使用 state 和 lifecycle hooks。
  - 绑定事件监听器。
  - 使用浏览器 API。
- **声明方式：** 文件顶部添加 `"use client";` 指令。

## 组件交织模型 (Interleaving)

RSC 最强大的特性在于它可以与 Client Components 无缝交织。但这里有一个非常核心的规则：**Client Component 中不能直接导入 (import) Server Component。**

**为什么？**
因为如果在 Client Component 中 `import` 了一个组件，那么打包工具就必须将那个组件的代码打包进客户端 bundle 中，这违背了 Server Component "不发送到客户端" 的初衷。

**正确的组合方式：通过 `children` 或 `props` 传递。**

```tsx
// ❌ 错误示范：在 Client Component 中直接导入 Server Component
"use client";
import ServerComponent from "./ServerComponent";

export default function ClientComponent() {
  return (
    <div>
      <ServerComponent />{" "}
      {/* 打包工具会报错或默默将其转化为 Client Component */}
    </div>
  );
}
```

```tsx
// ✅ 正确示范：通过 children 将 Server Component 传递给 Client Component
// app/page.tsx (这是一个 Server Component)
import ClientComponent from "./ClientComponent";
import ServerComponent from "./ServerComponent";

export default function Page() {
  return (
    // Server Component 可以随意组合它们
    <ClientComponent>
      <ServerComponent />
    </ClientComponent>
  );
}

// app/ClientComponent.tsx
("use client");
export default function ClientComponent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>{count}</button>
      {/* 这里的 children 就是在服务端已经渲染好并序列化的 ServerComponent 的结果 */}
      {children}
    </div>
  );
}
```

## Next.js App Router 的数据获取范式

RSC 彻底改变了数据获取的方式。在 App Router 中，推荐的数据获取方式是：**在 Server Component 中直接使用 `async/await`。**

```tsx
// app/users/page.tsx (Server Component)
// 组件可以直接是 async 的！
export default async function UsersPage() {
  // 直接在服务端发起 fetch，靠近数据源，没有瀑布流问题
  const res = await fetch("https://api.example.com/users", {
    next: { revalidate: 3600 }, // Next.js 扩展的 fetch，支持细粒度缓存
  });
  const users = await res.json();

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### 数据流优势：消除 Waterfall（瀑布流）

以前如果在客户端深层嵌套的组件中进行数据获取，必须等父组件渲染完成并挂载后，子组件才能开始 fetch 数据。
有了 RSC，所有的数据获取都可以前置在服务端并行进行，并且可以直接向客户端流式传输 (Streaming) 渲染好的 HTML 块。

## 总结：如何决定使用哪种组件？

作为中级开发者，在构建现代 React 应用时，请遵循以下决策树：

1. **默认使用 Server Components**（完成所有数据获取和静态 UI 渲染）。
2. 当且仅当遇到以下情况，才在文件顶部加上 `'use client'` 降级为 Client Component：
   - 需要用户交互（如按钮点击、表单输入）。
   - 需要状态管理（`useState`, `useReducer`）。
   - 需要生命周期/副作用（`useEffect`）。
   - 需要使用特定的浏览器 API。
