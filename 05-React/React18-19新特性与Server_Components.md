# React 19 新特性深度指南

> 更新日期：2026-03-31 | 来源：React 官方文档 + RFC

---

## 🚀 React 19 核心概览

| 特性                      | 一句话描述                             | 稳定版本 |
| ------------------------- | -------------------------------------- | -------- |
| `use()` Hook              | 在渲染中直接 await Promise / Context   | ✅ RC    |
| Server Actions            | 在 Server Component 中直接调用异步函数 | ✅ RC    |
| `useOptimistic`           | 乐观 UI，异步操作前先更新界面          | ✅ RC    |
| `useFormStatus`           | 获取父级 form 的提交状态               | ✅ RC    |
| `useActionState`          | 管理 action 返回值 + pending 状态      | ✅ RC    |
| React Compiler            | 编译时自动 memo，告别手动优化          | 实验中   |
| ref 作为 prop             | 无需 `forwardRef` 包裹                 | ✅ RC    |
| `<Context>` 作为 Provider | 简化 Context 写法                      | ✅ RC    |

---

## 一、`use()` Hook

> 打破 Hooks 规则：可以在 **条件语句** 和 **循环** 中使用！

### 基本用法

```tsxx
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

```tsxx
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

```tsxx
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

```tsxx
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

```tsxx
// app/actions.ts — 服务端函数（'use server' 指令）
'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function updateUserName(userId: string, name: string) {
  await db.users.update({ where: { id: userId }, data: { name } });
  revalidatePath('/profile'); // 重新验证缓存
  return { success: true };
}
```

```tsxx
// 客户端组件中直接使用 Server Action
'use client';
import { updateUserName } from './actions';

function ProfileForm({ userId }) {
  async function handleSubmit(formData: FormData) {
    const name = formData.get('name') as string;
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

```tsxx
'use client';
import { useActionState } from 'react';
import { updateName } from './actions';

function EditForm({ userId }) {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const name = formData.get('name') as string;
      if (name.length < 2) return { error: '名字至少2个字符' };

      const result = await updateName(userId, name);
      return result.success ? { success: true } : { error: '更新失败' };
    },
    null // 初始 state
  );

  return (
    <form action={formAction}>
      <input name="name" defaultValue="" />
      <button disabled={isPending}>
        {isPending ? '保存中...' : '保存'}
      </button>
      {state?.error && <p style={{ color: 'red' }}>{state.error}</p>}
      {state?.success && <p style={{ color: 'green' }}>保存成功！</p>}
    </form>
  );
}
```

---

## 三、`useOptimistic` — 乐观 UI

> 在异步操作**完成前**先在界面显示预期结果，操作完成后替换成真实数据。

### 经典场景：点赞按钮

```tsxx
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

```tsxx
import { useOptimistic, useState, useTransition } from 'react';

function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isPending, startTransition] = useTransition();

  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (currentTodos, newTodo: Todo) => [...currentTodos, newTodo]
  );

  async function handleSubmit(formData: FormData) {
    const title = formData.get('title') as string;
    const tempTodo = { id: 'temp-' + Date.now(), title, done: false };

    // 乐观更新：立即显示
    addOptimisticTodo(tempTodo);

    // 后台异步保存
    const savedTodo = await createTodo(title);
    setTodos(prev => [...prev, savedTodo]); // 替换为真实数据
  }

  return (
    <div>
      <form action={handleSubmit}>
        <input name="title" placeholder="新任务" />
        <button type="submit">添加</button>
      </form>
      <ul>
        {optimisticTodos.map(todo => (
          <li key={todo.id} style={{ opacity: todo.id.startsWith('temp') ? 0.5 : 1 }}>
            {todo.title}
            {todo.id.startsWith('temp') && ' (保存中...)'}
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

```tsxx
import { useFormStatus } from 'react-dom'; // 注意：从 react-dom 导入！

// 提交按钮组件：自动感知父 form 的 pending 状态
function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? '提交中...' : '提交'}
    </button>
  );
}

// 使用：直接放在 form 内即可
function ContactForm() {
  async function handleSubmit(formData: FormData) {
    await sendMessage(formData.get('message'));
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

```tsxx
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

### 5.1 ref 直接作为 prop（告别 forwardRef）

```tsxx
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
<NewInput ref={inputRef} placeholder="输入内容" />
```

### 5.2 `<Context>` 直接作为 Provider

```tsxx
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

```tsxx
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

```tsxx
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

---

## 🔗 参考资料

- [React 19 官方博客](https://react.dev/blog/2024/12/05/react-19)
- [React 19 RC 发布说明](https://react.dev/blog/2024/04/25/react-19)
- [use() RFC](https://github.com/reactjs/rfcs/pull/229)
- [Server Actions 文档](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

# React 18/19 新特性全解

> 收录日期：2026-03-07 | 来源：React 官方博客 + 掘金精选

---

## React 18 核心特性

### 1. 并发渲染（Concurrent Rendering）

React 18 最重要的改变：渲染可以**被中断**。

```tsxx
// createRoot 替代 render（开启并发特性）
import { createRoot } from "react-dom/client";
const root = createRoot(document.getElementById("root"));
root.render(<App />);

// ❌ 旧写法（React 17）
// ReactDOM.render(<App />, document.getElementById('root'));
```

### 2. 自动批处理（Automatic Batching）

React 17 只在事件处理器中批处理，React 18 **所有场景**都自动批处理：

```tsxx
// React 18：setTimeout 里也会批处理（只触发一次渲染）
setTimeout(() => {
  setCount((c) => c + 1); // 不会立即渲染
  setFlag((f) => !f); // 不会立即渲染
  // React 18 会合并成一次渲染
}, 1000);
```

如果需要立即渲染，用 `flushSync`：

```tsxx
import { flushSync } from "react-dom";
flushSync(() => setCount((c) => c + 1)); // 立即渲染
```

### 3. startTransition

标记**非紧急**更新，让紧急更新（输入、点击）优先：

```tsxx
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

```tsxx
function SearchResults({ query }) {
  const deferredQuery = useDeferredValue(query);
  return <HeavyList query={deferredQuery} />;
}
```

### 5. Suspense 增强

支持**服务端渲染流式传输** + **数据获取**：

```tsxx
<Suspense fallback={<Skeleton />}>
  <Comments />
</Suspense>
```

### 6. useId

生成 SSR 安全的唯一 ID：

```tsxx
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

```tsxx
// React 19：直接写，编译器自动优化
function TodoList({ todos, filter }) {
  const filtered = todos.filter((t) => t.status === filter);
  return filtered.map((t) => <Todo key={t.id} todo={t} />);
}
```

### 2. Actions（表单简化）

```tsxx
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

```tsxx
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);
  return comments.map((c) => <Comment key={c.id} comment={c} />);
}
```

### 4. Server Components

组件在服务端执行，不发送 JS 到客户端：

```tsxx
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
