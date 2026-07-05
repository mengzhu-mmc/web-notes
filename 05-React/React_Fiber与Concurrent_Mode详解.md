# React Fiber 架构与虚拟 DOM

## 面试高频考点

- 什么是虚拟 DOM？它的优缺点？
- React Fiber 是什么？解决了什么问题？
- React 的 diff 算法是怎么工作的？
- 为什么 React 需要 key？
- React 的调和（Reconciliation）过程？

---

## 一、虚拟 DOM（Virtual DOM）

### 什么是虚拟 DOM

虚拟 DOM 是用 JavaScript 对象来描述真实 DOM 结构的一种抽象。

```text
// JSX
<div className="container">
  <h1>Hello</h1>
  <p>World</p>
</div>

// 编译后的虚拟 DOM 对象
{
  type: 'div',
  props: {
    className: 'container',
    children: [
      { type: 'h1', props: { children: 'Hello' } },
      { type: 'p', props: { children: 'World' } }
    ]
  }
}
```

### 虚拟 DOM 的优缺点

**优点：**

- **跨平台**：虚拟 DOM 是纯 JS 对象，可以渲染到不同平台（浏览器、Native、服务端）
- **批量更新**：将多次 DOM 操作合并，减少真实 DOM 操作次数
- **声明式编程**：开发者只需描述"应该是什么样"，框架负责"怎么变"

**缺点：**

- **首次渲染慢**：需要额外创建虚拟 DOM 树
- **内存占用**：需要维护一份虚拟 DOM 树
- **不一定比直接操作 DOM 快**：对于简单场景，直接操作 DOM 可能更快

> 虚拟 DOM 的真正价值不是"快"，而是"足够快"的同时提供了更好的开发体验。

---

## 二、Diff 算法

React 的 diff 算法基于三个假设（启发式算法，O(n) 复杂度）：

1. **不同类型的元素产生不同的树**（直接替换，不复用）
2. **开发者可以通过 key 标识哪些元素在不同渲染中保持稳定**
3. **同层比较**（不跨层级比较）

### 同类型元素的比较

```text
// 更新前
<div className="before" title="stuff" />
// 更新后
<div className="after" title="stuff" />
// 结果：只更新 className 属性，复用 DOM 节点
```

### 不同类型元素

```text
// 更新前
<div><Counter /></div>
// 更新后
<span><Counter /></span>
// 结果：销毁整个 div 树（包括 Counter），重新创建 span 树
```

### 列表 diff 与 key

```text
// 没有 key 时，React 按位置比较
// 更新前：[A, B, C]
// 更新后：[B, C, A]（A 移到末尾）
// React 会更新 A→B, B→C, C→A（3次更新）

// 有 key 时，React 按 key 匹配
// React 识别出 B、C 只是移动了，A 也只是移动了
// 只需要移动 DOM 节点，不需要更新内容

// ❌ 不要用 index 作为 key（列表重排时会出问题）
{
  list.map((item, index) => <Item key={index} data={item} />);
}

// ✅ 用稳定唯一的 id
{
  list.map((item) => <Item key={item.id} data={item} />);
}
```

---

## 三、React Fiber 架构

### 为什么需要 Fiber？

React 15 的问题：**Stack Reconciler（栈调和器）**

- 递归处理组件树，一旦开始就无法中断
- 如果组件树很深，JS 线程会被长时间占用
- 导致浏览器无法响应用户输入，页面卡顿（掉帧）

### Fiber 的核心思想

**时间切片（Time Slicing）**：将渲染工作拆分成小单元，每个单元执行完后检查是否有更高优先级的任务（如用户输入），有则暂停当前工作，先处理高优先级任务。

```
Fiber 节点 = 虚拟 DOM 节点 + 工作单元

每个 Fiber 节点包含：
- type：组件类型
- key：唯一标识
- stateNode：对应的真实 DOM 或组件实例
- return：父 Fiber
- child：第一个子 Fiber
- sibling：下一个兄弟 Fiber
- pendingProps / memoizedProps：新旧 props
- memoizedState：当前 state（Hooks 链表）
- effectTag：需要执行的副作用类型（插入/更新/删除）
```

### Fiber 的两个阶段

**阶段一：Render/Reconcile（可中断）**

- 遍历 Fiber 树，找出需要更新的节点
- 构建 workInProgress 树（双缓冲）
- 可以被高优先级任务中断

**阶段二：Commit（不可中断）**

- 将 Render 阶段的结果应用到真实 DOM
- 执行生命周期和副作用（useEffect 等）
- 必须同步完成，不能中断

```
双缓冲机制：
current 树 ←→ workInProgress 树
（当前显示的）  （正在构建的）

构建完成后，两棵树互换角色
```

### 优先级调度

React 18 引入了并发模式，不同更新有不同优先级：

```
优先级从高到低：
1. 同步（Sync）：如 flushSync
2. 用户阻塞（UserBlocking）：如点击、输入
3. 普通（Normal）：如网络请求后的更新
4. 低（Low）：如数据预加载
5. 空闲（Idle）：如离屏渲染
```

```text
// React 18 并发特性
import { startTransition, useTransition, useDeferredValue } from "react";

// startTransition：标记为低优先级更新
startTransition(() => {
  setSearchResults(results); // 不阻塞用户输入
});

// useTransition：带 pending 状态的 transition
const [isPending, startTransition] = useTransition();
startTransition(() => setTab("heavy"));
// isPending 为 true 时可以显示 loading

// useDeferredValue：延迟更新某个值
const deferredQuery = useDeferredValue(query);
// deferredQuery 会在空闲时才更新，不阻塞当前渲染
```

---

## 四、Fiber 遍历机制（深度优先）

React 构建 workInProgress 树采用**深度优先遍历（DFS）**，遵循 `child → sibling → return` 的顺序。

```text
function performUnitOfWork(unitOfWork) {
  // 1. beginWork：处理当前节点，创建子 Fiber
  let next = beginWork(current, unitOfWork, renderLanes);

  if (next === null) {
    // 2. 没有子节点，进入 complete 阶段
    completeUnitOfWork(unitOfWork);
  } else {
    // 3. 有子节点，继续向下遍历
    workInProgress = next;
  }
}

function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    completeWork(completedWork);
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber; // 有兄弟节点，处理兄弟
      return;
    }
    completedWork = completedWork.return; // 没有兄弟，回到父节点
    workInProgress = completedWork;
  } while (completedWork !== null);
}
```

对于树 `A → B(→D), C(→E)`，遍历顺序为：`A → B → D → C → E`。

**为什么使用深度优先？**

- 符合组件树结构特点（先处理子组件，再回到父组件）
- 便于 complete 阶段从叶子节点向上回溯收集副作用
- 利于时间切片（可以在任意节点中断和恢复）
- 内存效率高（只需维护当前工作路径，不需要队列存储所有同层节点）

---

## 五、Fiber 节点核心字段

```text
{
  type,         // 节点类型（'div' | App | () => {}）
  props,        // 当前属性
  stateNode,    // 真实 DOM 节点或组件实例
  return,       // 父 Fiber 节点
  child,        // 第一个子 Fiber 节点
  sibling,      // 下一个兄弟 Fiber 节点
  alternate,    // 双缓存：指向另一棵树的对应节点
  flags,        // 副作用标记（Placement/Update/Deletion）
  lanes,        // 优先级（31位二进制 Lane）
}
```

- `alternate`：`currentFiber.alternate = wipFiber`，两棵树互相指向，构建时不销毁旧树
- `flags`：Placement（新增）、Update（更新）、Deletion（删除）
- `lanes`：31 位二进制表示优先级，同步 > 交互事件 > 网络返回 > 懒加载

---

## 六、时间切片：为什么用 MessageChannel 而非 requestIdleCallback？

React 时间切片底层用的是 **MessageChannel**，不是 `requestIdleCallback`，原因如下：

| 对比项     | requestIdleCallback                              | MessageChannel                 |
| ---------- | ------------------------------------------------ | ------------------------------ |
| 执行时机   | 浏览器空闲时才执行，用户交互频繁时可能一直被推迟 | 每帧都能稳定执行（宏任务）     |
| 给的时间   | 可能不足 1ms                                     | 可以精确控制（React 设为 5ms） |
| 兼容性     | Safari 不支持                                    | 全面支持                       |
| 优先级控制 | React 无法自定义优先级                           | 可配合 Scheduler 精确调度      |

```text
// React 借用 MessageChannel 产生"干净的宏任务"
const channel = new MessageChannel();
// port1 发消息，port2 收消息（自己给自己发）
// 时间片用完 → 停止工作 → port1.postMessage() → 产生宏任务
// 浏览器执行渲染 → onmessage 触发 → 恢复工作

// 源码佐证
export const frameYieldMs = 5; // 5ms 时间片

function shouldYieldToHost() {
  return getCurrentTime() - startTime >= frameYieldMs;
}
```

### 常见误区：时间片和浏览器 16.6ms 帧是「解耦」的

一个高频错误说法是「浏览器每 16.6ms 检查一次刷新，React 占用其中的 5ms 干活」。这不准确：

- **5ms 是一个固定常量**（`frameYieldMs = 5`），**不是从 16.6ms 帧里切出来的一段**。React 的调度器不依附于浏览器的帧节奏。
- Scheduler 用 **`MessageChannel.postMessage` 把工作切成一个个宏任务**来跑。每个宏任务里循环执行 `performUnitOfWork`，每处理一个节点就调用一次 `shouldYield()`，只要**本段已经跑满 5ms** 就中断，再 `postMessage` 排下一个宏任务续跑。
- 让出主线程的目的，是把控制权还给浏览器，让它有机会处理**输入事件、渲染**等；至于这个间隙浏览器要不要绘制、什么时候绘制，由浏览器按自己的刷新率决定，**和 React 的 5ms 时间片没有对齐关系**。

> 「16.6ms 检查 / 用 rAF 动态算帧预算」其实描述的是 React 16 **最初设想、但已被弃用**的方案：早期打算用 `requestIdleCallback` 配合 rAF 计算每帧剩余时间，因触发不稳定、兼容性差被放弃，最终改成 `MessageChannel` + 固定 5ms 时间片[[React Scheduler 源码 - GitHub](https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js)]。

### 关键前提：可中断只在「并发模式」下才生效

Fiber 架构（React 16）只是把递归 reconcile 重构成了**可中断的链表循环**，让时间切片**成为可能**——但它本身不等于「异步可中断」。在 legacy 同步模式（`ReactDOM.render`）下，即使底层是 Fiber，更新依然是**同步、一口气跑完、不可中断**的。真正把时间切片开起来，要靠 React 18 的 `createRoot` 或并发特性（如 `startTransition`）。

> 严谨表述：**Fiber 提供了可中断的底层结构，并发模式（Concurrent Rendering）才把这个能力真正开启。** 详见下方「并发模式」章节的开启条件。

---

## 七、协调阶段 vs 提交阶段

### 协调阶段（render/reconcile）——可中断

- 深度优先遍历，基于 current 树增量构建 workInProgress 树
- 为每个 Fiber 节点打 flags 标记
- 每处理完一个任务单元检查时间（5ms），超时立即让出主线程
- 高优先级更新可**抛弃**低优先级的 workInProgress，重新构建

### 提交阶段（commit）——不可中断，分3个子阶段

| 子阶段              | 时机               | 执行内容                                             |
| ------------------- | ------------------ | ---------------------------------------------------- |
| **before mutation** | DOM 修改前         | 处理 `useEffect` 清理函数、`getSnapshotBeforeUpdate` |
| **mutation**        | 真正操作 DOM       | 根据 flags 执行插入/更新/删除                        |
| **layout**          | DOM 更新后、绘制前 | 执行 `componentDidMount/Update`、`useLayoutEffect`   |

`useEffect` 在提交阶段完成后**异步**执行（不阻塞浏览器绘制）。

---

## 八、React 渲染流程总结

```
触发更新（setState / props 变化 / forceUpdate）
    ↓
Scheduler（调度器）：根据优先级决定何时执行
    ↓
Reconciler（协调器）：Render 阶段（可中断）
  - 遍历 Fiber 树（beginWork + completeWork）
  - 对比新 element vs 旧 Fiber，标记 flags
  - 构建 workInProgress 树
  - 时间切片：5ms 到就让出主线程（MessageChannel）
    ↓
Renderer（渲染器）：Commit 阶段（不可中断）
  - before mutation：处理 useEffect 清理
  - mutation：操作真实 DOM（插入/更新/删除）
  - layout：执行 componentDidMount/Update、useLayoutEffect
  - 异步执行 useEffect
```

### 一句话面试标准答案

> React Fiber 采用**双缓存 + 时间切片 + 优先级调度**：协调阶段基于 current 树增量构建 workInProgress 树，可中断、可恢复、可插队；时间片默认 **5ms**，时间到立即通过 **MessageChannel** 释放主线程，不阻塞浏览器；高优先级更新可抛弃低优先级的构建进度，重新开始；提交阶段分 before mutation / mutation / layout 三个子阶段，一次性将变更应用到 DOM，保证视图一致性。

# React 并发模式与 Suspense

> React 18 最重要的特性，面试高频考点：并发渲染原理、useTransition、useDeferredValue、Suspense 数据获取。

## 面试高频考点

1. **React 18 的并发模式是什么？和之前有什么区别？**
2. **useTransition 和 useDeferredValue 的区别和使用场景？**
3. **Suspense 的工作原理是什么？如何配合数据获取使用？**
4. **startTransition 解决了什么问题？**
5. **并发模式下 React 如何保证 UI 一致性？**

---

## 一、并发模式的核心思想

### 1.1 同步渲染 vs 并发渲染

**React 17 及之前（同步渲染）**：

```
用户输入 → React 开始渲染 → 渲染完成（中途不可中断）
```

渲染一旦开始就必须执行到底，如果组件树很大，会长时间占用主线程，导致用户输入无响应（卡顿）。

**React 18 并发渲染**：

```
用户输入 → React 开始渲染 → 发现更高优先级任务 → 暂停当前渲染 → 处理高优先级任务 → 恢复渲染
```

并发模式让 React 可以**中断、暂停、恢复、丢弃**渲染工作，始终保持 UI 对用户输入的响应。

### 1.2 开启并发模式

```text
// React 17（旧版，同步模式）
ReactDOM.render(<App />, document.getElementById("root"));

// React 18（并发模式）
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
```

使用 `createRoot` 即开启并发模式，这是 React 18 的默认行为。

#### 「开启并发模式」到底意味着什么——两层含义

很多人以为「用了 `createRoot` 页面就会自动变成可中断的并发渲染」，这是误解。准确来说分**两层**：

**第一层：`createRoot` 只是「解锁」并发能力，不是「全量启用」。**

- 只要用 `createRoot`（而非旧的 `ReactDOM.render`）挂载应用，就进入了 **Concurrent Mode 的运行时**——并发特性**可用**了。
- 但**默认的普通更新（如直接 `setState`、事件回调里的更新）仍是同步、不可中断的**。`createRoot` 本身不会把你所有的更新都变成可切片的低优先级任务。
- 也就是说：`createRoot` 是「把并发发动机装上车」，但不代表「一直在用并发档位跑」。

**第二层：真正触发「可中断、可切片」渲染，需要显式把更新标记为并发（低优先级）。** 满足以下任一条件，该次更新才会走可中断的并发渲染路径：

| 触发方式                       | 说明                                                               |
| ------------------------------ | ------------------------------------------------------------------ |
| `startTransition(() => {...})` | 把回调内的 state 更新标记为 Transition（非紧急），可被高优先级打断 |
| `useTransition()`              | 同上，额外提供 `isPending` 状态                                    |
| `useDeferredValue(value)`      | 让派生值延迟更新，延迟版本的重渲染走并发路径                       |
| `<Suspense>` 内的挂起与恢复    | 数据/组件未就绪时的等待与重试，由并发渲染驱动                      |
| `use()` Hook 触发的挂起        | React 18/19 中读取未就绪 Promise，触发并发下的 Suspense            |

一句话概括开启条件：**① 用 `createRoot` 挂载（解锁并发运行时）→ ② 用 `startTransition` / `useTransition` / `useDeferredValue` / `Suspense` 等把某次更新标记为「非紧急」，这次更新才真正享受可中断、可丢弃、可插队的时间切片。** 只做①不做②，普通更新依旧同步。

> 换句话说：**并发不是一个「全局开关」，而是一组「可组合的 API」。** `createRoot` 提供土壤，具体哪次更新并发，由你用并发 API 逐处声明。（这也是官方在 React 18 后不再叫「Concurrent Mode（模式）」而叫「Concurrent Features（特性）」的原因。）

---

## 二、useTransition — 标记低优先级更新

### 2.1 问题场景

搜索框输入时，同时触发两件事：更新输入框显示（高优先级）和过滤大量列表（低优先级）。如果两者同步执行，列表过滤会阻塞输入框更新，导致输入卡顿。

### 2.2 基本用法

```tsx
import { ChangeEvent, useState, useTransition } from "react";

interface SearchResult {
  id: string;
  title: string;
}

function SearchPage({ allItems }: { allItems: SearchResult[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextQuery = event.target.value;

    // 高优先级：立即更新输入框
    setQuery(nextQuery);

    // 低优先级：标记为 transition，可被中断
    startTransition(() => {
      setResults(heavyFilter(allItems, nextQuery));
    });
  }

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <span>搜索中...</span>}
      <ResultList results={results} />
    </div>
  );
}
```

**`isPending`**：transition 更新还在进行中时为 `true`，可用于显示 loading 状态。

### 2.3 工作原理

`startTransition` 内的状态更新被标记为"过渡更新"（Transition Update），优先级低于"紧急更新"（Urgent Update，如用户输入、点击）。当有紧急更新时，React 会中断过渡更新，先处理紧急更新，再恢复过渡更新。

```
优先级从高到低：
SyncLane（同步）> InputContinuousLane（连续输入）> DefaultLane（默认）> TransitionLane（过渡）> IdleLane（空闲）
```

---

## 三、useDeferredValue — 延迟派生值

### 3.1 基本用法

```tsx
import { ChangeEvent, useDeferredValue, useMemo, useState } from "react";

interface SearchResult {
  id: string;
  title: string;
}

function SearchPage({ allItems }: { allItems: SearchResult[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query); // 延迟版本的 query

  const visibleResults = useMemo(
    () => heavyFilter(allItems, deferredQuery),
    [allItems, deferredQuery],
  );

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {/* 使用延迟值渲染列表，不阻塞输入框 */}
      <SlowList results={visibleResults} stale={query !== deferredQuery} />
    </div>
  );
}
```

`deferredQuery` 会"滞后"于 `query`：当 `query` 快速变化时，`deferredQuery` 保持旧值，等到浏览器空闲时才更新，避免每次击键都触发昂贵的列表重渲染。

### 3.2 useTransition vs useDeferredValue

| 对比项       | `useTransition`        | `useDeferredValue`               |
| ------------ | ---------------------- | -------------------------------- |
| 控制对象     | 状态更新（setter）     | 值（已有的 state/prop）          |
| 使用场景     | 你能控制状态更新的地方 | 接收 prop 或无法修改更新逻辑时   |
| loading 状态 | ✅ `isPending`         | ❌ 需要自己对比新旧值            |
| 典型场景     | 搜索、Tab 切换         | 接收父组件传来的 prop 做昂贵渲染 |

**选择原则**：能用 `useTransition` 就用它（更明确）；当你无法控制状态更新的来源（如 prop 来自父组件），用 `useDeferredValue`。

---

## 四、Suspense — 声明式异步处理

### 4.1 基本用法（代码分割）

```text
import { Suspense, lazy } from "react";

const HeavyComponent = lazy(() => import("./HeavyComponent"));

function App() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 4.2 Suspense 的工作原理

Suspense 的核心机制是**抛出 Promise**：

```text
// 简化版原理
function fetchData(url) {
  let status = "pending";
  let result;
  const promise = fetch(url)
    .then((res) => res.json())
    .then(
      (data) => {
        status = "success";
        result = data;
      },
      (err) => {
        status = "error";
        result = err;
      },
    );

  return {
    read() {
      if (status === "pending") throw promise; // ← 抛出 Promise！
      if (status === "error") throw result;
      return result;
    },
  };
}
```

当组件调用 `resource.read()` 时：

1. 数据未就绪 → 抛出 Promise → React 捕获 → 渲染最近的 `<Suspense>` 的 `fallback`
2. Promise resolve → React 重新尝试渲染该组件
3. 数据就绪 → `read()` 返回数据 → 正常渲染

### 4.3 React 18 的 use Hook（新方式）

React 18 引入了 `use` Hook，可以在组件内直接 await Promise：

```text
import { use, Suspense } from "react";

// 在组件外创建 Promise（不能在组件内创建，否则每次渲染都是新 Promise）
const userPromise = fetchUser(userId);

function UserProfile() {
  const user = use(userPromise); // 如果 Promise 未完成，自动触发 Suspense
  return <div>{user.name}</div>;
}

function App() {
  return (
    <Suspense fallback={<Skeleton />}>
      <UserProfile />
    </Suspense>
  );
}
```

### 4.4 Suspense + 错误边界

```text
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <div>出错了：{this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <AsyncComponent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## 五、并发特性综合实战

### 场景：搜索 + 分页 + 懒加载

```text
import { useState, useTransition, Suspense, lazy } from "react";

const ResultDetail = lazy(() => import("./ResultDetail"));

function SearchApp() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (value) => {
    setQuery(value); // 高优先级：立即更新输入框

    startTransition(() => {
      setPage(1); // 低优先级：重置分页
    });
  };

  const handlePageChange = (newPage) => {
    startTransition(() => {
      setPage(newPage); // 翻页是低优先级操作
    });
  };

  return (
    <div>
      <input onChange={(e) => handleSearch(e.target.value)} />

      {isPending ? <div className="loading-overlay">更新中...</div> : null}

      <SearchResults query={query} page={page} onSelect={setSelectedId} />

      {selectedId && (
        <Suspense fallback={<DetailSkeleton />}>
          <ResultDetail id={selectedId} />
        </Suspense>
      )}
    </div>
  );
}
```

---

## 六、并发模式的注意事项

### 副作用可能执行多次

并发模式下，React 可能多次调用渲染函数（包括 render 阶段的生命周期和函数组件体）。副作用必须放在 `useEffect` 中，不能放在渲染函数里：

```text
// ❌ 危险：渲染函数中的副作用可能执行多次
function Component() {
  console.log("渲染了"); // 可能打印多次
  analytics.track("view"); // 可能上报多次！
  return <div />;
}

// ✅ 正确：副作用放在 useEffect 中
function Component() {
  useEffect(() => {
    analytics.track("view"); // 只在挂载时执行一次
  }, []);
  return <div />;
}
```

### StrictMode 双重调用

React 18 的 StrictMode 在开发环境下会故意调用组件函数两次，用于检测副作用问题。这是正常行为，生产环境不会发生。

---

## 七、面试答题模板

**Q：React 18 并发模式解决了什么问题？**

React 17 的同步渲染模型中，一旦开始渲染就无法中断，大型组件树会长时间占用主线程，导致用户输入卡顿。React 18 的并发模式让渲染变得可中断、可暂停、可恢复，通过优先级调度保证高优先级更新（用户输入）始终能及时响应，低优先级更新（数据过滤、列表渲染）在空闲时执行。

**Q：useTransition 和 useDeferredValue 怎么选？**

两者都用于标记低优先级更新，区别在于控制点：`useTransition` 包裹状态更新的 setter 调用，适合你能控制更新来源的场景，且提供 `isPending` 状态；`useDeferredValue` 接收一个值并返回其延迟版本，适合接收来自 prop 或无法修改更新逻辑的场景。能用 `useTransition` 就优先用它，语义更清晰。

---

# React 原理精读：写给中级前端的核心心智模型

> 💡 **导读**：对于 2~3 年经验的前端开发者而言，直接一头扎进 React 庞大且充斥着位运算的源码中，性价比极低且容易劝退。本文剥离了繁杂的底层 C++ 风格代码实现，通过“伪代码”和“心智模型”的维度，直击 React 核心架构的设计初衷。
>
> 我们不背源码，我们只拆解**它遇到了什么问题、为什么这么设计、这么设计的好处是什么**。

---

## 核心哲学：React 是个状态机

### 1. 设计初衷与要解决的问题

- **jQuery 时代的痛点**：在传统的命令式编程中，开发者需要手动追踪状态的变化，并精确地计算出应该去操作哪一个具体的 DOM 节点。当页面交互（如购物车、复杂表单）变得极其复杂时，数据流向就会变成一团乱麻（意大利面条代码），极易产生 Bug，且极难维护。
- **React 的解法**：提出 `UI = fn(state)` 的声明式哲学。你只需要告诉我“状态（state）是什么”，我（React）负责计算出“长什么样（UI）”，并全自动帮你把真实 DOM 修改成那个样子。

### 2. 为什么要有 Virtual DOM（虚拟 DOM）？

- **设计初衷**：真实的 DOM 节点是非常庞大的对象（包含成百上千个属性和方法），直接频繁操作真实 DOM 会导致浏览器严重的回流（Reflow）和重绘（Repaint），性能极差。
- **有什么好处**：
  1. **性能缓冲**：Virtual DOM 本质上就是一个轻量级的普通 JavaScript 对象（包含 `type`, `props`, `children`）。React 先在内存中用非常廉价的计算代价找出两棵 VDOM 树的差异（Diff 算法），最后只把真正的差异点（Patch）一次性应用到真实 DOM 上。
  2. **跨平台能力**：既然中间多了一层 JS 对象，那么这个对象就不一定要渲染成网页（浏览器 DOM）。它可以交给不同的“渲染器（Renderer）”，渲染成手机原生组件（React Native）、桌面应用甚至终端界面。

---

## 架构演进：为什么要有 Fiber 架构？（最高频面试考点）

这是 React 16 最大的架构重构，也是最体现 React 团队工程能力的设计。

### 1. React 15 的致命痛点：同步递归渲染 (Stack Reconciler)

- **问题所在**：在 React 15 中，当我们调用 `setState` 触发更新时，React 会从根节点开始，**同步地、递归地**对比整棵组件树。
- **为什么致命**：浏览器的 JS 线程和 GUI 渲染线程是**互斥的**（也就是同一时间只能一个人干活）。如果你的组件树非常庞大，这个递归 Diff 过程可能会耗时 100 毫秒甚至更久。这 100 毫秒内，JS 线程被霸占，浏览器无法响应用户的点击、滚动，甚至连 CSS 动画都会卡顿、掉帧。

### 2. Fiber 的设计初衷：可中断的循环

- **解决思路**：既然“一口气干完”会卡死，那我们就把它拆分成无数个“小任务”。每做完一个小任务，就看看浏览器有没有更紧急的事情（如用户点击、渲染高优动画）。如果有，就先把控制权交还给浏览器，等浏览器空闲了再回来接着干。这被称为**时间分片（Time Slicing）**。
- **为什么叫 Fiber（纤程）**：它是一种比线程（Thread）还要细粒度的控制力，完全由用户态（React 框架自己）去调度，而不是由操作系统调度。

### 3. Fiber 树长什么样？（从“树”到“链表”）

- 为了实现“随时可以中断并恢复”，原有的递归数据结构（执行栈）必须被废弃。React 团队将这棵树打碎，重新设计成了一个**带有多个指针的单向链表**。
- 每一个 Fiber 节点（即一个组件或 DOM 节点）都包含三个核心指针：
  1. `return`：指向父节点。
  2. `child`：指向第一个子节点。
  3. `sibling`：指向右侧的第一个兄弟节点。
- **有什么好处**：这种数据结构使得 React 在遍历时，无论随时停在哪里，都可以通过这三个指针极其轻易地找到回家的路，或者找到下一个该遍历的节点。

### 4. “时间分片”的大白话伪代码模型

借助于浏览器的 `requestIdleCallback` API（实际上 React 自己用 MessageChannel 模拟实现了类似的功能），我们可以这样理解 Fiber 的工作循环：

```text
let nextUnitOfWork = null; // 记录下一个要执行的 Fiber 节点任务

function workLoop(deadline) {
  // 当有任务需要执行，并且浏览器还有剩余空闲时间时
  while (nextUnitOfWork && deadline.timeRemaining() > 1) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork); // 执行当前任务，并返回下一个任务
  }

  // 如果任务没执行完，但是时间到了
  if (nextUnitOfWork) {
    // 主动让出主线程，告诉浏览器：“你先去忙渲染或响应点击吧，下次空闲了再叫我”
    requestIdleCallback(workLoop);
  }
}
```

---

## 渲染机制：双缓冲模型 (Double Buffering)

### 1. 设计初衷与要解决的问题

- 既然 Fiber 架构允许我们的 Diff 过程（找差异）随时被中断，那如果我算了一半，突然被更高优先级的任务打断了，页面上会不会只渲染了一半的新内容，一半的老内容？（画面撕裂）

### 2. 怎么解决：分为两个阶段 (Render & Commit)

React 将整个更新过程严格分为了两个阶段：

1. **Render 阶段（纯计算、可中断）**：
   - 在内存中，React 默默地构建一棵新的 Fiber 树（称为 `workInProgress` 树）。
   - 这个阶段纯粹是找差异，不上屏幕，所以**随便你怎么中断、重启、废弃都可以**，用户根本看不见。
2. **Commit 阶段（同步执行、不可中断）**：
   - 一旦 `workInProgress` 树在内存中完整构建完毕，React 就进入 Commit 阶段。
   - 这时，React 会在一瞬间将新树上收集到的所有真实 DOM 变更（如增删改查）一次性、**同步地**应用到屏幕上。

### 3. 有什么好处：内存指针一键切换

屏幕上当前显示的视图对应着 `current Fiber` 树，而内存中刚建好的新树叫 `workInProgress`。当 Commit 阶段完成后，React 只需要**把底层的一个指针从 `current` 指向 `workInProgress`**，新树瞬间就变成了当前树。这与大型单机游戏渲染画面时防止画面撕裂的“双缓冲显存技术”如出一辙——后台画板画完，前台画板直接翻面替换。

---

## Hooks 架构：为何有严格的调用顺序规则？

### 1. 痛点：为什么不能把 Hooks 放在 if/else 里？

React 官方文档极其严厉地警告：**不要在循环、条件判断或嵌套函数中调用 Hooks。** 这让很多初学者感到困惑，为什么不能像普通函数那样随意调用？

### 2. 设计初衷：Hooks 的底层其实是“单向链表”

当我们在一个函数组件中调用多个 `useState` 或 `useEffect` 时，React 底层是如何区分这些独立的状态的？它没有靠变量名（如 `const [age] = useState()`），而是纯粹**靠执行的先后顺序**。

- **挂载阶段（Mount）**：每执行到一个 Hook（如 `useState`），React 就在当前组件的 Fiber 节点上，以单向链表的形式挂载一个 Hook 对象。
  ```text
  Hook1 (name) ---> Hook2 (age) ---> Hook3 (useEffect)
  ```
- **更新阶段（Update）**：当组件重新渲染时，React 会再次按照你写的代码顺序，从链表头顺藤摸瓜去读上一次存下来的状态。

### 3. 为什么设计成链表（不设计成对象/Map）？

- **有什么好处**：
  1. **闭包安全与独立性**：你可以多次调用同一个自定义 Hook（比如两次 `useForm()`），它们彼此之间的状态是完全隔离的，因为每次调用都会在链表上新追加一组节点，绝不会像基于 `Map` 或对象键值对那样发生命名冲突。
  2. **极致的轻量**：链表结构的内存开销极小，不需要维护额外的 hash 计算或键名存储，非常符合 React 函数组件频繁被调用的高性能要求。

### 4. 违反规则的灾难后果

如果你的代码是这样写的：

```text
if (isAdult) {
  const [car, setCar] = useState("BMW"); // 这是第二顺位的 Hook
}
const [money, setMoney] = useState(100); // 正常是第三顺位
```

假设某次渲染时 `isAdult` 变成了 `false`，第二个 `useState` 被跳过了。那么当 React 读到第三个 `useState(100)` 时，它会去读链表上的**第二顺位**（本来存的是 'BMW'），直接导致状态错乱，整个组件彻底崩溃。

> **总结**：Hooks 的极简使用体验，建立在“执行顺序绝对稳定”这一个极其脆弱的隐式契约之上。这也是为什么 React 团队开发了专门的 ESLint 插件来强制规范你的写法。

## 现代 Concurrent API 心智模型（2026-05-22）

> Updated: 2026-05-22 based on official React 19.2 release notes: https://react.dev/blog/2025/10/01/react-19-2.

Concurrent Mode 不应该再理解成一个需要整体打开的“模式开关”，而是一组可组合 API：React 根据更新优先级、Suspense 边界和用户输入，把工作切片、暂停、恢复或丢弃。

### API 对照

| API / 能力                               | 解决的问题                                        | 典型使用                                    |
| ---------------------------------------- | ------------------------------------------------- | ------------------------------------------- |
| `startTransition` / `useTransition`      | 把非紧急更新标记为 transition，避免阻塞输入       | 搜索过滤、路由切换、重型列表更新            |
| `useDeferredValue(value, initialValue?)` | 让派生 UI 滞后于高优先级输入；React 19 支持初始值 | 输入框实时响应，结果区延迟刷新              |
| `<Suspense>`                             | 为异步数据或 lazy 组件提供可中断边界              | RSC、路由分块、懒加载                       |
| `<Activity />`                           | 隐藏但保留 UI 状态，并降低隐藏更新优先级          | Tab、返回恢复、下一页预渲染                 |
| Performance Tracks                       | 观察 React 调度和组件渲染轨迹                     | 定位 transition 是否被阻塞、effect 是否过重 |

### TypeScript 示例：输入优先，列表延后

```tsx
import { ChangeEvent, useDeferredValue, useMemo, useState } from "react";

interface Product {
  id: string;
  name: string;
  tags: string[];
}

interface ProductSearchProps {
  products: Product[];
}

export function ProductSearch({ products }: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query, "");

  const visibleProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) return products;
    return products.filter((product) =>
      product.name.toLowerCase().includes(normalizedQuery),
    );
  }, [deferredQuery, products]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  const isStale = query !== deferredQuery;

  return (
    <section aria-busy={isStale}>
      <input value={query} onChange={handleChange} />
      <ProductList products={visibleProducts} stale={isStale} />
    </section>
  );
}
```

### 判断口诀

1. 用户正在输入、点击、拖拽时，交互反馈优先。
2. 列表过滤、图表重算、路由内容切换可以进入 transition。
3. 数据/代码未就绪时用 Suspense 边界兜底，而不是把 loading 状态散落在多层组件里。
4. 只是暂时不可见但马上可能回来，用 `<Activity />`；真正不再需要才卸载。
5. 性能问题先用 Performance Tracks 验证优先级和耗时，再决定是否手写 memo 或拆分边界。

## 现代并发 API 巡检补充（2026-05-25）

> Updated: 2026-05-25 based on React 19.2 release notes and Activity docs: https://react.dev/blog/2025/10/01/react-19-2, https://react.dev/reference/react/Activity

### 并发不是“全局开关”

现代 React 里更建议把并发理解为一组可组合能力：`startTransition` 标记非紧急更新，`useTransition` 暴露 pending 状态，`useDeferredValue` 延迟消费高频输入，`Suspense` 切分等待边界，`<Activity />` 则让隐藏子树以更低优先级继续准备。

```tsx
import {
  Activity,
  Suspense,
  useDeferredValue,
  useState,
  useTransition,
} from "react";

interface Product {
  id: string;
  title: string;
}

interface SearchPageProps {
  products: Product[];
}

export function SearchPage({ products }: SearchPageProps) {
  const [query, setQuery] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  return (
    <>
      <input
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          startTransition(() => setShowPreview(nextQuery.length > 0));
        }}
      />
      {isPending && <span>更新结果中...</span>}
      <Suspense fallback={<p>加载搜索结果...</p>}>
        <SearchResults products={products} query={deferredQuery} />
      </Suspense>
      <Activity mode={showPreview ? "visible" : "hidden"}>
        <RecommendationPreview query={deferredQuery} />
      </Activity>
    </>
  );
}
```

### 调试顺序

1. 先用 React DevTools / Chrome Performance Tracks 确认是 render、commit、effect 还是网络等待慢。
2. 输入卡顿优先考虑 `startTransition` 和 `useDeferredValue`。
3. 切换页面丢状态或重复加载，优先考虑 `<Activity />` 与 Suspense 边界。
4. 服务端首屏等待过长，再考虑 streaming SSR、RSC、Partial Pre-rendering 的架构拆分。

## 2026-06-16 巡检补充：Transition、Action 与 deferred value 的边界

> Updated: 2026-06-16 based on official React `startTransition`, `useTransition`, and `useDeferredValue` docs.

现代 React 的并发能力不是“把所有 setState 都包进 transition”，而是把**紧急交互、非阻塞渲染、异步 Action、旧内容保留**分层处理。`startTransition(action)` 会立即执行传入函数，并把该函数同步执行期间调度的 state update 标记为 Transition；它本身不提供 pending 状态，组件内需要 pending UI 时应使用 `useTransition`[[startTransition – React]](https://react.dev/reference/react/startTransition)。

### 1. 输入框状态必须同步更新

Transition update 不能用于控制文本输入；输入框自身的 `value` 应同步更新，昂贵列表、图表或搜索结果再通过 `useDeferredValue` 延后消费[[useTransition – React]](https://react.dev/reference/react/useTransition)。

```tsx
import { ChangeEvent, Suspense, useDeferredValue, useState } from "react";

interface SearchResult {
  id: string;
  title: string;
}

interface SearchResultsProps {
  query: string;
  stale: boolean;
}

function SearchResults({ query, stale }: SearchResultsProps) {
  const results = useSearchResults(query);

  return (
    <ul aria-busy={stale} style={{ opacity: stale ? 0.55 : 1 }}>
      {results.map((item: SearchResult) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  return (
    <section>
      <input value={query} onChange={handleChange} />
      <Suspense fallback={<p>搜索结果加载中...</p>}>
        <SearchResults query={deferredQuery} stale={isStale} />
      </Suspense>
    </section>
  );
}
```

`useDeferredValue` 返回的值会在更新时先保持旧值，再在后台尝试用新值重渲染；如果后台渲染挂起，用户会继续看到旧内容而不是最近的 Suspense fallback[[useDeferredValue – React]](https://react.dev/reference/react/useDeferredValue)。它不会减少网络请求，也不会设置固定延迟；它优化的是 React 渲染优先级，真正的请求节流仍要配合 debounce、throttle、缓存或框架数据层[[useDeferredValue – React]](https://react.dev/reference/react/useDeferredValue)。

### 2. Action 可以异步，但 `await` 后的 setState 要重新标记

`useTransition()` 返回 `[isPending, startTransition]`，适合在组件内展示 pending 状态；传给 `startTransition` 的函数被称为 Action，Action 内可以执行副作用，但 `await` 之后的 state update 目前需要再次包进 `startTransition` 才会继续被标记为 Transition[[useTransition – React]](https://react.dev/reference/react/useTransition)。

```tsx
import {
  startTransition as markTransition,
  useState,
  useTransition,
} from "react";

interface SaveResult {
  version: number;
}

async function saveDraft(content: string): Promise<SaveResult> {
  return api.saveDraft(content);
}

export function DraftToolbar({ content }: { content: string }) {
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startSaveTransition] = useTransition();

  function handleSave() {
    startSaveTransition(async () => {
      try {
        const result = await saveDraft(content);
        markTransition(() => {
          setVersion(result.version);
          setError(null);
        });
      } catch {
        markTransition(() => {
          setError("保存失败，请稍后重试");
        });
      }
    });
  }

  return (
    <section aria-busy={isPending}>
      <button disabled={isPending} onClick={handleSave}>
        {isPending ? "保存中" : "保存草稿"}
      </button>
      <span>版本：{version}</span>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
```

如果一个异步流程可能被快速重复触发，普通 Transition 内的 async update 可能出现完成顺序和触发顺序不一致的问题；常见表单和提交场景应优先用 `useActionState`、`<form action>` 或 Server Functions，因为这些抽象会处理常见的提交顺序问题[[useTransition – React]](https://react.dev/reference/react/useTransition)。

### 3. 选择口诀

- **控制输入值**：同步 `setState`，不要放进 Transition。
- **输入驱动慢列表**：输入同步更新，列表消费 `useDeferredValue`。
- **按钮触发慢渲染或页面切换**：用 `useTransition` 拿 `isPending`，把非紧急状态更新标记为 Transition。
- **组件外或数据库里触发非阻塞更新**：用独立的 `startTransition`，但它没有 pending 标记。
- **异步提交要顺序和错误状态**：优先 `useActionState` / form Action / Server Function，而不是手写一堆 Transition 队列。
- **Suspense 导航**：路由或页面切换默认应该进入 Transition，避免已经显示的内容被突兀 fallback 替换。

面试可以这样收束：`startTransition` 是“标记非紧急更新”的 API，`useTransition` 是“带 pending 状态的组件内版本”，`useDeferredValue` 是“延后消费某个值”的 API。输入框自身永远优先保持同步；慢列表、图表、路由内容和 Suspense 子树才适合并发降级。
