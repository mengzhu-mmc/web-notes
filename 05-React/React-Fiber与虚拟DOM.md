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

```jsx
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

```jsx
// 更新前
<div className="before" title="stuff" />
// 更新后
<div className="after" title="stuff" />
// 结果：只更新 className 属性，复用 DOM 节点
```

### 不同类型元素

```jsx
// 更新前
<div><Counter /></div>
// 更新后
<span><Counter /></span>
// 结果：销毁整个 div 树（包括 Counter），重新创建 span 树
```

### 列表 diff 与 key

```jsx
// 没有 key 时，React 按位置比较
// 更新前：[A, B, C]
// 更新后：[B, C, A]（A 移到末尾）
// React 会更新 A→B, B→C, C→A（3次更新）

// 有 key 时，React 按 key 匹配
// React 识别出 B、C 只是移动了，A 也只是移动了
// 只需要移动 DOM 节点，不需要更新内容

// ❌ 不要用 index 作为 key（列表重排时会出问题）
{list.map((item, index) => <Item key={index} data={item} />)}

// ✅ 用稳定唯一的 id
{list.map(item => <Item key={item.id} data={item} />)}
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

```jsx
// React 18 并发特性
import { startTransition, useTransition, useDeferredValue } from 'react';

// startTransition：标记为低优先级更新
startTransition(() => {
  setSearchResults(results); // 不阻塞用户输入
});

// useTransition：带 pending 状态的 transition
const [isPending, startTransition] = useTransition();
startTransition(() => setTab('heavy'));
// isPending 为 true 时可以显示 loading

// useDeferredValue：延迟更新某个值
const deferredQuery = useDeferredValue(query);
// deferredQuery 会在空闲时才更新，不阻塞当前渲染
```

---

## 四、React 渲染流程总结

```
触发更新（setState / props 变化 / forceUpdate）
    ↓
Scheduler（调度器）：根据优先级决定何时执行
    ↓
Reconciler（协调器）：Render 阶段
  - 遍历 Fiber 树（beginWork + completeWork）
  - 对比新旧 Fiber，标记副作用（effectTag）
  - 构建 workInProgress 树
    ↓
Renderer（渲染器）：Commit 阶段
  - Before Mutation：执行 getSnapshotBeforeUpdate
  - Mutation：操作真实 DOM（插入/更新/删除）
  - Layout：执行 componentDidMount/Update、useLayoutEffect
  - 异步执行 useEffect
```
