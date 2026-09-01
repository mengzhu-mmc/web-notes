# React 性能优化实战

> 更新日期：2026-03-31 | 重点：**正确使用场景** — 什么时候该用，什么时候不该用

---

## 核心原则：不要过早优化

> "过早优化是万恶之源" — Donald Knuth

React 在大多数场景下已经足够快。优化前先**测量**，用 React DevTools Profiler 找到真正的瓶颈。

---

## 一、React.memo — 跳过子组件重渲染

### 什么时候该用

```tsx
// ✅ 场景1：纯展示组件 + 父组件频繁更新
const UserCard = React.memo(function UserCard({ user }) {
  return (
    <div>
      <img src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
    </div>
  );
});

// 父组件有定时器/频繁状态更新，但 UserCard 的 props 基本不变
function Dashboard() {
  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const user = useUser(); // 假设用户数据不常变
  return (
    <div>
      <p>当前时间: {time}</p>
      <UserCard user={user} /> {/* memo 保护：时间变化不触发 UserCard 重渲染 */}
    </div>
  );
}
```

```tsx
// ✅ 场景2：列表中的每一项
const ListItem = React.memo(function ListItem({ item, onToggle }) {
  console.log("ListItem render:", item.id);
  return (
    <li>
      <input
        type="checkbox"
        checked={item.done}
        onChange={() => onToggle(item.id)}
      />
      {item.title}
    </li>
  );
});

// 配合 useCallback：只有修改的那一项重渲染
function TodoList({ todos }) {
  const handleToggle = useCallback((id) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  }, []); // 稳定引用

  return (
    <ul>
      {todos.map((item) => (
        <ListItem key={item.id} item={item} onToggle={handleToggle} />
      ))}
    </ul>
  );
}
```

### 什么时候不该用

```tsx
// ❌ 场景1：props 是内联对象/数组，每次父渲染都是新引用
// memo 毫无用处，还增加了比较开销
function Parent() {
  return (
    // 每次 Parent 渲染，{ color: 'red' } 都是新对象
    <MemoChild style={{ color: "red" }} items={[1, 2, 3]} />
  );
}

// ❌ 场景2：组件本身就很简单，渲染耗时 < 比较 props 耗时
const SimpleText = React.memo(({ text }) => <span>{text}</span>);
// 这个 memo 几乎没有收益，反而增加了一点点开销

// ❌ 场景3：props 本身就频繁变化
const Counter = React.memo(({ count }) => <div>{count}</div>);
// count 每秒都变，memo 每次都比较失败，毫无意义
```

### 自定义比较函数

```tsx
// 当 props 是复杂对象时，可以自定义比较逻辑
const UserProfile = React.memo(
  function UserProfile({ user, settings }) {
    return (
      <div>
        {user.name} - {settings.theme}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // 只比较关心的字段，返回 true = 跳过渲染
    return (
      prevProps.user.id === nextProps.user.id &&
      prevProps.settings.theme === nextProps.settings.theme
    );
  },
);
```

---

## 二、useMemo — 缓存计算结果

### 什么时候该用

```tsx
// ✅ 场景1：昂贵的计算（数组排序/过滤、复杂算法）
function DataTable({ rows, sortKey, filterText }) {
  const processedData = useMemo(() => {
    console.log("重新计算..."); // 只在依赖变化时执行
    return rows
      .filter((row) => row[filterText] !== undefined)
      .sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : -1));
  }, [rows, sortKey, filterText]); // 依赖项精确

  return (
    <table>
      {processedData.map((row) => (
        <Row key={row.id} row={row} />
      ))}
    </table>
  );
}
```

```tsx
// ✅ 场景2：稳定引用类型给 memo 子组件
function Parent({ userId }) {
  // ❌ 每次渲染都是新对象，导致 MemoChild 每次都重渲染
  // const config = { userId, theme: 'dark' };

  // ✅ userId 不变则引用稳定
  const config = useMemo(() => ({ userId, theme: "dark" }), [userId]);

  return <MemoChild config={config} />;
}
```

```tsx
// ✅ 场景3：作为其他 Hook 的依赖（避免无限循环）
function SearchComponent({ query }) {
  // 没有 useMemo：options 每次渲染都是新对象
  // → useEffect 每次都触发 → 可能造成无限循环
  const options = useMemo(
    () => ({
      query,
      page: 1,
      limit: 20,
    }),
    [query],
  );

  useEffect(() => {
    fetchData(options);
  }, [options]); // 依赖稳定了

  return <div>...</div>;
}
```

### 什么时候不该用

```tsx
// ❌ 场景1：计算本身很简单
// 加法运算比 useMemo 的 hook 调用开销还小
const total = useMemo(() => a + b, [a, b]); // ❌ 多此一举
const total = a + b; // ✅ 直接算

// ❌ 场景2：依赖项每次都变化
function Component({ data }) {
  // data 每次渲染都是新对象引用，useMemo 每次都重算
  const processed = useMemo(() => process(data), [data]); // ❌ 没意义
}

// ❌ 场景3：基本类型值
const doubled = useMemo(() => count * 2, [count]); // ❌ 不需要
const doubled = count * 2; // ✅ 直接算
```

### 如何判断计算是否"昂贵"

```tsx
// 用 console.time 测量
console.time("filter");
const result = largeArray.filter((item) => item.active);
console.timeEnd("filter");
// 如果 > 1ms，考虑 useMemo；< 0.1ms，不值得

// 或者用 React DevTools Profiler 看重渲染耗时
```

---

## 三、useCallback — 缓存函数引用

### 什么时候该用

```tsx
// ✅ 场景1：传给 memo 子组件的回调函数（必须配合 memo 才有意义！）
const ExpensiveList = React.memo(function ExpensiveList({
  items,
  onItemClick,
}) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} onClick={() => onItemClick(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
});

function Parent({ items }) {
  // ❌ 没有 useCallback：每次 Parent 渲染都创建新函数
  // → memo 比较失败 → ExpensiveList 每次都重渲染
  // const handleClick = (id) => console.log(id);

  // ✅ 有 useCallback：函数引用稳定 → memo 生效
  const handleClick = useCallback((id) => {
    console.log("点击了:", id);
  }, []); // 无依赖，永远稳定

  return <ExpensiveList items={items} onItemClick={handleClick} />;
}
```

```tsx
// ✅ 场景2：作为 useEffect 依赖（避免无限触发）
function Component({ onDataLoad }) {
  // 如果 onDataLoad 不稳定，每次渲染都触发 effect
  useEffect(() => {
    fetchData().then(onDataLoad);
  }, [onDataLoad]);
}

// 在父组件中稳定化
function Parent() {
  const handleDataLoad = useCallback((data) => {
    setData(data);
  }, []);

  return <Component onDataLoad={handleDataLoad} />;
}
```

```tsx
// ✅ 场景3：自定义 Hook 中导出的函数
function useCounter() {
  const [count, setCount] = useState(0);

  // 稳定的 API，防止使用方不必要的重渲染
  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => c - 1), []);
  const reset = useCallback(() => setCount(0), []);

  return { count, increment, decrement, reset };
}
```

### 什么时候不该用

```tsx
// ❌ 最常见的误用：组件内部使用的函数，不传给子组件
function Component() {
  // 没意义！这个函数不影响任何子组件
  const handleClick = useCallback(() => {
    console.log("click");
  }, []);

  return <button onClick={handleClick}>Click</button>;
}

// ✅ 直接写就行
function Component() {
  const handleClick = () => console.log("click");
  return <button onClick={handleClick}>Click</button>;
}
```

```tsx
// ❌ 没有配合 memo 使用
function Parent() {
  // 用了 useCallback，但 Child 没有 memo
  const fn = useCallback(() => {}, []);
  return <Child onClick={fn} />; // Child 每次都会渲染，useCallback 白费
}
```

### useCallback 和 useMemo 的关系

```tsx
// useCallback(fn, deps) 等价于 useMemo(() => fn, deps)
const memoizedCallback = useCallback(fn, [a, b]);
const memoizedCallback2 = useMemo(() => fn, [a, b]); // 等价
```

---

## 四、startTransition — 区分紧急/非紧急更新

### 什么时候该用

```tsx
import { useTransition, startTransition } from "react";

// ✅ 场景1：搜索/过滤大列表
function SearchPage({ allItems }) {
  const [query, setQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState(allItems);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e) {
    // 紧急：立即更新输入框，保持响应
    setQuery(e.target.value);

    // 非紧急：过滤大量数据，可以延迟
    startTransition(() => {
      setFilteredItems(
        allItems.filter((item) =>
          item.name.toLowerCase().includes(e.target.value.toLowerCase()),
        ),
      );
    });
  }

  return (
    <>
      <input value={query} onChange={handleSearch} placeholder="搜索..." />
      {isPending && <p>过滤中...</p>}
      <ItemList items={filteredItems} />
    </>
  );
}
```

```tsx
// ✅ 场景2：Tab 切换 + 重量级内容
function TabContainer() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isPending, startTransition] = useTransition();

  function switchTab(tab) {
    startTransition(() => {
      setActiveTab(tab); // Tab 内容很重，用 transition 让 Tab 切换不卡顿
    });
  }

  return (
    <div>
      <nav>
        {["overview", "details", "reviews"].map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            style={{ opacity: isPending ? 0.5 : 1 }} // 显示 pending 状态
          >
            {tab}
          </button>
        ))}
      </nav>
      <TabContent tab={activeTab} /> {/* 重量级组件 */}
    </div>
  );
}
```

### 什么时候不该用

```tsx
// ❌ 受控输入框本身（输入框必须紧急更新）
startTransition(() => {
  setInputValue(e.target.value); // ❌ 输入框会卡顿！
});

// ❌ 需要立即反馈的 UI（如按钮选中状态）
startTransition(() => {
  setSelectedButton(id); // ❌ 用户会感觉按钮"卡了一下"
});

// ❌ 简单、快速的状态更新（没必要，增加复杂度）
startTransition(() => {
  setCount((c) => c + 1); // ❌ 简单计数不需要 transition
});
```

### `useTransition` vs `useDeferredValue` 选哪个？

```tsx
// useTransition：当你能控制状态更新时
function Parent() {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <input
      onChange={(e) => {
        setQuery(e.target.value); // 立即更新输入框
        startTransition(() => setSearchQuery(e.target.value)); // 延迟搜索
      }}
    />
  );
}

// useDeferredValue：当 props 来自外部，你无法控制更新时机时
function SearchResults({ query }) {
  // query 来自父组件，你控制不了何时更新
  const deferredQuery = useDeferredValue(query);

  return <HeavyResultList query={deferredQuery} />;
}
```

---

## 五、组合优化 — 实战案例

### 案例：高性能数据表格

```tsx
type Row = { id: number; name: string; age: number; score: number };

function DataTable({ data }: { data: Row[] }) {
  const [sortKey, setSortKey] = useState<keyof Row>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  // 1. useMemo: 缓存排序过滤结果
  const processedData = useMemo(() => {
    let result = data;
    if (filter) {
      result = result.filter((row) =>
        row.name.toLowerCase().includes(filter.toLowerCase()),
      );
    }
    return [...result].sort((a, b) => {
      const val = a[sortKey] > b[sortKey] ? 1 : -1;
      return sortDir === "asc" ? val : -val;
    });
  }, [data, sortKey, sortDir, filter]);

  // 2. useCallback: 稳定排序函数引用
  const handleSort = useCallback((key: keyof Row) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  // 3. startTransition: 过滤是非紧急操作
  const handleFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    startTransition(() => setFilter(e.target.value));
  };

  return (
    <div>
      <input placeholder="过滤..." onChange={handleFilter} />
      {isPending && <span>过滤中...</span>}
      <table>
        <thead>
          <tr>
            {(["id", "name", "age", "score"] as const).map((key) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                style={{ cursor: "pointer" }}
              >
                {key} {sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processedData.map((row) => (
            // 4. React.memo: 每行单独 memo
            <TableRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 5. memo: 只有 row 引用变化才重渲染
const TableRow = React.memo(function TableRow({ row }: { row: Row }) {
  return (
    <tr>
      <td>{row.id}</td>
      <td>{row.name}</td>
      <td>{row.age}</td>
      <td>{row.score}</td>
    </tr>
  );
});
```

---

## 六、性能优化决策树

```
遇到性能问题？
    ↓
先用 React DevTools Profiler 测量
    ↓
找到哪个组件重渲染次数过多？
    ├─→ 是：props 是引用类型且每次新建？
    │       ├─→ 是：用 useMemo 稳定 props
    │       └─→ 否：用 React.memo 跳过渲染
    │
    └─→ 找到哪个计算耗时较长？
            ├─→ 是（>1ms）：用 useMemo 缓存结果
            └─→ 否：UI 是否卡顿/无响应？
                    ├─→ 是：用 startTransition 标记非紧急更新
                    └─→ 否：代码分割/懒加载/虚拟滚动
```

---

## 七、与 Vue 3 性能优化对比

| 优化手段       | React             | Vue 3                  |
| -------------- | ----------------- | ---------------------- |
| 跳过组件重渲染 | `React.memo`      | 天生追踪（响应式自动） |
| 缓存计算值     | `useMemo`         | `computed`（自动缓存） |
| 稳定函数引用   | `useCallback`     | 方法定义天生稳定       |
| 非紧急更新     | `startTransition` | 暂无直接对应           |
| 列表虚拟化     | `react-virtual`   | `vue-virtual-scroller` |
| 代码分割       | `React.lazy`      | `defineAsyncComponent` |

> 💡 **本质差异**：Vue 3 的响应式系统在依赖追踪层面自动优化，组件只在真正依赖的数据变化时更新。React 的重渲染默认向下传播，需要开发者手动用 memo/useMemo/useCallback "拦截"。React 19 的 Compiler 目标是让 React 也达到 Vue 那样的自动优化效果。

---

## 八、代码分割与懒加载

```tsx
import React, { Suspense, lazy } from "react";

// 路由级别懒加载
const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));

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
const HeavyModal = lazy(() => import("./HeavyModal"));

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

## 九、虚拟列表

当列表数据量很大（>1000 条）时，只渲染可视区域内的元素。

```tsx
// 使用 react-window（推荐）
import { FixedSizeList } from "react-window";

function VirtualList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style}>{items[index].name}</div>
  );

  return (
    <FixedSizeList
      height={600} // 容器高度
      itemCount={items.length}
      itemSize={50} // 每行高度
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
    items.length,
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return (
    <div
      style={{ height: containerHeight, overflow: "auto" }}
      onScroll={(e) => setScrollTop(e.target.scrollTop)}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
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

## 十、其他优化技巧

### 避免在渲染中创建对象/数组

```tsx
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

```tsx
// ❌ 用 index 作为 key（列表重排时性能差）
{
  list.map((item, index) => <Item key={index} {...item} />);
}

// ✅ 用稳定唯一的 id
{
  list.map((item) => <Item key={item.id} {...item} />);
}

// 特殊用法：强制重置组件状态
// 改变 key 会让 React 销毁旧组件，创建新组件
<UserForm key={userId} userId={userId} />;
```

### 状态下移（State Colocation）

```tsx
// ❌ 状态放在父组件，导致整个父组件重新渲染
function Parent() {
  const [inputValue, setInputValue] = useState("");
  return (
    <div>
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      <HeavyComponent /> {/* 每次输入都重新渲染 */}
    </div>
  );
}

// ✅ 状态下移到需要它的组件
function SearchInput() {
  const [inputValue, setInputValue] = useState("");
  return (
    <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
  );
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

```tsx
// ❌ ScrollTracker 内部的 HeavyComponent 会随 scroll 变化重新渲染
function ScrollTracker() {
  const [scroll, setScroll] = useState(0);
  return (
    <div onScroll={(e) => setScroll(e.target.scrollTop)}>
      <p>Scroll: {scroll}</p>
      <HeavyComponent /> {/* 每次滚动都重新渲染！ */}
    </div>
  );
}

// ✅ 通过 children 传入，引用不变，不会重新渲染
function ScrollTracker({ children }) {
  const [scroll, setScroll] = useState(0);
  return (
    <div onScroll={(e) => setScroll(e.target.scrollTop)}>
      <p>Scroll: {scroll}</p>
      {children} {/* 引用稳定，不重新渲染 */}
    </div>
  );
}

// 使用时
<ScrollTracker>
  <HeavyComponent />
</ScrollTracker>;
```

### 路由预加载（悬停时提前加载）

```tsx
// 鼠标悬停时就开始加载，点击时已经加载完毕
const importSettings = () => import("./pages/Settings");
const Settings = lazy(importSettings);

<Link to="/settings" onMouseEnter={importSettings}>
  Settings
</Link>;
```

### 使用 @tanstack/react-virtual 虚拟滚动

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualList({ items }) {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: 400, overflow: "auto" }}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            style={{
              position: "absolute",
              top: row.start,
              height: row.size,
              width: "100%",
            }}
          >
            {items[row.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 十一、面试高频问题

### Q1：useMemo 和 useCallback 的区别？

`useMemo` 缓存**计算结果值**，`useCallback` 缓存**函数本身**。本质上 `useCallback(fn, deps)` 等价于 `useMemo(() => fn, deps)`。

使用场景：

- `useMemo`：昂贵计算 / 需要稳定引用的对象
- `useCallback`：传给 memo 子组件的回调 / 作为 useEffect 依赖

### Q2：什么情况下 React.memo 会失效？

1. props 中有每次渲染都新建的**引用类型**（对象、数组、函数）
2. 使用了 `Context`（Context 变化时 memo 无效）
3. 自定义比较函数返回了错误结果

### Q3：startTransition 的原理？

`startTransition` 把状态更新标记为"可中断"的低优先级任务。React 的并发调度器遇到高优先级任务（用户输入）时，可以中断 transition 更新，先处理高优先级，再回来继续 transition。

从用户视角看：输入框始终响应，重量级 UI 更新在后台进行。

### Q4：过度使用 useMemo/useCallback 的危害？

1. **代码可读性下降**：多了很多"噪音"
2. **额外内存开销**：缓存本身需要内存
3. **额外计算开销**：每次渲染都要比较依赖项
4. **依赖项 bug**：依赖项写错可能导致缓存不更新

> 原则：**有明确性能问题时才优化，而不是预防性地到处加**。

---

## 十二、React Compiler 时代的性能优化口径

React Compiler 的目标是把一部分安全的 memoization 前移到编译阶段，减少手写 `useMemo`、`useCallback` 和 `React.memo` 的样板代码。但它不等于“所有性能问题自动消失”，也不意味着现在就可以无条件删除历史优化。

### 1. 默认策略：先写纯净组件，再用数据验证

1. 组件 render 保持纯净：不要在 render 中修改外部变量、发请求、写 DOM 或触发订阅。
2. props、state、context 尽量保持不可变更新，避免原地修改对象导致 memo 或 Compiler 判断失真。
3. 优化前先用 React DevTools Profiler、Performance 面板或业务指标定位瓶颈。
4. 新代码不要预防性地到处包 `useMemo/useCallback`，优先保证数据流清晰。

### 2. 仍然适合手写 memo 的场景

即使启用 React Compiler，下面这些场景仍然需要人工判断：

- 大列表行组件、复杂图表、富文本渲染等已通过 profiling 证明收益明确的 memo 边界。
- 传给第三方库、订阅系统、虚拟列表或缓存层的稳定引用。
- Context Provider 的 `value` 对象，避免 Provider 每次 render 都广播给所有消费者。
- 跨组件共享的昂贵派生数据，例如大型索引、排序结果、权限树、路由匹配表。
- Compiler 尚未覆盖或因为纯度问题被 lint 跳过的历史模块。

### 3. 决策树升级版

```text
遇到性能问题？
    ↓
先测量：Profiler / Performance / 用户指标
    ↓
是渲染次数过多，还是单次计算太重？
    ├─ 渲染次数过多
    │   ├─ state 是否放得太高？→ 状态下移 / 组件拆分
    │   ├─ Context 是否广播过大？→ 拆 Context / memo Provider value
    │   ├─ props 是否每次新建？→ useMemo/useCallback 稳定引用
    │   └─ 子组件是否昂贵且 props 稳定？→ React.memo
    │
    ├─ 单次计算太重
    │   ├─ 大数组过滤/排序？→ useMemo / worker / 分页
    │   ├─ 大列表渲染？→ 虚拟列表
    │   └─ 非关键 UI 阻塞输入？→ startTransition / useDeferredValue
    │
    └─ 已启用 Compiler
        ├─ lint 是否通过？→ 先修 purity / immutability / hooks 规则
        ├─ profiling 是否仍显示瓶颈？→ 保留或补充手写 memo
        └─ 没有可观测收益？→ 删除冗余 memo，降低维护成本
```

### 4. 与专题笔记的分工

- 本文只保留“性能问题如何定位、何时使用手写优化、如何组合优化”的实践口径。
- React Compiler 的配置、指令、lint、gating、`target` 等工程化细节，统一维护在 [React Compiler 自动记忆化心智模型](./React_Compiler自动记忆化.md)。
- React 18/19 的并发 API 与 RSC 心智模型，分别回到 [React Fiber 架构与虚拟 DOM](./React_Fiber与Concurrent_Mode详解.md) 和 [React 19 新特性深度指南](./React18-19新特性与Server_Components.md)。

## 十三、去重记录

> Updated: 2026-09-01 based on local note inspection.

本文件原本在正文后重复拼接了“深入版、一页速记、标准答案索引、深挖专题索引”等片段，和前文的 `React.memo`、`useMemo`、`useCallback`、`startTransition`、虚拟列表等内容高度重叠。本轮已将这些重复片段收敛为上面的 Compiler 时代决策口径，并保留专题跳转，避免同一知识点在一个文件中维护多份答案。

---

## 相关笔记

- [React 性能优化指南 - 一页速记](./React性能优化指南%20-%20一页速记.md) — 高频复习用
- [React 性能优化指南 - 标准答案索引](./React性能优化指南%20-%20标准答案索引.md) — 面试可直接表达的答案
- [React 性能优化指南 - 深挖专题索引](./React性能优化指南%20-%20深挖专题索引.md) — 可拆分的专题清单
- [React Fiber 与 Concurrent Mode 详解](./React_Fiber与Concurrent_Mode详解.md) — 时间切片与并发调度原理
- [React Compiler 自动记忆化](./React_Compiler自动记忆化.md) — 编译器如何替代手写 memo
- [React 19.2 实践心智模型](./React19.2实践心智模型.md) — Performance Tracks 等新能力
- [DevTools Performance 面板实操](../08-网络与浏览器/性能优化/DevTools-Performance面板实操.md) — 配合 React DevTools Profiler 定位渲染瓶颈
- [Web Vitals：INP 指标详解](../08-网络与浏览器/性能优化/Web%20Vitals与INP指标详解.md) — React 优化如何反映到 INP 指标
- [前端性能优化完全指南](../11-项目实战/前端性能优化完全指南.md) — 分层优化正典
