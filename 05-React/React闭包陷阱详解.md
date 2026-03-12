# React 闭包陷阱详解

## 什么是闭包陷阱

在 React 函数组件中，由于每次渲染都会创建新的函数作用域，闭包会捕获创建时的变量值（快照），而非变量的实时引用。当在异步操作或旧函数引用中使用状态值时，就会出现"闭包陷阱"——使用的是过时的状态快照。

## 问题演示

### setState(value) 的问题

```javascript
function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    // 连续调用3次，count 在闭包中被"冻结"为 0
    setCount(count + 1);  // setCount(0 + 1)
    setCount(count + 1);  // setCount(0 + 1)
    setCount(count + 1);  // setCount(0 + 1)
    // 最终 count 只会变成 1，而不是 3
  };

  return <button onClick={handleClick}>{count}</button>;
}
```

### setState(fn) 的正确写法

```javascript
const handleClick = () => {
  setCount(c => c + 1); // c = 0，返回 1
  setCount(c => c + 1); // c = 1，返回 2
  setCount(c => c + 1); // c = 2，返回 3
  // 最终 count 会变成 3
};
```

函数式更新不依赖闭包中的旧值，而是由 React 在执行更新队列时传入最新状态。

## 渲染机制解析

每次渲染，组件函数重新执行，创建新的 `handleClick` 函数，捕获当次渲染的 `count` 值。旧函数仍然持有旧的 `count` 值：

```javascript
// === 第1次渲染 ===
// const count = 0; handleClick_v1 捕获 count=0

// === 第2次渲染（点击后） ===
// const count = 1; handleClick_v2 捕获 count=1
```

## 典型陷阱场景

### 场景一：异步操作中的陷阱

```javascript
function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setTimeout(() => {
      // 3秒后执行，闭包捕获的 count 还是点击时的值
      setCount(count + 1); // ❌ 使用过时的快照
    }, 3000);
  };

  return <button onClick={handleClick}>{count}</button>;
}
```

如果在 3 秒内多次点击，每个 `setTimeout` 都捕获各自点击时的 `count` 值，导致结果不符合预期。

### 场景二：useEffect 依赖陷阱

```javascript
function Timer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(count + 1); // ❌ count 永远是 0
    }, 1000);
    return () => clearInterval(timer);
  }, []); // 空依赖，effect 永远不会重新创建

  return <div>{count}</div>;
  // count 只会显示 1，不会继续增长
}
```

空依赖数组导致 effect 只在挂载时创建一次，闭包捕获的 `count` 永远是初始值 0。

### 正确写法

```javascript
function Timer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => c + 1); // ✅ 总是基于最新值
    }, 1000);
    return () => clearInterval(timer);
  }, []); // 可以保持空依赖

  return <div>{count}</div>;
}
```

## React 内部处理机制

```javascript
// React 内部维护状态队列
class ReactState {
  constructor() {
    this.state = 0;
    this.updateQueue = [];
  }

  setState(updater) {
    if (typeof updater === 'function') {
      this.updateQueue.push(updater); // 函数式：执行时传入最新状态
    } else {
      this.updateQueue.push(() => updater); // 直接值：使用给定的值
    }
  }

  flush() {
    this.updateQueue.forEach(updater => {
      this.state = updater(this.state); // 关键：传入最新 state
    });
    this.updateQueue = [];
  }
}
```

直接传值时，所有更新函数都返回同一个固定值（因为闭包捕获的旧值相同），合并后只生效一次。函数式更新时，每个函数接收上一次的返回值作为输入，形成链式更新。

## 形象比喻

直接传值相当于"拍照片"——`setTimeout` 中看到的 `count` 是拍照时的值，即使实际的 `count` 已经变了，照片里还是旧值。函数式更新相当于"视频通话"——每次都能看到最新的 `count`。

## 类组件中的函数式更新

类组件的 `this.setState` 同样支持函数式更新，接收 `(prevState, props)` 两个参数：

```javascript
// 函数式写法
this.setState((prevState, props) => ({
  count: prevState.count + 1
}));

// 带回调的写法
this.setState(
  state => ({ count: state.count + 1 }),
  () => {
    console.log('更新完成，当前count:', this.state.count);
  }
);
```

类组件中对象式写法 `this.setState({ count: this.state.count + 1 })` 多次调用时，React 会通过 `Object.assign` 合并，只有最后一次生效。

## render 中的异步判断陷阱

```javascript
render() {
  return isZhenguoLogin() ? this.renderList() : this.renderLoginView();
}
```

如果 `isZhenguoLogin()` 是异步函数（返回 Promise），这段代码不会报错但逻辑是错的——Promise 对象在 JavaScript 中永远是 truthy，所以永远进入 `true` 分支。正确做法是在 `componentDidMount` 或 `useEffect` 中执行异步检查，将结果存入 state，render 中只根据 state 判断。

## 使用建议

| 方式 | 获取的状态 | 适用场景 |
|------|-----------|---------|
| `setState(value)` | 闭包捕获的旧值 | 新值不依赖旧值 |
| `setState(fn)` | 最新的状态值 | 新值依赖旧值 |

当更新依赖当前状态时，永远使用函数式更新。其他解决方案包括正确设置 `useEffect` 依赖项，以及使用 `useRef` 存储不需要触发渲染的可变值。
