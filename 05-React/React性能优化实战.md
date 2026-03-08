# React 性能优化实战手册

> 收录日期：2026-03-07 | 来源：掘金精选 + 实战经验

## 关联笔记
- [[[4868] 22  思路拓展：如何打造高性能的 React 应用？]]
- [[[4858] 09  真正理解虚拟 DOM：React 选它，真的是为了性能吗？]]
- [[[4861] 12  如何理解 Fiber 架构的迭代动机与设计思想]]
- [[React18-19新特性]] — 并发特性用于性能优化
- [[Hooks深入实战]] — useMemo/useCallback 的正确用法

---

## 一、渲染优化

### 1. React.memo 包裹纯展示组件
```jsx
const ExpensiveList = React.memo(({ items }) => {
  return items.map(item => <Item key={item.id} {...item} />);
});
```

### 2. 状态下沉
```jsx
// ❌ 整个页面因为 input 变化而重渲染
function Page() {
  const [text, setText] = useState('');
  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} />
      <ExpensiveComponent />
    </div>
  );
}

// ✅ 把状态下沉到需要它的组件
function SearchInput() {
  const [text, setText] = useState('');
  return <input value={text} onChange={e => setText(e.target.value)} />;
}
function Page() {
  return (
    <div>
      <SearchInput />
      <ExpensiveComponent />  {/* 不会重渲染 */}
    </div>
  );
}
```

### 3. Children as Props（内容提升）
```jsx
function ScrollTracker({ children }) {
  const [scroll, setScroll] = useState(0);
  return (
    <div onScroll={e => setScroll(e.target.scrollTop)}>
      <p>Scroll: {scroll}</p>
      {children}  {/* 不重渲染！引用没变 */}
    </div>
  );
}
```

---

## 二、加载优化

### 路由级代码分割
```jsx
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

### 预加载（悬停时开始加载）
```jsx
const importSettings = () => import('./pages/Settings');
const Settings = lazy(importSettings);

<Link to="/settings" onMouseEnter={importSettings}>Settings</Link>
```

---

## 三、列表优化 — 虚拟滚动

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
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(row => (
          <div key={row.key} style={{ position: 'absolute', top: row.start, height: row.size }}>
            {items[row.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 四、状态管理优化

```jsx
// ❌ 一个大 Context
const AppContext = createContext({ user: null, theme: 'light', locale: 'zh' });

// ✅ 拆分成多个小 Context
const UserContext = createContext(null);
const ThemeContext = createContext('light');

// ✅ 或用 Zustand：只订阅你用到的字段
const useStore = create((set) => ({
  count: 0,
  name: '',
  increment: () => set(s => ({ count: s.count + 1 })),
}));

function Counter() {
  const count = useStore(s => s.count); // 只在 count 变化时重渲染
}
```

---

## 五、优化清单

- [ ] 用 React DevTools Profiler 找到渲染瓶颈
- [ ] 大列表用虚拟滚动（@tanstack/react-virtual）
- [ ] 路由级 lazy + Suspense
- [ ] React.memo 包裹纯展示组件
- [ ] 状态下沉，避免影响范围过大
- [ ] Context 按职责拆分
- [ ] 用 startTransition 处理非紧急更新
- [ ] 升级到 React 19 + Compiler（自动 memo）
