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

## 四、Fiber 遍历机制（深度优先）

React 构建 workInProgress 树采用**深度优先遍历（DFS）**，遵循 `child → sibling → return` 的顺序。

```javascript
function performUnitOfWork(unitOfWork) {
  // 1. beginWork：处理当前节点，创建子 Fiber
  let next = beginWork(current, unitOfWork, renderLanes);

  if (next === null) {
    // 2. 没有子节点，进入 complete 阶段
    completeUnitOfWork(unitOfWork);
  } else {
    // 3. 有子节点，继续向下遍历
    workInProgress = next;
  }
}

function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    completeWork(completedWork);
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber; // 有兄弟节点，处理兄弟
      return;
    }
    completedWork = completedWork.return; // 没有兄弟，回到父节点
    workInProgress = completedWork;
  } while (completedWork !== null);
}
```

对于树 `A → B(→D), C(→E)`，遍历顺序为：`A → B → D → C → E`。

**为什么使用深度优先？**

- 符合组件树结构特点（先处理子组件，再回到父组件）
- 便于 complete 阶段从叶子节点向上回溯收集副作用
- 利于时间切片（可以在任意节点中断和恢复）
- 内存效率高（只需维护当前工作路径，不需要队列存储所有同层节点）

---

## 五、Fiber 节点核心字段

```js
{
  type,         // 节点类型（'div' | App | () => {}）
  props,        // 当前属性
  stateNode,    // 真实 DOM 节点或组件实例
  return,       // 父 Fiber 节点
  child,        // 第一个子 Fiber 节点
  sibling,      // 下一个兄弟 Fiber 节点
  alternate,    // 双缓存：指向另一棵树的对应节点
  flags,        // 副作用标记（Placement/Update/Deletion）
  lanes,        // 优先级（31位二进制 Lane）
}
```

- `alternate`：`currentFiber.alternate = wipFiber`，两棵树互相指向，构建时不销毁旧树
- `flags`：Placement（新增）、Update（更新）、Deletion（删除）
- `lanes`：31 位二进制表示优先级，同步 > 交互事件 > 网络返回 > 懒加载

---

## 六、时间切片：为什么用 MessageChannel 而非 requestIdleCallback？

React 时间切片底层用的是 **MessageChannel**，不是 `requestIdleCallback`，原因如下：

| 对比项 | requestIdleCallback | MessageChannel |
|--------|---------------------|----------------|
| 执行时机 | 浏览器空闲时才执行，用户交互频繁时可能一直被推迟 | 每帧都能稳定执行（宏任务） |
| 给的时间 | 可能不足 1ms | 可以精确控制（React 设为 5ms） |
| 兼容性 | Safari 不支持 | 全面支持 |
| 优先级控制 | React 无法自定义优先级 | 可配合 Scheduler 精确调度 |

```js
// React 借用 MessageChannel 产生"干净的宏任务"
const channel = new MessageChannel();
// port1 发消息，port2 收消息（自己给自己发）
// 时间片用完 → 停止工作 → port1.postMessage() → 产生宏任务
// 浏览器执行渲染 → onmessage 触发 → 恢复工作

// 源码佐证
export const frameYieldMs = 5; // 5ms 时间片

function shouldYieldToHost() {
  return getCurrentTime() - startTime >= frameYieldMs;
}
```

---

## 七、协调阶段 vs 提交阶段

### 协调阶段（render/reconcile）——可中断

- 深度优先遍历，基于 current 树增量构建 workInProgress 树
- 为每个 Fiber 节点打 flags 标记
- 每处理完一个任务单元检查时间（5ms），超时立即让出主线程
- 高优先级更新可**抛弃**低优先级的 workInProgress，重新构建

### 提交阶段（commit）——不可中断，分3个子阶段

| 子阶段 | 时机 | 执行内容 |
|--------|------|----------|
| **before mutation** | DOM 修改前 | 处理 `useEffect` 清理函数、`getSnapshotBeforeUpdate` |
| **mutation** | 真正操作 DOM | 根据 flags 执行插入/更新/删除 |
| **layout** | DOM 更新后、绘制前 | 执行 `componentDidMount/Update`、`useLayoutEffect` |

`useEffect` 在提交阶段完成后**异步**执行（不阻塞浏览器绘制）。

---

## 八、React 渲染流程总结

```
触发更新（setState / props 变化 / forceUpdate）
    ↓
Scheduler（调度器）：根据优先级决定何时执行
    ↓
Reconciler（协调器）：Render 阶段（可中断）
  - 遍历 Fiber 树（beginWork + completeWork）
  - 对比新 element vs 旧 Fiber，标记 flags
  - 构建 workInProgress 树
  - 时间切片：5ms 到就让出主线程（MessageChannel）
    ↓
Renderer（渲染器）：Commit 阶段（不可中断）
  - before mutation：处理 useEffect 清理
  - mutation：操作真实 DOM（插入/更新/删除）
  - layout：执行 componentDidMount/Update、useLayoutEffect
  - 异步执行 useEffect
```

### 一句话面试标准答案

> React Fiber 采用**双缓存 + 时间切片 + 优先级调度**：协调阶段基于 current 树增量构建 workInProgress 树，可中断、可恢复、可插队；时间片默认 **5ms**，时间到立即通过 **MessageChannel** 释放主线程，不阻塞浏览器；高优先级更新可抛弃低优先级的构建进度，重新开始；提交阶段分 before mutation / mutation / layout 三个子阶段，一次性将变更应用到 DOM，保证视图一致性。
