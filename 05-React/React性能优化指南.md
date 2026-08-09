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



### {user.name}


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


当前时间: {time}

{/* memo 保护：时间变化不触发 UserCard 重渲染 */}

  );
}
```

```tsx
// ✅ 场景2：列表中的每一项
const ListItem = React.memo(function ListItem({ item, onToggle }) {
  console.log("ListItem render:", item.id);
  return (

      <input
        type="checkbox"
        checked={item.done}
        onChange={() => onToggle(item.id)}
      />
      {item.title}

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

  );
}

// ❌ 场景2：组件本身就很简单，渲染耗时 < 比较 props 耗时
const SimpleText = React.memo(({ text }) => {text});
// 这个 memo 几乎没有收益，反而增加了一点点开销

// ❌ 场景3：props 本身就频繁变化
const Counter = React.memo(({ count }) => {count});
// count 每秒都变，memo 每次都比较失败，毫无意义
```

### 自定义比较函数

```tsx
// 当 props 是复杂对象时，可以自定义比较逻辑
const UserProfile = React.memo(
  function UserProfile({ user, settings }) {
    return (

        {user.name} - {settings.theme}

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

return ;
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

  return ...;
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

- onItemClick(item.id)}> {item.name}

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

return ;
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

return ;
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

return Click;
}

// ✅ 直接写就行
function Component() {
  const handleClick = () => console.log("click");
return Click;
}
```

```tsx
// ❌ 没有配合 memo 使用
function Parent() {
  // 用了 useCallback，但 Child 没有 memo
  const fn = useCallback(() => {}, []);
return ; // Child 每次都会渲染，useCallback 白费
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

      {isPending &&
过滤中...
}

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
{/* 重量级组件 */}

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

return ;
}
```

---

## 五、组合优化 — 实战案例

### 案例：高性能数据表格

```tsx
type Row = { id: number; name: string; age: number; score: number };

function DataTable({ data }: { data: Row[] }) {
const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');
  const [isPending, startTransition] = useTransition();

  // 1. useMemo: 缓存排序过滤结果
  const processedData = useMemo(() => {
    let result = data;
    if (filter) {
      result = result.filter(row =>
        row.name.toLowerCase().includes(filter.toLowerCase())
      );
    }
    return [...result].sort((a, b) => {
      const val = a[sortKey] > b[sortKey] ? 1 : -1;
      return sortDir === 'asc' ? val : -val;
    });
  }, [data, sortKey, sortDir, filter]);

  // 2. useCallback: 稳定排序函数引用
  const handleSort = useCallback((key: keyof Row) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return prev;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  // 3. startTransition: 过滤是非紧急操作
const handleFilter = (e: React.ChangeEvent) => {
    startTransition(() => setFilter(e.target.value));
  };

  return (


      {isPending && 过滤中...}

| handleSort(key)} style={{ cursor: 'pointer' }}>
 {key} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''} |
| --- |


  );
}

// 5. memo: 只有 row 引用变化才重渲染
const TableRow = React.memo(function TableRow({ row }: { row: Row }) {
  return (

{row.id}
{row.name}
{row.age}
{row.score}
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

## 八、面试高频问题

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

```tsx
// 问题：父组件更新时，子组件即使 props 没变也会重新渲染
function Parent() {
  const [count, setCount] = useState(0);
  return (

setCount((c) => c + 1)}>+1
{/* 每次 Parent 更新，Child 都会重新渲染 */}

  );
}

// 解决：用 React.memo 包裹，props 不变则跳过渲染
const Child = React.memo(function Child({ name }) {
  console.log("Child 渲染了");
  return {name};
});

// 自定义比较函数（默认是浅比较）
const Child2 = React.memo(
  function Child2({ user }) {
    return {user.name};
  },
  (prevProps, nextProps) => {
    // 返回 true 表示相同，跳过渲染
    return prevProps.user.id === nextProps.user.id;
  },
);
```

---

## 三、useMemo —— 缓存计算结果

```tsx
// 问题：每次渲染都重新计算昂贵的值
function Component({ list, filter }) {
  // ❌ 每次渲染都执行，即使 list 和 filter 没变
  const filteredList = list.filter((item) => item.includes(filter));

  // ✅ 只有 list 或 filter 变化时才重新计算
  const filteredList2 = useMemo(
    () => list.filter((item) => item.includes(filter)),
    [list, filter],
  );

  return (

- {item}

  );
}

// 适合场景：
// 1. 复杂计算（排序、过滤大数组）
// 2. 创建引用类型值（对象、数组），避免子组件不必要渲染
function Parent() {
  const [count, setCount] = useState(0);

  // ❌ 每次渲染都创建新对象，导致 Child 每次都重新渲染
  const config = { theme: "dark", size: "large" };

  // ✅ 引用稳定，Child 不会不必要重新渲染
  const config2 = useMemo(() => ({ theme: "dark", size: "large" }), []);

return ;
}
```

---

## 四、useCallback —— 缓存函数引用

```tsx
// 问题：每次渲染都创建新函数，导致子组件不必要渲染
function Parent() {
  const [count, setCount] = useState(0);

  // ❌ 每次渲染都是新函数，Child 每次都重新渲染
  const handleClick = () => console.log("clicked");

  // ✅ 函数引用稳定
  const handleClick2 = useCallback(() => {
    console.log("clicked");
  }, []); // 依赖为空，函数永远不变

  // 如果函数依赖 state，需要加入依赖
  const handleAdd = useCallback(() => {
    setCount((c) => c + 1); // 用函数式更新，不需要依赖 count
  }, []);

return ;
}

// useMemo vs useCallback
// useMemo(() => fn, deps)  ≡  useCallback(fn, deps)
// useMemo 缓存的是函数的返回值
// useCallback 缓存的是函数本身
```

---

## 五、何时不需要 useMemo/useCallback

```tsx
// ❌ 过度优化：简单计算不需要 useMemo
const double = useMemo(() => count * 2, [count]); // 没必要

// ❌ 没有子组件依赖时，useCallback 没有意义
const handleClick = useCallback(() => {
  console.log("clicked");
}, []); // 如果这个函数只在当前组件用，没必要

// ✅ 真正需要的场景：
// 1. 计算量大（>1ms）
// 2. 函数/值作为 props 传给 React.memo 包裹的子组件
// 3. 函数/值作为 useEffect 的依赖
```

---

## 六、代码分割与懒加载

```tsx
import React, { Suspense, lazy } from "react";

// 路由级别懒加载
const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));

function App() {
  return (

} />
} />
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
setShow(true)}>打开弹窗
      {show && (
}>
setShow(false)} />
        </Suspense>
      )}
    </>
  );
}
```

---

## 七、虚拟列表

当列表数据量很大（>1000 条）时，只渲染可视区域内的元素。

```tsx
// 使用 react-window（推荐）
import { FixedSizeList } from "react-window";

function VirtualList({ items }) {
  const Row = ({ index, style }) => (
    {items[index].name}
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
     setScrollTop(e.target.scrollTop)}
    >


          {visibleItems.map((item, i) => (

              {item.name}

          ))}



  );
}
```

---

## 八、其他优化技巧

### 避免在渲染中创建对象/数组

```tsx
// ❌ 每次渲染都创建新数组

// ✅ 提到组件外或用 useMemo
const STYLE = { color: 'red' };
const ITEMS = [1, 2, 3];

```

### 合理使用 key

```tsx
// ❌ 用 index 作为 key（列表重排时性能差）
{
list.map((item, index) => );
}

// ✅ 用稳定唯一的 id
{
list.map((item) => );
}

// 特殊用法：强制重置组件状态
// 改变 key 会让 React 销毁旧组件，创建新组件
;
```

### 状态下移（State Colocation）

```tsx
// ❌ 状态放在父组件，导致整个父组件重新渲染
function Parent() {
  const [inputValue, setInputValue] = useState("");
  return (

      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
{/* 每次输入都重新渲染 */}

  );
}

// ✅ 状态下移到需要它的组件
function SearchInput() {
  const [inputValue, setInputValue] = useState("");
  return (
setInputValue(e.target.value)} />
  );
}

function Parent() {
  return (


{/* 不再受 input 影响 */}

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
     setScroll(e.target.scrollTop)}>

Scroll: {scroll}

{/* 每次滚动都重新渲染！ */}

  );
}

// ✅ 通过 children 传入，引用不变，不会重新渲染
function ScrollTracker({ children }) {
  const [scroll, setScroll] = useState(0);
  return (
     setScroll(e.target.scrollTop)}>

Scroll: {scroll}

      {children} {/* 引用稳定，不重新渲染 */}

  );
}

// 使用时

</ScrollTracker>;
```

### 路由预加载（悬停时提前加载）

```tsx
// 鼠标悬停时就开始加载，点击时已经加载完毕
const importSettings = () => import("./pages/Settings");
const Settings = lazy(importSettings);

  Settings
;
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


        {virtualizer.getVirtualItems().map((row) => (

            {items[row.index].name}

        ))}


  );
}
```

---

# React性能优化指南 - 一页速记.md

# React性能优化指南 - 一页速记

> 来源：[[React性能优化指南]]。本页用于高频复习，完整细节回到原文。

## 必背主线

- React 性能优化先定位：Profiler、why-did-you-render、用户指标
- 减少无效渲染：memo/useMemo/useCallback/状态下沉或拆分
- 列表与大数据：虚拟列表、分页、懒加载、稳定 key
- 并发能力：startTransition/useDeferredValue 区分紧急与非紧急更新
- 架构层面：组件边界、服务端渲染、缓存、RSC/Next App Router

## 面试表达公式

1. **一句话定义**：先说明它解决什么问题。
2. **核心机制**：用流程或阶段说明底层原理。
3. **工程落地**：结合项目讲方案、指标、收益。
4. **边界风险**：补充兼容性、性能、维护成本或安全风险。

## 快速自测

- [ ] 我能 1 分钟讲清核心概念。
- [ ] 我能画出关键流程。
- [ ] 我能说出至少 2 个项目实践。
- [ ] 我能回答常见追问和边界情况。

## 复习入口

- 标准答案：[[React性能优化指南 - 标准答案索引]]
- 深挖专题：[[React性能优化指南 - 深挖专题索引]]
- 原文：[[React性能优化指南]]

---

# React性能优化指南 - 标准答案索引.md

# React性能优化指南 - 标准答案索引

> 来源：[[React性能优化指南]]。本页沉淀可直接用于面试表达的答案。

## 回答结构

- **结论**：先直接回答核心问题。
- **原理**：解释关键机制，不只背定义。
- **实践**：结合项目落地、指标或复杂度说明。
- **追问**：主动暴露可深入的方向。

## 高频标准答案

### Q1：React 中 memo 什么时候有用？

memo 适合 props 稳定且组件渲染成本较高的场景。它不是默认优化手段，如果 props 每次都是新对象或新函数，或者组件本身很轻，memo 反而可能增加比较成本。

**关键词**：memo、props 稳定、浅比较

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q2：useMemo 和 useCallback 怎么选？

useMemo 缓存计算结果，useCallback 缓存函数引用。它们主要用于避免昂贵计算重复执行，或配合 memo 稳定子组件 props。不要为了“看起来优化”滥用。

**关键词**：useMemo、useCallback、引用稳定

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q3：startTransition 解决什么问题？

startTransition 用来标记非紧急更新，让 React 优先响应输入、点击等紧急交互，再处理列表过滤、搜索结果渲染等可延后的更新，从而改善交互流畅度。

**关键词**：React 18、transition、并发渲染

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q4：React 如何定位性能问题？

先用 React DevTools Profiler 看哪些组件频繁渲染、渲染耗时和提交次数，再结合 Performance 看主线程长任务。定位后判断是状态设计、props 引用、列表渲染、计算过重还是副作用导致。

**关键词**：Profiler、commit、render、Performance

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q5：为什么不建议无脑使用 useCallback？

useCallback 本身也有依赖比较和闭包维护成本。如果函数没有传给 memo 子组件，或不是依赖稳定性的 Hook 参数，缓存它通常没有收益。优化要基于测量，而不是机械添加。

**关键词**：useCallback、闭包、依赖数组、优化成本

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q6：React 列表性能怎么优化？

列表优化包括稳定 key、减少 item 组件渲染成本、分页或虚拟列表、懒加载图片、避免在 render 中创建大量新对象，以及把列表项状态局部化。数据量很大时优先虚拟列表。

**关键词**：key、虚拟列表、局部状态

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q7：Context 为什么可能导致性能问题？

Context value 变化会让消费该 Context 的组件重新渲染。如果把频繁变化的大对象放进 Context，影响范围会很大。优化方式是拆分 Context、稳定 value、选择性订阅或使用状态管理库。

**关键词**：Context、value、选择性订阅

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q8：状态应该放在哪里？

状态应放在真正需要它的最小公共父级，避免过度提升导致大范围重渲染。局部交互状态优先放组件内部，跨页面或跨模块共享状态再考虑全局状态管理。

**关键词**：状态提升、局部状态、全局状态

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q9：useDeferredValue 和 startTransition 区别？

startTransition 是把某次状态更新标记为非紧急；useDeferredValue 是让某个值的更新延后，常用于输入值和搜索结果渲染解耦。前者控制更新，后者控制值的消费节奏。

**关键词**：useDeferredValue、startTransition、非紧急更新

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q10：React 中 key 为什么重要？

key 帮助 React 在 diff 时识别节点身份。稳定 key 可以复用组件实例和状态；使用 index 作为 key 在插入、删除、排序时可能导致状态错乱和不必要渲染。

**关键词**：key、diff、状态复用

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q11：React 组件拆分如何影响性能？

合理拆分可以缩小状态变化影响范围，让不相关组件避免重渲染。但过度拆分会增加组件层级和理解成本。性能优化中更重要的是状态边界、memo 边界和数据流稳定。

**关键词**：组件拆分、状态边界、memo 边界

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

### Q12：React 性能优化如何和业务指标关联？

不要只看组件渲染次数，要关联首屏、交互延迟、输入响应、列表滚动 FPS、接口耗时和业务转化。优化前后用 Profiler、RUM 和埋点证明收益。

**关键词**：业务指标、RUM、INP、FPS

**追问方向**：原理细节、边界条件、项目落地、性能/安全/复杂度影响。

## 复习建议

- 第一轮：只看问题，口述 30～60 秒答案。
- 第二轮：对照关键词补齐遗漏点。
- 第三轮：为每个主题补充一个自己的项目案例。

---

# React性能优化指南 - 深挖专题索引.md

# React性能优化指南 - 深挖专题索引

> 来源：[[React性能优化指南]]。本页用于把长文拆成可逐步扩展的专题，不承载高频速记。

## 深挖原则

1. 一个专题只解决一个问题，避免再次变成长文。
2. 每个专题包含：背景、核心机制、源码/规范线索、工程实践、常见误区。
3. 与面试标准答案分离，深挖内容服务理解，不要求全部背诵。

## 可拆专题候选

- [[#React 性能优化实战|React 性能优化实战]]
  - [[#核心原则：不要过早优化|核心原则：不要过早优化]]
  - [[#一、React.memo — 跳过子组件重渲染|一、React.memo — 跳过子组件重渲染]]
    - [[#什么时候该用|什么时候该用]]
    - [[#什么时候不该用|什么时候不该用]]
    - [[#自定义比较函数|自定义比较函数]]
  - [[#二、useMemo — 缓存计算结果|二、useMemo — 缓存计算结果]]
    - [[#什么时候该用|什么时候该用]]
    - [[#什么时候不该用|什么时候不该用]]
    - [[#如何判断计算是否"昂贵"|如何判断计算是否"昂贵"]]
  - [[#三、useCallback — 缓存函数引用|三、useCallback — 缓存函数引用]]
    - [[#什么时候该用|什么时候该用]]
    - [[#什么时候不该用|什么时候不该用]]
    - [[#useCallback 和 useMemo 的关系|useCallback 和 useMemo 的关系]]
  - [[#四、startTransition — 区分紧急/非紧急更新|四、startTransition — 区分紧急/非紧急更新]]
    - [[#什么时候该用|什么时候该用]]
    - [[#什么时候不该用|什么时候不该用]]
    - [[#`useTransition` vs `useDeferredValue` 选哪个？|`useTransition` vs `useDeferredValue` 选哪个？]]
  - [[#五、组合优化 — 实战案例|五、组合优化 — 实战案例]]
    - [[#案例：高性能数据表格|案例：高性能数据表格]]
  - [[#六、性能优化决策树|六、性能优化决策树]]
  - [[#七、与 Vue 3 性能优化对比|七、与 Vue 3 性能优化对比]]
  - [[#八、面试高频问题|八、面试高频问题]]
    - [[#Q1：useMemo 和 useCallback 的区别？|Q1：useMemo 和 useCallback 的区别？]]
    - [[#Q2：什么情况下 React.memo 会失效？|Q2：什么情况下 React.memo 会失效？]]
    - [[#Q3：startTransition 的原理？|Q3：startTransition 的原理？]]
    - [[#Q4：过度使用 useMemo/useCallback 的危害？|Q4：过度使用 useMemo/useCallback 的危害？]]
- [[#React 性能优化深入|React 性能优化深入]]
  - [[#面试高频考点|面试高频考点]]
  - [[#一、性能优化总览|一、性能优化总览]]
  - [[#二、React.memo —— 避免子组件不必要渲染|二、React.memo —— 避免子组件不必要渲染]]
  - [[#三、useMemo —— 缓存计算结果|三、useMemo —— 缓存计算结果]]
  - [[#四、useCallback —— 缓存函数引用|四、useCallback —— 缓存函数引用]]
  - [[#五、何时不需要 useMemo/useCallback|五、何时不需要 useMemo/useCallback]]
  - [[#六、代码分割与懒加载|六、代码分割与懒加载]]
  - [[#七、虚拟列表|七、虚拟列表]]
  - [[#八、其他优化技巧|八、其他优化技巧]]
    - [[#避免在渲染中创建对象/数组|避免在渲染中创建对象/数组]]
    - [[#合理使用 key|合理使用 key]]
    - [[#状态下移（State Colocation）|状态下移（State Colocation）]]
    - [[#Children as Props（内容提升）|Children as Props（内容提升）]]
    - [[#路由预加载（悬停时提前加载）|路由预加载（悬停时提前加载）]]
    - [[#使用 @tanstack/react-virtual 虚拟滚动|使用 @tanstack/react-virtual 虚拟滚动]]

## 专题沉淀区

- [ ] 专题 1：待补充。
- [ ] 专题 2：待补充。
- [ ] 专题 3：待补充。

## 推荐优先深挖

- [ ] 从源码或规范角度解释核心机制。
- [ ] 整理一张流程图或时序图。
- [ ] 补充项目中的排查案例。
- [ ] 对比同类方案的取舍。
