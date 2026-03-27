# React 合成事件机制

## 面试高频考点

- React 事件代理在哪个节点上？React 16 和 17 有什么区别？
- 合成事件做了哪些处理？有什么好处？
- React 17 为什么移除了事件池？
- 如何阻止合成事件和原生事件的冒泡？
- 合成事件与原生事件混用时，执行顺序是什么？
- 为什么 React 事件中 `e.stopPropagation()` 无法阻止原生事件？

---

## 一、事件代理位置

React 16 及之前：事件代理在 `document` 节点上。

React 17 及之后：事件代理改为在 **root 容器节点**上（即 `ReactDOM.createRoot()` 挂载的节点）。

改变原因：更好支持多个 React 版本共存，避免与非 React 代码的事件冲突，渐进式升级更安全。

```
React 16:
  document ← 所有 React 事件代理在这里
    └── #root
          └── <App>

React 17+:
  document
    └── #root ← 所有 React 事件代理在这里
          └── <App>
```

---

## 二、合成事件的处理机制

### 1. 事件注册阶段

React 收集所有事件类型，在 root 节点上注册原生事件监听器（同时注册捕获和冒泡阶段）。

### 2. 事件触发阶段

```
原生事件触发 → 找到真实 DOM 节点 → 找到对应 Fiber 节点
→ 创建合成事件对象 → 模拟捕获/冒泡收集处理函数 → 按顺序执行
```

### 3. 事件对象封装

合成事件对象包装了原生事件，提供统一的 API（`preventDefault`、`stopPropagation` 等），抹平浏览器差异。通过 `e.nativeEvent` 可以访问原始的原生事件对象。

---

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

---

## 四、事件执行顺序（重点！）

这是面试高频陷阱题，必须搞清楚。

### React 17+ 的执行顺序

```jsx
function App() {
  const divRef = useRef(null);

  useEffect(() => {
    // 原生事件：直接绑定在 div 上
    divRef.current.addEventListener('click', () => {
      console.log('原生事件 - div（冒泡）');
    });
    // 原生事件：绑定在 document 上
    document.addEventListener('click', () => {
      console.log('原生事件 - document（冒泡）');
    });
  }, []);

  return (
    <div ref={divRef} onClick={() => console.log('React合成事件 - div（冒泡）')}>
      <button onClick={() => console.log('React合成事件 - button（冒泡）')}>
        点击
      </button>
    </div>
  );
}
```

点击 button 后，输出顺序：

```
1. 原生事件 - div（冒泡）        ← 原生事件先触发（绑定在真实 DOM 上）
2. React合成事件 - button（冒泡）← React 事件在 root 节点统一处理
3. React合成事件 - div（冒泡）
4. 原生事件 - document（冒泡）   ← document 原生事件最后
```

**核心规律：**
- 原生事件（绑定在真实 DOM 上）先于 React 合成事件执行
- React 合成事件先于绑定在 document 上的原生事件执行（React 17+）
- React 16 中，React 合成事件和 document 原生事件几乎同级（都在 document 上）

### React 16 的执行顺序（对比）

```
1. 原生事件 - div（冒泡）
2. React合成事件 - button（冒泡）
3. React合成事件 - div（冒泡）
4. 原生事件 - document（冒泡）   ← React 16 的合成事件也在 document 上，顺序可能交叉
```

---

## 五、混用原生事件与合成事件的陷阱

### 陷阱 1：`e.stopPropagation()` 无法阻止原生事件

```jsx
function App() {
  const btnRef = useRef(null);

  useEffect(() => {
    document.addEventListener('click', () => {
      console.log('document 原生事件触发了！');
    });
  }, []);

  return (
    <button
      ref={btnRef}
      onClick={(e) => {
        e.stopPropagation(); // ❌ 只阻止了 React 事件树中的冒泡
        // document 上的原生监听器依然会触发！
        console.log('React 合成事件');
      }}
    >
      点击
    </button>
  );
}
// 输出：React 合成事件 → document 原生事件触发了！
```

**原因**：`e.stopPropagation()` 阻止的是合成事件在 React 虚拟事件树中的冒泡，但原生事件已经冒泡到 root 节点（React 17+）并触发了 React 的处理，之后继续冒泡到 document。

**解决方案**：

```js
onClick={(e) => {
  e.nativeEvent.stopImmediatePropagation(); // 阻止原生事件继续传播
}}
```

### 陷阱 2：原生事件中阻止冒泡，React 事件不会触发

```jsx
function App() {
  const btnRef = useRef(null);

  useEffect(() => {
    btnRef.current.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止原生事件冒泡到 root
      console.log('原生事件阻止了冒泡');
    });
  }, []);

  return (
    <button
      ref={btnRef}
      onClick={() => console.log('React 合成事件')} // ❌ 不会触发！
    >
      点击
    </button>
  );
}
```

**原因**：React 合成事件是在 root 节点上监听的，如果原生事件在到达 root 之前就被 `stopPropagation()` 阻止，React 根本收不到事件，合成事件自然不会触发。

### 陷阱 3：React 16 中 `document.addEventListener` 与合成事件的冲突

React 16 将事件代理在 document 上，如果在 document 上绑定了原生事件并调用 `stopPropagation()`，会导致 React 的合成事件系统出现问题。这也是 React 17 将代理位置改到 root 节点的重要原因之一。

---

## 六、事件池（Event Pooling）

### React 16 的事件池机制

React 16 为了性能，使用了事件池：合成事件对象在事件处理函数执行完毕后会被"回收"，所有属性被置为 null。

```js
// React 16 中的问题
function handleClick(e) {
  console.log(e.type); // 'click' ✅
  setTimeout(() => {
    console.log(e.type); // null ❌ 事件对象已被回收
  }, 0);
}

// 解决方案：调用 e.persist() 阻止回收
function handleClick(e) {
  e.persist();
  setTimeout(() => {
    console.log(e.type); // 'click' ✅
  }, 0);
}
```

### React 17 移除事件池

React 17 彻底移除了事件池机制，合成事件对象不再被回收，可以在异步代码中安全访问，`e.persist()` 变为空操作（保留但无效）。

**移除原因**：现代 JS 引擎的 GC 已经足够高效，事件池带来的性能收益微乎其微，但却造成了大量开发者困惑。

---

## 七、阻止冒泡的方式对比

| 方法 | 作用范围 | 适用场景 |
|------|---------|---------|
| `e.stopPropagation()` | 阻止 React 合成事件树中的冒泡 | 阻止父组件的 React 事件处理器 |
| `e.nativeEvent.stopPropagation()` | 阻止原生事件冒泡（但不阻止同节点其他监听器） | 阻止原生事件继续冒泡 |
| `e.nativeEvent.stopImmediatePropagation()` | 阻止原生事件冒泡 + 同节点其他监听器 | 彻底阻止所有后续处理 |
| `e.preventDefault()` | 阻止默认行为（不影响冒泡） | 阻止表单提交、链接跳转等 |

---

## 八、面试常见追问

**Q：React 为什么不直接用原生事件，而要封装合成事件？**

A：三个核心原因。第一，跨浏览器兼容，抹平不同浏览器的事件 API 差异。第二，性能优化，通过事件委托将所有事件代理到 root 节点，避免大量 DOM 节点绑定监听器。第三，与 React 调度系统集成，合成事件可以携带优先级信息，配合并发模式实现可中断渲染。

**Q：React 17 为什么把事件代理从 document 改到 root？**

A：主要是为了支持微前端场景下多个 React 版本共存。当页面上同时运行 React 16 和 React 17 时，如果都代理在 document 上，事件处理会相互干扰。改到 root 节点后，每个 React 应用的事件系统完全独立，互不影响。

**Q：onClick 和 addEventListener('click') 有什么区别？**

A：`onClick` 是 React 合成事件，绑定在 root 节点上，通过事件委托实现，支持 React 的批量更新和优先级调度。`addEventListener` 是原生 DOM 事件，直接绑定在指定节点上，不经过 React 的事件系统。两者混用时需要注意执行顺序和冒泡阻止的差异。

**Q：为什么在 useEffect 中绑定的原生事件，调用 stopPropagation 后 React 的 onClick 不触发？**

A：因为 React 17+ 的合成事件是在 root 节点上监听的。如果在子节点上绑定原生事件并调用 `stopPropagation()`，事件冒泡在到达 root 之前就被终止，React 的监听器收不到事件，所以 `onClick` 不会触发。

---

## 九、总结

React 合成事件通过事件代理（React 17+ 在 root 节点）、事件统一化、批量更新、事件优先级等机制，提供了高性能、跨浏览器兼容、易于管理的事件系统，是 React 核心优化之一。

混用原生事件时的核心原则：**原生事件先于合成事件执行；在原生事件中 `stopPropagation()` 会导致合成事件不触发；在合成事件中 `stopPropagation()` 无法阻止 document 上的原生监听器。**
