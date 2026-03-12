# React 合成事件机制

## 面试高频考点

- React 事件代理在哪个节点上？React 16 和 17 有什么区别？
- 合成事件做了哪些处理？有什么好处？
- React 17 为什么移除了事件池？
- 如何阻止合成事件和原生事件的冒泡？

---

## 一、事件代理位置

React 16 及之前：事件代理在 `document` 节点上。

React 17 及之后：事件代理改为在 **root 容器节点**上（即 `ReactDOM.createRoot()` 挂载的节点）。

改变原因：更好支持多个 React 版本共存，避免与非 React 代码的事件冲突，渐进式升级更安全。

## 二、合成事件的处理机制

### 1. 事件注册阶段

React 收集所有事件类型，在 root 节点上注册原生事件监听器（同时注册捕获和冒泡阶段）。

### 2. 事件触发阶段

```
原生事件触发 → 找到真实 DOM 节点 → 找到对应 Fiber 节点
→ 创建合成事件对象 → 模拟捕获/冒泡收集处理函数 → 按顺序执行
```

### 3. 事件对象封装

合成事件对象包装了原生事件，提供统一的 API（`preventDefault`、`stopPropagation` 等），抹平浏览器差异。

## 三、合成事件的好处

**1. 跨浏览器兼容**

开发者无需关心浏览器差异，React 内部处理 IE 的 `propertychange` 等兼容问题。

**2. 性能优化 — 事件委托**

```js
// 原生方式：1000 个按钮 = 1000 个监听器
buttons.forEach((btn) => btn.addEventListener('click', handler));

// React 方式：1000 个按钮 = 1 个监听器（在 root 上）
items.map((item) => <button onClick={handler}>{item}</button>);
```

**3. 批量更新**

```js
function handleClick(e) {
  // 这些 setState 会被批量处理，只触发一次重新渲染
  setCount1((c) => c + 1);
  setCount2((c) => c + 1);
  setCount3((c) => c + 1);
}
```

**4. 事件优先级（React 18+）**

```
DiscreteEventPriority   // 离散事件（click、input）- 高优先级
ContinuousEventPriority // 连续事件（scroll、mousemove）- 中优先级
DefaultEventPriority    // 默认优先级
IdleEventPriority       // 空闲优先级
```

**5. 更好的可控性**

在并发模式下，可以中断和恢复事件处理，配合 `useTransition` 实现低优先级更新。

## 四、注意事项

### 异步访问事件对象

React 16 使用事件池，异步访问需要 `e.persist()`。React 17+ 已移除事件池，不需要 `persist()`。

### 阻止冒泡的差异

```js
e.stopPropagation(); // 只阻止 React 事件树中的冒泡
e.nativeEvent.stopImmediatePropagation(); // 阻止原生事件冒泡
```

## 五、总结

React 合成事件通过事件代理（React 17+ 在 root 节点）、事件统一化、批量更新、事件优先级等机制，提供了高性能、跨浏览器兼容、易于管理的事件系统，是 React 核心优化之一。
