# React 自定义 Hook 与自定义组件区别

## 核心区别

| 特性 | 自定义组件 | 自定义 Hook |
|------|-----------|------------|
| 核心职责 | 负责 UI 渲染，决定页面"长什么样" | 负责逻辑复用，决定数据"怎么变" |
| 返回值 | 必须返回 JSX 或 null | 返回任意值（变量、函数、对象等） |
| 命名规范 | 大驼峰（PascalCase），如 `MyButton` | `use` 开头小驼峰，如 `useWindowSize` |
| 调用方式 | 标签形式：`<MyButton />` | 函数形式：`const data = useWindowSize()` |
| 复用内容 | 复用 UI 结构和样式 | 复用状态逻辑（Stateful Logic） |

## 代码对比

```javascript
// 自定义 Hook：只管逻辑，不返回 JSX
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  const increment = () => setCount(prev => prev + 1);
  const decrement = () => setCount(prev => prev - 1);
  const reset = () => setCount(initialValue);
  return { count, increment, decrement, reset };
}

// 自定义组件：只管渲染，调用 Hook 获取逻辑
function MyPage() {
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

## 关键概念：Hook 状态是独立的

自定义 Hook 复用的是"状态逻辑"（Stateful Logic），而不是"状态本身"（State）。当两个不同的组件调用同一个 Hook 时，React 会为每一次调用创建一份全新的、独立的 State，互不干扰。

```javascript
function CounterA() {
  const { count, increment } = useCounter(); // 独立的状态
  return <button onClick={increment}>A: {count}</button>;
}

function CounterB() {
  const { count, increment } = useCounter(); // 另一份独立的状态
  return <button onClick={increment}>B: {count}</button>;
}
// 点击 A 的按钮不会影响 B 的数字
```

本质原因：自定义 Hook 只是一个普通的 JavaScript 函数。组件 A 调用时，`useState` 在组件 A 的 Fiber 节点上注册状态；组件 B 调用时，在组件 B 的节点上注册另一份状态。

## 如何实现多处共用一份状态

单靠自定义 Hook 无法实现全局状态共享，需要结合 React Context + 自定义 Hook（在顶层 Provider 保存状态，Hook 内部用 `useContext` 读取）、状态管理库（Redux、Zustand、MobX 等）、或状态提升（Lifting State Up，将 `useState` 写在共同父组件中通过 props 传递）。

## 形象比喻

自定义组件是显示器、键盘、机箱外壳——用户看得到、摸得着的部分。自定义 Hook 是 CPU 运算指令或内存管理机制——看不到但在后台处理数据，告诉组件该显示什么。自定义 Hook 就像产出逻辑的模具，用模具印出两个月饼，吃掉第一个，第二个不会消失。
