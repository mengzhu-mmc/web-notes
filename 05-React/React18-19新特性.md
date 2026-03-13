# React 18/19 新特性全解

> 收录日期：2026-03-07 | 来源：React 官方博客 + 掘金精选

## 关联笔记
- [[生命周期]] — React 18 对生命周期的影响
- [[[4863] 16  剖析 Fiber 架构下 Concurrent 模式的实现原理]] — 并发模式是 React 18 的基础
- [[[4861] 12  如何理解 Fiber 架构的迭代动机与设计思想]] — Fiber 架构演进
- [[[4868] 22  思路拓展：如何打造高性能的 React 应用？]] — 性能优化实践

---

## React 18 核心特性

### 1. 并发渲染（Concurrent Rendering）

React 18 最重要的改变：渲染可以**被中断**。

```jsx
// createRoot 替代 render（开启并发特性）
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root'));
root.render(<App />);

// ❌ 旧写法（React 17）
// ReactDOM.render(<App />, document.getElementById('root'));
```

### 2. 自动批处理（Automatic Batching）

React 17 只在事件处理器中批处理，React 18 **所有场景**都自动批处理：

```jsx
// React 18：setTimeout 里也会批处理（只触发一次渲染）
setTimeout(() => {
  setCount(c => c + 1);  // 不会立即渲染
  setFlag(f => !f);       // 不会立即渲染
  // React 18 会合并成一次渲染
}, 1000);
```

如果需要立即渲染，用 `flushSync`：
```jsx
import { flushSync } from 'react-dom';
flushSync(() => setCount(c => c + 1)); // 立即渲染
```

### 3. startTransition

标记**非紧急**更新，让紧急更新（输入、点击）优先：

```jsx
import { useTransition } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    setQuery(e.target.value);          // 紧急：立即更新输入框
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

```jsx
function SearchResults({ query }) {
  const deferredQuery = useDeferredValue(query);
  return <HeavyList query={deferredQuery} />;
}
```

### 5. Suspense 增强

支持**服务端渲染流式传输** + **数据获取**：

```jsx
<Suspense fallback={<Skeleton />}>
  <Comments />
</Suspense>
```

### 6. useId

生成 SSR 安全的唯一 ID：

```jsx
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

```jsx
// React 19：直接写，编译器自动优化
function TodoList({ todos, filter }) {
  const filtered = todos.filter(t => t.status === filter);
  return filtered.map(t => <Todo key={t.id} todo={t} />);
}
```

### 2. Actions（表单简化）

```jsx
function ChangeName() {
  const [error, submitAction, isPending] = useActionState(
    async (prev, formData) => {
      const name = formData.get('name');
      const error = await updateName(name);
      if (error) return error;
      redirect('/profile');
    },
    null
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

```jsx
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);
  return comments.map(c => <Comment key={c.id} comment={c} />);
}
```

### 4. Server Components

组件在服务端执行，不发送 JS 到客户端：

```jsx
// server component（默认）
async function BlogPost({ id }) {
  const post = await db.posts.find(id);
  return <article>{post.content}</article>;
}

// client component（需要交互时）
'use client';
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

| 问题 | 关键答案 |
|------|---------|
| React 18 最大改变？ | 并发渲染 + 自动批处理 |
| startTransition 解决什么？ | 区分紧急/非紧急更新，保持 UI 响应 |
| 为什么要 createRoot？ | 开启并发特性的入口 |
| React 19 的 Compiler？ | 编译时自动 memo，告别手动优化 |
| Server Components 意义？ | 减少客户端 JS 体积，直接访问后端资源 |
