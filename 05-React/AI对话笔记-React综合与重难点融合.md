# 知识融合报告 - AI 对话笔记（综合 + React 专题）

> ⚠️ 该文档合并了 `AI对话笔记-综合.md` 和 `AI对话笔记-React专题.md`，两份旧笔记的详细内容已被吸收进相应的系统知识地图中。这篇笔记作为核心高频题和重难点（闭包陷阱、Fiber双缓存、多次 setState 机制等）的汇总版供突击复习。

---

## 🚀 核心架构与底层原理

### 一、React Fiber 与双缓存机制

**1. 设计动机**
- 旧版（React 15及以前）：全量同步递归更新（Reconciler），任务一旦开始就无法停止，长时间执行会阻塞浏览器主线程，导致动画卡顿和交互延迟。
- 架构升级（React 16+）：引入 Fiber 架构，从**同步阻塞更新**变为**异步可中断更新**。React 18 的 `createRoot` 正式开放了基于该架构的并发特性。

**2. 两大生命周期阶段**
- **协调阶段（Render / Reconcile）—— 可中断**
  - 使用双缓存：`current` 树（当前展示）+ `workInProgress` 树（正在构建的新树）。
  - 基于 `current` 树深度优先遍历（**循环+链表**代替递归），增量构建 `workInProgress` 树。
  - 遍历过程为每个节点打 `flags` 标记（Update/Placement/Deletion）。
  - **时间切片**：每处理完一个Fiber单元就检查时间（底层依赖 `MessageChannel` 产生的宏任务），默认 5ms，超时立即让出主线程给浏览器绘制。
  - **优先级调度**（Lanes机制）：高优先级更新（如用户输入）可**插队并抛弃**低优先级（如数据获取）的构建进度，重新开始。
- **提交阶段（Commit）—— 不可中断**
  - 分三个子阶段：
    1. **Before mutation**：DOM 修改前，处理 `useEffect` 清理函数。
    2. **Mutation**：真正操作 DOM，一次性根据 flags 将所有变更应用到真实 DOM 上。
    3. **Layout**：DOM 已更新，执行 `componentDidMount` / `useLayoutEffect`。
  - 结束后，通过切换指针 `root.current = finishedWork` 完成双缓存交替。

**3. Fiber 节点核心结构**
```tsxx
{
  type,         // 节点类型 ('div', Component等)
  props,        // 属性
  stateNode,    // 真实DOM或组件实例
  return,       // 父节点 (深度优先遍历的“回溯”关键)
  child,        // 第一个子节点
  sibling,      // 下一个兄弟
  alternate,    // 对应旧Fiber (双缓存：currentFiber.alternate = wipFiber)
  flags,        // 增/删/改标记
  lanes,        // 优先级
}
```

---

## 🛠️ 核心机制与开发陷阱

### 二、React 闭包陷阱（Stale Closures）

**1. 产生原因**
组件渲染时，函数/Effect 捕获了**当时的 state 快照**。由于依赖数组设置不当（如 `[]`）或其他原因导致函数未更新，即便外部 state 已改变，闭包内引用的仍是旧值。
> 本质：React 每次渲染都是一次独立的函数调用，各自有独立的变量快照。

**2. 经典场景**
```tsxx
function Demo() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setInterval(() => {
      console.log(count); // 空依赖导致只执行一次，永远打印首次的 0！
    }, 1000);
  }, []); 
}
```

**3. 解决方案**
- **方案A：补全依赖**（最本分） - `useEffect` 依赖加入 `[count]`，每次变化重新绑挂定时器。
- **方案B：函数式更新** - `setCount(prev => prev + 1)`，如果只是为了更新而不需读取最新状态值。
- **方案C：使用 `useRef`**（最通用、ahooks `useMemoizedFn` 底层原理） - `useRef` 内容随时可变且在生命周期内引用唯一。
  ```tsxx
  const countRef = useRef(count);
  countRef.current = count; // 每次渲染都同步最新值
  // 定时器内部读取 countRef.current
  ```
- **方案D：`useEvent`（React 18+ 提案/相关实现）** - 从 Effect 中剥离出响应式外部状态的函数。

---

### 三、连续三次调用 setState 怎么都生效？

**1. 背景与表现**
React 默认会**合并批量更新**（Batching），如果在同一宏任务或同步代码内多次调用对象式 `setState`，React 只触发一次渲染，且后调用的状态会覆盖前面的。

**2. 解决方案对比**
| 方式 | 渲染次数 | 值是否生效 | 推荐度 | 说明 |
| --- | --- | --- | --- | --- |
| **函数式更新** | 1次 | ✅ 生效 | ⭐⭐⭐⭐⭐ | `setCount(prev => prev + 1)`，队列中保证按顺序执行。 |
| **flushSync** | 3次 | ✅ 生效 | ⭐⭐⭐ | React 18 强制同步更新并立即重绘 DOM，性能损耗大。 |
| **setTimeout** | 3次 | ✅ 生效 | ⭐⭐ | 通过宏任务绕开批处理机制（React 18 中 setTimeout 也会自动批处理，不再完全适用该 hack）。 |

---

### 四、useMemo 与 useCallback 的空依赖效果

- **空数组 `[]`**：仅在组件首次挂载时执行计算或创建引用，后续**永远复用首次结果**。极易引发闭包陷阱。
- **不传依赖**：每次组件重渲染都重新计算/创建，相当于**没有缓存**。

> ⚠️ 核心注意：传 `[]` 仅适用于“内部完全不依赖组件任何 state/props”的纯净计算。有依赖必须加入数组，否则必然导致数据不一致。

---

## 🏗️ 实战进阶方案

### 五、使用 useContext + useReducer 模拟 Redux

适合中小型应用，免去额外引包。
**实现流程：**
1. **Context**：`createContext()` 创建上下文。
2. **Reducer**：纯函数，处理 state 和 action（`switch(action.type)...`）。
3. **Provider**：包裹根组件，`const [state, dispatch] = useReducer(reducer, initialState)`，然后将 `{ state, dispatch }` 通过 `Context.Provider value` 传入。
4. **Consumer**：业务组件通过 `useContext(StoreContext)` 提取 `state` 或 `dispatch` 使用。

> **局限性：** 当 Context 值更新时，所有消费该 Context 的组件都会重渲染，如果不做 Context 拆分或细粒度的 Memo 优化，容易遇到性能瓶颈。

### 六、React Suspense 的常见场景

1. **代码分割/懒加载（传统用法）**
   `React.lazy` 配合 `Suspense` 加载非首屏页面。
2. **异步数据获取（React 18+ 推荐）**
   配合 SWR、React Query 或 React 19 的 `use()` API，将请求挂起时的 fallback 状态上提至最近的 `Suspense` 边界。
3. **配合并发模式**
   结合 `useTransition` 或 `useDeferredValue` 优化加载过程。

---

## 🎯 其他高频基础面试题

- **为什么更新数据必须用 setState？**
  触发重渲染；支持批量更新优化；保证数据不可变性原则（用于快速 Diff 对比）；支持并发调度优先级。
- **useEffect 与 useLayoutEffect 的区别？**
  `useEffect` 是异步的，在浏览器绘制结束后执行，不阻塞视觉更新。`useLayoutEffect` 是同步的，在 DOM 更新后、浏览器绘制前执行，用于处理需要测量 DOM 尺寸防止闪烁的场景。
- **为什么要用 key？能用 index 吗？**
  key 是 React 进行 Diff 时识别节点是否可复用的唯一标识。用 index 做 key，在列表发生插入、删除排序变化时，会因为索引平移导致状态错乱和不必要的 DOM 重建。
- **减少不必要渲染的手段？**
  `React.memo` (缓存组件渲染)、`useCallback` (缓存传给子组件的函数引用)、`useMemo` (缓存大开销计算或对象/数组引用)、合理的状态下推或状态拆分。