# React 自定义 Hook 与自定义组件区别

> 面试高频：自定义 Hook 和自定义组件有什么区别？什么时候用 Hook，什么时候用组件？Hook 的状态是共享的吗？

---

## 一、核心区别对比

| 特性 | 自定义组件 | 自定义 Hook |
|------|-----------|------------|
| 核心职责 | 负责 UI 渲染，决定页面"长什么样" | 负责逻辑复用，决定数据"怎么变" |
| 返回值 | 必须返回 JSX 或 null | 返回任意值（变量、函数、对象等） |
| 命名规范 | 大驼峰（PascalCase），如 `MyButton` | `use` 开头小驼峰，如 `useWindowSize` |
| 调用方式 | 标签形式：`<MyButton />` | 函数形式：`const data = useWindowSize()` |
| 复用内容 | 复用 UI 结构和样式 | 复用状态逻辑（Stateful Logic） |
| 能否使用 Hooks | ✅ 可以在内部调用 Hooks | ✅ 可以调用其他 Hooks |
| 能否渲染 JSX | ✅ 必须返回 JSX | ❌ 不应返回 JSX |
| React 是否追踪 | 作为 Fiber 节点追踪 | 不单独追踪，附属于调用它的组件 |

---

## 二、代码对比

```javascript
// ✅ 自定义 Hook：只管逻辑，不返回 JSX
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  const increment = () => setCount(prev => prev + 1);
  const decrement = () => setCount(prev => prev - 1);
  const reset = () => setCount(initialValue);
  return { count, increment, decrement, reset };
}

// ✅ 自定义组件：只管渲染，调用 Hook 获取逻辑
function CounterDisplay() {
  const { count, increment, reset } = useCounter(10);
  return (
    <div>
      <h1>结果: {count}</h1>
      <button onClick={increment}>加一</button>
      <button onClick={reset}>重置</button>
    </div>
  );
}
```

---

## 三、关键概念：Hook 状态是独立的（非共享）

自定义 Hook 复用的是"状态逻辑"（Stateful Logic），而不是"状态本身"（State）。每次调用同一个 Hook，React 都会为该次调用创建一份全新的、独立的 State：

```javascript
function CounterA() {
  const { count, increment } = useCounter(); // 独立的状态，初始值 0
  return <button onClick={increment}>A: {count}</button>;
}

function CounterB() {
  const { count, increment } = useCounter(); // 另一份独立的状态，初始值 0
  return <button onClick={increment}>B: {count}</button>;
}
// 点击 A 的按钮不会影响 B 的数字，反之亦然
```

**底层原因**：自定义 Hook 只是一个普通的 JavaScript 函数。组件 A 调用时，`useState` 在组件 A 的 Fiber 节点上注册状态；组件 B 调用时，在组件 B 的 Fiber 节点上注册另一份状态，两者完全独立。

---

## 四、如何实现多处共用一份状态

单靠自定义 Hook 无法实现全局状态共享，需要借助以下方案：

### 方案一：React Context + 自定义 Hook

```javascript
// 1. 创建 Context
const CounterContext = createContext(null);

// 2. Provider 组件持有状态
function CounterProvider({ children }) {
  const [count, setCount] = useState(0);
  const increment = () => setCount(prev => prev + 1);
  return (
    <CounterContext.Provider value={{ count, increment }}>
      {children}
    </CounterContext.Provider>
  );
}

// 3. 自定义 Hook 封装 useContext（加错误边界）
function useSharedCounter() {
  const context = useContext(CounterContext);
  if (!context) {
    throw new Error('useSharedCounter 必须在 CounterProvider 内部使用');
  }
  return context;
}

// 4. 使用：A 和 B 共享同一份状态
function App() {
  return (
    <CounterProvider>
      <CounterA />
      <CounterB />
    </CounterProvider>
  );
}

function CounterA() {
  const { count, increment } = useSharedCounter(); // 共享状态
  return <button onClick={increment}>A: {count}</button>;
}

function CounterB() {
  const { count } = useSharedCounter(); // 同一份状态
  return <span>B 看到的值: {count}</span>;
}
```

### 方案二：状态管理库（Zustand 示例）

```javascript
import { create } from 'zustand';

// 创建 store（全局单例）
const useCounterStore = create(set => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 })
}));

// 任意组件都能访问同一份状态
function CounterA() {
  const { count, increment } = useCounterStore();
  return <button onClick={increment}>A: {count}</button>;
}

function CounterB() {
  const count = useCounterStore(state => state.count); // 选择性订阅
  return <span>B: {count}</span>;
}
```

### 方案三：状态提升（Lifting State Up）

```javascript
// 将状态提升到共同父组件
function Parent() {
  const [count, setCount] = useState(0);
  const increment = () => setCount(prev => prev + 1);
  return (
    <>
      <CounterA count={count} onIncrement={increment} />
      <CounterB count={count} />
    </>
  );
}
```

---

## 五、自定义 Hook 的命名规范与 React 的识别机制

React 通过 `use` 前缀来识别 Hook，这不只是约定，而是有实际意义：

```javascript
// ✅ React 认为这是 Hook，会检查 Hook 规则
function useData() {
  const [data, setData] = useState(null);
  // ...
}

// ❌ React 不认为这是 Hook，不会检查 Hook 规则
// 但如果内部调用了 useState，会在运行时报错
function getData() {
  const [data, setData] = useState(null); // 违反 Hook 规则！
}
```

**React 的 Hook 规则**（ESLint `eslint-plugin-react-hooks` 会检查）：
1. 只能在函数组件或自定义 Hook 的顶层调用 Hook
2. 不能在条件语句、循环或嵌套函数中调用 Hook

---

## 六、什么时候用 Hook，什么时候用组件

**用自定义 Hook 的场景**：
- 多个组件需要相同的状态逻辑（如数据获取、表单处理、定时器）
- 需要将复杂的 `useEffect` 逻辑抽离出来
- 封装第三方库的使用方式

```javascript
// 典型自定义 Hook：数据获取
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });
    return () => { cancelled = true; }; // 清理：防止组件卸载后 setState
  }, [url]);

  return { data, loading, error };
}

// 使用
function UserProfile({ userId }) {
  const { data: user, loading, error } = useFetch(`/api/users/${userId}`);
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  return <div>{user.name}</div>;
}
```

**用自定义组件的场景**：
- 有可复用的 UI 结构（按钮、卡片、弹窗等）
- 需要封装特定的渲染逻辑
- 需要独立的生命周期（如错误边界 `ErrorBoundary`）

---

## 七、常见误区

### 误区一：把返回 JSX 的函数当 Hook 用

```javascript
// ❌ 错误：这是组件，不是 Hook，不应该用 use 前缀
function useUserCard(user) {
  return <div className="card">{user.name}</div>; // 返回 JSX
}

// ✅ 正确：这是组件
function UserCard({ user }) {
  return <div className="card">{user.name}</div>;
}
```

### 误区二：在 Hook 内部直接渲染

```javascript
// ❌ 错误：Hook 不应该有副作用地渲染 UI
function useModal() {
  const [open, setOpen] = useState(false);
  // 不要在 Hook 里 return JSX！
  return { open, setOpen, Modal: <Modal open={open} /> }; // 反模式
}

// ✅ 正确：Hook 只返回状态和方法，组件负责渲染
function useModal() {
  const [open, setOpen] = useState(false);
  return { open, openModal: () => setOpen(true), closeModal: () => setOpen(false) };
}

function App() {
  const { open, openModal, closeModal } = useModal();
  return (
    <>
      <button onClick={openModal}>打开</button>
      <Modal open={open} onClose={closeModal} />
    </>
  );
}
```

---

## 八、形象比喻

自定义**组件**是显示器、键盘、机箱外壳——用户看得到、摸得着的部分。

自定义 **Hook** 是 CPU 运算指令或内存管理机制——看不到但在后台处理数据，告诉组件该显示什么。

自定义 Hook 就像产出逻辑的模具：用同一个模具印出两个月饼，吃掉第一个，第二个不会消失——因为它们是两份独立的实例。

---

## 九、面试常见追问

**Q1：自定义 Hook 和普通工具函数有什么区别？**

普通工具函数不能调用 React Hooks（`useState`、`useEffect` 等），自定义 Hook 可以。如果逻辑不涉及 React 状态或副作用，用普通函数即可；如果需要管理状态或副作用，才需要自定义 Hook。

**Q2：自定义 Hook 能返回 JSX 吗？**

技术上可以，但这是反模式。返回 JSX 的函数应该是组件（大驼峰命名），而不是 Hook。混用会导致代码难以理解和维护。

**Q3：两个组件调用同一个 Hook，状态会共享吗？**

不会。每次调用 Hook，React 都会为该次调用创建独立的状态实例。要共享状态，需要使用 Context、状态管理库或状态提升。

**Q4：自定义 Hook 可以调用其他自定义 Hook 吗？**

可以，这是 Hook 组合的核心能力。例如 `useUserData` 内部可以调用 `useFetch` 和 `useLocalStorage`，形成逻辑层次。

**Q5：为什么 Hook 必须以 `use` 开头？**

这是 React 的约定，让 React（和 ESLint 插件）能够识别 Hook 并检查 Hook 规则（不能在条件/循环中调用）。如果不以 `use` 开头，React 不会对其应用 Hook 规则检查，可能导致难以排查的 bug。
