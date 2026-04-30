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
