# React 闭包陷阱与底层执行机制解析

> 核心要点：在 React 中，**每一次渲染（Render）都有自己独立的执行上下文（Execution Context）和词法环境（Lexical Environment）**。理解这一点，是彻底掌握 React 闭包陷阱及内存回收机制的关键。

## 一、 前置概念：JS 闭包与执行上下文

1. **执行上下文（Execution Context）**：函数执行时创建的环境，包含了内部变量、函数声明等。
2. **词法环境（Lexical Environment）**：决定了变量的查找规则（作用域链）。函数在**定义时**就已经确定了它的词法环境，而不是执行时。
3. **闭包（Closure）**：当一个函数内部引用了外部作用域的变量，且该函数被保留到外部作用域之外执行时，就形成了闭包。闭包会“记住”它诞生时的那个词法环境。

## 二、 React 闭包陷阱是如何产生的？

React 函数组件的每一次重新渲染（Re-render），本质上就是重新执行了一次该组件的函数。

### 1. 独立的状态快照

每次渲染，React 都会创建一个新的执行上下文，里面包含了**这一帧**特有的 `state` 和 `props`。
如果在这一帧内定义了一个异步回调（如 `setTimeout`、`setInterval`、或挂载到 `window` 的事件监听器），这个回调函数就会捕获**当前这一帧**的词法环境。

### 2. 闭包陷阱（Stale Closure）场景再现

假设我们在 `useEffect` 中绑定了一个滚动事件，且依赖数组为空 `[]`：

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      console.log("当前 Count:", count);
    };
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []); // 依赖为空，只在首次挂载时执行一次

  return <button onClick={() => setCount(count + 1)}>Add</button>;
}
```

**发生过程解析**：

1. **首次渲染 (Render 1)**：`count` 值为 0。创建了 `handleScroll`，它所在的词法环境中 `count = 0`。`useEffect` 执行，将这个 `handleScroll` 绑定到 `window` 上。
2. **点击按钮 (Render 2)**：调用 `setCount(1)` 触发重渲染。React 重新执行 `Counter`，此时是一个全新的执行上下文，内部的 `count` 值为 1。
3. **闭包问题**：由于 `useEffect` 依赖为 `[]`，第二次渲染并没有重新执行 `useEffect`。因此，`window` 上绑定的滚动事件依然是 **Render 1** 中创建的那个 `handleScroll`。当触发滚动时，打印出的 `count` 永远是 0。这就是**闭包陷阱（Stale Closure）**。

## 三、 垃圾回收（GC）与可达性

为什么 Render 1 已经结束很久了，它的 `count` 依然没有被销毁？
这涉及 V8 引擎的**垃圾回收（Garbage Collection）机制 —— 可达性分析（Reachability）**。

1. **可达性（Reachability）**：GC 定期从根节点（Root，比如全局对象 `window`）开始遍历。如果一个对象可以被引用链访问到，它就是“可达的”，不会被回收。
2. **事件监听器保持了引用**：在上述例子中，`window` 对象保持着对 `handleScroll` 的引用。而 `handleScroll` 作为闭包，又保持着对 Render 1 词法环境（包含 `count = 0`）的引用。
3. **结果**：尽管 Render 1 的执行上下文已经结束，但由于 `window -> handleScroll -> Render 1 词法环境` 的引用链依然存在，GC 无法回收 Render 1 的内存，老状态被死死“抓”住了。

## 四、 如何优雅地解决闭包陷阱？

### 1. 正确设置依赖数组 (Dependencies)

让 `useEffect` 监听 `count`，每次 `count` 变化都解绑旧事件、绑定新事件（获取最新的词法环境）。
_缺点：高频触发绑定和解绑，可能带来额外性能开销。_

### 2. 利用 `useRef` 突破闭包限制 (ahooks `useLatest` 原理)

`useRef` 返回的是一个可变的普通 JavaScript 对象（`{ current: ... }`），它的内存地址在整个组件生命周期中保持不变。

```tsx
const [count, setCount] = useState(0);
const countRef = useRef(count);

// 每次渲染都更新 ref，让它永远指向最新值
countRef.current = count;

useEffect(() => {
  const handleScroll = () => {
    // 通过 ref.current 永远能拿到最新值，绕开了由于函数本身没有更新导致的闭包陷阱
    console.log("当前 Count:", countRef.current);
  };
  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, []);
```

这也是为什么在 `ahooks` 等现代 Hook 库中，大量使用了 `useRef` 来对抗闭包陷阱，保证在不重复触发 effect 的前提下获取最新状态。
