# React 性能优化深入

> 参考：掘金精选 + React 官方文档

## 面试高频考点

- React 中有哪些性能优化手段？
- useMemo 和 useCallback 的区别和使用场景？
- React.memo 的原理和使用？
- 虚拟列表如何实现？
- 代码分割和懒加载如何实现？

---

## 一、性能优化总览

React 性能问题的根本原因：**不必要的重新渲染**。

优化思路分三层：
1. **减少渲染次数**：避免不必要的 re-render
2. **减少渲染计算量**：缓存计算结果
3. **减少渲染范围**：代码分割、懒加载

---

## 二、React.memo —— 避免子组件不必要渲染

```jsx
// 问题：父组件更新时，子组件即使 props 没变也会重新渲染
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <Child name="固定名字" /> {/* 每次 Parent 更新，Child 都会重新渲染 */}
    </div>
  );
}

// 解决：用 React.memo 包裹，props 不变则跳过渲染
const Child = React.memo(function Child({ name }) {
  console.log('Child 渲染了');
  return <div>{name}</div>;
});

// 自定义比较函数（默认是浅比较）
const Child2 = React.memo(
  function Child2({ user }) {
    return <div>{user.name}</div>;
  },
  (prevProps, nextProps) => {
    // 返回 true 表示相同，跳过渲染
    return prevProps.user.id === nextProps.user.id;
  }
);
```

---

## 三、useMemo —— 缓存计算结果

```jsx
// 问题：每次渲染都重新计算昂贵的值
function Component({ list, filter }) {
  // ❌ 每次渲染都执行，即使 list 和 filter 没变
  const filteredList = list.filter(item => item.includes(filter));

  // ✅ 只有 list 或 filter 变化时才重新计算
  const filteredList2 = useMemo(
    () => list.filter(item => item.includes(filter)),
    [list, filter]
  );

  return <ul>{filteredList2.map(item => <li key={item}>{item}</li>)}</ul>;
}

// 适合场景：
// 1. 复杂计算（排序、过滤大数组）
// 2. 创建引用类型值（对象、数组），避免子组件不必要渲染
function Parent() {
  const [count, setCount] = useState(0);

  // ❌ 每次渲染都创建新对象，导致 Child 每次都重新渲染
  const config = { theme: 'dark', size: 'large' };

  // ✅ 引用稳定，Child 不会不必要重新渲染
  const config2 = useMemo(() => ({ theme: 'dark', size: 'large' }), []);

  return <Child config={config2} />;
}
```

---

## 四、useCallback —— 缓存函数引用

```jsx
// 问题：每次渲染都创建新函数，导致子组件不必要渲染
function Parent() {
  const [count, setCount] = useState(0);

  // ❌ 每次渲染都是新函数，Child 每次都重新渲染
  const handleClick = () => console.log('clicked');

  // ✅ 函数引用稳定
  const handleClick2 = useCallback(() => {
    console.log('clicked');
  }, []); // 依赖为空，函数永远不变

  // 如果函数依赖 state，需要加入依赖
  const handleAdd = useCallback(() => {
    setCount(c => c + 1); // 用函数式更新，不需要依赖 count
  }, []);

  return <Child onClick={handleClick2} />;
}

// useMemo vs useCallback
// useMemo(() => fn, deps)  ≡  useCallback(fn, deps)
// useMemo 缓存的是函数的返回值
// useCallback 缓存的是函数本身
```

---

## 五、何时不需要 useMemo/useCallback

```jsx
// ❌ 过度优化：简单计算不需要 useMemo
const double = useMemo(() => count * 2, [count]); // 没必要

// ❌ 没有子组件依赖时，useCallback 没有意义
const handleClick = useCallback(() => {
  console.log('clicked');
}, []); // 如果这个函数只在当前组件用，没必要

// ✅ 真正需要的场景：
// 1. 计算量大（>1ms）
// 2. 函数/值作为 props 传给 React.memo 包裹的子组件
// 3. 函数/值作为 useEffect 的依赖
```

---

## 六、代码分割与懒加载

```jsx
import React, { Suspense, lazy } from 'react';

// 路由级别懒加载
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));

function App() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Suspense>
  );
}

// 组件级别懒加载（大型组件、弹窗等）
const HeavyModal = lazy(() => import('./HeavyModal'));

function Page() {
  const [show, setShow] = useState(false);
  return (
    <>
      <button onClick={() => setShow(true)}>打开弹窗</button>
      {show && (
        <Suspense fallback={<Spinner />}>
          <HeavyModal onClose={() => setShow(false)} />
        </Suspense>
      )}
    </>
  );
}
```

---

## 七、虚拟列表

当列表数据量很大（>1000 条）时，只渲染可视区域内的元素。

```jsx
// 使用 react-window（推荐）
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  );

  return (
    <FixedSizeList
      height={600}      // 容器高度
      itemCount={items.length}
      itemSize={50}     // 每行高度
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// 手写简易虚拟列表原理
function SimpleVirtualList({ items, itemHeight = 50, containerHeight = 500 }) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={e => setScrollTop(e.target.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>
              {item.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 八、其他优化技巧

### 避免在渲染中创建对象/数组

```jsx
// ❌ 每次渲染都创建新数组
<Component style={{ color: 'red' }} />
<Component items={[1, 2, 3]} />

// ✅ 提到组件外或用 useMemo
const STYLE = { color: 'red' };
const ITEMS = [1, 2, 3];
<Component style={STYLE} />
<Component items={ITEMS} />
```

### 合理使用 key

```jsx
// ❌ 用 index 作为 key（列表重排时性能差）
{list.map((item, index) => <Item key={index} {...item} />)}

// ✅ 用稳定唯一的 id
{list.map(item => <Item key={item.id} {...item} />)}

// 特殊用法：强制重置组件状态
// 改变 key 会让 React 销毁旧组件，创建新组件
<UserForm key={userId} userId={userId} />
```

### 状态下移（State Colocation）

```jsx
// ❌ 状态放在父组件，导致整个父组件重新渲染
function Parent() {
  const [inputValue, setInputValue] = useState('');
  return (
    <div>
      <input value={inputValue} onChange={e => setInputValue(e.target.value)} />
      <HeavyComponent /> {/* 每次输入都重新渲染 */}
    </div>
  );
}

// ✅ 状态下移到需要它的组件
function SearchInput() {
  const [inputValue, setInputValue] = useState('');
  return <input value={inputValue} onChange={e => setInputValue(e.target.value)} />;
}

function Parent() {
  return (
    <div>
      <SearchInput />
      <HeavyComponent /> {/* 不再受 input 影响 */}
    </div>
  );
}
```

### Children as Props（内容提升）

将稳定的子节点通过 `children` 传入，可以避免它们随父组件状态变化而重新渲染。

```jsx
// ❌ ScrollTracker 内部的 HeavyComponent 会随 scroll 变化重新渲染
function ScrollTracker() {
  const [scroll, setScroll] = useState(0);
  return (
    <div onScroll={e => setScroll(e.target.scrollTop)}>
      <p>Scroll: {scroll}</p>
      <HeavyComponent /> {/* 每次滚动都重新渲染！ */}
    </div>
  );
}

// ✅ 通过 children 传入，引用不变，不会重新渲染
function ScrollTracker({ children }) {
  const [scroll, setScroll] = useState(0);
  return (
    <div onScroll={e => setScroll(e.target.scrollTop)}>
      <p>Scroll: {scroll}</p>
      {children} {/* 引用稳定，不重新渲染 */}
    </div>
  );
}

// 使用时
<ScrollTracker>
  <HeavyComponent />
</ScrollTracker>
```

### 路由预加载（悬停时提前加载）

```jsx
// 鼠标悬停时就开始加载，点击时已经加载完毕
const importSettings = () => import('./pages/Settings');
const Settings = lazy(importSettings);

<Link to="/settings" onMouseEnter={importSettings}>
  Settings
</Link>
```

### 使用 @tanstack/react-virtual 虚拟滚动

```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(row => (
          <div
            key={row.key}
            style={{ position: 'absolute', top: row.start, height: row.size, width: '100%' }}
          >
            {items[row.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```
