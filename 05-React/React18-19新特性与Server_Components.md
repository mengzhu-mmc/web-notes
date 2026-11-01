# React 18/19 新特性与 Server Components 主线指南

> Updated: 2026-11-01. 本文将原先分散在 React 18、React 19、RSC 与并发渲染笔记中的重复内容合并为一条主线：**客户端并发调度 → Action 异步交互 → Server Components 边界 → SSR/RSC 渲染流水线**。

## 一、版本能力地图

React 18 到 React 19/19.2 的变化，不应该只背 API 名称，而要按“解决什么工程问题”理解。

| 版本主线   | 重点能力                                                                                       | 解决的问题                                                   | 推荐入口                                              |
| ---------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| React 18   | `createRoot`、自动批处理、`startTransition`、`useTransition`、`useDeferredValue`、Suspense SSR | 让渲染可中断、可降级优先级、减少无意义重渲染                 | 并发渲染心智模型                                      |
| React 19   | Actions、`useActionState`、`useOptimistic`、`use`、`useFormStatus`、ref as prop、资源加载 API  | 简化 mutation、表单、乐观 UI、资源预加载和异步读取           | Action 与 RSC 边界                                    |
| React 19.2 | `<Activity />`、`useEffectEvent`、`cacheSignal`、Performance Tracks、Partial Pre-rendering     | 后台 UI、Effect 事件拆分、RSC cache 生命周期、服务端恢复渲染 | [React 19.2 实践心智模型](./React19.2实践心智模型.md) |

React 19 稳定版发布后，Actions、`useActionState`、`useOptimistic`、`use` 与资源预加载成为主线能力，而不是实验特性[[React v19](https://react.dev/blog/2024/12/05/react-19)]。React 19.2 继续补齐 `<Activity />`、`useEffectEvent`、`cacheSignal` 与 Partial Pre-rendering 等能力[[React 19.2](https://react.dev/blog/2025/10/01/react-19-2)]。

## 二、Concurrent Rendering：不是“并发模式开关”

### 2.1 核心心智模型

并发渲染不是多线程，也不是让所有更新变快。它的价值是：**把渲染工作拆成可中断、可恢复、可按优先级调度的任务**。

- **输入、点击、光标移动**：必须同步反馈，属于紧急更新。
- **列表过滤、搜索结果、图表重算**：可以延后，适合 transition。
- **大组件树渲染**：可以被更高优先级交互打断，避免主线程长时间卡死。
- **Commit 阶段**：仍然不可中断，所以不要把副作用塞进 render。

### 2.2 `startTransition` 的正确边界

```tsx
import { ChangeEvent, startTransition, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  tags: string[];
};

type ProductSearchProps = {
  products: Product[];
};

export function ProductSearch({ products }: ProductSearchProps) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.currentTarget.value;

    // 紧急更新：输入框必须立刻响应。
    setInput(next);

    // 非紧急更新：搜索结果可以延后。
    startTransition(() => {
      setQuery(next);
    });
  }

  const result = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return products;

    return products.filter((product) =>
      product.name.toLowerCase().includes(keyword),
    );
  }, [products, query]);

  return (
    <section>
      <input value={input} onChange={handleChange} placeholder="搜索商品" />
      <p>命中 {result.length} 条</p>
    </section>
  );
}
```

**判断口诀**：能影响光标、输入值、按钮按下反馈的更新不要放进 transition；会导致大面积列表、图表、详情区重算的更新可以放进 transition。

### 2.3 `await` 后的更新要重新标记

React 19 支持 async transition，但要注意：`await` 之后如果还有 state update，需要再次包进 `startTransition`，避免它退回普通更新。

```tsx
import { startTransition, useState, useTransition } from "react";

type SaveState = "idle" | "saved" | "failed";

type SaveResult = {
  ok: boolean;
};

async function saveDraft(content: string): Promise<SaveResult> {
  const response = await fetch("/api/draft", {
    method: "POST",
    body: JSON.stringify({ content }),
  });

  return { ok: response.ok };
}

export function DraftEditor() {
  const [content, setContent] = useState("");
  const [state, setState] = useState<SaveState>("idle");
  const [isPending, startSave] = useTransition();

  function handleSave() {
    startSave(async () => {
      const result = await saveDraft(content);

      startTransition(() => {
        setState(result.ok ? "saved" : "failed");
      });
    });
  }

  return (
    <button disabled={isPending} onClick={handleSave}>
      {isPending ? "保存中" : state === "saved" ? "已保存" : "保存"}
    </button>
  );
}
```

如果需要处理提交顺序、pending 状态、错误恢复和表单渐进增强，优先考虑 `useActionState` 或框架提供的 Server Function。

## 三、Actions：把 mutation 从“手写状态机”收束为流程

### 3.1 Action 解决什么

传统 mutation 需要手写 pending、error、optimistic、顺序控制和提交后清理。Action 的价值是把这些状态放到 React 调度体系里，让交互在数据变化时仍然可响应。

```tsx
"use client";

import { useActionState } from "react";

type ProfileState = {
  ok: boolean;
  message: string;
};

type UpdateProfileInput = {
  displayName: string;
};

async function updateProfile(input: UpdateProfileInput): Promise<ProfileState> {
  const response = await fetch("/api/profile", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false, message: "更新失败，请稍后重试" };
  }

  return { ok: true, message: "已保存" };
}

const initialState: ProfileState = {
  ok: false,
  message: "",
};

export function ProfileForm() {
  const [state, formAction, isPending] = useActionState(
    async (_previousState: ProfileState, formData: FormData) => {
      const displayName = String(formData.get("displayName") ?? "").trim();

      if (displayName.length < 2) {
        return { ok: false, message: "昵称至少需要 2 个字符" };
      }

      return updateProfile({ displayName });
    },
    initialState,
  );

  return (
    <form action={formAction}>
      <input name="displayName" minLength={2} />
      <button disabled={isPending}>{isPending ? "提交中" : "保存"}</button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
```

### 3.2 `useOptimistic` 的三层模型

乐观 UI 不等于直接改真实数据。更稳的心智模型是三层：

1. **真实状态**：服务端或外部 store 返回的确认数据。
2. **临时投影**：用户操作后立即展示的 optimistic patch。
3. **错误恢复**：失败时撤销投影、提示原因、允许重试。

```tsx
import { useOptimistic } from "react";

type Todo = {
  id: string;
  title: string;
  pending?: boolean;
};

type OptimisticTodoAction = {
  title: string;
  clientId: string;
};

function optimisticReducer(
  current: Todo[],
  action: OptimisticTodoAction,
): Todo[] {
  return [
    { id: action.clientId, title: action.title, pending: true },
    ...current,
  ];
}

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    optimisticReducer,
  );

  async function submit(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;

    addOptimisticTodo({ title, clientId: crypto.randomUUID() });
    await createTodoOnServer(title);
  }

  return (
    <form action={submit}>
      <input name="title" />
      <button type="submit">新增</button>
      <ul>
        {optimisticTodos.map((todo) => (
          <li key={todo.id}>
            {todo.pending ? `${todo.title}（同步中）` : todo.title}
          </li>
        ))}
      </ul>
    </form>
  );
}
```

## 四、`use()`、Suspense 与数据读取

`use()` 的关键不是“在组件里随便 fetch”，而是让组件读取由父级、框架或缓存层创建的 Promise，并把 pending 状态交给 Suspense。

```tsx
import { Suspense, use } from "react";

type User = {
  id: string;
  name: string;
};

type UserCardProps = {
  userPromise: Promise<User>;
};

function UserCard({ userPromise }: UserCardProps) {
  const user = use(userPromise);
  return <h2>{user.name}</h2>;
}

export function UserPanel({ userPromise }: UserCardProps) {
  return (
    <Suspense fallback={<p>加载用户中...</p>}>
      <UserCard userPromise={userPromise} />
    </Suspense>
  );
}
```

注意：不要在 render 过程中每次创建新的 Promise；否则会导致重复请求和持续 suspend。

## 五、Server Components：边界比 API 更重要

### 5.1 Server / Client 不是 JSX 父子边界

`"use client"` 标记的是**模块依赖树边界**，不是“这个组件的 JSX 子树全部变成客户端组件”。Server Component 可以把另一个 Server Component 作为 `children` 传给 Client Component，只要客户端模块没有直接 import 服务端模块。

```tsx
// app/page.tsx — Server Component
import { ClientShell } from "./ClientShell";
import { ServerOnlyFeed } from "./ServerOnlyFeed";

export default async function Page() {
  return (
    <ClientShell>
      <ServerOnlyFeed />
    </ClientShell>
  );
}
```

```tsx
// app/ClientShell.tsx
"use client";

import { ReactNode, useState } from "react";

type ClientShellProps = {
  children: ReactNode;
};

export function ClientShell({ children }: ClientShellProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section>
      <button onClick={() => setExpanded((value) => !value)}>切换</button>
      {expanded && children}
    </section>
  );
}
```

### 5.2 Server Component 没有 `"use server"` 指令

- Server Component 是框架默认的服务端渲染组件形态。
- `"use server"` 用来标记可被客户端引用并远程调用的 **Server Function**。
- 当 Server Function 作为 `<form action>` 或 `formAction` 使用时，才是表单语境下的 Server Action。

### 5.3 RSC 安全边界

RSC 不等于“客户端不会看到任何服务端信息”。只要数据被序列化进 RSC Payload，客户端就能间接获得。因此：

1. 不要把 token、cookie、内网 URL、数据库连接串放进 props。
2. 所有来自客户端的 Server Function 参数都要重新鉴权和校验。
3. 只向客户端传可序列化、可展示、可审计的数据。
4. 缓存要区分公共数据、用户级数据和请求级数据。

```tsx
type PublicUserProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

function toPublicUserProfile(user: InternalUserRecord): PublicUserProfile {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}
```

## 六、SSR、RSC、PPR 的区别

| 能力                  | 主要产物                          | 解决的问题                             | 常见误区                        |
| --------------------- | --------------------------------- | -------------------------------------- | ------------------------------- |
| SSR                   | HTML                              | 首屏可见、SEO、减少白屏                | 以为 SSR 自动减少所有客户端 JS  |
| Streaming SSR         | 分块 HTML                         | 让页面边加载边展示                     | 忽略 Suspense 边界设计          |
| RSC                   | RSC Payload + HTML                | 减少客户端组件和客户端数据获取         | 把 RSC 当成普通 API 返回 JSON   |
| Partial Pre-rendering | 静态壳 + postponed state + resume | 先生成可缓存静态壳，请求时恢复动态区域 | 把 `prerender` 当成普通流式 SSR |

选择顺序：

1. 页面大部分静态、少量动态：优先考虑 PPR / 静态壳。
2. 页面强依赖请求时数据：Streaming SSR + Suspense 边界。
3. 组件无需浏览器交互：优先 Server Component。
4. 需要事件、state、Effect、浏览器 API：Client Component。

## 七、资源加载 API：下载、解析、执行要分开想

React 19 的资源加载 API 可以把资源意图提前告诉浏览器。记忆方式：

- `preload`：提前下载普通资源，例如字体、图片、样式。
- `preinit`：提前下载并初始化会执行或应用的资源，例如脚本、样式。
- `preloadModule`：提前下载 ESM 模块。
- `preinitModule`：提前下载并执行 ESM 模块初始化。

```tsx
import { preinit, preload, preloadModule } from "react-dom";

export function ProductPageHead() {
  preload("/fonts/inter.woff2", {
    as: "font",
    crossOrigin: "anonymous",
  });

  preinit("/styles/product.css", {
    as: "style",
  });

  preloadModule("/chunks/recommendation-panel.js");

  return null;
}
```

## 八、迁移检查清单

### 8.1 从 React 17/旧 React 18 迁移

- [ ] 入口从 `ReactDOM.render` 迁移到 `createRoot` / `hydrateRoot`。
- [ ] 清理依赖副作用的 render 逻辑，保证 StrictMode 下可重复执行。
- [ ] 把“输入同步 + 结果延后”的场景改成 `startTransition` / `useDeferredValue`。
- [ ] 将数据请求的 loading/error 组合逐步迁移到 Suspense 边界或框架数据层。

### 8.2 引入 React 19

- [ ] 表单 mutation 优先试点 `useActionState`。
- [ ] 乐观 UI 使用 `useOptimistic`，不要直接污染真实状态。
- [ ] 新组件 ref 优先按 prop 传递；旧库兼容时再保留 `forwardRef`。
- [ ] 资源预加载放到真实性能瓶颈链路，不要全量滥用。

### 8.3 引入 RSC / Server Functions

- [ ] 明确 `"use client"` 的模块边界。
- [ ] Server Function 参数全部重新鉴权、校验、限流。
- [ ] props 只传可序列化公开数据。
- [ ] 错误、重定向、缓存刷新由框架约定统一处理。

## 九、面试回答模板

### Q1：Concurrent Rendering 解决了什么？

它把 render 阶段改造成可中断、可恢复、可按优先级调度的工作循环。用户输入等紧急更新可以打断低优先级渲染，避免大列表或复杂组件树阻塞主线程。但 commit 阶段仍然同步不可中断，所以副作用和 DOM 写入依旧要谨慎。

### Q2：React 19 Actions 的价值是什么？

Actions 把异步 mutation 纳入 React 调度体系，减少手写 pending、error、optimistic 和提交顺序控制。表单场景中可以配合 `useActionState`、`useFormStatus` 和 `useOptimistic`，让提交、反馈、错误恢复和渐进增强更一致。

### Q3：RSC 和 SSR 有什么区别？

SSR 主要产出 HTML，解决首屏可见和 SEO；RSC 产出可被客户端合并的组件 payload，解决“哪些组件和数据根本不需要进客户端包”的问题。两者可以组合：Server Components 决定组件边界和数据位置，SSR/Streaming/PPR 决定页面如何发送给浏览器。

### Q4：什么时候必须用 Client Component？

只要组件需要浏览器事件、`useState`、`useEffect`、DOM API、浏览器存储或客户端状态库，就必须进入 Client Component。否则默认优先 Server Component，减少客户端 JS 和 hydration 成本。
