# React 面试题

> 面向 2-3 年经验前端开发 | 共 30 题 | 涵盖虚拟DOM、Hooks、状态管理、性能优化、React 18

---

## 一、核心概念

### Q: 什么是虚拟 DOM？它为什么能提升性能？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

**虚拟 DOM（Virtual DOM）** 是用 JS 对象描述真实 DOM 结构的轻量级副本。

```js
// 真实 DOM
<div id="app" class="container">
  <h1>Hello</h1>
</div>

// 对应的虚拟 DOM 对象
{
  type: 'div',
  props: { id: 'app', className: 'container' },
  children: [
    { type: 'h1', props: {}, children: ['Hello'] }
  ]
}
```

**为什么能提升性能？**

直接操作真实 DOM 代价昂贵（触发回流/重绘），虚拟 DOM 的价值在于：
1. **批量更新**：将多次状态变更合并，一次性 patch 到真实 DOM
2. **Diff 算法**：对比新旧虚拟 DOM，只更新差异部分（最小化 DOM 操作）
3. **跨平台**：虚拟 DOM 可渲染到 Native（React Native）、Canvas 等

> ⚠️ 注意：虚拟 DOM 并不一定比手动操作 DOM 快，它的价值在于**保证性能下限**和**开发体验**，而非绝对性能最优。

**🔍 深层原理**

虚拟 DOM 的本质是**用 JS 计算换 DOM 操作**。DOM 操作昂贵的根本原因是：

1. **布局/回流（Reflow）**：修改影响布局的属性（width、height、position），浏览器需要重新计算所有元素的几何位置，是 CPU 密集型操作
2. **绘制/重绘（Repaint）**：颜色、背景等视觉属性变更，需重新绘制像素
3. **合成（Composite）**：分层合并，对 transform/opacity 等有优化

JS 引擎和 DOM 引擎是相互隔离的，每次"跨桥访问"DOM 都有额外开销。虚拟 DOM 的 Diff 在纯 JS 环境中运行，批量计算最小更新集，再一次性应用到真实 DOM，减少了跨桥次数。

```
状态变更 A → 虚拟DOM diff → 最小patch集 → 一次真实DOM更新
状态变更 B ↗                              （批量合并）
状态变更 C ↗
```

**⚠️ 常见误区**

- 误区1：虚拟 DOM 比 innerHTML 快 → **错误**。如果更新整个列表，innerHTML 可能更快；虚拟 DOM 的优势在于**局部精准更新**
- 误区2：虚拟 DOM 是 React 独有的 → Vue 2/3 也使用虚拟 DOM
- 误区3：越多用虚拟 DOM 越好 → 创建虚拟 DOM 对象本身有内存开销，超小型应用不一定需要

**🎯 面试追问**

**Q1: 虚拟 DOM 的 Diff 算法时间复杂度为什么是 O(n) 而不是 O(n³)？**

A: 标准树 Diff 的 O(n³) 来自：遍历树1 O(n) × 遍历树2 O(n) × 编辑距离 O(n) = O(n³)。React 通过三个假设（同层比较、类型不同直接替换、key 标识稳定节点）将复杂度降到 O(n)。

**Q2: 虚拟 DOM 与 Svelte 的编译时优化相比有何优劣？**

A: Svelte 在编译阶段分析依赖，生成精准的 DOM 更新代码，运行时无需 Diff，性能更优且包体积更小。虚拟 DOM 的优势在于运行时灵活（支持动态组件）和成熟的生态。

**Q3: React 的 JSX 最终是什么？**

A: JSX 经 Babel 编译后变成 `React.createElement(type, props, ...children)` 调用，返回虚拟 DOM 对象。React 17+ 引入新 JSX Transform，无需手动 `import React`，编译为 `_jsx()` 函数。

---

### Q: React 的 Diff 算法原理是什么？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

标准树 Diff 复杂度是 O(n³)，React 基于以下**三个假设**将其优化到 O(n)：

1. **不同类型的元素产生不同的树**（跨层移动忽略）
2. **同层节点通过 key 标识**（列表 Diff）
3. **开发者通过 key 暗示稳定节点**

**Diff 策略：**

**① Tree Diff（跨层移动）**：只对同层节点比较，不同层节点直接销毁重建
**② Component Diff（组件比较）**：同类型组件继续比较，不同类型直接替换
**③ Element Diff（元素比较）**：有 key → 优化移动操作；无 key → 逐位比较

```jsx
// key 的重要性：列表 Diff
// ❌ 不加 key 或用 index 作 key
{items.map((item, index) => <Item key={index} data={item} />)}
// 插入/删除导致后续所有节点重新渲染

// ✅ 用稳定唯一 id 作 key
{items.map(item => <Item key={item.id} data={item} />)}
// React 能识别节点移动，复用已有 DOM
```

**Fiber Diff 的改进（React 16+）：**
- 支持**可中断**的异步 Diff（时间切片）
- 新增：使用**单向链表**替代树结构，便于中断恢复

**🔍 深层原理**

**React 18 的 Fiber Diff 两轮遍历策略：**

第一轮：处理可复用节点（更新场景）

```
newFiber[0] vs oldFiber[0] → key/type 相同 → 复用
newFiber[1] vs oldFiber[1] → key 不同 → 停止第一轮
```

第二轮：处理剩余节点（增删/移动场景）

```
把剩余 oldFiber 放入 Map<key, fiber>
遍历剩余 newFiber → 从 Map 找匹配 → 找到复用、找不到新建
Map 中剩余未被复用的 → 标记删除
```

**移动节点的最优解（lastPlacedIndex）：**

```
旧序列: A B C D
新序列: D A B C

lastPlacedIndex = 0（初始）
处理 D: 在旧序列中 index=3 >= lastPlacedIndex(0) → 不需要移动，lastPlacedIndex=3
处理 A: 在旧序列中 index=0 < lastPlacedIndex(3) → 需要移动（插入到 D 后面）
处理 B: 在旧序列中 index=1 < lastPlacedIndex(3) → 需要移动
处理 C: 在旧序列中 index=2 < lastPlacedIndex(3) → 需要移动

结论: 只有 D 不动，A B C 都要移动 (3次移动)
最优解其实是: D 移到最前面 (1次移动) —— React 的策略非最优，但简单高效
```

**ASCII 流程图：Diff 整体流程**

```
新虚拟 DOM 树
      |
      v
同层节点比较（Tree Diff）
      |
   ┌──┴──┐
type不同  type相同
   |        |
 销毁      继续比较
 重建    (Component Diff)
           |
      ┌────┴────┐
   函数/类组件  DOM元素
      |            |
   递归比较    Element Diff
                   |
             ┌─────┴─────┐
           有key          无key
             |              |
         Map查找复用     逐位对比
```

**⚠️ 常见误区**

- 误区1：以为 React 会比较整棵树 → 实际只比较同层，跨层移动代价极高
- 误区2：以为 `key` 只是为了消除 warning → key 是 Diff 算法的核心 hint，影响性能
- 误区3：以为 key 唯一就行 → key 需在**同级兄弟节点中**唯一，不是全局唯一

**🎯 面试追问**

**Q1: 为什么不推荐用 Math.random() 做 key？**

A: 每次渲染 key 都不同，React 无法复用任何节点，等价于每次全量重建，性能极差，且会导致组件内部状态丢失。

**Q2: key 在 Context、ref 等方面还有什么影响？**

A: key 变化会导致组件完全卸载重挂（相当于销毁重建），可以利用这点强制重置组件状态（比 `useEffect` 清理更彻底）：`<Form key={userId} />` 切换用户时自动重置表单。

---

### Q: 什么是 Fiber 架构？解决了什么问题？

**难度**：⭐⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

**React 15 的问题**：Stack Reconciler 使用递归同步更新，一旦开始无法中断，长时间阻塞主线程导致页面卡顿（丢帧）。

**Fiber 的核心思想**：将渲染工作拆成**可中断的小单元（Fiber 节点）**，利用浏览器空闲时间（`requestIdleCallback` 思想）分批执行。

**Fiber 节点结构：**
```js
{
  type,           // 元素类型（div / MyComponent）
  key,            // key
  stateNode,      // 对应真实 DOM 节点
  return,         // 父 Fiber
  child,          // 第一个子 Fiber
  sibling,        // 下一个兄弟 Fiber
  pendingProps,   // 本次渲染的 props
  memoizedState,  // Hooks 链表（函数组件）
  flags,          // 副作用标记（Placement/Update/Deletion）
  lanes,          // 优先级
}
```

**双缓存机制（Double Buffering）：**
- **current tree**：当前页面正在显示的 Fiber 树
- **workInProgress tree**：正在后台构建的新 Fiber 树
- 构建完成后，`current` 指针切换到新树（类似显卡双缓存，避免撕裂）

**两个阶段：**
1. **Render/Reconcile 阶段**（可中断）：构建 workInProgress tree，标记副作用
2. **Commit 阶段**（不可中断）：将副作用同步应用到真实 DOM

**🔍 深层原理**

**为什么递归不能中断，链表可以？**

递归调用依赖 JS 调用栈，一旦压栈就必须等待弹栈，无法在中间"保存进度离开"。

Fiber 将树结构转成**三叉链表（child + sibling + return）**，遍历时只需保存当前 Fiber 节点指针，可以随时中断保存，下次从断点继续：

```
         App
        /    \
      Div    Span
      / \
     P   A

Fiber 链表遍历顺序（DFS）：
App → child → Div → child → P → return → Div → sibling → A
→ return → Div → return → App → sibling → Span → return → App

中断时只需记住当前节点指针，继续时从该节点 resume
```

**时间切片实现（Scheduler）：**

React 没有直接用 `requestIdleCallback`（兼容性差、最小帧间隔 50ms），而是自己实现了 Scheduler：
- 使用 `MessageChannel` 创建宏任务（5ms 时间片）
- 每个时间片结束检查是否需要让出控制权
- 有高优先级任务时（如用户输入）中断当前工作

```
帧1(16ms):
  |--React Fiber work(5ms)--|--浏览器处理用户输入(3ms)--|--React Fiber work(5ms)--|--空闲--|
```

**优先级 Lanes 模型（React 18）：**

```
SyncLane         = 0b0000000000000000000000000000001  // 最高优先级（同步）
InputContinuousLane = 0b0000000000000000000000000000100  // 用户输入
DefaultLane      = 0b0000000000000000000000000010000  // 默认
TransitionLane   = 0b0000000000000000000000001000000  // useTransition
IdleLane         = 0b0100000000000000000000000000000  // 空闲
```

**ASCII 流程图：Fiber 工作循环**

```
浏览器帧
    |
    v
workLoop() 开始
    |
    v
performUnitOfWork(fiber)  ← 可被中断
    |                          ↑
    ├── beginWork()            |
    |   (根据 type 执行组件)    |
    |   生成子 Fiber             |
    |                          |
    └── completeWork()         |
        (收集副作用)            |
        |                      |
        v                      |
      还有下一个 fiber? ────YES──┘
        |
        NO
        |
        v
    commitRoot() ← 不可中断
    (三个子阶段: BeforeMutation / Mutation / Layout)
        |
        v
    页面更新完成
```

**⚠️ 常见误区**

- 误区1：以为 Fiber 让 React 变得更快 → Fiber 让 React 更**流畅**（响应更及时），但单次渲染的吞吐量并不一定提升
- 误区2：以为 Commit 阶段可以中断 → Commit 阶段必须同步完成（操作真实 DOM 期间不能中断，否则用户会看到不完整的 UI）
- 误区3：以为所有生命周期都是安全的 → Render 阶段（可中断）中的生命周期（如旧的 `componentWillMount`）可能被重复执行，这也是它们被废弃的原因

**🎯 面试追问**

**Q1: Fiber 架构中，哪些生命周期被标记为 UNSAFE？为什么？**

A: `UNSAFE_componentWillMount`、`UNSAFE_componentWillReceiveProps`、`UNSAFE_componentWillUpdate`。这三个在 Render 阶段执行，由于 Render 阶段可中断重试，这些方法可能被调用多次，如果在其中发起异步请求/产生副作用，会造成重复执行问题。

**Q2: useLayoutEffect 和 useEffect 的区别与 Fiber 的关系是什么？**

A: `useLayoutEffect` 在 Commit 阶段的 Layout 子阶段同步执行（DOM 已更新但浏览器未绘制），`useEffect` 在浏览器绘制完成后异步执行。`useLayoutEffect` 可以同步读取 DOM 测量值并修改，避免闪烁，但会阻塞绘制。

**Q3: React 18 的并发特性与 Fiber 架构是什么关系？**

A: Fiber 是并发特性的基础设施。Fiber 实现了可中断/恢复的渲染，React 18 在此基础上构建了 `useTransition`（降优先级）、`useDeferredValue`（延迟更新）、Suspense 流式渲染等并发特性。

---

## 二、Hooks

### Q: useState 的更新是同步还是异步？为什么多次 setState 只触发一次渲染？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

`useState` 的更新在 React **合成事件和生命周期中是批量异步的**（React 18 前在原生事件、setTimeout 中是同步的，React 18 起全部自动批处理）。

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);  // 不立即更新
    setCount(count + 1);  // count 仍是 0，实际上重复设置为 1
    console.log(count);   // 还是 0（闭包中的旧值）
  }
  // 两次 setCount(1) → 只触发一次渲染，count 变为 1

  // ✅ 使用函数式更新，基于最新状态
  function handleClickCorrect() {
    setCount(c => c + 1);  // c = 0 → 1
    setCount(c => c + 1);  // c = 1 → 2
    // 触发一次渲染，count 变为 2 ✓
  }
}

// React 18: 自动批处理（flushSync 可跳出）
import { flushSync } from 'react-dom';
flushSync(() => setCount(1));  // 立即同步更新
```

**🔍 深层原理**

**批处理的实现机制：**

React 维护一个全局的"执行上下文"标志位（`executionContext`）。在合成事件处理函数开始时，React 设置 `BatchedUpdates` 标志，所有 `setState` 调用只是将更新入队（`updateQueue`），不立即触发 re-render。事件处理函数结束时，React 统一处理队列，一次性重新渲染。

```js
// React 内部简化示意
function batchedUpdates(fn) {
  executionContext |= BatchedContext;  // 标记批处理开始
  try {
    fn();  // 执行用户代码，setState 只入队
  } finally {
    executionContext &= ~BatchedContext;  // 清除标记
    flushPassiveEffects();  // 统一处理，触发一次渲染
  }
}
```

**React 18 自动批处理的实现：**

React 18 用 `scheduler` 的微任务（Promise/MutationObserver）包裹所有更新入口，让所有来源的更新（setTimeout、原生事件等）都经过相同的批处理逻辑。

```jsx
// 完整示例：展示各种场景的行为差异
function BatchingDemo() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const renderCount = useRef(0);
  renderCount.current++;

  // 场景1：React 合成事件（React 17/18 都批处理）
  const handleSyntheticEvent = () => {
    setA(a + 1);
    setB(b + 1);
    // 只触发 1 次渲染 ✓
  };

  // 场景2：setTimeout（React 17 不批处理，React 18 批处理）
  const handleTimeout = () => {
    setTimeout(() => {
      setA(a + 1);  // React 17: 触发渲染
      setB(b + 1);  // React 17: 再次触发渲染
      // React 18: 合并为 1 次渲染
    }, 0);
  };

  // 场景3：需要强制同步更新（React 18）
  const handleForceSync = () => {
    flushSync(() => setA(a + 1));  // 立即渲染（renderCount+1）
    flushSync(() => setB(b + 1));  // 再次立即渲染（renderCount+1）
    // 共触发 2 次渲染
  };

  return (
    <div>
      <p>Renders: {renderCount.current}</p>
      <p>a={a}, b={b}</p>
      <button onClick={handleSyntheticEvent}>Synthetic Event</button>
      <button onClick={handleTimeout}>Timeout</button>
      <button onClick={handleForceSync}>Force Sync</button>
    </div>
  );
}
```

**⚠️ 常见误区**

- 误区1：认为 `setState` 后立刻能读到新值 → state 更新在下次渲染才生效，当前闭包中的值永远是旧的
- 误区2：直接修改 state 对象 → `state.count = 1` 不会触发渲染，必须调用 `setState`
- 误区3：以为函数式更新和直接更新等价 → 在批处理场景下完全不同，函数式更新能正确累积

**💡 踩坑点**

```jsx
// 经典踩坑：基于 state 的计数器
function BuggyCounter() {
  const [count, setCount] = useState(0);

  // ❌ 点击一次，count 只增加 1（而非 3）
  const addThree = () => {
    setCount(count + 1); // count = 0，入队：set to 1
    setCount(count + 1); // count 仍是 0，入队：set to 1（覆盖）
    setCount(count + 1); // count 仍是 0，入队：set to 1（覆盖）
  };

  // ✅ 正确：每次基于最新值
  const addThreeCorrect = () => {
    setCount(c => c + 1); // 0 → 1
    setCount(c => c + 1); // 1 → 2
    setCount(c => c + 1); // 2 → 3
  };

  return <button onClick={addThreeCorrect}>{count}</button>;
}
```

**🎯 面试追问**

**Q1: useState 和 useReducer 如何选择？**

A: 当状态逻辑简单（单个值或少数独立值）用 useState；当多个状态互相关联、下一个状态依赖多个旧状态、或更新逻辑复杂时用 useReducer。useReducer 还便于测试（reducer 是纯函数）和配合 Context 下发 dispatch（dispatch 引用永远稳定）。

**Q2: 为什么 React 要设计成异步批处理而不是同步更新？**

A: 性能考虑。同步更新意味着每次 setState 都立即触发 Diff + DOM 操作，一个事件处理函数中的多次 setState 会造成多次重排重绘。批处理让 React 能合并多次更新，只做一次 Diff 和 DOM 操作，提升性能。

**Q3: 如何在 setState 后立即获取更新后的值？**

A: 不能直接获取（state 是当次渲染的快照）。方案：① 用 `useRef` 保存最新值；② 在 `useEffect` 中读取（下次渲染后）；③ 直接在 setState 的函数式更新回调中计算，不依赖外部 state。

---

### Q: useEffect 的执行时机是什么？deps 数组的工作原理？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

`useEffect` 在**浏览器绘制完成后**异步执行（不阻塞渲染），相当于类组件的 `componentDidMount` + `componentDidUpdate`。

| deps 形式 | 执行时机 |
|---|---|
| 无 deps（省略）| 每次渲染后都执行 |
| `[]`（空数组）| 仅挂载后执行一次 |
| `[a, b]`（依赖项）| 挂载后 + `a` 或 `b` 变化后执行 |

```jsx
useEffect(() => {
  // 1. 挂载时执行
  const subscription = subscribe(props.id);

  // 2. 返回清理函数（下次执行前 or 卸载时调用）
  return () => {
    subscription.unsubscribe();
  };
}, [props.id]);  // props.id 变化时重新执行

// 常见陷阱：闭包旧值问题
function Example() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      console.log(count);  // ❌ 永远是 0（闭包捕获初始值）
    }, 1000);
    return () => clearInterval(timer);
  }, []);  // 空 deps → 不更新

  // ✅ 方案1：加入 deps
  useEffect(() => {
    const timer = setInterval(() => console.log(count), 1000);
    return () => clearInterval(timer);
  }, [count]);  // count 变化时重建定时器

  // ✅ 方案2：useRef 保存最新值
  const countRef = useRef(count);
  countRef.current = count;
  useEffect(() => {
    const timer = setInterval(() => console.log(countRef.current), 1000);
    return () => clearInterval(timer);
  }, []);
}
```

**🔍 深层原理**

**deps 比较机制：**

React 使用 `Object.is` 进行**浅比较**（类似 `===`，但能正确处理 `NaN === NaN` 和 `+0 !== -0`）。这意味着：

```jsx
// ❌ 对象/数组每次渲染都是新引用
useEffect(() => {
  fetchData();
}, [{ id: 1 }]);  // 每次渲染都触发，因为 {} !== {}

// ✅ 使用基本类型或稳定引用
useEffect(() => {
  fetchData();
}, [userId]);  // string/number 值比较，正确
```

**执行顺序（完整版）：**

```
1. React 渲染（调用组件函数，生成虚拟 DOM）
2. React commit（更新真实 DOM）
3. 浏览器绘制（用户看到更新后的界面）
4. 清理上一次的 effect（执行上次返回的 cleanup 函数）
5. 执行本次 effect
```

**useEffect vs useLayoutEffect：**

```
渲染完成 → DOM更新        ↓
useLayoutEffect 回调（同步）→ 浏览器绘制 → useEffect 回调（异步）
```

**⚠️ 常见误区**

- 误区1：以为空 deps `[]` 只执行一次就够了，不需要清理 → 即使只执行一次，卸载时仍会执行清理函数，忘记清理会导致内存泄漏
- 误区2：在 useEffect 里直接 async 函数 → `useEffect(async () => {...})` 会导致返回 Promise 而非 cleanup 函数，应该在内部定义 async 函数再调用
- 误区3：把对象/函数直接放 deps → 每次渲染都是新引用，导致无限循环

**💡 踩坑点**

```jsx
// ❌ 直接用 async effect（错误！）
useEffect(async () => {
  const data = await fetchData();
  setData(data);
}, []);
// 返回的是 Promise，React 会告警且清理逻辑无法正常运行

// ✅ 正确写法
useEffect(() => {
  let cancelled = false;
  async function load() {
    const data = await fetchData();
    if (!cancelled) setData(data);  // 防止组件卸载后还 setState
  }
  load();
  return () => { cancelled = true; };  // 清理：防止竞态条件
}, []);
```

**🎯 面试追问**

**Q1: 如何解决 useEffect 的竞态条件（Race Condition）？**

A: 在 cleanup 函数中设置 `cancelled` 标志位，或使用 AbortController 取消 fetch 请求。React Query / SWR 等库内部已处理了这个问题。

**Q2: useEffect 依赖数组里应该放什么？**

A: 所有在 effect 中用到的、会随渲染变化的响应式值（state、props、context 中的值，以及组件内定义的函数/对象）。eslint-plugin-react-hooks 的 `exhaustive-deps` 规则可以自动检测遗漏。

**Q3: 如何在 useEffect 中安全地订阅事件？**

A: 在 effect 中添加监听，在 cleanup 中移除监听，且 cleanup 捕获的是同次渲染的引用：

```jsx
useEffect(() => {
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, [handler]);  // 若 handler 不稳定，配合 useCallback 使用
```

---

## 三、生命周期与组件

### Q6: React 生命周期有哪些？类组件和函数组件如何对比？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

**类组件完整生命周期（React 16.4+）：**

```
挂载阶段：
constructor → static getDerivedStateFromProps → render → componentDidMount

更新阶段：
static getDerivedStateFromProps → shouldComponentUpdate → render
→ getSnapshotBeforeUpdate → componentDidUpdate

卸载阶段：
componentWillUnmount

错误处理：
static getDerivedStateFromError → componentDidCatch
```

**类组件 vs 函数组件生命周期对照：**

| 类组件 | 函数组件（Hooks）| 说明 |
|---|---|---|
| `constructor` | `useState` 初始值 / `useRef` | 初始化状态 |
| `componentDidMount` | `useEffect(() => {}, [])` | 挂载后执行一次 |
| `componentDidUpdate` | `useEffect(() => {}, [dep])` | 依赖变化时执行 |
| `componentWillUnmount` | `useEffect(() => { return cleanup }, [])` | 清理副作用 |
| `shouldComponentUpdate` | `React.memo` + `useMemo` | 性能优化 |
| `getSnapshotBeforeUpdate` | `useLayoutEffect` + `useRef` | DOM 更新前捕获 |
| `componentDidCatch` | 无直接等价（需用类组件 ErrorBoundary）| 错误边界 |
| `getDerivedStateFromError` | 无直接等价 | 错误边界 |

```jsx
// 类组件生命周期完整示例
class LifecycleDemo extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    // 初始化，不要在这里发请求
  }

  static getDerivedStateFromProps(props, state) {
    // 每次渲染前调用，返回对象更新 state 或 null
    // 极少使用场景：props 驱动 state
    if (props.initialCount !== state.prevInitialCount) {
      return {
        count: props.initialCount,
        prevInitialCount: props.initialCount
      };
    }
    return null;
  }

  shouldComponentUpdate(nextProps, nextState) {
    // 返回 false 阻止渲染（性能优化）
    return nextState.count !== this.state.count;
  }

  getSnapshotBeforeUpdate(prevProps, prevState) {
    // DOM 更新前捕获信息（如滚动位置）
    // 返回值会传给 componentDidUpdate 的第三个参数
    return this.listRef.scrollHeight;
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // snapshot 来自 getSnapshotBeforeUpdate
    if (prevState.count !== this.state.count) {
      console.log('count changed:', snapshot);
    }
  }

  componentDidMount() {
    // 挂载后：发请求、添加事件监听、操作 DOM
    this.timer = setInterval(() => this.setState(s => ({ count: s.count + 1 })), 1000);
  }

  componentWillUnmount() {
    // 卸载前：清理定时器、取消订阅、移除事件监听
    clearInterval(this.timer);
  }

  render() {
    return <div ref={el => this.listRef = el}>{this.state.count}</div>;
  }
}

// 等价的函数组件
function LifecycleDemoFunc({ initialCount }) {
  const [count, setCount] = useState(initialCount);
  const listRef = useRef(null);
  const prevScrollHeight = useRef(0);

  // componentDidMount + componentWillUnmount
  useEffect(() => {
    const timer = setInterval(() => setCount(c => c + 1), 1000);
    return () => clearInterval(timer);  // cleanup = componentWillUnmount
  }, []);

  // getSnapshotBeforeUpdate 等价（useLayoutEffect 在 DOM 更新后、绘制前同步执行）
  useLayoutEffect(() => {
    const scrollHeight = listRef.current?.scrollHeight;
    console.log('prev:', prevScrollHeight.current, 'now:', scrollHeight);
    prevScrollHeight.current = scrollHeight;
  });

  return <div ref={listRef}>{count}</div>;
}
```

**🔍 深层原理**

函数组件每次渲染都是一次全新的函数调用，没有实例，React 通过 Hooks 链表（存在 Fiber 节点的 `memoizedState` 上）维护跨渲染的状态。

类组件的生命周期是"时间节点"思维（某时刻做某事），函数组件是"同步效果"思维（某依赖变化时执行），二者心智模型不同。

**⚠️ 常见误区**

- ❌ `componentDidMount` 里直接 setState → 会触发二次渲染（闪烁），应该优先在 constructor 里初始化状态
- ❌ 以为 `useEffect(() => {}, [])` 完全等于 `componentDidMount` → 严格模式下 React 18 会挂载→卸载→再挂载以检测副作用（开发环境）
- ✅ 函数组件更适合现代 React，类组件仅在需要错误边界时使用

**💡 踩坑点**

```jsx
// 严格模式下 useEffect 双重触发（React 18 开发环境）
// StrictMode 下组件会挂载→卸载→再挂载
// 确保你的 cleanup 能正确清理，否则会有 bug
useEffect(() => {
  const conn = createConnection();
  conn.connect();
  return () => conn.disconnect();  // 必须有正确 cleanup
}, []);
```

**🎯 面试追问**

**Q1: getDerivedStateFromProps 是静态方法，为什么？**

A: 静态方法无法访问 `this`，强制开发者不依赖组件实例，只基于 props 和 state 计算新 state，避免副作用，也符合纯函数设计原则。

**Q2: 为什么官方推荐函数组件而非类组件？**

A: 函数组件更简洁（无 this 困惑），Hooks 比生命周期更细粒度地复用逻辑，自定义 Hook 比 HOC/Render Props 更直观，且更易被 React 编译器优化。

**Q3: componentDidUpdate 如何避免无限循环？**

A: 必须在内部条件判断后再 setState，如 `if (prevProps.id !== this.props.id) { this.setState(...) }`，否则 setState → 更新 → componentDidUpdate → setState 死循环。

---

### Q7: useMemo 和 useCallback 的区别和应用场景？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

| Hook | 缓存的是 | 适用场景 |
|---|---|---|
| `useMemo` | 计算结果（值） | 昂贵计算、避免子组件不必要的 props 变化 |
| `useCallback` | 函数引用 | 传给子组件的回调、useEffect 的依赖函数 |

```jsx
// useMemo：缓存计算结果
function ExpensiveList({ items, filter }) {
  // ❌ 每次渲染都重新过滤（如果 items 很大，性能差）
  const filtered = items.filter(item => item.name.includes(filter));

  // ✅ 只在 items 或 filter 变化时重新计算
  const filteredMemo = useMemo(
    () => items.filter(item => item.name.includes(filter)),
    [items, filter]  // 依赖项
  );

  return <ul>{filteredMemo.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
}

// useCallback：缓存函数引用
function Parent() {
  const [count, setCount] = useState(0);

  // ❌ 每次 Parent 渲染都创建新函数，Child 会不必要地重渲染
  const handleClick = () => console.log('clicked');

  // ✅ 函数引用稳定，Child 不会因 Parent 渲染而重渲染
  const handleClickCb = useCallback(() => {
    console.log('clicked');
  }, []);  // 空 deps：函数不依赖任何变化的值

  // 依赖 count 的回调
  const handleAdd = useCallback(() => {
    setCount(c => c + 1);  // 用函数式更新，不需要把 count 放入 deps
  }, []);  // ✅ 空 deps，因为没有直接引用 count

  return <Child onClick={handleClickCb} />;
}

// 需要配合 React.memo 才有效
const Child = React.memo(({ onClick }) => {
  console.log('Child rendered');
  return <button onClick={onClick}>Click</button>;
});
```

**🔍 深层原理**

`useMemo` 和 `useCallback` 底层实现完全相同，都是存在 Fiber 的 Hook 链表上：

```js
// React 源码简化
function useMemo(factory, deps) {
  const hook = workInProgressHook;
  const prevDeps = hook.memoizedState?.[1];
  if (prevDeps && areHookInputsEqual(deps, prevDeps)) {
    return hook.memoizedState[0];  // 返回缓存值
  }
  const value = factory();
  hook.memoizedState = [value, deps];
  return value;
}

// useCallback 就是 useMemo 的语法糖
function useCallback(callback, deps) {
  return useMemo(() => callback, deps);  // 缓存函数本身
}
```

deps 比较同样使用 `Object.is` 浅比较。

**⚠️ 常见误区**

- ❌ 所有函数都用 useCallback 包裹 → 过度优化反而增加内存开销和代码复杂度，只在传给 memo 子组件或作为 useEffect 依赖时才有意义
- ❌ useMemo 的计算函数有副作用 → useMemo 只应用于纯计算，副作用应放在 useEffect
- ✅ `useCallback(fn, deps)` 等价于 `useMemo(() => fn, deps)`
- ❌ 以为 useMemo 会阻止子组件渲染 → useMemo 只缓存值，要阻止子组件渲染需配合 React.memo

**💡 踩坑点**

```jsx
// 踩坑：useCallback 里引用了 state 但没加到 deps
function Counter() {
  const [count, setCount] = useState(0);

  // ❌ 闭包陷阱！count 永远是 0
  const logCount = useCallback(() => {
    console.log(count);  // 读取的是初始值 0
  }, []);  // 空 deps，但引用了 count

  // ✅ 方案1：把 count 加入 deps
  const logCount1 = useCallback(() => {
    console.log(count);
  }, [count]);  // count 变化时更新函数

  // ✅ 方案2：用 ref 存最新值（函数引用永远稳定）
  const countRef = useRef(count);
  countRef.current = count;
  const logCount2 = useCallback(() => {
    console.log(countRef.current);  // 永远读最新值
  }, []);
}
```

**🎯 面试追问**

**Q1: 什么时候 useMemo 真的有必要？**

A: ① 计算开销大（如大数组排序/过滤，可用 `console.time` 验证）；② 计算结果作为另一个 Hook 的依赖（避免无限循环）；③ 计算结果传给使用了 `React.memo` 的子组件。简单的 JS 计算（加减乘除、字符串拼接）不需要 useMemo。

**Q2: useCallback 不传 deps 会怎样？**

A: `useCallback(fn)` 省略 deps 等价于每次渲染都创建新函数，毫无意义，还不如直接 `const fn = () => {}`。

**Q3: React Compiler（React Forget）对 useMemo/useCallback 的影响？**

A: React Compiler（编译时优化）能自动分析组件，在编译阶段插入必要的 memo 优化，理论上可以消除手动写 useMemo/useCallback 的需求。但目前仍在实验阶段，生产项目仍需手动优化。

---

### Q8: React.memo 的工作原理和使用场景？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

`React.memo` 是一个高阶组件（HOC），对函数组件进行 **props 浅比较**，如果 props 没有变化则跳过重新渲染。

```jsx
// 基本用法
const Button = React.memo(function Button({ onClick, label }) {
  console.log('Button rendered');
  return <button onClick={onClick}>{label}</button>;
});

// 自定义比较函数（第二个参数）
const UserCard = React.memo(
  function UserCard({ user }) {
    return <div>{user.name} - {user.age}</div>;
  },
  (prevProps, nextProps) => {
    // 返回 true = 相同 = 不重渲染
    // 返回 false = 不同 = 重渲染
    return prevProps.user.id === nextProps.user.id
      && prevProps.user.name === nextProps.user.name;
  }
);

// 完整示例：配合 useCallback 使用
function TodoList() {
  const [todos, setTodos] = useState([]);
  const [count, setCount] = useState(0);

  // ✅ useCallback 保证 handleDelete 引用稳定
  const handleDelete = useCallback((id) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      {/* count 变化时，TodoItem 不会重渲染（因为 handleDelete 引用稳定）*/}
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} onDelete={handleDelete} />
      ))}
    </div>
  );
}

const TodoItem = React.memo(({ todo, onDelete }) => {
  console.log('TodoItem rendered:', todo.id);
  return (
    <div>
      {todo.text}
      <button onClick={() => onDelete(todo.id)}>Delete</button>
    </div>
  );
});
```

**🔍 深层原理**

`React.memo` 包装后，组件在 Reconcile 阶段会先执行 `updateMemoComponent`，通过 `Object.is` 逐个比较每个 prop。如果所有 props 浅相等，直接复用上次的 Fiber 子树，跳过 render 函数调用。

```
父组件渲染
    ↓
检查 memo 组件的 props 是否变化（Object.is 浅比较）
    ↓
相同 → 直接复用旧 Fiber，跳过渲染     不同 → 正常执行 render
```

**⚠️ 常见误区**

- ❌ React.memo 和 useMemo 是一样的 → React.memo 针对组件（跳过渲染），useMemo 针对值（缓存计算结果）
- ❌ 所有组件都包 React.memo → memo 本身有比较 props 的开销，对于简单/快速渲染的组件得不偿失
- ✅ memo 只做**浅比较**，props 是对象且内容变了但引用没变，不会重渲染（可能是 bug！）
- ❌ 忘记配合 useCallback 使用 → 父组件传给 memo 子组件的回调函数每次都是新引用，memo 形同虚设

**💡 踩坑点**

```jsx
// memo 失效的经典场景
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      {/* ❌ 每次 Parent 渲染，style 对象都是新引用 → Child 每次都重渲染 */}
      <Child style={{ color: 'red' }} />
    </div>
  );
}

const Child = React.memo(({ style }) => <div style={style}>Child</div>);

// ✅ 将对象提取到组件外或用 useMemo
const STYLE = { color: 'red' };  // 模块级常量，引用永远稳定
function ParentFixed() {
  return <Child style={STYLE} />;
}
```

**🎯 面试追问**

**Q1: React.memo 的自定义比较函数和 shouldComponentUpdate 有什么区别？**

A: `shouldComponentUpdate` 返回 `false` 时阻止渲染（false = 不更新）；`React.memo` 的比较函数返回 `true` 时阻止渲染（true = 相同 = 不更新），语义相反，注意别搞反。

**Q2: 什么情况下 React.memo 会失效？**

A: ① props 包含每次都新建的对象/数组/函数（需配合 useMemo/useCallback）；② props 是 children（JSX 每次渲染都是新对象）；③ 使用了 Context（memo 不阻止 Context 变化导致的重渲染）。

**Q3: React.memo 包裹的组件，内部 state 变化时会重渲染吗？**

A: 会。React.memo 只对外部 props 的变化进行短路优化，组件内部的 state 或 context 变化仍会触发重渲染。

---

### Q9: useRef 的原理和应用（DOM 引用 vs 存储变量）？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

`useRef` 返回一个 `{ current: ... }` 对象，它在组件的整个生命周期内**保持同一个引用**，修改 `.current` 不会触发重渲染。

```jsx
// 用途1：操作 DOM（最常见）
function FocusInput() {
  const inputRef = useRef(null);

  const handleClick = () => {
    inputRef.current.focus();  // 直接访问 DOM 节点
    inputRef.current.style.borderColor = 'blue';
  };

  return (
    <>
      <input ref={inputRef} type="text" />
      <button onClick={handleClick}>Focus</button>
    </>
  );
}

// 用途2：存储不影响渲染的变量（替代实例变量）
function Timer() {
  const [count, setCount] = useState(0);
  const timerRef = useRef(null);  // 存储定时器 id

  const start = () => {
    // timerRef.current 改变不会触发重渲染
    timerRef.current = setInterval(() => setCount(c => c + 1), 1000);
  };

  const stop = () => {
    clearInterval(timerRef.current);
  };

  return (
    <div>
      <p>{count}</p>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </div>
  );
}

// 用途3：保存上一次的值（previous value 模式）
function usePrevious(value) {
  const prevRef = useRef();
  useEffect(() => {
    prevRef.current = value;  // 渲染完成后更新，所以 current 是"上一次"的值
  });
  return prevRef.current;  // 返回上一次渲染时的值
}

function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);  // 上一次的 count

  return <p>Now: {count}, Before: {prevCount}</p>;
}

// 用途4：forwardRef 将 ref 传给子组件
const CustomInput = React.forwardRef((props, ref) => (
  <input ref={ref} {...props} />
));

function Parent() {
  const inputRef = useRef(null);
  return <CustomInput ref={inputRef} />;
}
```

**🔍 深层原理**

`useRef` 本质上是一个不参与渲染的 state。React 在第一次渲染时创建 `{ current: initialValue }` 对象并存入 Fiber 的 Hook 链表，后续渲染直接返回同一个对象引用，不做任何比较或更新触发。

```js
// React 源码简化
function useRef(initialValue) {
  const hook = workInProgressHook;
  if (isMount) {
    const ref = { current: initialValue };
    hook.memoizedState = ref;
    return ref;
  }
  return hook.memoizedState;  // 每次返回同一个对象
}
```

对比 state 和 ref：

| | useState | useRef |
|---|---|---|
| 更新时 | 触发重渲染 | 不触发重渲染 |
| 读取时 | 渲染时快照值 | 永远是最新值 |
| 用途 | 渲染相关数据 | 非渲染数据 / DOM 引用 |

**⚠️ 常见误区**

- ❌ 在渲染阶段读取/修改 ref（如 `ref.current = xxx` 放在组件函数体中）→ 应该只在事件处理函数或 useEffect 中修改
- ❌ 用 ref 存需要触发渲染的数据 → 改 ref 不渲染，用 state 才对
- ✅ ref 是"逃生舱"，用于跳出 React 的响应式系统

**💡 踩坑点**

```jsx
// 踩坑：ref 初始值为 null，访问前必须判断
function SafeRef() {
  const divRef = useRef(null);

  useEffect(() => {
    // ✅ 挂载后才能访问
    if (divRef.current) {
      console.log(divRef.current.offsetHeight);
    }
  }, []);

  // ❌ 渲染时 ref.current 是 null（DOM 还没挂载）
  // console.log(divRef.current.offsetHeight);  // TypeError!

  return <div ref={divRef}>content</div>;
}
```

**🎯 面试追问**

**Q1: ref 和 state 都能存数据，什么时候该用哪个？**

A: 数据需要展示在 UI 上 → state；数据只用于内部逻辑（定时器 id、上一次的值、DOM 节点引用）→ ref。用错会导致：用 ref 存显示数据时 UI 不更新；用 state 存定时器 id 时产生不必要的重渲染。

**Q2: useImperativeHandle 是什么？**

A: 配合 `forwardRef` 使用，自定义暴露给父组件的 ref 接口。比如子组件只想暴露 `focus()` 方法而非整个 DOM 节点：
```jsx
useImperativeHandle(ref, () => ({ focus: () => inputRef.current.focus() }));
```

**Q3: ref 可以指向组件实例吗？**

A: 函数组件没有实例，ref 默认无法指向函数组件。需要用 `forwardRef` + `useImperativeHandle` 才能给函数组件创建"伪实例"供外部调用。类组件的 ref 直接指向类实例。

---

### Q10: useContext 的原理和性能问题？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

`useContext` 让组件订阅 React Context，当 Provider 的 value 变化时，所有消费该 Context 的组件都会重渲染。

```jsx
// 创建和使用 Context
const ThemeContext = React.createContext('light');  // 默认值

// Provider：提供数据
function App() {
  const [theme, setTheme] = useState('light');
  return (
    // value 变化时，所有 Consumer 重渲染
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Header />
      <Content />
    </ThemeContext.Provider>
  );
}

// Consumer：消费数据
function Header() {
  const { theme, setTheme } = useContext(ThemeContext);
  return (
    <header className={theme}>
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
        Toggle
      </button>
    </header>
  );
}

// 性能优化：拆分 Context
// ❌ 把所有数据放一个 Context，任何变化都导致所有消费者重渲染
const AppContext = createContext({ user: null, theme: 'light', cart: [] });

// ✅ 按变化频率拆分 Context
const UserContext = createContext(null);     // 几乎不变
const ThemeCtx = createContext('light');    // 偶尔变
const CartContext = createContext([]);       // 频繁变

// 性能优化：稳定 value 引用
function GoodProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ✅ 分离 state 和 dispatch（dispatch 引用永远稳定）
  return (
    <DispatchContext.Provider value={dispatch}>
      <StateContext.Provider value={state}>
        {children}
      </StateContext.Provider>
    </DispatchContext.Provider>
  );
}
```

**🔍 深层原理**

`useContext` 通过将组件注册为 Context 的订阅者实现。当 Provider 的 value 发生变化时（通过 `Object.is` 检测），React 从 Provider 向下遍历 Fiber 树，找到所有使用该 Context 的组件并标记为需要更新。

**关键特性：**
1. Context 更新会绕过 `React.memo`（memo 只检查 props）
2. 组件订阅了某个 Context，Context 任何字段变化都会触发整个组件重渲染
3. Context 不是状态管理工具，是依赖注入工具

```
Provider value 变化
      ↓
从 Provider 向下遍历 Fiber 树
      ↓
找到所有 useContext(ThemeContext) 的组件
      ↓
标记为 ContextChanged，强制重渲染（跳过 memo 检查）
```

**⚠️ 常见误区**

- ❌ useContext 可以替代 Redux → Context 没有性能优化（选择性订阅），频繁更新的数据不适合放 Context
- ❌ Context value 直接写 `value={{ a, b }}` → 每次渲染 value 都是新对象，所有消费者都重渲染
- ✅ 用 useMemo 稳定 Context value：`value={useMemo(() => ({ a, b }), [a, b])}`

**💡 踩坑点**

```jsx
// 踩坑：Provider value 每次渲染都是新对象
function BadProvider({ children }) {
  const [count, setCount] = useState(0);

  // ❌ 每次 BadProvider 渲染，value 都是新对象
  // 所有消费 MyContext 的组件都会重渲染！
  return (
    <MyContext.Provider value={{ count, setCount }}>
      {children}
    </MyContext.Provider>
  );
}

// ✅ 用 useMemo 稳定 value
function GoodProvider({ children }) {
  const [count, setCount] = useState(0);
  const value = useMemo(() => ({ count, setCount }), [count]);
  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
}
```

**🎯 面试追问**

**Q1: Context 和 Redux 各自适合什么场景？**

A: Context 适合低频更新的全局数据（主题、语言、用户信息），组件层级深但更新少；Redux 适合复杂状态管理（频繁更新、跨组件共享、需要时间旅行调试、中间件处理异步）。

**Q2: 如何实现 Context 的选择性订阅（只关心部分数据变化）？**

A: ① 拆分 Context（按更新频率分多个 Context）；② 使用 `use-context-selector` 库；③ 在消费组件外包一层 memo 组件做数据过滤；④ 使用 Zustand / Jotai 等支持选择性订阅的状态库。

**Q3: createContext 的默认值什么时候生效？**

A: 当组件树中没有对应的 Provider 包裹时生效。有 Provider 时默认值无效（即使 value 是 undefined）。常见用途：测试时不需要 Provider 包裹、文档示例简化。

---

## 四、性能优化

### Q11: React 性能优化的完整方案有哪些？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

React 性能优化分为三层：**减少渲染次数、减少渲染开销、减少加载体积**。

**① 减少不必要的重渲染**

```jsx
// 1. React.memo + useCallback + useMemo 组合
const Child = React.memo(({ data, onAction }) => <div>{data.name}</div>);

function Parent() {
  const [count, setCount] = useState(0);
  // useMemo 稳定对象引用
  const data = useMemo(() => ({ name: 'Alice' }), []);
  // useCallback 稳定函数引用
  const onAction = useCallback(() => console.log('action'), []);

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <Child data={data} onAction={onAction} />  {/* 不会随 count 变化重渲染 */}
    </>
  );
}

// 2. 状态下沉（State Colocation）：将状态移到真正使用它的组件
// ❌ 高层状态导致大范围重渲染
function App() {
  const [inputValue, setInputValue] = useState('');  // 只有 SearchBox 用
  return (
    <>
      <SearchBox value={inputValue} onChange={setInputValue} />
      <HeavyComponent />  {/* inputValue 变化时也重渲染！*/}
    </>
  );
}
// ✅ 状态下沉
function App() {
  return (
    <>
      <SearchBox />  {/* 自己管理自己的 inputValue */}
      <HeavyComponent />  {/* 完全不受影响 */}
    </>
  );
}

// 3. 内容提升（Lift Content Up）：用 children 避免子组件重渲染
function SlowParent({ children }) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      {children}  {/* children 是从外部传入的，不受 SlowParent state 影响 */}
    </div>
  );
}
// App 组件里：<SlowParent><HeavyChild /></SlowParent>
```

**② 减少单次渲染开销**

```jsx
// 1. 虚拟列表（只渲染可视区域）
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style}>{items[index].name}</div>
  );

  return (
    <FixedSizeList
      height={600}       // 容器高度
      itemCount={items.length}
      itemSize={50}      // 每项高度
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// 2. 懒加载组件（代码分割）
const HeavyChart = React.lazy(() => import('./HeavyChart'));

function Dashboard() {
  return (
    <Suspense fallback={<div>Loading chart...</div>}>
      <HeavyChart />
    </Suspense>
  );
}

// 3. useTransition 降低非紧急更新优先级（React 18）
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e) => {
    setQuery(e.target.value);  // 立即更新输入框（高优先级）
    startTransition(() => {
      // 标记为低优先级，不阻塞用户输入
      setResults(searchData(e.target.value));
    });
  };

  return (
    <>
      <input value={query} onChange={handleSearch} />
      {isPending ? <Spinner /> : <ResultList data={results} />}
    </>
  );
}
```

**③ 减少加载体积**

```js
// webpack / Vite 代码分割策略
// 按路由分割
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));

// Tree Shaking：使用具名导入
import { debounce } from 'lodash-es';  // ✅ 只打包 debounce
// import _ from 'lodash';  // ❌ 打包整个 lodash

// 图片优化
// - WebP/AVIF 格式
// - 响应式图片（srcset）
// - 懒加载（loading="lazy"）
```

**🔍 深层原理**

React 渲染分三步：Render（JS）→ Commit（DOM）→ Paint（浏览器）。优化思路对应：
- Render 优化：减少调用组件函数次数（memo/shouldComponentUpdate）
- Commit 优化：减少 DOM 操作次数（批处理、key 复用）
- Paint 优化：减少回流重绘（CSS transform/opacity 而非 width/top）

**⚠️ 常见误区**

- ❌ 过早优化 → 先 Profiler 定位瓶颈，再有针对性地优化
- ❌ 把所有状态放顶层 Provider → 导致全局重渲染，应该合理拆分状态
- ✅ 优化顺序：架构优化（状态下沉/内容提升）> 组件优化（memo）> 算法优化（虚拟列表）> 打包优化

**💡 踩坑点**

使用 React DevTools Profiler 定位性能瓶颈，而不是凭感觉优化。火焰图中高亮的组件是渲染耗时的组件。

**🎯 面试追问**

**Q1: 什么是状态下沉（Colocation）？为什么它比 memo 更有效？**

A: 将 state 移到最靠近使用它的组件。memo 是"渲染了但尝试跳过"，colocation 是"根本不触发"，从源头减少渲染范围，效果更根本。

**Q2: 虚拟列表的原理是什么？**

A: 只渲染视口内可见的 N 条数据，通过 CSS 撑开容器高度（padding 或绝对定位），随滚动动态替换渲染的内容。10000 条数据只渲染 20 条，DOM 节点数恒定。

**Q3: React 18 的 useDeferredValue 和 useTransition 有什么区别？**

A: `useTransition` 用于包裹触发更新的函数（控制更新的发起方），`useDeferredValue` 用于包裹值本身（控制更新的消费方），两者都是将更新标记为低优先级的方式，适用场景不同（是否能控制触发方）。

---

## 五、状态管理

### Q12: Redux 的核心概念和工作流程？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

Redux 三大核心原则：**单一数据源（Single Source of Truth）、State 只读（State is Read-Only）、纯函数修改（Changes by Pure Functions）**。

**核心概念：**

```js
// 1. Store：全局状态容器
const store = createStore(rootReducer);

// 2. Action：描述"发生了什么"的普通对象
const addTodo = (text) => ({
  type: 'todos/added',  // type 必须唯一
  payload: text
});

// 3. Reducer：纯函数，(state, action) => newState
function todosReducer(state = [], action) {
  switch (action.type) {
    case 'todos/added':
      return [...state, { id: Date.now(), text: action.payload, done: false }];
    case 'todos/toggled':
      return state.map(t => t.id === action.payload ? { ...t, done: !t.done } : t);
    default:
      return state;  // 必须有 default！
  }
}

// 4. Dispatch：派发 action
store.dispatch(addTodo('Learn Redux'));

// 5. Subscribe：监听 state 变化
store.subscribe(() => console.log(store.getState()));

// 6. Selector：从 state 中提取数据
const selectTodos = (state) => state.todos;
const selectDoneTodos = (state) => state.todos.filter(t => t.done);
```

**Redux 数据流（单向）：**

```
用户操作
   ↓
dispatch(action)
   ↓
Middleware（如 redux-thunk 处理异步）
   ↓
Reducer(currentState, action) → newState
   ↓
Store 更新
   ↓
连接的组件重渲染（通过 useSelector）
```

**在 React 中使用（react-redux）：**

```jsx
import { Provider, useSelector, useDispatch } from 'react-redux';

// 根组件用 Provider 注入 store
function App() {
  return (
    <Provider store={store}>
      <TodoList />
    </Provider>
  );
}

// 组件中读取和操作状态
function TodoList() {
  const todos = useSelector(state => state.todos);  // 订阅 state
  const dispatch = useDispatch();

  return (
    <ul>
      {todos.map(todo => (
        <li
          key={todo.id}
          onClick={() => dispatch({ type: 'todos/toggled', payload: todo.id })}
          style={{ textDecoration: todo.done ? 'line-through' : 'none' }}
        >
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

**🔍 深层原理**

`useSelector` 使用 `===` 比较前后两次 selector 的返回值，不同才触发重渲染。因此：
- 返回基本类型（number/string）：精准订阅
- 返回对象/数组：每次都是新引用，会导致不必要的重渲染，需要 `createSelector`（Reselect 库的记忆化 selector）

**⚠️ 常见误区**

- ❌ Reducer 里直接修改 state → `state.todos.push(...)` 是违规的，必须返回新对象
- ❌ 把所有状态都放 Redux → 表单状态、UI 局部状态适合用 local state
- ✅ Redux 的异步操作不是用 Reducer 处理的，而是用中间件（thunk/saga）

**💡 踩坑点**

```js
// ❌ Reducer 里的常见错误：直接 mutate state
function badReducer(state = [], action) {
  if (action.type === 'add') {
    state.push(action.payload);  // ❌ 直接修改！
    return state;
  }
  return state;
}

// ✅ 返回新数组
function goodReducer(state = [], action) {
  if (action.type === 'add') {
    return [...state, action.payload];  // ✅ 新引用
  }
  return state;
}
```

**🎯 面试追问**

**Q1: redux-thunk 和 redux-saga 有什么区别？**

A: thunk 是函数中间件，适合简单异步（async/await）；saga 基于 Generator，适合复杂异步流（并发控制、竞态、取消、重试），学习成本更高但能力更强。

**Q2: useSelector 的性能如何优化？**

A: ① 细粒度订阅（只选需要的字段）；② 用 `createSelector`（Reselect）做记忆化 selector，避免每次返回新对象；③ 用 `shallowEqual` 作为第二个参数：`useSelector(selector, shallowEqual)`。

**Q3: Redux 和 Context API 的本质区别是什么？**

A: Context 是依赖注入机制，任何 value 变化都全量更新消费者；Redux 通过 `useSelector` 实现细粒度订阅（只有 selector 结果变化才重渲染），性能更好。Redux 还提供中间件、时间旅行、DevTools 等 Context 不具备的能力。

---

### Q13: Redux Toolkit（RTK）和传统 Redux 的对比？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

Redux Toolkit（RTK）是 Redux 官方推荐的最佳实践封装，解决了传统 Redux 的样板代码过多问题。

**对比：**

```js
// =================== 传统 Redux ===================
// 1. 手写 Action Types 常量
const ADD_TODO = 'todos/add';
const TOGGLE_TODO = 'todos/toggle';

// 2. 手写 Action Creators
const addTodo = (text) => ({ type: ADD_TODO, payload: text });
const toggleTodo = (id) => ({ type: TOGGLE_TODO, payload: id });

// 3. 手写 Reducer（switch-case，手动保证不可变性）
function todosReducer(state = [], action) {
  switch (action.type) {
    case ADD_TODO:
      return [...state, { id: Date.now(), text: action.payload, done: false }];
    case TOGGLE_TODO:
      return state.map(t => t.id === action.payload ? { ...t, done: !t.done } : t);
    default:
      return state;
  }
}

// 4. 手写 combineReducers + createStore
const store = createStore(combineReducers({ todos: todosReducer }));

// =================== RTK ===================
import { createSlice, configureStore, createAsyncThunk } from '@reduxjs/toolkit';

// 1. createSlice 自动生成 action types + action creators + reducer
const todosSlice = createSlice({
  name: 'todos',
  initialState: [],
  reducers: {
    // 可以直接"修改" state（内部用 Immer 保证不可变性）
    added(state, action) {
      state.push({ id: Date.now(), text: action.payload, done: false });
    },
    toggled(state, action) {
      const todo = state.find(t => t.id === action.payload);
      if (todo) todo.done = !todo.done;  // Immer 让你直接 mutate
    }
  },
  // 处理异步 thunk 的生命周期
  extraReducers(builder) {
    builder
      .addCase(fetchTodos.pending, (state) => { state.loading = true; })
      .addCase(fetchTodos.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTodos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

// 2. createAsyncThunk 处理异步操作
const fetchTodos = createAsyncThunk('todos/fetch', async (userId) => {
  const response = await fetch(`/api/todos?user=${userId}`);
  return response.json();  // 自动 dispatch fulfilled/rejected action
});

// 3. configureStore 自动配置 devtools 和中间件
const store = configureStore({
  reducer: {
    todos: todosSlice.reducer,
  },
  // 默认已包含 redux-thunk + redux-devtools-extension
});

// 导出 action creators
export const { added, toggled } = todosSlice.actions;
export { fetchTodos };
```

**🔍 深层原理**

RTK 的核心依赖：
- **Immer**：让 reducer 可以直接"修改" state（Immer 基于 Proxy 拦截修改，生成新的不可变对象）
- **createSelector（Reselect）**：记忆化 selector，内置于 `createEntityAdapter`
- **redux-thunk**：自动集成，处理异步 action

**⚠️ 常见误区**

- ❌ 在 createSlice 外部的代码中直接修改 RTK 返回的 state → Immer 的保护只在 reducer 内部有效
- ❌ createAsyncThunk 的 rejectWithValue 没处理 → 异步 thunk 抛出错误时会 dispatch rejected action，需要在 extraReducers 中处理
- ✅ RTK Query（RTK 的数据请求层）可以替代大多数 data fetching 样板代码

**🎯 面试追问**

**Q1: Immer 的工作原理是什么？**

A: Immer 使用 ES6 Proxy 创建 state 的草稿（draft），所有对 draft 的修改都被 Proxy 拦截记录，最后 `produce` 函数根据变更记录生成新的不可变对象，未修改的部分共享原来的引用（结构共享）。

**Q2: RTK Query 是什么？为什么可以替代 React Query？**

A: RTK Query 是 RTK 内置的数据请求/缓存方案，自动处理 loading/error/data 状态、缓存失效、重新请求、乐观更新等，与 Redux store 无缝集成。React Query 是独立库不依赖 Redux，如果项目已用 RTK，用 RTK Query 可以减少依赖；否则 React Query 更轻量。

**Q3: 什么是 Selector？为什么要用 createSelector？**

A: Selector 是从 Redux state 派生数据的函数。`createSelector` 是记忆化 selector 工厂，当输入 selector 的结果不变时，返回上次的缓存结果（===），防止 useSelector 触发不必要的重渲染（尤其是返回派生对象/数组时）。

---

## 六、路由

### Q14: React Router 的工作原理（history vs hash 模式）？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

React Router 基于浏览器的 **History API** 或 **Hash** 机制，监听 URL 变化，渲染对应组件，实现无刷新路由。

**两种模式对比：**

| | BrowserRouter（History 模式）| HashRouter（Hash 模式）|
|---|---|---|
| URL 格式 | `/user/123` | `/#/user/123` |
| 原理 | HTML5 History API（pushState/replaceState）| `window.location.hash` |
| 服务器配置 | 需要服务器将所有路由指向 index.html | 不需要（# 后的部分不发送到服务器）|
| SEO | 友好 | 不友好（搜索引擎忽略 # 后内容）|
| 兼容性 | 现代浏览器 | 所有浏览器 |

```jsx
// React Router v6 基本用法
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/users/123">User 123</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/users/:id" element={<UserDetail />} />
        {/* 嵌套路由 */}
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<DashboardHome />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

// 动态路由参数
function UserDetail() {
  const { id } = useParams();  // 读取 URL 参数
  const navigate = useNavigate();

  return (
    <div>
      <p>User ID: {id}</p>
      <button onClick={() => navigate(-1)}>Go Back</button>
      <button onClick={() => navigate('/about', { replace: true })}>
        Go About (replace history)
      </button>
    </div>
  );
}

// 编程式导航
const navigate = useNavigate();
navigate('/path');                    // push
navigate('/path', { replace: true }); // replace（不产生历史记录）
navigate(-1);                         // 后退
navigate(1);                          // 前进
```

**🔍 深层原理**

**History 模式工作流：**

```
用户点击 <Link to="/about">
    ↓
调用 history.pushState(null, '', '/about')
（浏览器 URL 改变，但不发送请求到服务器）
    ↓
React Router 监听到 popstate 事件（或自己触发）
    ↓
重新渲染，匹配 /about 对应的组件
    ↓
渲染 <About />
```

**为什么 History 模式需要服务器配置？**

刷新页面时，浏览器会向服务器请求 `/about`，服务器没有这个文件会返回 404。需要服务器配置将所有路由返回 `index.html`：

```nginx
# Nginx 配置
location / {
  try_files $uri $uri/ /index.html;
}
```

**⚠️ 常见误区**

- ❌ Link 会刷新页面 → Link 本质是拦截了默认的 `<a>` 跳转行为，调用 history API
- ❌ useNavigate 和 history.push 是一样的 → useNavigate 是 React 感知的，会触发组件重渲染；直接用 window.history.pushState 不会触发路由更新
- ✅ v6 中 `<Switch>` 已被 `<Routes>` 替代，且 `<Routes>` 默认精确匹配

**🎯 面试追问**

**Q1: React Router v5 和 v6 的主要区别？**

A: ① `Switch` → `Routes`，路由精确匹配；② `component` prop → `element` prop（接受 JSX）；③ 嵌套路由写法变化（v6 嵌套在父路由内）；④ `useHistory` → `useNavigate`；⑤ `Redirect` → `Navigate`；⑥ 路由权重自动计算（无需 exact）。

**Q2: 如何实现路由守卫（权限控制）？**

A:
```jsx
function RequireAuth({ children }) {
  const auth = useAuth();
  const location = useLocation();
  if (!auth.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
// 使用
<Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
```

**Q3: 路由懒加载如何实现？**

A: `React.lazy` + `Suspense` 组合，按路由分割代码：
```jsx
const Dashboard = lazy(() => import('./Dashboard'));
<Route path="/dashboard" element={
  <Suspense fallback={<Loading />}><Dashboard /></Suspense>
} />
```

---

## 七、表单与事件

### Q15: 受控组件 vs 非受控组件的区别和应用？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

| | 受控组件 | 非受控组件 |
|---|---|---|
| 数据存储 | React state（每次输入都同步到 state）| DOM 本身（通过 ref 按需读取）|
| 数据同步 | 实时 | 按需（提交时） |
| 代码量 | 较多（需要 onChange 处理函数）| 较少 |
| 验证时机 | 实时验证 | 提交时验证 |
| 适用场景 | 需要实时处理输入（搜索、验证）| 文件上传、简单表单 |

```jsx
// 受控组件：React 完全控制表单值
function ControlledForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ name, email });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}                         // value 由 state 控制
        onChange={e => setName(e.target.value)}  // 每次输入都更新 state
        placeholder="Name"
      />
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      {/* 实时验证 */}
      {email && !email.includes('@') && <p style={{color:'red'}}>Invalid email</p>}
      <button type="submit">Submit</button>
    </form>
  );
}

// 非受控组件：用 ref 读取 DOM 值
function UncontrolledForm() {
  const nameRef = useRef(null);
  const emailRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({
      name: nameRef.current.value,   // 提交时才读取
      email: emailRef.current.value,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ref={nameRef} defaultValue="Alice" placeholder="Name" />
      <input ref={emailRef} placeholder="Email" />
      <button type="submit">Submit</button>
    </form>
  );
}

// 特殊场景：文件上传必须用非受控（file input 的 value 只读）
function FileUpload() {
  const fileRef = useRef(null);

  const handleUpload = async () => {
    const file = fileRef.current.files[0];
    const formData = new FormData();
    formData.append('file', file);
    await fetch('/api/upload', { method: 'POST', body: formData });
  };

  return (
    <>
      <input type="file" ref={fileRef} />
      <button onClick={handleUpload}>Upload</button>
    </>
  );
}
```

**🔍 深层原理**

受控组件让 React state 成为"单一数据源"，DOM 输入框的值始终反映 state 值。实现原理是：React 在 commit 阶段将 `value` prop 同步到 DOM 的 `.value` 属性，`onChange` 使用 React 的合成事件系统监听 DOM 的 `input` 事件。

**⚠️ 常见误区**

- ❌ 受控组件设置了 value 但没有 onChange → 输入框变成只读（React 会报 warning）
- ❌ `defaultValue` 和 `value` 混用 → `defaultValue` 是非受控（只设置初始值），`value` 是受控，不能同时用
- ✅ `defaultValue` 用于非受控组件设置初始值，不影响后续用户输入

**💡 踩坑点**

```jsx
// ❌ 受控 input 设置了 value 但忘记 onChange
<input value={name} />  // 输入框无法输入！React 报警告

// ❌ 切换 controlled/uncontrolled（value 从有值变 undefined）
const [val, setVal] = useState(undefined);  // undefined = uncontrolled
setVal('hello');  // 变成 controlled，React 报警告

// ✅ 初始值用 '' 而非 undefined/null
const [val, setVal] = useState('');
```

**🎯 面试追问**

**Q1: React Hook Form 为什么性能比受控表单好？**

A: RHF 默认使用非受控模式，用 ref 收集表单值，不在每次输入时触发 React 重渲染。传统受控表单每次按键都 setState → 重渲染整个表单，大型表单性能差。RHF 只在 blur 或 submit 时验证，减少渲染次数。

**Q2: 如何在受控组件中处理防抖搜索？**

A:
```jsx
const [query, setQuery] = useState('');
const debouncedQuery = useDebounce(query, 300);  // 自定义 Hook
useEffect(() => {
  if (debouncedQuery) fetchSearchResults(debouncedQuery);
}, [debouncedQuery]);
// input 实时更新（体验好），搜索请求防抖（性能好）
```

**Q3: 表单状态应该放在组件内 state 还是 Redux？**

A: 原则上表单状态是 UI 临时状态，适合放本地 state（或 RHF/Formik 管理）。Redux 适合需要跨组件共享的持久化数据，临时表单草稿放 Redux 会增加不必要的复杂度。除非有"跨页面保存草稿"等特殊需求。

---

### Q16: React 合成事件系统原理？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

React 不将事件直接绑定到 DOM 节点，而是在**根容器（React 18：root DOM 节点，React 17 前：document）** 统一代理所有事件，通过事件委托 + 合成事件对象实现跨浏览器一致的事件系统。

```jsx
function EventDemo() {
  const handleClick = (e) => {
    console.log(e);              // SyntheticEvent（合成事件对象）
    console.log(e.nativeEvent);  // 原生 MouseEvent
    e.stopPropagation();         // 阻止合成事件冒泡（不影响原生事件）
    e.preventDefault();          // 阻止默认行为

    // React 17 前：合成事件在回调后被回收（对象池）
    // 不能异步访问 e 的属性！
    setTimeout(() => {
      console.log(e.target);  // React 17 前：null（已被回收）
      // ✅ React 17 前：e.persist() 阻止回收，或提前保存
      // ✅ React 17+：事件对象不再被回收，可以异步访问
    }, 1000);
  };

  return <button onClick={handleClick}>Click</button>;
}

// 合成事件 vs 原生事件的执行顺序
function EventOrder() {
  const divRef = useRef(null);

  useEffect(() => {
    // 原生事件（捕获阶段）
    divRef.current.addEventListener('click', () => console.log('native capture'), true);
    // 原生事件（冒泡阶段）
    divRef.current.addEventListener('click', () => console.log('native bubble'), false);
  }, []);

  // 执行顺序：
  // 1. native capture（原生捕获）
  // 2. React onClick（合成事件，在冒泡阶段触发）
  // 3. native bubble（原生冒泡）
  return (
    <div ref={divRef} onClick={() => console.log('React synthetic')}>
      Click Me
    </div>
  );
}
```

**🔍 深层原理**

```
用户点击 DOM 元素
      ↓
原生事件从 document/root 捕获向下
      ↓
到达目标元素，开始冒泡
      ↓
冒泡到 React root 容器
      ↓
React 的统一事件处理函数触发
      ↓
根据事件目标，从 Fiber 树中收集对应的 React 事件处理函数
（从目标 Fiber 向上遍历，收集捕获/冒泡处理函数）
      ↓
创建 SyntheticEvent 对象（包装原生事件，跨浏览器标准化）
      ↓
依次执行：捕获阶段处理函数（onClickCapture）→ 冒泡阶段处理函数（onClick）
```

**React 17 的变更：**
- React 17 前：事件绑定到 `document`，可能与第三方库冲突
- React 17+：事件绑定到 React root 容器（`#root`），多个 React 版本共存不冲突

**⚠️ 常见误区**

- ❌ `e.stopPropagation()` 能阻止所有事件传播 → 只阻止合成事件冒泡，原生事件仍会冒泡（如果使用 `addEventListener` 监听）
- ❌ onClick 在捕获阶段触发 → `onClick` 是冒泡阶段；`onClickCapture` 是捕获阶段
- ✅ React 17+ 不需要 `e.persist()`，合成事件不再被回收

**🎯 面试追问**

**Q1: 为什么 React 要用事件委托而不是直接绑定？**

A: ① 性能（减少 DOM 事件监听器数量）；② 便于统一处理（批量更新、事件优先级）；③ 跨浏览器兼容（SyntheticEvent 抹平差异）；④ 组件卸载时无需手动移除监听（减少内存泄漏风险）。

**Q2: 在 React 里，如何阻止合成事件冒泡到原生事件？**

A: 调用原生事件的 `e.nativeEvent.stopImmediatePropagation()`（阻止同一节点上的其他原生监听器）或在目标 DOM 的原生监听器里 `e.stopPropagation()`。

**Q3: 为什么 React 事件处理函数中直接 console.log(e) 在 React 17 前会看到属性为 null？**

A: React 17 前采用对象池优化，SyntheticEvent 回调执行完后属性被重置（归还池）。异步读取时属性已为 null。需要 `e.persist()` 或提前 `const target = e.target` 保存。

---

## 八、错误处理与新特性

### Q17: 错误边界（Error Boundary）的原理和使用？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

错误边界是一种捕获**子组件树渲染期间 JS 错误**的类组件，防止错误导致整个应用崩溃。

```jsx
// 错误边界必须是类组件（函数组件暂不支持）
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // 渲染阶段错误：返回 fallback state（类似 getDerivedStateFromProps）
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // 提交阶段后：记录错误信息（适合上报监控）
  componentDidCatch(error, errorInfo) {
    // errorInfo.componentStack：组件调用栈
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    // 上报错误监控
    logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // 降级 UI
      return this.props.fallback || <h2>Something went wrong.</h2>;
    }
    return this.props.children;
  }
}

// 使用：包裹可能出错的子组件
function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <UserProfile />
      <ErrorBoundary fallback={<p>Chart unavailable</p>}>
        <DataChart />  {/* Chart 错误只影响这里，不影响 UserProfile */}
      </ErrorBoundary>
    </ErrorBoundary>
  );
}

// 重置错误状态（让用户重试）
class ResettableErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <p>Oops! Something went wrong.</p>
          <button onClick={this.reset}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**🔍 深层原理**

错误边界捕获的是 Fiber render 阶段和 commit 阶段（Layout 子阶段）抛出的错误。当错误抛出后，React 沿 Fiber 树向上查找最近的 `getDerivedStateFromError` 方法，触发该边界的重渲染并显示 fallback UI。

**⚠️ 不能捕获的错误（错误边界的局限性）：**

```
❌ 事件处理函数里的错误（用 try-catch）
❌ 异步代码（setTimeout / fetch 的回调）
❌ 服务端渲染（SSR）
❌ 错误边界自身的错误（往上找更高层的边界）
✅ 渲染期间的错误（子组件 render 方法）
✅ 生命周期方法中的错误
✅ 构造函数中的错误
```

**⚠️ 常见误区**

- ❌ 以为一个全局错误边界就够了 → 应该按功能模块设置多个局部错误边界，避免整个页面崩溃
- ❌ 用 try-catch 包裹 JSX → 无法捕获子组件内部错误，只能用错误边界
- ✅ React 18 + Suspense 结合错误边界可以实现优雅的异步加载错误处理

**🎯 面试追问**

**Q1: 为什么错误边界必须是类组件？函数组件什么时候会支持？**

A: 错误边界需要 `componentDidCatch` 和 `getDerivedStateFromError`，这两个生命周期目前没有 Hooks 等价物。React 团队正在开发函数组件版本，但目前（2024）仍需类组件。社区库 `react-error-boundary` 提供了更方便的函数式包裹方案。

**Q2: 生产环境和开发环境错误边界的表现有什么不同？**

A: 开发环境下，错误仍会显示在控制台（方便调试），错误边界的 fallback UI 会先短暂显示然后重新显示错误；生产环境下，错误边界的 fallback UI 正常展示，不会在控制台显示原始错误栈（需要通过 Source Map 还原）。

**Q3: 如何在函数组件中实现类似错误边界的功能？**

A: 使用 `react-error-boundary` 库：
```jsx
import { ErrorBoundary } from 'react-error-boundary';
<ErrorBoundary FallbackComponent={ErrorFallback} onReset={handleReset}>
  <Component />
</ErrorBoundary>
```

---

### Q18: React 18 新特性详解（并发渲染、Suspense、Transitions）？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

React 18 的核心是**并发渲染（Concurrent Rendering）**，允许 React 同时准备多个 UI 版本，中断低优先级渲染来响应高优先级用户交互。

```jsx
// 1. 新的 createRoot API（开启并发特性）
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root'));
root.render(<App />);
// 旧 API：ReactDOM.render（不支持并发特性）

// 2. useTransition：标记非紧急更新
import { useTransition, useState } from 'react';

function TabContainer() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();

  function selectTab(nextTab) {
    startTransition(() => {
      // 这是"过渡"更新（低优先级）
      // 如果用户在此期间有操作，React 会中断这个更新
      setTab(nextTab);
    });
  }

  return (
    <>
      <TabButton onClick={() => selectTab('home')}>Home</TabButton>
      <TabButton onClick={() => selectTab('posts')}>Posts</TabButton>
      {/* isPending 期间可以保留旧 UI，显示加载指示 */}
      <div style={{ opacity: isPending ? 0.8 : 1 }}>
        {tab === 'home' ? <HomeTab /> : <PostsTab />}
      </div>
    </>
  );
}

// 3. useDeferredValue：延迟非紧急值
function SearchResults({ query }) {
  // deferredQuery 会"滞后"于 query
  // query 立即更新（输入框），deferredQuery 在 CPU 空闲时更新（搜索结果）
  const deferredQuery = useDeferredValue(query);

  // 用 memo 包裹，只在 deferredQuery 变化时重新渲染
  const results = useMemo(
    () => <SlowList query={deferredQuery} />,
    [deferredQuery]
  );

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <Suspense fallback={<Spinner />}>{results}</Suspense>
    </>
  );
}

// 4. 自动批处理（Automatic Batching）
// React 18 所有更新自动批处理（包括 setTimeout、Promise、原生事件）
setTimeout(() => {
  setA(1);  // React 18: 合并为一次渲染
  setB(2);  // React 17: 两次渲染
}, 0);

// 5. Suspense 流式 SSR（React 18 服务端）
// 服务端可以流式发送 HTML，组件 ready 时再填充
function App() {
  return (
    <html>
      <body>
        <Header />           {/* 立即发送 */}
        <Suspense fallback={<Spinner />}>
          <SlowSidebar />    {/* 数据 ready 后流式发送 */}
        </Suspense>
        <Suspense fallback={<Spinner />}>
          <MainContent />    {/* 数据 ready 后流式发送 */}
        </Suspense>
      </body>
    </html>
  );
}
```

**🔍 深层原理**

并发渲染的核心是**可中断渲染**（基于 Fiber 架构）+ **优先级调度**（Lanes 模型）：

```
高优先级更新（用户输入）   ←──────────────────────
                                                  |
    打断正在进行的低优先级渲染                      |
            ↓                                     |
    优先完成高优先级渲染                           |
            ↓                                     |
    恢复低优先级渲染（从头或断点继续）               |
```

**React 18 新 Hooks 汇总：**

| Hook | 作用 |
|---|---|
| `useTransition` | 标记状态更新为"过渡"，低优先级 |
| `useDeferredValue` | 延迟值更新，让紧急更新先完成 |
| `useId` | 生成稳定唯一 ID（SSR 安全）|
| `useSyncExternalStore` | 订阅外部 store（避免撕裂）|
| `useInsertionEffect` | CSS-in-JS 库专用，在 DOM 修改前插入样式 |

**⚠️ 常见误区**

- ❌ 以为并发渲染让所有东西自动变快 → 并发渲染提升的是**响应性**（用户操作不被阻塞），不是渲染速度
- ❌ useTransition 可以替代所有防抖 → useTransition 是优先级降级，适合 CPU 密集型；防抖适合减少触发频率（如网络请求）
- ✅ 使用 `createRoot` 才能开启所有 React 18 并发特性

**🎯 面试追问**

**Q1: 什么是"撕裂"（Tearing）问题？React 18 如何解决？**

A: 并发渲染中，React 可能在渲染中途被中断，如果期间外部 store 更新，同一个数据在不同组件里可能读到不同版本，导致 UI 不一致（撕裂）。`useSyncExternalStore` 通过同步读取 store 解决此问题（Redux 8+、Zustand 已适配）。

**Q2: React 18 的 Strict Mode 在开发环境做了什么？**

A: React 18 严格模式会对每个组件**挂载→卸载→再挂载**，检查 useEffect cleanup 是否正确清理，以帮助发现并发模式下可能的 bug（组件可能被多次挂载）。

**Q3: Suspense 在 React 18 有什么新能力？**

A: ① 支持服务端流式 SSR（hydrateRoot）；② Suspense 边界内的并发渲染（startTransition 和 Suspense 结合）；③ SuspenseList 协调多个 Suspense 的展示顺序（实验性）。

---

### Q19: React Server Components（RSC）的原理？

**难度**：⭐⭐⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

React Server Components 是运行在服务器上的 React 组件，**不会被打包进客户端 bundle**，直接在服务器渲染并以序列化格式（RSC Payload）发送给客户端。

**Server Components vs Client Components vs SSR：**

| | Server Components | Client Components | 传统 SSR |
|---|---|---|---|
| 运行环境 | 仅服务器 | 仅客户端（浏览器）| 服务器（首次）+ 客户端（hydration）|
| JS Bundle | 不包含 | 包含 | 包含（hydration 代码）|
| Hooks | ❌ 不支持 | ✅ 支持 | ✅ 支持 |
| 直接访问数据库 | ✅ 可以 | ❌ 不可以 | ✅ 可以（getServerSideProps）|
| 交互性 | ❌ 无 | ✅ 有 | ✅ hydration 后有 |
| 标记方式 | 默认（Next.js 14+）| `'use client'` | - |

```jsx
// Server Component（默认，无需标记）
// app/page.tsx（Next.js 14 App Router）
async function Page() {
  // 直接访问数据库/文件系统，不泄露给客户端
  const posts = await db.query('SELECT * FROM posts');

  return (
    <main>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />  {/* 也是 Server Component */}
      ))}
      {/* 需要交互的部分，标记为 Client Component */}
      <LikeButton postId={post.id} />
    </main>
  );
}

// Client Component（需要 Hooks / 事件处理）
'use client';  // 标记：以下是客户端组件

import { useState } from 'react';

function LikeButton({ postId }) {
  const [liked, setLiked] = useState(false);

  return (
    <button onClick={() => setLiked(l => !l)}>
      {liked ? '❤️' : '🤍'} Like
    </button>
  );
}
```

**RSC Payload 格式：**

```
Server Component 渲染结果不是 HTML，而是 React 自定义的序列化格式（类似 JSON）：

1:{"type":"div","props":{"children":[
  2:{"type":"h1","props":{"children":"Posts"}},
  3:{"type":"$Lpostcard","props":{"title":"Hello"}},  // Lazy Client Component
]}}
```

**🔍 深层原理**

```
服务器
  ↓
执行 Server Components → 生成 RSC Payload（序列化的虚拟 DOM + Client Components 占位符）
  ↓
流式发送 RSC Payload 到客户端
  ↓
客户端
  ↓
React 解析 RSC Payload，重建 Fiber 树
  ↓
遇到 Client Component 占位符 → 加载对应的 JS Bundle → hydration
  ↓
最终得到可交互的 UI
```

**⚠️ 常见误区**

- ❌ RSC 和 SSR 是同一回事 → SSR 在服务器生成 HTML 后客户端 hydration；RSC 是组件模型，Server Component 永远运行在服务器，不 hydration
- ❌ Server Component 里可以用 useState/useEffect → 完全不支持，Server Component 无状态、无交互
- ✅ Server Component 可以 import Client Component，但 Client Component 不能 import Server Component（可以通过 children prop 传入）

**🎯 面试追问**

**Q1: RSC 解决了什么问题？**

A: ① 减少客户端 JS Bundle 体积（Server Component 不打包）；② 消除客户端数据请求的瀑布流（服务器直接读数据库）；③ 敏感逻辑（API keys、数据库访问）永远不暴露给客户端。

**Q2: Server Component 和 Client Component 如何通信？**

A: ① 父 Server Component → 子 Client Component：通过 props（只能传序列化数据，不能传函数）；② Client Component → Server Component：通过 Server Actions（`'use server'` 标记的函数，客户端调用服务器函数）。

**Q3: Next.js App Router 和 Pages Router 的主要区别？**

A: App Router（Next.js 13+）默认使用 Server Components，支持 RSC、流式 SSR、嵌套布局（layout.tsx）；Pages Router 是传统 SSR（getServerSideProps），所有组件默认是 Client Components。App Router 是 Next.js 的未来方向。

---

### Q20: 如何做 React 应用的性能监控？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

React 性能监控分三层：**开发时分析**（Profiler）、**运行时监控**（Web Vitals）、**错误监控**（Sentry 等）。

```jsx
// 1. React DevTools Profiler（开发时）
// 在 React DevTools 的 Profiler 面板录制，查看：
// - 每次渲染的耗时（火焰图）
// - 哪些组件触发了渲染（蓝色=渲染，灰色=未渲染）
// - 渲染原因（state/props/hooks 变化）

// 2. Profiler API（程序化采集渲染性能数据）
import { Profiler } from 'react';

function onRenderCallback(
  id,          // 组件 id（Profiler 的 id prop）
  phase,       // 'mount' | 'update' | 'nested-update'
  actualDuration,    // 本次渲染耗时（ms）
  baseDuration,      // 估算无 memo 时的耗时
  startTime,         // 开始时间
  commitTime,        // 提交时间
) {
  // 上报到监控系统
  if (actualDuration > 16) {  // 超过一帧（16ms）报警
    analytics.track('slow_render', { id, actualDuration, phase });
  }
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Profiler id="Header" onRender={onRenderCallback}>
        <Header />
      </Profiler>
      <Profiler id="Content" onRender={onRenderCallback}>
        <Content />
      </Profiler>
    </Profiler>
  );
}

// 3. Web Vitals 监控（用户体验指标）
import { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } from 'web-vitals';

function reportWebVitals(metric) {
  // 上报到 Google Analytics 或自己的监控系统
  console.log(metric);
  // { name: 'LCP', value: 1200, rating: 'good', delta: 1200, id: '...' }

  // 上报到 GA4
  gtag('event', metric.name, {
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    event_category: 'Web Vitals',
    non_interaction: true,
  });
}

onCLS(reportWebVitals);   // Cumulative Layout Shift（布局稳定性）
onFID(reportWebVitals);   // First Input Delay（首次输入延迟）
onLCP(reportWebVitals);   // Largest Contentful Paint（最大内容绘制）
onINP(reportWebVitals);   // Interaction to Next Paint（React 18 重点指标）
onFCP(reportWebVitals);   // First Contentful Paint
onTTFB(reportWebVitals);  // Time to First Byte

// 4. 错误监控（Sentry）
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'your-dsn',
  integrations: [
    new Sentry.BrowserTracing(),  // 性能追踪
    new Sentry.Replay(),          // 错误回放
  ],
  tracesSampleRate: 0.1,   // 采样率 10%（生产环境）
  replaysOnErrorSampleRate: 1.0,  // 错误时 100% 录制
});

// 结合错误边界
const SentryErrorBoundary = Sentry.withErrorBoundary(App, {
  fallback: <ErrorFallback />,
});

// 5. 自定义性能 Hook（追踪关键操作耗时）
function usePerformanceMark(name) {
  const startRef = useRef(null);

  const start = useCallback(() => {
    startRef.current = performance.now();
    performance.mark(`${name}_start`);
  }, [name]);

  const end = useCallback(() => {
    const duration = performance.now() - startRef.current;
    performance.mark(`${name}_end`);
    performance.measure(name, `${name}_start`, `${name}_end`);
    // 上报
    analytics.track('custom_perf', { name, duration });
    return duration;
  }, [name]);

  return { start, end };
}
```

**🔍 深层原理**

**核心 Web Vitals 指标（Google 2024）：**

| 指标 | 含义 | 良好阈值 |
|---|---|---|
| LCP | 最大内容元素渲染时间 | < 2.5s |
| CLS | 累计布局偏移 | < 0.1 |
| INP | 交互到下一帧绘制（2024 替换 FID）| < 200ms |

React 对 INP 影响最大，因为长时间的 JS 执行（大型组件渲染）会阻塞主线程，导致 INP 差。React 18 的 `useTransition` 可以有效改善 INP。

**⚠️ 常见误区**

- ❌ 只在开发环境测试性能 → 生产环境（无 StrictMode、有 minify）的性能与开发差异很大
- ❌ Profiler API 在生产环境默认关闭 → 需要引入 `react-dom/profiling` 包才能在生产环境使用
- ✅ 性能监控应该是持续的，而非一次性的，CI/CD 中加入 Lighthouse 检查

**💡 踩坑点**

```jsx
// 踩坑：Profiler 在生产环境无法使用
// 默认的 react-dom 生产包会 tree-shake 掉 Profiler
// 需要在 webpack/vite 中配置别名：
// 'react-dom': 'react-dom/profiling'
// 才能在生产环境使用 Profiler API
```

**🎯 面试追问**

**Q1: 如何定位 React 应用中的"渲染风暴"（过多的重渲染）？**

A: ① React DevTools Profiler 录制，查看频繁渲染的组件；② `why-did-you-render` 库自动打印不必要的重渲染原因；③ 在组件里加 `console.count('ComponentName rendered')` 临时调试。

**Q2: INP 指标对 React 应用有什么意义？如何优化？**

A: INP 衡量用户交互到下一帧渲染的时间。React 应用中长时间的同步渲染（大型列表、复杂计算）会导致 INP 差。优化：① `useTransition` 降低非紧急更新优先级；② `useDeferredValue` 延迟渲染；③ 虚拟列表；④ Code Splitting 减少 JS 解析时间。

**Q3: 如何在 React 应用中实现用户行为回放？**

A: ① Sentry Replay（录制 DOM 变化 + 用户操作，错误发生时回放）；② FullStory / Hotjar（第三方行为分析工具）；③ 自研：使用 `MutationObserver` 记录 DOM 变化，`rrweb` 库实现录制/回放。

---

> **文件更新于 2026-03-24**
> **题目总数：20 题（Q1-Q20）**
> **涵盖主题：虚拟DOM、Diff算法、Fiber、Hooks（useState/useEffect/useMemo/useCallback/useRef/useContext）、生命周期、React.memo、性能优化、Redux/RTK、React Router、受控/非受控、合成事件、错误边界、React 18 新特性、React Server Components、性能监控**
