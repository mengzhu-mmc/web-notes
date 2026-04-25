# 豆包对话提取 - React

> ⚠️ 已蒸馏至正式笔记，此文件归档备用。

> 来源：豆包历史对话，提取时间：2026-03-17

---

## React Fiber 核心更新逻辑

### 核心知识点
- React Fiber 架构从**同步阻塞更新**变为**异步可中断更新**
- 整体流程分两大阶段：协调阶段（可中断）+ 提交阶段（不可中断）
- **双缓存机制**：current 树（当前展示）+ workInProgress 树（正在构建）

### 双缓存机制
- `current` 树：当前页面已渲染的 Fiber 树，只读
- `workInProgress` 树：正在构建的新树，基于 current 增量构建
- `alternate` 指针：两棵树的对应节点相互指向
- 提交后通过 `root.current = finishedWork` 切换

### 协调阶段（render 阶段）——可中断
1. 基于 current 树深度优先遍历，增量生成 workInProgress 树
2. 遍历过程为每个节点打 flags 标记（Update/Placement/Deletion）
3. **时间切片**：每次最多执行 5ms（Scheduler 默认时间片）
4. 处理完一个任务单元就检查时间，超时则暂停，让出主线程
5. 高优先级更新可**抛弃**低优先级的 workInProgress，重新构建

### 提交阶段（commit 阶段）——不可中断
分三个子阶段：
1. **before mutation**：DOM 修改前，处理 useEffect 清理
2. **mutation**：根据 flags 执行真实 DOM 操作（增/删/改）
3. **layout**：DOM 已更新，执行 componentDidMount/useLayoutEffect

### 时间切片核心逻辑

```js
// packages/scheduler/src/Scheduler.js
function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - startTime;
  if (timeElapsed < frameYieldMs) { // frameYieldMs = 5
    return false;
  }
  return true;
}

// 并发工作循环（可中断）
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}
```

### Fiber 节点核心字段

```js
{
  type: 'div' | App | () => {},  // 节点类型
  props: {},                      // 属性
  stateNode: dom节点 || 组件实例, // 真实 DOM 或实例
  return: 父Fiber,                // 父节点
  child: 子Fiber,                 // 第一个子节点
  sibling: 兄弟Fiber,             // 下一个兄弟
  alternate: 对应旧Fiber,         // 双缓存关键
  flags: 标记,                    // 增/删/改/替换
  lanes: 优先级,
}
```

### 深度优先遍历顺序
- 口诀：**先子后兄，没兄再回父**
- 不用递归，用循环 + 链表遍历，因此随时可中断恢复

### React 16 vs React 18
- **React 16**：有 Fiber 架构底层能力，但默认**同步渲染**（走 workLoopSync）
- **React 18**：通过 `createRoot` 开启并发特性，时间切片和可中断更新才真正生效

### 优先级 Lane 机制
- 使用 31 位二进制 Lane 表示优先级
- 同步更新 > 交互事件 > 网络返回 > 懒加载/Suspense
- 高优先级更新**抛弃**低优先级进度，重新构建（不是插队继续）

### 面试标准答案
> React Fiber 采用双缓存+时间切片+优先级调度：协调阶段基于 current 树增量构建 workInProgress 树，可中断、可恢复、可插队；时间片默认 5ms，时间到立即释放主线程，不阻塞浏览器；高优先级更新可抛弃低优先级的构建进度，重新开始；提交阶段一次性将变更应用到 DOM，不可中断，保证视图一致性。

---

## React闭包陷阱讲解

### 核心知识点
- 组件渲染时，函数/Effect 捕获了**当时的 state**，之后 state 更新了，但函数里用的还是旧值
- 本质：React 每次渲染都是一次独立的函数调用，各自有独立的**变量快照**

### 经典场景：定时器永远打印旧值

```js
function Demo() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setInterval(() => {
      console.log(count); // 永远打印 0！
    }, 1000);
  }, []); // 空依赖，只捕获首次渲染的 count

  return <button onClick={() => setCount(count + 1)}>+1</button>;
}
```

### 解决方案（4种）

**1. 正确写依赖（最简单）**
```js
useEffect(() => {
  const id = setInterval(() => {
    console.log(count);
  }, 1000);
  return () => clearInterval(id);
}, [count]); // 把 count 加上
```

**2. 函数式更新（不需要最新值时）**
```js
setCount(prev => prev + 1); // 不依赖外部 count
```

**3. useRef 存最新引用（最通用）**
```js
const countRef = useRef(count);
countRef.current = count; // 每次渲染同步最新值

useEffect(() => {
  setInterval(() => {
    console.log(countRef.current); // 永远最新
  }, 1000);
}, []);
```

**4. useEvent（React 18+）**
```js
const onTick = useEvent(() => {
  console.log(count); // 永远最新
});
```

### 面试要点
- 闭包陷阱 = 函数捕获了旧渲染的 state，异步场景拿不到最新值
- 解决：补全依赖 / 函数式更新 / useRef 存最新值 / useEvent

---

## React中连续三次调用setState都生效的方法

### 核心知识点
- React 默认会**合并批量更新**，多次 setState 只触发一次渲染
- 要让每次都生效，需让 React 知道每次都是"新状态"

### 四种方案

**1. 函数式更新（最推荐）**
```js
// class 组件
this.setState(prev => ({ count: prev.count + 1 }));
this.setState(prev => ({ count: prev.count + 1 }));
this.setState(prev => ({ count: prev.count + 1 }));

// Hooks
setCount(prev => prev + 1);
setCount(prev => prev + 1);
setCount(prev => prev + 1);
// 三次都执行，只触发一次渲染，count 最终 +3
```

**2. flushSync（React 18+，强制同步更新）**
```js
import { flushSync } from 'react-dom';

flushSync(() => { this.setState({ count: this.state.count + 1 }); });
flushSync(() => { this.setState({ count: this.state.count + 1 }); });
flushSync(() => { this.setState({ count: this.state.count + 1 }); });
// 每次立即更新 DOM，触发 3 次渲染
```

**3. setTimeout/宏任务**
```js
setTimeout(() => { this.setState({ count: this.state.count + 1 }); }, 0);
setTimeout(() => { this.setState({ count: this.state.count + 1 }); }, 0);
setTimeout(() => { this.setState({ count: this.state.count + 1 }); }, 0);
```

**4. 回调嵌套（串行异步，触发 3 次渲染）**
```js
this.setState({ count: this.state.count + 1 }, () => {
  this.setState({ count: this.state.count + 1 }, () => {
    this.setState({ count: this.state.count + 1 });
  });
});
```

### 关键区分
| 方式 | 是否触发3次渲染 | 值是否都生效 | 推荐度 |
|------|----------------|-------------|--------|
| 函数式更新 | ❌ 只1次 | ✅ 都生效 | ⭐⭐⭐⭐⭐ |
| flushSync | ✅ 3次 | ✅ 都生效 | ⭐⭐⭐ |
| setTimeout | ✅ 3次 | ✅ 都生效 | ⭐⭐ |
| 回调嵌套 | ✅ 3次 | ✅ 都生效 | ⭐（回调地狱） |

### 面试要点
- 函数式 setState：值一定不丢，会按顺序执行，渲染可能合并
- 想三次都生效（值不丢），优先用函数式更新
- 想三次都触发渲染，用 flushSync

---

## 用useContext和useReducer模拟Redux

### 核心知识点
- `useContext` 替代 Redux 的 `Provider`，实现跨组件状态共享
- `useReducer` 替代 Redux 的 `reducer/dispatch`，管理复杂状态逻辑
- 核心流程：创建 Context → 编写 reducer → Provider 传递 state/dispatch → 自定义 Hook 消费

### 与 Redux 的对应关系
| Redux 概念 | React Hook 实现 |
|-----------|----------------|
| store | useReducer + Context.Provider |
| reducer | useReducer 的第一个参数（纯函数） |
| dispatch | useReducer 返回的 dispatch |
| state | useReducer 返回的 state |
| useSelector | 自定义 Hook 中解构 state |
| useDispatch | 自定义 Hook 中解构 dispatch |

### 完整实现代码

```jsx
import React, { createContext, useContext, useReducer } from 'react';

// 1. 创建 Context
const StoreContext = createContext(null);

// 2. 初始状态
const initialState = { todos: [], filter: 'all' };

// 3. Reducer（纯函数）
function rootReducer(state, action) {
  switch (action.type) {
    case 'ADD_TODO':
      return { ...state, todos: [...state.todos, { id: Date.now(), text: action.payload, completed: false }] };
    case 'TOGGLE_TODO':
      return { ...state, todos: state.todos.map(todo =>
        todo.id === action.payload ? { ...todo, completed: !todo.completed } : todo
      )};
    case 'SET_FILTER':
      return { ...state, filter: action.payload };
    default:
      return state;
  }
}

// 4. Provider 组件
export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(rootReducer, initialState);
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

// 5. 自定义 Hook
export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore 必须在 StoreProvider 内部使用');
  return context;
}
```

### 进阶优化
- **异步 action（类似 redux-thunk）**：封装 `enhancedDispatch`，支持函数类型 action
- **状态持久化**：结合 `localStorage` 在初始化时读取，更新时保存
- **拆分 Reducer**：自己实现简单的 `combineReducers` 函数

### 面试要点
- 适合中小型应用，无需安装额外库
- 劣势：context 更新会重渲染所有消费者（可用 memo 或 context 拆分优化）

---

## useMemo和useCallback空数组依赖效果

### 核心知识点
- 传空数组 `[]`：依赖永远不变化，**仅在组件首次渲染时执行一次**，后续复用首次结果
- 不传依赖数组：每次组件重渲染都重新计算/创建，相当于没有缓存

### useMemo(fn, []) 的效果

```jsx
const expensiveValue = useMemo(() => {
  console.log('计算 expensiveValue'); // 仅首次渲染打印
  return count * 1000;
  // 注意：虽然用到 count，但依赖为空，后续 count 变化也不会重新计算！
}, []);
// count 变为 1 后，expensiveValue 仍为 0
```

### useCallback(fn, []) 的效果

```jsx
const handleClick = useCallback(() => {
  console.log('count:', count); // 注意：捕获的是首次的 count（0），后续不会更新
}, []);
// 点击加1后 count=1，再调用 handleClick 仍输出 0（闭包陷阱！）
```

### 注意事项（新手易踩坑）
- 依赖缺失问题：内部用到了 state/props，但传 `[]` 会导致内部值永远是旧值
- 传 `[]` 仅适用于"计算逻辑无依赖、函数内部不依赖组件状态"的场景
- 有依赖必须加入数组（如 `[count]`），否则引发 bug

### 面试要点
- `useMemo(fn, [])` 和 `useCallback(fn, [])` **有效果**：仅首次渲染执行，后续复用
- 核心风险：如果内部依赖了 state，传 `[]` 会导致值"固化"为首次渲染的旧值
- 正确用法：无依赖传 `[]`，有依赖必须加入数组

---
