# React 19 新特性深度指南

> 更新日期：2026-05-14 | 来源：React 官方文档 (React v19 发布)

---

## 🚀 React 19 核心概览

| 特性                      | 一句话描述                             | 稳定版本 |
| ------------------------- | -------------------------------------- | -------- |
| `use()` Hook              | 在渲染中直接 await Promise / Context   | ✅ 稳定  |
| Server Actions            | 在 Server Component 中直接调用异步函数 | ✅ 稳定  |
| `useOptimistic`           | 乐观 UI，异步操作前先更新界面          | ✅ 稳定  |
| `useFormStatus`           | 获取父级 form 的提交状态               | ✅ 稳定  |
| `useActionState`          | 管理 action 返回值 + pending 状态      | ✅ 稳定  |
| React Compiler            | 编译时自动 memo，告别手动优化          | 实验中   |
| ref 作为 prop             | 无需 `forwardRef` 包裹                 | ✅ 稳定  |
| `<Context>` 作为 Provider | 简化 Context 写法                      | ✅ 稳定  |

---

## 一、`use()` Hook

> 打破 Hooks 规则：可以在 **条件语句** 和 **循环** 中使用！

### 基本用法

```tsx
import { use, Suspense } from "react";

// 1. 读取 Promise（配合 Suspense 使用）
function Comments({ commentsPromise }) {
  // 如果 promise 还在 pending，组件会 suspend（交给 Suspense 显示 loading）
  const comments = use(commentsPromise);
  return (
    <ul>
      {comments.map((c) => (
        <li key={c.id}>{c.text}</li>
      ))}
    </ul>
  );
}

function App() {
  const commentsPromise = fetchComments(); // 在外部创建，不要在组件内创建！
  return (
    <Suspense fallback={<p>加载评论中...</p>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  );
}
```

> ⚠️ **关键原则**：Promise 必须在组件外或父级创建，不能在渲染函数内创建（否则每次渲染都是新 Promise）

### 条件使用（突破 Hooks 规则）

```tsx
function UserProfile({ userId, showDetails }) {
  // ✅ use() 可以放在 if 里！普通 Hook 不行
  if (showDetails) {
    const details = use(fetchUserDetails(userId));
    return <div>{details.bio}</div>;
  }
  return <div>基本信息</div>;
}
```

### 读取 Context

```tsx
import { use, createContext } from "react";

const ThemeContext = createContext("light");

function Button() {
  // use() 读取 Context，等价于 useContext(ThemeContext)
  // 但 use() 可以放在条件语句中
  const theme = use(ThemeContext);
  return <button className={theme}>Click me</button>;
}
```

### `use()` vs `useEffect` 数据获取对比

```tsx
// ❌ 旧方式：useEffect + state 管理 loading/error
function OldFetch({ url }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) return <Spinner />;
  if (error) return <Error error={error} />;
  return <div>{data?.title}</div>;
}

// ✅ 新方式：use() + Suspense + ErrorBoundary
function NewFetch({ dataPromise }) {
  const data = use(dataPromise); // 自动处理 loading/error 状态
  return <div>{data.title}</div>;
}

// 在父组件中统一处理 loading/error
<ErrorBoundary fallback={<Error />}>
  <Suspense fallback={<Spinner />}>
    <NewFetch dataPromise={fetchData(url)} />
  </Suspense>
</ErrorBoundary>;
```

---

## 二、Server Actions

> 在组件中直接调用服务端函数，无需手写 API 路由！

### 基本用法（Next.js App Router）

```tsx
// app/actions.ts — 服务端函数（'use server' 指令）
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateUserName(userId: string, name: string) {
  await db.users.update({ where: { id: userId }, data: { name } });
  revalidatePath("/profile"); // 重新验证缓存
  return { success: true };
}
```

```tsx
// 客户端组件中直接使用 Server Action
"use client";
import { updateUserName } from "./actions";

function ProfileForm({ userId }) {
  async function handleSubmit(formData: FormData) {
    const name = formData.get("name") as string;
    await updateUserName(userId, name);
    // 无需 fetch，无需 API 路由！
  }

  return (
    <form action={handleSubmit}>
      <input name="name" placeholder="新名字" />
      <button type="submit">保存</button>
    </form>
  );
}
```

### 与 `useActionState` 配合（处理返回值）

```tsx
"use client";
import { useActionState } from "react";
import { updateName } from "./actions";

function EditForm({ userId }) {
  const [state, formAction, isPending] = useActionState(
    async (prevState: State, formData: FormData) => {
      const name = formData.get("name") as string;
      if (name.length < 2) return { error: "名字至少2个字符" };

      const result = await updateName(userId, name);
      return result.success ? { success: true } : { error: "更新失败" };
    },
    null, // 初始 state
  );

  return (
    <form action={formAction}>
      <input name="name" defaultValue="" />
      <button disabled={isPending}>{isPending ? "保存中..." : "保存"}</button>
      {state?.error && <p style={{ color: "red" }}>{state.error}</p>}
      {state?.success && <p style={{ color: "green" }}>保存成功！</p>}
    </form>
  );
}
```

---

## 三、`useOptimistic` — 乐观 UI

> 在异步操作**完成前**先在界面显示预期结果，操作完成后替换成真实数据。

### 经典场景：点赞按钮

```tsx
import { useOptimistic, useState } from "react";

function LikeButton({ postId, initialLikes }) {
  const [likes, setLikes] = useState(initialLikes);

  // useOptimistic(actualState, updateFn)
  // updateFn: (currentState, optimisticValue) => newState
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    likes,
    (currentLikes, increment) => currentLikes + increment,
  );

  async function handleLike() {
    addOptimisticLike(1); // 立即 +1（乐观更新）

    try {
      const newLikes = await likePost(postId); // 真实请求
      setLikes(newLikes); // 用服务器返回值替换
    } catch {
      // 请求失败时，optimisticLikes 自动回滚到 likes
      alert("点赞失败，请重试");
    }
  }

  return <button onClick={handleLike}>❤️ {optimisticLikes}</button>;
}
```

### 经典场景：TODO 列表乐观添加

```tsx
import { useOptimistic, useState, useTransition } from "react";

function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isPending, startTransition] = useTransition();

  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (currentTodos, newTodo: Todo) => [...currentTodos, newTodo],
  );

  async function handleSubmit(formData: FormData) {
    const title = formData.get("title") as string;
    const tempTodo = { id: "temp-" + Date.now(), title, done: false };

    // 乐观更新：立即显示
    addOptimisticTodo(tempTodo);

    // 后台异步保存
    const savedTodo = await createTodo(title);
    setTodos((prev) => [...prev, savedTodo]); // 替换为真实数据
  }

  return (
    <div>
      <form action={handleSubmit}>
        <input name="title" placeholder="新任务" />
        <button type="submit">添加</button>
      </form>
      <ul>
        {optimisticTodos.map((todo) => (
          <li
            key={todo.id}
            style={{ opacity: todo.id.startsWith("temp") ? 0.5 : 1 }}
          >
            {todo.title}
            {todo.id.startsWith("temp") && " (保存中...)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### `useOptimistic` 生命周期

```
用户操作
  ↓
addOptimistic(value)  → optimisticState 立即更新（乐观值）
  ↓
async action 执行中   → optimisticState 保持乐观值
  ↓
action 完成           → optimisticState 自动回到 actualState
                        （然后你用 setActualState 更新真实数据）
  ↓（如果 action 抛出错误）
action 失败           → optimisticState 自动回滚到 actualState
```

---

## 四、`useFormStatus` — 表单状态

> 获取**祖先 `<form>`** 的提交状态，无需 prop drilling。

```tsx
import { useFormStatus } from "react-dom"; // 注意：从 react-dom 导入！

// 提交按钮组件：自动感知父 form 的 pending 状态
function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "提交中..." : "提交"}
    </button>
  );
}

// 使用：直接放在 form 内即可
function ContactForm() {
  async function handleSubmit(formData: FormData) {
    await sendMessage(formData.get("message"));
  }

  return (
    <form action={handleSubmit}>
      <textarea name="message" rows={4} />
      <SubmitButton /> {/* 自动获取 form 的 pending 状态 */}
    </form>
  );
}
```

### `useFormStatus` 的字段含义

| 字段      | 类型                 | 说明                         |
| --------- | -------------------- | ---------------------------- |
| `pending` | `boolean`            | form 是否正在提交            |
| `data`    | `FormData \| null`   | 提交的表单数据（提交中有值） |
| `method`  | `string`             | 表单提交方法（get/post）     |
| `action`  | `string \| function` | form 的 action 属性值        |

### ⚠️ 常见错误

```tsx
// ❌ 错误：在 form 本身的组件里用 useFormStatus，获取不到
function MyForm() {
  const { pending } = useFormStatus(); // ❌ 这里是 form 的同层，不是子组件
  return <form action={submit}>...</form>;
}

// ✅ 正确：必须在 form 的子组件中使用
function MyForm() {
  return (
    <form action={submit}>
      <SubmitButton /> {/* ✅ SubmitButton 内部用 useFormStatus */}
    </form>
  );
}
```

---

## 五、其他 React 19 重要更新

> Updated: 2026-05-10 based on official docs (React 19 Release / Next.js 15)

### 5.1 ref 直接作为 prop（告别 forwardRef）

```tsx
// React 19 之前：必须用 forwardRef
const OldInput = forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} {...props} />
));

// React 19：直接传 ref prop
function NewInput({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}

// 使用方式完全一样
const inputRef = useRef<HTMLInputElement>(null);
<NewInput ref={inputRef} placeholder="输入内容" />;
```

### 5.2 `<Context>` 直接作为 Provider

```tsx
const ThemeContext = createContext('light');

// 之前：必须用 ThemeContext.Provider
<ThemeContext.Provider value="dark">
  <App />
</ThemeContext.Provider>

// React 19：直接用 Context 本身
<ThemeContext value="dark">
  <App />
</ThemeContext>
```

### 5.3 文档 Metadata 原生支持

```tsx
// 无需 react-helmet，直接在组件中写 title/meta
function BlogPost({ post }) {
  return (
    <article>
      <title>{post.title} - 我的博客</title>
      <meta name="description" content={post.summary} />
      <link rel="canonical" href={`https://example.com/posts/${post.slug}`} />

      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

### 5.4 资源预加载 API

```tsx
import { preload, preloadModule, prefetchDNS, preinit } from "react-dom";

function App() {
  // 预连接 DNS
  prefetchDNS("https://api.example.com");

  // 预加载字体
  preload("/fonts/inter.woff2", { as: "font", type: "font/woff2" });

  // 预初始化（加载并执行）脚本
  preinit("/analytics.js", { as: "script" });

  return <div>...</div>;
}
```

### 5.5 `after()` API（Next.js 15+ 实验性特性）

在 Server Components 或 Server Actions 中，有时我们需要在响应返回给用户后，继续执行一些后台任务（如日志记录、数据分析、缓存清理）。Next.js 15 引入了 `after()` 函数，专门解决这个痛点，允许将耗时任务推迟到响应流关闭后执行。

```tsx
import { after } from "next/server";

export default function Page() {
  // 1. 响应会立即返回给客户端
  after(() => {
    // 2. 响应发送完毕后，服务端后台悄悄执行
    console.log("User visited the page at", new Date());
    logAnalytics();
  });

  return <div>Welcome to the Page</div>;
}
```

**对比传统方案：**
传统方案可能需要触发额外的 API 路由请求或依靠微服务/队列，而 `after()` 原生集成在服务端渲染链路的生命周期中。

---

## 六、React 19 面试高频问题

### Q1：`use()` 和 `useEffect` 获取数据有什么区别？

| 维度         | `useEffect` + state            | `use()` + Suspense   |
| ------------ | ------------------------------ | -------------------- |
| loading 状态 | 手动管理                       | Suspense 自动处理    |
| error 状态   | 手动 try/catch                 | ErrorBoundary 处理   |
| 代码量       | 多（需要 loading/error state） | 少（只关注数据本身） |
| 可中断       | 不可中断                       | 配合并发模式可中断   |
| 条件使用     | ❌ 不能在条件里                | ✅ 可以在条件里      |
| 适用场景     | 副作用（订阅、DOM 操作）       | 数据获取             |

### Q2：`useOptimistic` 和直接 setXxx 的区别？

直接 `setState` 更新后就是真实状态。`useOptimistic` 的乐观状态是**临时的**：

- action 执行期间显示乐观值
- action 结束（无论成功还是失败）自动回到 `actualState`
- 失败时自动回滚，无需手动处理

### Q3：`useFormStatus` 为什么从 `react-dom` 导入？

`useFormStatus` 和 HTML `<form>` 元素强绑定，属于 DOM 相关 API，因此放在 `react-dom` 包。同样道理，`createPortal`、`flushSync` 也在 `react-dom`。

### Q4：Server Components 和 Client Components 如何选择？

| 用 Server Component            | 用 Client Component           |
| ------------------------------ | ----------------------------- |
| 直接访问数据库                 | 需要 `useState` / `useEffect` |
| 访问文件系统                   | 需要事件监听                  |
| 使用敏感数据（不暴露给客户端） | 需要浏览器 API                |
| 减少客户端 JS 体积             | 需要实时交互                  |
| 异步数据获取（async/await）    | 第三方需要 DOM 的库           |

### Q5：React 19 的 Actions 和 Redux 的区别？

React Actions 是轻量级的**局部状态管理**，配合 `useActionState` + `useOptimistic` 处理单个表单/操作的异步状态。Redux 是**全局状态管理**，处理跨组件共享的复杂状态。两者不冲突，可以共存。

---

## 七、与 Vue 3 的对比

| 功能       | React 19                           | Vue 3                             |
| ---------- | ---------------------------------- | --------------------------------- |
| 异步数据   | `use()` + Suspense                 | `<Suspense>` + async setup        |
| 表单状态   | `useFormStatus` + `useActionState` | VueUse `useForm` / 手动           |
| 乐观 UI    | `useOptimistic`                    | 手动 ref + 计算属性               |
| 服务端数据 | Server Actions                     | Nuxt `useFetch` / `useAsyncData`  |
| 自动优化   | React Compiler（编译时 memo）      | Vue 3 响应式天生追踪（无需 memo） |

> 💡 Vue 3 的响应式系统（Proxy + 依赖追踪）让大多数场景不需要手动优化；React 需要 Compiler 来弥补这一差距。

## 八、React 19.2 稳定版：Activity、Effect Event 与 SSR 能力补齐

> Updated: 2026-05-17 based on official React 19.2 release notes: https://react.dev/blog/2025/10/01/react-19-2

React 19.2 已经是稳定发布版本，不再只是“预告”。这一版的主线不是再新增一批表层 Hook，而是把 React 的三个底层方向继续往前推进：**后台 UI 保活与降优先级、Effect 中非响应式事件抽离、服务端渲染/预渲染流水线增强**。

### 8.1 `<Activity />`：隐藏但不销毁的 UI 分区

过去我们经常用条件渲染控制页面片段：

```tsx
{
  isVisible && <Page />;
}
```

这种写法的问题是：隐藏时组件会被卸载，组件内部 state、未完成的数据预热、图片/CSS 加载进度都会丢掉。React 19.2 的 `<Activity />` 提供了更细的控制：

```tsx
import { Activity } from "react";

function App({ isVisible }: { isVisible: boolean }) {
  return (
    <Activity mode={isVisible ? "visible" : "hidden"}>
      <Page />
    </Activity>
  );
}
```

当前稳定支持两个模式：

- `visible`：正常展示 children，挂载 effects，更新按正常优先级处理。
- `hidden`：隐藏 children，卸载 effects，并把该子树更新延后到 React 空闲时处理。

**心智模型**：`<Activity />` 不是简单的 `display: none`，也不是普通条件渲染。它更像“后台标签页”：UI 不显示，副作用暂停，但状态和已经构建出的子树可以保留，适合用于路由预渲染、Tab 切换保活、返回上一页时恢复输入状态等场景。

### 8.2 `useEffectEvent`：把 Effect 里的“事件”拆出来

`useEffectEvent` 解决的是一个非常典型的闭包/依赖困境：Effect 订阅的是 `roomId`，但回调里又想读取最新的 `theme`。如果把 `theme` 放进依赖数组，切换主题会导致聊天室重连；如果不放，又会遇到 stale closure。

```tsx
import { useEffect, useEffectEvent } from "react";

function ChatRoom({ roomId, theme }: { roomId: string; theme: string }) {
  const onConnected = useEffectEvent(() => {
    showNotification("Connected!", theme); // 永远读到最新 theme
  });

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on("connected", () => {
      onConnected();
    });
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]); // ✅ Effect 只对真正的订阅条件响应
}
```

**判断标准**：只有那些“由 Effect 内部触发、但自身不应该决定 Effect 是否重跑”的逻辑，才适合放进 `useEffectEvent`。不要为了绕过依赖检查而滥用它；它不是 `eslint-disable` 的替代品。

### 8.3 `cacheSignal`：让 RSC 缓存生命周期能中断异步任务

`cacheSignal` 只用于 React Server Components 场景。它返回一个和 `cache()` 生命周期绑定的 `AbortSignal`，当 React 已经不再需要某个缓存结果时，可以中断仍在进行中的异步工作。

```tsx
import { cache, cacheSignal } from "react";

const dedupedFetch = cache(fetch);

export default async function Page() {
  const res = await dedupedFetch("https://api.example.com/posts", {
    signal: cacheSignal(),
  });
  const posts = await res.json();
  return <PostList posts={posts} />;
}
```

它适合用来取消服务端渲染中已经失效的请求，避免渲染被中止、失败或缓存生命周期结束后，后台请求还继续占用资源。

### 8.4 Performance Tracks：把 React 调度过程放进 Chrome Performance 面板

React 19.2 在 Chrome DevTools Performance 中增加了 React 自定义 tracks，主要包括：

- **Scheduler track**：展示 blocking、transition 等不同优先级的工作，以及更新何时被阻塞、何时等待 paint、何时继续。
- **Components track**：展示组件 render、mount、effect 执行等阶段，帮助定位是哪棵组件子树耗时。

这对理解 Concurrent Rendering 很有帮助：以前我们只能说“React 会按优先级调度”，现在可以在性能面板里看到“哪次交互触发了哪个优先级的更新、它被谁阻塞、最后在哪个时间片完成”。

### 8.5 Partial Pre-rendering：先发静态壳，再恢复动态内容

React 19.2 新增的 Partial Pre-rendering 允许先把页面的静态部分预渲染出来并放到 CDN，后续请求到来时再使用 `resume` 系列 API 恢复渲染动态部分。

核心链路可以理解为：

1. 构建或预渲染阶段：`prerender(<App />)` 生成静态 `prelude` 和可恢复的 `postponed` 状态。
2. 请求阶段：读取 `postponed`，调用 `resume(<App />, postponed)` 继续产出 SSR stream。
3. 对用户：先快速看到静态壳，再逐步补齐动态区域。

### 8.6 SSR 细节变化：Suspense 批量 reveal 与 Node Web Streams

React 19.2 调整了服务端流式渲染中 Suspense boundary 的 reveal 行为：不会每个 boundary 一完成就立刻替换 fallback，而是短暂批量合并，让服务端流式 SSR 与客户端渲染的视觉行为更一致，也为后续 View Transition 场景打基础。

同时，`renderToReadableStream`、`prerender`、`resume`、`resumeAndPrerender` 等 Web Streams API 开始支持 Node.js。不过在 Node 环境里，官方仍然更推荐 Node Streams 版本，例如 `renderToPipeableStream`、`resumeToPipeableStream`、`prerenderToNodeStream`，因为 Node Streams 通常更快，并且更容易接入压缩能力。

---

## 🔗 参考资料

- [React 19 官方发布博客 (2024-12-05)](https://react.dev/blog/2024/12/05/react-19)
- [React 19.2 官方发布博客 (2025-10-01)](https://react.dev/blog/2025/10/01/react-19-2)
- [React 19 RC 发布说明 (2024-04-25)](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [use() RFC](https://github.com/reactjs/rfcs/pull/229)
- [Server Actions 文档](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

# React 18/19 新特性全解

> 收录日期：2026-03-07 | 来源：React 官方博客 + 掘金精选

---

## React 18 核心特性

### 1. 并发渲染（Concurrent Rendering）

React 18 最重要的改变：渲染可以**被中断**。

```tsx
// createRoot 替代 render（开启并发特性）
import { createRoot } from "react-dom/client";
const root = createRoot(document.getElementById("root"));
root.render(<App />);

// ❌ 旧写法（React 17）
// ReactDOM.render(<App />, document.getElementById('root'));
```

### 2. 自动批处理（Automatic Batching）

React 17 只在事件处理器中批处理，React 18 **所有场景**都自动批处理：

```tsx
// React 18：setTimeout 里也会批处理（只触发一次渲染）
setTimeout(() => {
  setCount((c) => c + 1); // 不会立即渲染
  setFlag((f) => !f); // 不会立即渲染
  // React 18 会合并成一次渲染
}, 1000);
```

如果需要立即渲染，用 `flushSync`：

```tsx
import { flushSync } from "react-dom";
flushSync(() => setCount((c) => c + 1)); // 立即渲染
```

### 3. startTransition

标记**非紧急**更新，让紧急更新（输入、点击）优先：

```tsx
import { useTransition } from "react";

function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    setQuery(e.target.value); // 紧急：立即更新输入框
    startTransition(() => {
      setResults(filterData(e.target.value)); // 非紧急：可延迟
    });
  };

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending ? <Spinner /> : <ResultList results={results} />}
    </>
  );
}
```

### 4. useDeferredValue

延迟更新某个值，类似 transition 但更简单：

```tsx
function SearchResults({ query }) {
  const deferredQuery = useDeferredValue(query);
  return <HeavyList query={deferredQuery} />;
}
```

### 5. Suspense 增强

支持**服务端渲染流式传输** + **数据获取**：

```tsx
<Suspense fallback={<Skeleton />}>
  <Comments />
</Suspense>
```

### 6. useId

生成 SSR 安全的唯一 ID：

```tsx
function EmailField() {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>Email</label>
      <input id={id} type="email" />
    </>
  );
}
```

### 7. useSyncExternalStore

用于订阅外部数据源（如 Redux store），解决并发渲染下外部 store 的**撕裂问题**（tearing）——同一次渲染中不同组件读到不同版本的数据。

### 8. 双缓存与并发渲染的关系

双缓存机制（Double Buffering）在 React 16 引入 Fiber 架构时就已存在：内存中同时维护 `current Tree`（当前显示）和 `workInProgress Tree`（构建中），更新完成后通过指针切换完成视图更新。React 16/17 虽有双缓存结构，但默认同步执行；React 18 正式开放基于双缓存的并发特性，支持在 `workInProgress` 树上计算到一半时挂起，先处理高优先级任务。

---

## React 19 核心特性

### 1. React Compiler（自动 memo）

**告别手动 useMemo/useCallback/React.memo！**

```tsx
// React 19：直接写，编译器自动优化
function TodoList({ todos, filter }) {
  const filtered = todos.filter((t) => t.status === filter);
  return filtered.map((t) => <Todo key={t.id} todo={t} />);
}
```

### 2. Actions（表单简化）

```tsx
function ChangeName() {
  const [error, submitAction, isPending] = useActionState(
    async (prev, formData) => {
      const name = formData.get("name");
      const error = await updateName(name);
      if (error) return error;
      redirect("/profile");
    },
    null,
  );

  return (
    <form action={submitAction}>
      <input name="name" />
      <button disabled={isPending}>Update</button>
      {error && <p>{error}</p>}
    </form>
  );
}
```

### 3. use() Hook

在组件中直接读取 Promise 和 Context：

```tsx
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);
  return comments.map((c) => <Comment key={c.id} comment={c} />);
}
```

### 4. Server Components

组件在服务端执行，不发送 JS 到客户端：

```tsx
// server component（默认）
async function BlogPost({ id }) {
  const post = await db.posts.find(id);
  return <article>{post.content}</article>;
}

// client component（需要交互时）
("use client");
function LikeButton() {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>❤️</button>;
}
```

### 5. useOptimistic

乐观 UI Hook，在异步操作完成前先在界面显示预期结果。`useOptimistic(state, updateFn)` 返回 `[optimisticState, addOptimistic]`，乐观状态只存在于当前 Action 执行周期内，一旦真实数据更新或 Action 结束自动销毁，无需手动回滚。

### 6. 其他改进

- **ref 作为 prop**：不再需要 forwardRef
- **Context 直接作为 provider**：`<ThemeContext value={theme}>`
- **文档 metadata 支持**：`<title>` `<meta>` 在组件中直接写
- **资源预加载 API**：`preload()`、`preinit()` 优化资源加载时机

---

## useTransition vs useDeferredValue

`useTransition` 控制状态更新函数的执行（"这个更新不着急"），适用于能控制 `setState` 触发时机的场景（如点击按钮、Tab 切换），返回 `isPending` 状态。`useDeferredValue` 控制数据值（"先用旧值顶一下"），适用于无法控制状态更新触发的场景（如从父组件接收 props），仅返回延迟后的值。

---

## 面试要点总结

| 问题                       | 关键答案                             |
| -------------------------- | ------------------------------------ |
| React 18 最大改变？        | 并发渲染 + 自动批处理                |
| startTransition 解决什么？ | 区分紧急/非紧急更新，保持 UI 响应    |
| 为什么要 createRoot？      | 开启并发特性的入口                   |
| React 19 的 Compiler？     | 编译时自动 memo，告别手动优化        |
| Server Components 意义？   | 减少客户端 JS 体积，直接访问后端资源 |

---

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
  - 直接读取服务端数据源（数据库、文件系统或后端服务）。
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

---

# React19_API与心智模型.md

# React 19 API 与心智模型速查

> 目标：把 React 19 当作一次“渲染模型 + 数据提交模型 + 资源加载模型”的收敛升级，而不是只背新增 Hook。

## 一、核心心智模型

React 19 延续 React 18 的并发渲染基础，但把“异步数据、表单提交、服务端渲染、资源预加载”这些过去依赖框架或社区库补齐的能力进一步标准化。理解时建议分成三层：

1. **Render 是可中断的**：并发渲染允许 React 在不阻塞高优先级交互的前提下准备 UI。渲染函数必须保持纯净，不要在 render 阶段写外部状态。
2. **Commit 是原子的**：真正修改 DOM 仍发生在提交阶段，用户不会看到半成品 UI。
3. **Async 是 UI 状态的一部分**：请求、提交、乐观更新、错误边界、Suspense fallback 都应被建模为 UI 状态，而不是散落在命令式回调里。

## 二、新增/重点 API

### `useActionState`

用于把“提交动作 + pending 状态 + 返回结果”组合在一起，特别适合表单和服务端动作。

```tsx
import { useActionState } from "react";

async function updateName(prevState: { error?: string }, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "请输入名称" };
  }

  await saveName(name);
  return {};
}

export function ProfileForm() {
  const [state, formAction, isPending] = useActionState(updateName, {});

  return (
    <form action={formAction}>
      <input name="name" aria-label="name" />
      <button disabled={isPending}>{isPending ? "保存中..." : "保存"}</button>
      {state.error ? <p role="alert">{state.error}</p> : null}
    </form>
  );
}
```

**面试表达**：它把异步 Action 的结果状态收敛到 Hook 内，减少手写 `isLoading/error/data` 三件套，尤其适合渐进增强的表单提交。

### `useOptimistic`

用于在服务端确认前先展示乐观 UI。

```tsx
import { useOptimistic } from "react";

type Comment = { id: string; text: string; pending?: boolean };

export function CommentList({ comments }: { comments: Comment[] }) {
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (current, text: string) => [
      ...current,
      { id: crypto.randomUUID(), text, pending: true },
    ],
  );

  async function submit(formData: FormData) {
    const text = String(formData.get("text") ?? "");
    addOptimisticComment(text);
    await createComment(text);
  }

  return (
    <form action={submit}>
      {optimisticComments.map((item) => (
        <p key={item.id} style={{ opacity: item.pending ? 0.6 : 1 }}>
          {item.text}
        </p>
      ))}
      <input name="text" />
    </form>
  );
}
```

**注意**：乐观 UI 不是本地最终状态，失败时需要借助 Action 返回值、错误边界或重新拉取数据回滚。

### `use`

`use` 可以在组件中读取 Promise 或 Context。读取 Promise 时会与 Suspense 协作：pending 触发 fallback，reject 交给 Error Boundary。

```tsx
import { Suspense, use } from "react";

function UserName({ userPromise }: { userPromise: Promise<{ name: string }> }) {
  const user = use(userPromise);
  return <span>{user.name}</span>;
}

export function UserCard(props: { userPromise: Promise<{ name: string }> }) {
  return (
    <Suspense fallback={<span>加载中...</span>}>
      <UserName userPromise={props.userPromise} />
    </Suspense>
  );
}
```

**边界**：不要在 render 中临时创建新 Promise，否则每次渲染都可能重新挂起；Promise 应来自框架、缓存层或父组件。

## 三、资源加载 API

React 19 支持更显式地表达资源优先级，例如 `preload`、`preinit`、`preconnect`。它们的价值是让组件在渲染过程中声明自己需要的关键资源，由 React 协调插入资源提示，减少瀑布加载。

```tsx
import { preconnect, preload } from "react-dom";

export function ProductHero() {
  preconnect("https://cdn.example.com");
  preload("https://cdn.example.com/hero.webp", { as: "image" });

  return <img src="https://cdn.example.com/hero.webp" alt="商品主图" />;
}
```

## 四、React Compiler 相关心智

React Compiler 的目标是自动推导一部分 memoization，减少手写 `useMemo/useCallback/memo` 的样板代码。即使没有启用 Compiler，也应该遵守这些约束：

- 组件和 Hook 保持纯函数语义。
- 不在 render 中写外部可变状态。
- props/state 使用不可变更新。
- 不为了“让依赖数组通过”而隐藏真实依赖。

## 五、迁移检查清单

1. 表单提交：优先评估 `useActionState`，减少手动维护 pending/error。
2. 即时反馈：使用 `useOptimistic` 表达乐观 UI，而不是把临时项混入真实服务端列表。
3. 异步读取：Promise 来源必须稳定，并配套 Suspense 与 Error Boundary。
4. 性能优化：先用 Profiler 定位瓶颈，再决定是否保留手写 memo。
5. 类型约束：Action 返回值、表单字段和乐观数据都要补齐 TypeScript 类型，避免 `any` 扩散。

---

# React并发渲染与Server_Components心智模型.md

# React 并发渲染与 Server Components 心智模型

## 一、并发渲染不是多线程

Concurrent Rendering 的重点不是“同时执行多个线程”，而是 React 可以把一次更新拆成更小的工作单元，并根据优先级暂停、恢复或丢弃尚未提交的渲染结果。

- **紧急更新**：输入框输入、点击反馈，应尽快响应。
- **非紧急更新**：筛选大列表、切换复杂图表，可以放进 transition。
- **提交阶段不可中断**：DOM 修改仍是一次性提交，避免用户看到中间态。

```tsx
import { useMemo, useState, useTransition } from "react";

type Item = { id: string; title: string };

export function SearchList({ items }: { items: Item[] }) {
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(
    () => items.filter((item) => item.title.includes(query)),
    [items, query],
  );

  return (
    <>
      <input
        value={keyword}
        onChange={(event) => {
          const nextKeyword = event.target.value;
          setKeyword(nextKeyword);
          startTransition(() => setQuery(nextKeyword));
        }}
      />
      {isPending ? <p>更新结果中...</p> : null}
      {filteredItems.map((item) => (
        <p key={item.id}>{item.title}</p>
      ))}
    </>
  );
}
```

**判断标准**：如果某个更新影响“输入是否跟手”，不要放进 transition；如果只是影响“结果区域何时刷新”，可以放进 transition。

## 二、Suspense 的定位

Suspense 是“等待某段 UI 准备好”的边界，不是数据请求库本身。它负责声明 fallback、协调 reveal 顺序，并与 `React.lazy`、框架数据缓存、RSC 流式渲染协作。

常见误区：

- 把所有页面包一个巨大 Suspense，导致 fallback 粒度太粗。
- 在组件 render 中创建不稳定 Promise，造成重复挂起。
- 忽略 Error Boundary，导致 reject 后没有合适的错误 UI。

## 三、Server Components 解决什么问题

Server Components（RSC）的核心是让一部分组件只在服务端执行，产物不是 HTML 字符串，而是可被客户端 React 合并的组件载荷。它主要解决：

1. **减少客户端 JS**：纯展示、数据读取、Markdown 渲染等逻辑无需打包到浏览器。
2. **靠近数据源**：服务端组件可以直接访问数据库、文件系统或后端服务。
3. **保留组件模型**：服务端组件可以组合客户端组件，但客户端组件不能直接导入服务端组件。

## 四、Server / Client 边界

| 场景     | Server Component                 | Client Component                      |
| -------- | -------------------------------- | ------------------------------------- |
| 数据读取 | 适合，靠近数据源                 | 通常通过 API/缓存层读取               |
| 交互状态 | 不支持 Hook 状态和浏览器事件     | 支持 `useState`、事件处理、浏览器 API |
| 包体积   | 不进入客户端 bundle              | 会进入客户端 bundle                   |
| 典型用途 | 页面骨架、详情展示、列表初始数据 | 表单、弹窗、拖拽、富交互组件          |

边界设计原则：默认 Server，必要时 Client。把交互叶子节点标记为 Client，而不是把整个页面都变成 Client。

```tsx
// app/products/page.tsx - Server Component
import { AddToCartButton } from "./AddToCartButton";

export default async function ProductPage() {
  const products = await getProducts();

  return (
    <main>
      {products.map((product) => (
        <section key={product.id}>
          <h2>{product.name}</h2>
          <AddToCartButton productId={product.id} />
        </section>
      ))}
    </main>
  );
}
```

```tsx
// app/products/AddToCartButton.tsx - Client Component
"use client";

import { useState } from "react";

export function AddToCartButton({ productId }: { productId: string }) {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount((value) => value + 1)}>
      加入购物车 {productId} × {count}
    </button>
  );
}
```

## 五、面试高频回答模板

- **Concurrent Mode 是什么？** 更准确叫并发特性集合，不是一个必须全局开启的模式。它让 React 能按优先级调度渲染，提升交互响应。
- **RSC 和 SSR 区别？** SSR 生成首屏 HTML，客户端仍需 hydrate 对应组件；RSC 让部分组件只在服务端执行，并把组件树载荷流给客户端合并，可减少客户端 JS。
- **什么时候用 Client Component？** 需要浏览器事件、状态、副作用、DOM API、第三方客户端库时使用。
- **为什么 Server Component 不能传函数给 Client Component？** 跨越网络/序列化边界，函数闭包无法安全序列化；应传可序列化数据或使用 Server Actions。

## 九、React 19.2 后的学习补充：Compiler 与 Effect 语义

> Updated: 2026-05-19 based on official React Compiler docs: https://react.dev/learn/react-compiler

React 19.2 之后，现代 React 的学习重点还需要补上一条线：**编译器如何帮助开发者减少手写 memoization**。

过去我们常用 `useMemo`、`useCallback`、`React.memo` 手动控制渲染性能，但这些 API 很容易被滥用：依赖数组写错会产生 bug，过度 memo 又会增加阅读成本。React Compiler 的方向是：在代码满足 React 纯度规则的前提下，由编译器自动推导安全的 memoization。

这意味着未来写 React 组件时更应该关注：

1. render 阶段保持纯净，不读写不可追踪的外部可变状态。
2. 派生数据尽量写成直接、可分析的表达式。
3. Effect 只用于同步外部系统，不把业务计算塞进 Effect。
4. `useEffectEvent` 用于 Effect 内部事件，而不是规避依赖数组。
5. 手写 memo 仍然可以保留，但应逐步从“默认写”变成“有明确证据再写”。

更完整的整理见：[React Compiler 自动记忆化心智模型](./React_Compiler自动记忆化.md)。
