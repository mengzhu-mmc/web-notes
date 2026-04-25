# React 一页速记

> 来源：[牛客网-面试题-React.md](../牛客网-面试题-React.md) | ~30 题浓缩
> ⚠️ 部分内容较旧，以 React 18/19 为准

---

## 核心概念

- **虚拟 DOM**：JS 对象描述 DOM 结构，通过 Diff 算法（O(n)）减少真实 DOM 操作
- **Diff 三条假设**：同层比较、不同类型不同树、key 标识稳定节点
- **Fiber 架构**：双缓存（current/workInProgress）+ 两阶段（Render 可中断 / Commit 不可中断）
- **key 的作用**：标识节点身份，避免复用错误；**不要用 index**（列表顺序变化时会导致状态错乱）

## Hooks

| Hook | 要点 | 常见坑 |
|---|---|---|
| `useState` | 批处理（React 18 自动）、异步更新 | 依赖旧值时用函数式更新 `setX(prev => ...)` |
| `useEffect` | 依赖数组决定执行时机 | 闭包陷阱：effect 内读到旧 state |
| `useCallback` | 缓存函数引用 | 不要滥用，只有传给 memo 子组件时才有意义 |
| `useMemo` | 缓存计算结果 | 同上，只在计算昂贵时用 |
| `useRef` | 持久化引用（不触发重渲染） | 改 `.current` 不会触发更新 |

- **自定义 Hook**：以 `use` 开头，内部可调用其他 Hook，用于逻辑复用
- **Hook 规则**：只在顶层调用、只在 React 函数中调用

## 性能优化

- **React.memo**：浅比较 props，避免不必要的重渲染
- **useCallback + React.memo** 链路：父组件缓存函数 → 子组件 memo 生效
- **代码分割**：`React.lazy()` + `Suspense` 实现路由级/组件级懒加载
- **避免**：在 render 中创建新对象/新函数（每次都是新引用，memo 失效）

## 状态管理

- **Redux 三原则**：单一数据源、state 只读、纯函数 reducer
- **RTK**：Redux Toolkit，简化写法（createSlice / configureStore）
- **Zustand**：更轻量的替代方案，API 简洁
- **Context**：适合低频更新的全局数据（主题/语言），高频更新会导致所有消费者重渲染

## React 18

- **并发模式**：`createRoot()` 启用，渲染可中断
- **自动批处理**：所有场景都批处理（包括 setTimeout/Promise），可用 `flushSync()` 退出
- **useTransition**：标记非紧急更新，保持 UI 响应性
- **Suspense**：支持数据获取的 fallback

## 常见问题

- **受控组件**：value 由 state 控制（推荐）；**非受控组件**：用 ref 直接读 DOM
- **ErrorBoundary**：`componentDidCatch` / `getDerivedStateFromError`，捕获子树渲染错误
- **严格模式**：开发环境 effect 执行两次（检测副作用），生产环境不执行
