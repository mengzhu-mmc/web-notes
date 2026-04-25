# Solid.js v2.0.0 Beta 发布

> 来源: JavaScript Weekly #776 | 2026-03-10
> 原文: https://www.solidjs.com/blog/solid-2-beta

## 核心变化

### 1. 原生异步支持
- 计算（computations）可以返回 Promise 或 async iterables
- 响应式图（reactive graph）会围绕 Promise 自动挂起和恢复
- 异步成为一等公民，不再需要特殊包装

### 2. `<Suspense>` → `<Loading>`
- `<Suspense>` 被废弃
- 新的 `<Loading>` 组件专用于初始渲染的加载状态
- 语义更清晰：Loading 就是加载中

### 3. 一等公民 `action()` 原语
- 用于 mutations（数据变更操作）
- 内置乐观更新（optimistic update）支持
- 类似 React Server Actions 的理念，但基于细粒度响应式

### 4. 架构理念
Ryan Carniato 认为：**细粒度响应式（fine-grained reactivity）是 AI-agent 时代唯一可持续的前端模型**。

> 在 AI 自动生成大量 UI 代码的世界里，能自动追踪最小依赖并精确更新的框架，比虚拟 DOM diff 更高效、更可预测。

## 迁移注意
- 破坏性变更较多，需要阅读 [迁移指南](https://docs.solidjs.com/migration-guide)
- 目前是 Beta 阶段，不建议生产使用

## 前端面试相关
- 可以作为"关注前端动态"的谈资
- 体现对响应式系统（Signals）趋势的了解：Vue/Solid/Angular 都在拥抱细粒度响应式

---

## 代码示例

### Solid.js v1 vs v2 响应式写法对比

```jsx
// ==================== Solid.js v1 写法 ====================

import { createSignal, createEffect, createResource, Suspense } from 'solid-js';

// v1: createSignal — 细粒度响应式基础
function CounterV1() {
  const [count, setCount] = createSignal(0);

  createEffect(() => {
    console.log('count changed:', count()); // 自动追踪依赖
  });

  return <button onClick={() => setCount(c => c + 1)}>Count: {count()}</button>;
}

// v1: createResource — 异步数据加载
function UserCardV1({ id }) {
  const [user] = createResource(id, async (userId) => {
    const res = await fetch(`/api/users/${userId}`);
    return res.json();
  });

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>{user()?.name}</div>
    </Suspense>
  );
}

// ==================== Solid.js v2 写法 ====================

import { createSignal, createEffect } from 'solid-js';

// v2: 计算可直接返回 Promise（异步一等公民）
function UserCardV2({ id }) {
  // v2: <Loading> 替代 <Suspense>，语义更清晰
  const user = () => fetch(`/api/users/${id()}`).then(r => r.json());
  // 响应式图会自动追踪 id()，id 变化时自动重新 fetch 并挂起

  return (
    <Loading fallback={<div>Loading...</div>}>
      <div>{user().name}</div>
    </Loading>
  );
}

// v2: action() 原语 — mutations with optimistic update
import { action, useAction } from '@solidjs/router';

const updateUser = action(async (data) => {
  const res = await fetch('/api/users', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.json();
});

function EditForm() {
  const update = useAction(updateUser);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await update({ name: 'New Name' });
    // action 内置乐观更新：提交前 UI 立即响应，失败时自动回滚
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Signals 核心原理（框架无关）

```js
// Signals 是细粒度响应式的核心原语
// Vue 3 (ref/reactive)、Solid、Angular Signals、Preact Signals 都是这个思想

// 极简 Signal 实现（帮助理解原理）
let currentEffect = null;

function createSignal(initialValue) {
  let value = initialValue;
  const subscribers = new Set();

  const read = () => {
    // 自动收集当前正在执行的 effect 作为订阅者
    if (currentEffect) {
      subscribers.add(currentEffect);
    }
    return value;
  };

  const write = (newValue) => {
    value = typeof newValue === 'function' ? newValue(value) : newValue;
    // 精确通知所有订阅者（只更新依赖此 signal 的部分）
    subscribers.forEach(fn => fn());
  };

  return [read, write];
}

function createEffect(fn) {
  const effect = () => {
    currentEffect = effect;
    fn(); // 执行时自动收集依赖
    currentEffect = null;
  };
  effect(); // 立即执行一次，完成依赖收集
}

// 使用
const [count, setCount] = createSignal(0);
createEffect(() => console.log('count:', count())); // 输出: count: 0
setCount(1); // 输出: count: 1（精确更新，不需要 diff 整个组件树）
```

### 细粒度响应式 vs 虚拟 DOM 对比

```jsx
// ==================== React（虚拟 DOM）====================
// 状态变化 → 整个组件函数重新执行 → 生成新 VDOM → diff → patch DOM

function ReactCounter() {
  const [count, setCount] = useState(0);
  // 每次 setCount，整个函数重新执行
  console.log('render'); // 每次点击都会打印
  return (
    <div>
      <span>{count}</span> {/* React 需要 diff 整个 div */}
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  );
}

// ==================== Solid.js（细粒度响应式）====================
// 状态变化 → 只有订阅了此 Signal 的 DOM 节点精确更新，无 diff

function SolidCounter() {
  const [count, setCount] = createSignal(0);
  console.log('setup'); // 只在组件初始化时执行一次！
  return (
    <div>
      {/* 只有这个文本节点订阅了 count，更新时只更新这里 */}
      <span>{count()}</span>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  );
}

// 关键差异：
// React: 重新执行整个组件函数（有 VDOM diff 保底）
// Solid: 组件函数只执行一次，之后只有 DOM 节点级别的精确更新
```

---

## 面试考点

### Q1：什么是细粒度响应式（Fine-grained Reactivity）？和 VDOM 有什么区别？

**标准答案要点：**
- **VDOM（React）**：状态变化 → 组件重新渲染 → 生成新 VDOM → diff 算法比较差异 → 更新 DOM
- **细粒度响应式（Solid/Vue）**：Signal 值变化 → 自动通知所有订阅了该 Signal 的 DOM 节点/计算 → 直接更新，无需 diff
- 优势：理论上更高效（跳过 VDOM diff），更新粒度更细（只更新真正变化的部分）
- 代表框架：Solid.js（最纯粹）、Vue 3（ref/reactive）、Angular Signals（v17+）

### Q2：Signals 是什么？为什么 Angular 和 Vue 都在拥抱它？

**标准答案要点：**
- Signal 是细粒度响应式的核心原语：一个可以被**订阅**的值容器
- 读取时自动收集依赖（`track`），写入时自动通知订阅者（`trigger`）
- 无需手动管理订阅/取消订阅，无需 `useEffect` 声明依赖数组
- 趋势：Vue3 的 `ref`、Solid 的 `createSignal`、Angular 的 `signal()`、Preact Signals 都是同一思想
- 意义：比 React 的 "重新渲染整个组件" 更精确，性能更好，心智负担更小

### Q3：React 和 Solid.js 的核心设计差异是什么？

**标准答案要点：**
- **React**：推崇"UI 是状态的函数"（`UI = f(state)`），组件重新执行是正常行为，VDOM diff 是安全网
- **Solid**：组件只是初始化的工厂函数，之后不再执行；响应式是直接的 DOM 操作，无 VDOM
- 选择建议：React 生态更成熟，Solid 性能基准更好（JSFramework Benchmark 常年第一/第二）
- 共同点：都是声明式 UI，JSX 语法相似，组件化思想相通

### Q4：乐观更新（Optimistic Update）是什么？如何实现？

**标准答案要点：**
- 定义：在服务器响应**之前**，先在 UI 上展示预期结果，失败时再回滚
- 目的：消除网络延迟感，提升用户体验（用户操作立即有反馈）
- 实现步骤：① 保存旧状态 ② 立即更新 UI ③ 发请求 ④ 失败则用旧状态回滚
- Solid v2 `action()` 内置支持；React 可用 `useOptimistic`（React 19）或 `TanStack Query` 实现

---

## 关键点总结

- **Solid v2 最大变化**：异步一等公民 + `action()` 原语 + `<Loading>` 替代 `<Suspense>`
- **行业趋势**：细粒度响应式（Signals）正在成为前端框架主流方向
- **面试价值**：能聊 Signals 原理、对比 React VDOM，是面试加分项
- **实用建议**：当前仍是 Beta，生产环境等稳定版；可在新项目中试水

---

## 相关知识

- [[Vue 3 响应式原理：ref 与 reactive]]
- [[React Hooks 原理与 useEffect 依赖收集]]
- [[2026-03-12-typescript-6-rc]] — 同期 TS 工具链动态
- [[前端框架演进：React → Vue → Solid → ？]]
- [[乐观更新与 TanStack Query]]
