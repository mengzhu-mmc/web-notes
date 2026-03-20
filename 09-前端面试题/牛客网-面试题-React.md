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

---

### Q: useCallback 和 useMemo 的区别？什么时候用？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

| Hook | 缓存对象 | 返回值 | 适用场景 |
|---|---|---|---|
| `useMemo` | 计算**值** | 计算结果 | 昂贵计算结果复用 |
| `useCallback` | **函数** | 函数本身 | 函数引用稳定（子组件 props） |

`useCallback(fn, deps)` 等价于 `useMemo(() => fn, deps)`

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');

  // ✅ useMemo：昂贵计算
  const expensiveValue = useMemo(() => {
    return computeExpensive(count);  // 仅 count 变化时重新计算
  }, [count]);

  // ✅ useCallback：传给子组件的函数，保持引用稳定
  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []);  // 空 deps，函数不会重建

  return (
    <>
      <p>{expensiveValue}</p>
      <Child onClick={handleClick} />  {/* Child 不会因 text 变化而重渲 */}
      <input value={text} onChange={e => setText(e.target.value)} />
    </>
  );
}

// 搭配 React.memo 使用，效果才最佳
const Child = React.memo(({ onClick }) => {
  console.log('Child render');
  return <button onClick={onClick}>Click</button>;
});
```

**⚠️ 不要过度使用：** 每个 hook 都有缓存开销，仅在以下情况使用：
- 子组件使用了 `React.memo`
- 函数/值作为其他 hook 的依赖
- 计算代价确实很高

---

### Q: useRef 的用途有哪些？与 createRef 的区别？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

`useRef` 返回一个 `{ current: ... }` 对象，**修改 current 不触发重新渲染**。

| 对比 | `useRef` | `createRef` |
|---|---|---|
| 使用场景 | 函数组件 | 类组件 |
| 创建时机 | 组件生命周期内只创建一次 | 每次渲染都创建新的 |
| 持久化 | ✅ 跨渲染保持 | ❌ 每次渲染重置 |

**三大用途：**

```jsx
function Demo() {
  // 1. 访问 DOM 元素
  const inputRef = useRef(null);
  const focusInput = () => inputRef.current.focus();

  // 2. 保存不需要触发渲染的可变值
  const renderCount = useRef(0);
  useEffect(() => { renderCount.current++; });  // 不触发渲染

  // 3. 保存上一次的值
  function usePrevious(value) {
    const ref = useRef();
    useEffect(() => { ref.current = value; });
    return ref.current;  // 返回上一次渲染的值
  }

  const prevCount = usePrevious(count);

  return (
    <>
      <input ref={inputRef} />
      <button onClick={focusInput}>Focus</button>
      <p>Rendered {renderCount.current} times</p>
    </>
  );
}
```

---

### Q: 如何实现自定义 Hook？请给出实际案例

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

自定义 Hook 是**以 `use` 开头、内部调用其他 Hook 的函数**，用于逻辑复用。

```jsx
// 1. useFetch：数据请求
function useFetch(url) {
  const [state, setState] = useState({
    data: null, loading: true, error: null
  });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    fetch(url)
      .then(r => r.json())
      .then(data => !cancelled && setState({ data, loading: false, error: null }))
      .catch(error => !cancelled && setState({ data: null, loading: false, error }));

    return () => { cancelled = true; };  // 防止竞态条件
  }, [url]);

  return state;
}

// 2. useLocalStorage：持久化状态
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  const setStoredValue = (newValue) => {
    try {
      setValue(newValue);
      window.localStorage.setItem(key, JSON.stringify(newValue));
    } catch (e) { console.error(e); }
  };

  return [value, setStoredValue];
}

// 3. useDebounce
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// 使用
function SearchBar() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { data, loading } = useFetch(`/api/search?q=${debouncedQuery}`);
  // ...
}
```

---

## 三、状态管理

### Q: Redux 的核心原则是什么？数据流是怎样的？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

**三大原则：**
1. **单一数据源（Single Source of Truth）**：整个应用的 state 存在唯一 store
2. **State 只读（State is Read-Only）**：唯一改变 state 的方式是 dispatch action
3. **纯函数修改（Changes with Pure Functions）**：reducer 必须是纯函数

**数据流：**
```
UI 事件 → dispatch(action) → reducer(state, action) → new state → 重新渲染
```

```js
// Redux Toolkit（现代写法，推荐）
import { createSlice, configureStore } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: state => { state.value += 1; },      // Immer 内部处理不可变性
    decrement: state => { state.value -= 1; },
    incrementByAmount: (state, action) => {
      state.value += action.payload;
    },
  },
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;

const store = configureStore({ reducer: { counter: counterSlice.reducer } });

// React 组件中使用
import { useSelector, useDispatch } from 'react-redux';

function Counter() {
  const count = useSelector(state => state.counter.value);
  const dispatch = useDispatch();
  return (
    <div>
      <button onClick={() => dispatch(increment())}>+</button>
      <span>{count}</span>
    </div>
  );
}
```

---

### Q: Redux、Zustand、Context API 如何选择？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

| 方案 | 适用场景 | 优点 | 缺点 |
|---|---|---|---|
| **Context API** | 主题/语言/简单全局状态 | 内置，无需依赖 | 频繁更新性能差（所有消费者重渲染） |
| **Zustand** | 中小型项目，追求简洁 | API 极简，性能好，支持选择性订阅 | 缺乏 Redux DevTools 的调试能力 |
| **Redux Toolkit** | 大型项目，复杂状态逻辑 | 可预测，调试强大，中间件生态丰富 | 样板代码多（RTK 已大幅减少） |

```js
// Zustand（极简对比）
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 }),
}));

function Counter() {
  const { count, increment } = useStore();
  return <button onClick={increment}>{count}</button>;
}
```

**选择建议：**
- **简单状态**（主题、用户信息）→ Context
- **中小型应用** → Zustand（5行搭起来）
- **大型应用/团队协作** → Redux Toolkit（强约束 + 调试工具）

---

## 四、性能优化

### Q: React.memo、useMemo、useCallback 如何避免不必要的渲染？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

React 默认每次父组件重渲时，子组件也重渲。优化链路：

```
父组件 state 变化
→ 父组件重渲
→ 子组件 props 是否变化？
  → 是（或未用 memo）→ 子组件重渲
  → 否（且用了 memo）→ 跳过重渲 ✓
```

```jsx
// React.memo：对 props 进行浅比较，相同则跳过重渲
const ExpensiveChild = React.memo(({ data, onClick }) => {
  console.log('ExpensiveChild render');
  return <div onClick={onClick}>{data.name}</div>;
}, (prevProps, nextProps) => {
  // 自定义比较函数（可选），返回 true 表示相同（跳过重渲）
  return prevProps.data.id === nextProps.data.id;
});

function Parent() {
  const [count, setCount] = useState(0);
  const [user] = useState({ id: 1, name: 'Alice' });

  // ✅ 函数引用稳定（useCallback）
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);  // 依赖为空，函数不重建

  // ✅ 对象引用稳定（useMemo）
  const config = useMemo(() => ({
    theme: 'dark',
    lang: 'zh'
  }), []);

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      {/* count 变化不会导致 ExpensiveChild 重渲 */}
      <ExpensiveChild data={user} onClick={handleClick} />
    </>
  );
}
```

---

### Q: React 中如何实现代码分割和懒加载？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

```jsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// 路由级代码分割（最常用）
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}

// 组件级懒加载（按需）
const HeavyChart = lazy(() =>
  import('./components/Chart').then(module => ({
    default: module.BarChart  // 非 default 导出
  }))
);

// 预加载（鼠标 hover 时提前加载）
const preloadDashboard = () => import('./pages/Dashboard');

<Link
  to="/dashboard"
  onMouseEnter={preloadDashboard}
>
  Dashboard
</Link>
```

---

## 五、生命周期

### Q: 类组件生命周期和 Hooks 的对应关系

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

| 类组件 | 函数组件 Hooks |
|---|---|
| `constructor` | `useState` 初始化 |
| `componentDidMount` | `useEffect(() => {}, [])` |
| `componentDidUpdate` | `useEffect(() => {}, [deps])` |
| `componentWillUnmount` | `useEffect` 返回的清理函数 |
| `shouldComponentUpdate` | `React.memo` / `useMemo` |
| `getSnapshotBeforeUpdate` | `useLayoutEffect` |
| `getDerivedStateFromProps` | 渲染期间直接计算 |
| `componentDidCatch` | 暂无 Hook 对应（需用类组件 ErrorBoundary） |

```jsx
// 类组件
class Timer extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }
  componentDidMount() {
    this.timer = setInterval(() => {
      this.setState(s => ({ count: s.count + 1 }));
    }, 1000);
  }
  componentWillUnmount() {
    clearInterval(this.timer);
  }
  render() {
    return <div>{this.state.count}</div>;
  }
}

// 等价 Hooks 写法
function Timer() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setCount(c => c + 1), 1000);
    return () => clearInterval(timer);  // componentWillUnmount
  }, []);  // [] = componentDidMount
  return <div>{count}</div>;
}
```

---

## 六、React 18 新特性

### Q: React 18 的并发模式是什么？useTransition 如何使用？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

**并发模式（Concurrent Mode）** 允许 React 同时准备多个版本的 UI，可以**中断、暂停、恢复渲染**，优先处理紧急更新。

**React 18 核心概念：**
- **紧急更新（Urgent Update）**：直接反映用户交互（打字、点击）
- **过渡更新（Transition Update）**：非紧急的 UI 更新（搜索结果、列表筛选）

```jsx
import { useState, useTransition, startTransition } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e) {
    const value = e.target.value;
    setQuery(value);  // 紧急更新：输入框立即响应

    startTransition(() => {
      // 过渡更新：结果列表可以延迟，让输入保持流畅
      setResults(heavyFilter(allData, value));
    });
  }

  return (
    <>
      <input value={query} onChange={handleSearch} />
      {isPending ? (
        <span>Loading results...</span>
      ) : (
        <ResultList data={results} />
      )}
    </>
  );
}

// useDeferredValue：类似 useTransition，但用于延迟某个值
import { useDeferredValue } from 'react';

function SearchResults({ query }) {
  const deferredQuery = useDeferredValue(query);
  // deferredQuery 在空闲时更新，不阻塞输入框
  const results = useMemo(() => filterData(deferredQuery), [deferredQuery]);
  return <List data={results} />;
}
```

---

### Q: React 18 的自动批处理（Automatic Batching）是什么？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

**React 17 及之前**：只在 React 事件处理器中批处理，在 `setTimeout`、Promise、原生事件中不批处理。

**React 18**：所有更新默认自动批处理，无论来自哪里。

```jsx
// React 17
setTimeout(() => {
  setCount(c => c + 1);  // 触发渲染
  setFlag(f => !f);      // 触发渲染
  // 共 2 次渲染
}, 1000);

// React 18
setTimeout(() => {
  setCount(c => c + 1);  // 不立即渲染
  setFlag(f => !f);      // 不立即渲染
  // 自动批处理，只触发 1 次渲染 ✓
}, 1000);

// 如果需要退出批处理（强制同步）
import { flushSync } from 'react-dom';
flushSync(() => setCount(c => c + 1));  // 立即渲染
flushSync(() => setFlag(f => !f));      // 再次渲染
```

---

## 七、常见问题

### Q: React 中 key 的作用是什么？为什么不能用 index 作 key？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥🔥🔥

**答：**

`key` 帮助 React **识别列表中哪些元素被添加、修改或删除**，是 Diff 算法的优化 hint。

**用 index 作 key 的问题：**

```jsx
// 初始状态
[{id: 'a', text: 'Apple'}, {id: 'b', text: 'Banana'}]
// 渲染：key=0: Apple, key=1: Banana

// 在头部插入 Cherry
[{id: 'c', text: 'Cherry'}, {id: 'a', text: 'Apple'}, {id: 'b', text: 'Banana'}]
// 渲染：key=0: Cherry, key=1: Apple, key=2: Banana

// React 认为：key=0 的元素从 Apple 变成了 Cherry（更新）
//             key=1 的元素从 Banana 变成了 Apple（更新）
//             key=2 是新增的 Banana
// → 所有节点都被更新，失去 Diff 优化
// → 如果节点有内部状态（输入框），状态会错乱！

// ✅ 使用稳定唯一 id
{items.map(item => <Item key={item.id} {...item} />)}
```

---

### Q: 受控组件和非受控组件的区别？

**难度**：⭐⭐ | **频率**：🔥🔥🔥🔥

**答：**

| 对比 | 受控组件 | 非受控组件 |
|---|---|---|
| 数据存储 | React state（`useState`） | DOM 自身 |
| 读取方式 | 直接读 state | `ref.current.value` |
| 实时校验 | ✅ 方便 | ❌ 麻烦 |
| 代码量 | 多（需 onChange） | 少 |
| 适用场景 | 表单验证、联动 | 简单表单、文件上传 |

```jsx
// 受控组件（推荐）
function ControlledForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // 直接用 state 中的值
    console.log({ name, email });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} />
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <button type="submit">Submit</button>
    </form>
  );
}

// 非受控组件
function UncontrolledForm() {
  const nameRef = useRef();
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(nameRef.current.value);  // 从 DOM 读取
  };
  return (
    <form onSubmit={handleSubmit}>
      <input ref={nameRef} defaultValue="default" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

### Q: 什么是错误边界（Error Boundary）？如何使用？

**难度**：⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

错误边界是一种 React 组件，能**捕获子组件树中的 JS 错误，防止整个应用崩溃**。

> ⚠️ 错误边界**只能捕获**：渲染、生命周期方法、构造函数中的错误
> **无法捕获**：事件处理器（用 try/catch）、异步代码、服务端渲染错误

```jsx
// 错误边界只能用类组件实现（暂无 Hook 等价物）
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // 上报错误到监控系统
    logErrorToService(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <h2>Something went wrong.</h2>;
    }
    return this.props.children;
  }
}

// 使用
function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Router>
        <Routes>
          <Route path="/" element={
            <ErrorBoundary fallback={<div>Home failed</div>}>
              <Home />
            </ErrorBoundary>
          } />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
```

---

### Q: React 中如何避免 Context 导致的过度渲染？

**难度**：⭐⭐⭐⭐ | **频率**：🔥🔥🔥

**答：**

Context 的问题：任何消费者组件，只要 Context value 引用变化（哪怕值逻辑上没变），都会重渲。

```jsx
// ❌ 问题：每次父组件渲染，value 对象重新创建，所有消费者重渲
function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  return (
    <AppContext.Provider value={{ user, setUser, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
}

// ✅ 方案1：拆分 Context
const UserContext = createContext();
const ThemeContext = createContext();

// ✅ 方案2：useMemo 稳定 value
function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const value = useMemo(() => ({ user, setUser }), [user]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// ✅ 方案3：状态和 dispatch 分离（推荐，dispatch 永远稳定）
const StateContext = createContext();
const DispatchContext = createContext();

function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <DispatchContext.Provider value={dispatch}>
      <StateContext.Provider value={state}>
        {children}
      </StateContext.Provider>
    </DispatchContext.Provider>
  );
}
```

---

*本文件共约 30 道题，涵盖 React 核心全部高频考点。*
