# React 18 与 19 新特性解析

## React 18 核心特性

### 并发渲染（Concurrent Rendering）

React 18 引入并发渲染，可以同时准备多个版本的 UI，支持可中断渲染。使用 `createRoot` 替代 `ReactDOM.render` 开启并发模式环境。但 `createRoot` 只是打开了"开关"，普通的 `setState` 依然是同步不可中断的，必须配合 `useTransition`、`useDeferredValue` 等并发特性 Hook 才能触发时间切片。

### 自动批处理（Automatic Batching）

React 18 自动批处理所有场景的更新，包括 Promise、setTimeout、原生事件处理器中的更新。React 17 只在事件处理器中批处理，而 React 18 中 `setTimeout` 内的多个 `setState` 只触发一次重渲染。如需退出自动批处理，使用 `flushSync`。

### Transition API

`useTransition` 返回 `[isPending, startTransition]`，用于标记非紧急更新。典型场景：输入框实时更新（紧急）+ 搜索结果渲染（非紧急），保持界面响应流畅。

### Suspense 增强与 useDeferredValue

服务端支持 Suspense，新增 `useDeferredValue` Hook 延迟更新值，支持流式 SSR。`useDeferredValue` 返回延迟后的值，React 会先用旧值渲染，等高优先级任务完成后再用新值渲染。

### 新 Hooks

`useId` 生成稳定唯一 ID，解决 SSR 中服务端和客户端 ID 不匹配的问题。`useSyncExternalStore` 用于订阅外部数据源，解决并发渲染下外部 store 的撕裂问题。

## React 18 双缓存与 Fiber 架构

双缓存机制（Double Buffering）在 React 16 引入 Fiber 架构时就已存在。内存中同时维护 `current Tree`（当前显示）和 `workInProgress Tree`（构建中），更新完成后通过指针切换完成视图更新。React 16/17 虽有双缓存结构，但默认同步执行；React 18 正式开放基于双缓存的并发特性，支持在 `workInProgress` 树上计算到一半时挂起，先处理高优先级任务。

## React 19 核心特性

### React Compiler

自动优化组件，减少手动 `useMemo`、`useCallback` 的需要。编译时分析和优化代码，降低开发复杂度，代码更简洁直观。

### Actions（表单增强）

新增 `useActionState`、`useFormStatus` Hooks，原生支持表单提交的异步处理，自动处理 pending、error 状态：

```jsx
const [state, formAction, isPending] = useActionState(signup, null);
return <form action={formAction}>...</form>;
```

### use() Hook

可以在渲染中读取 Promise 或 Context，突破 Hooks 规则限制支持条件性使用 Context，数据获取更接近同步写法。

### Document Metadata 支持

组件内直接设置 `<title>`、`<meta>` 等标签，自动提升到 `<head>` 中，不再需要 `react-helmet` 等第三方库。

### ref 作为普通 prop

`ref` 可以作为普通 prop 传递，不再需要 `forwardRef`，简化 API 和类型推导。

### useOptimistic

React 19 引入的乐观 UI Hook，在异步操作完成前先在界面显示预期结果。`useOptimistic(state, updateFn)` 返回 `[optimisticState, addOptimistic]`，乐观状态只存在于当前 Action 执行周期内，一旦真实数据更新或 Action 结束自动销毁，无需手动回滚。

### 资源预加载 API

`preload()`、`preinit()` 等 API 优化资源加载时机，减少白屏时间。

## useTransition vs useDeferredValue

`useTransition` 控制状态更新函数的执行（"这个更新不着急"），适用于能控制 `setState` 触发时机的场景（如点击按钮、Tab 切换），返回 `isPending` 状态。`useDeferredValue` 控制数据值（"先用旧值顶一下"），适用于无法控制状态更新触发的场景（如从父组件接收 props），仅返回延迟后的值。

## Webpack Module / Chunk / Bundle 关系

三者是构建流程不同阶段的产物：Module（解析阶段，源代码中的每个文件）→ Chunk（优化阶段，多个 module 的集合，包括 Entry Chunk、Async Chunk、Runtime Chunk）→ Bundle（输出阶段，最终生成的文件）。Module 是原料，Chunk 是半成品，Bundle 是成品。

## 总体趋势

React 18 关注并发渲染基础，解决性能瓶颈和渲染优先级问题。React 19 关注开发体验优化，简化 API、减少样板代码、自动优化。设计理念从手动到自动、从复杂到简单、从分离到集成演进。
