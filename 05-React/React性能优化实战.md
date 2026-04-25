# React 性能优化实战

> 更新日期：2026-03-31 | 重点：**正确使用场景** — 什么时候该用，什么时候不该用

---

## 核心原则：不要过早优化

> "过早优化是万恶之源" — Donald Knuth

React 在大多数场景下已经足够快。优化前先**测量**，用 React DevTools Profiler 找到真正的瓶颈。

---

## 一、React.memo — 跳过子组件重渲染

### 什么时候该用

```jsx
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

```jsx
// ✅ 场景2：列表中的每一项
const ListItem = React.memo(function ListItem({ item, onToggle }) {
  console.log('ListItem render:', item.id);
  return (
    <li>
      <input type="checkbox" checked={item.done} onChange={() => onToggle(item.id)} />
      {item.title}
    </li>
  );
});

// 配合 useCallback：只有修改的那一项重渲染
function TodoList({ todos }) {
  const handleToggle = useCallback((id) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }, []); // 稳定引用

  return (
    <ul>
      {todos.map(item => (
        <ListItem key={item.id} item={item} onToggle={handleToggle} />
      ))}
    </ul>
  );
}
```

### 什么时候不该用

```jsx
// ❌ 场景1：props 是内联对象/数组，每次父渲染都是新引用
// memo 毫无用处，还增加了比较开销
function Parent() {
  return (
    // 每次 Parent 渲染，{ color: 'red' } 都是新对象
    <MemoChild style={{ color: 'red' }} items={[1, 2, 3]} />
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

```jsx
// 当 props 是复杂对象时，可以自定义比较逻辑
const UserProfile = React.memo(
  function UserProfile({ user, settings }) {
    return <div>{user.name} - {settings.theme}</div>;
  },
  (prevProps, nextProps) => {
    // 只比较关心的字段，返回 true = 跳过渲染
    return (
      prevProps.user.id === nextProps.user.id &&
      prevProps.settings.theme === nextProps.settings.theme
    );
  }
);
```

---

## 二、useMemo — 缓存计算结果

### 什么时候该用

```jsx
// ✅ 场景1：昂贵的计算（数组排序/过滤、复杂算法）
function DataTable({ rows, sortKey, filterText }) {
  const processedData = useMemo(() => {
    console.log('重新计算...'); // 只在依赖变化时执行
    return rows
      .filter(row => row[filterText] !== undefined)
      .sort((a, b) => a[sortKey] > b[sortKey] ? 1 : -1);
  }, [rows, sortKey, filterText]); // 依赖项精确

  return <table>{processedData.map(row => <Row key={row.id} row={row} />)}</table>;
}
```

```jsx
// ✅ 场景2：稳定引用类型给 memo 子组件
function Parent({ userId }) {
  // ❌ 每次渲染都是新对象，导致 MemoChild 每次都重渲染
  // const config = { userId, theme: 'dark' };

  // ✅ userId 不变则引用稳定
  const config = useMemo(() => ({ userId, theme: 'dark' }), [userId]);

  return <MemoChild config={config} />;
}
```

```jsx
// ✅ 场景3：作为其他 Hook 的依赖（避免无限循环）
function SearchComponent({ query }) {
  // 没有 useMemo：options 每次渲染都是新对象
  // → useEffect 每次都触发 → 可能造成无限循环
  const options = useMemo(() => ({
    query,
    page: 1,
    limit: 20,
  }), [query]);

  useEffect(() => {
    fetchData(options);
  }, [options]); // 依赖稳定了

  return <div>...</div>;
}
```

### 什么时候不该用

```jsx
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

```jsx
// 用 console.time 测量
console.time('filter');
const result = largeArray.filter(item => item.active);
console.timeEnd('filter');
// 如果 > 1ms，考虑 useMemo；< 0.1ms，不值得

// 或者用 React DevTools Profiler 看重渲染耗时
```

---

## 三、useCallback — 缓存函数引用

### 什么时候该用

```jsx
// ✅ 场景1：传给 memo 子组件的回调函数（必须配合 memo 才有意义！）
const ExpensiveList = React.memo(function ExpensiveList({ items, onItemClick }) {
  return (
    <ul>
      {items.map(item => (
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
    console.log('点击了:', id);
  }, []); // 无依赖，永远稳定

  return <ExpensiveList items={items} onItemClick={handleClick} />;
}
```

```jsx
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

```jsx
// ✅ 场景3：自定义 Hook 中导出的函数
function useCounter() {
  const [count, setCount] = useState(0);
  
  // 稳定的 API，防止使用方不必要的重渲染
  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => c - 1), []);
  const reset = useCallback(() => setCount(0), []);
  
  return { count, increment, decrement, reset };
}
```

### 什么时候不该用

```jsx
// ❌ 最常见的误用：组件内部使用的函数，不传给子组件
function Component() {
  // 没意义！这个函数不影响任何子组件
  const handleClick = useCallback(() => {
    console.log('click');
  }, []);

  return <button onClick={handleClick}>Click</button>;
}

// ✅ 直接写就行
function Component() {
  const handleClick = () => console.log('click');
  return <button onClick={handleClick}>Click</button>;
}
```

```jsx
// ❌ 没有配合 memo 使用
function Parent() {
  // 用了 useCallback，但 Child 没有 memo
  const fn = useCallback(() => {}, []);
  return <Child onClick={fn} />; // Child 每次都会渲染，useCallback 白费
}
```

### useCallback 和 useMemo 的关系

```jsx
// useCallback(fn, deps) 等价于 useMemo(() => fn, deps)
const memoizedCallback = useCallback(fn, [a, b]);
const memoizedCallback2 = useMemo(() => fn, [a, b]); // 等价
```

---

## 四、startTransition — 区分紧急/非紧急更新

### 什么时候该用

```jsx
import { useTransition, startTransition } from 'react';

// ✅ 场景1：搜索/过滤大列表
function SearchPage({ allItems }) {
  const [query, setQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState(allItems);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e) {
    // 紧急：立即更新输入框，保持响应
    setQuery(e.target.value);
    
    // 非紧急：过滤大量数据，可以延迟
    startTransition(() => {
      setFilteredItems(allItems.filter(item =>
        item.name.toLowerCase().includes(e.target.value.toLowerCase())
      ));
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

```jsx
// ✅ 场景2：Tab 切换 + 重量级内容
function TabContainer() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isPending, startTransition] = useTransition();

  function switchTab(tab) {
    startTransition(() => {
      setActiveTab(tab); // Tab 内容很重，用 transition 让 Tab 切换不卡顿
    });
  }

  return (
    <div>
      <nav>
        {['overview', 'details', 'reviews'].map(tab => (
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

```jsx
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
  setCount(c => c + 1); // ❌ 简单计数不需要 transition
});
```

### `useTransition` vs `useDeferredValue` 选哪个？

```jsx
// useTransition：当你能控制状态更新时
function Parent() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  return (
    <input
      onChange={e => {
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

```jsx
type Row = { id: number; name: string; age: number; score: number };

function DataTable({ data }: { data: Row[] }) {
  const [sortKey, setSortKey] = useState<keyof Row>('id');
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
            {(['id', 'name', 'age', 'score'] as const).map(key => (
              <th key={key} onClick={() => handleSort(key)} style={{ cursor: 'pointer' }}>
                {key} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processedData.map(row => (
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

| 优化手段 | React | Vue 3 |
|---------|-------|-------|
| 跳过组件重渲染 | `React.memo` | 天生追踪（响应式自动）|
| 缓存计算值 | `useMemo` | `computed`（自动缓存）|
| 稳定函数引用 | `useCallback` | 方法定义天生稳定 |
| 非紧急更新 | `startTransition` | 暂无直接对应 |
| 列表虚拟化 | `react-virtual` | `vue-virtual-scroller` |
| 代码分割 | `React.lazy` | `defineAsyncComponent` |

> 💡 **本质差异**：Vue 3 的响应式系统在依赖追踪层面自动优化，组件只在真正依赖的数据变化时更新。React 的重渲染默认向下传播，需要开发者手动用 memo/useMemo/useCallback "拦截"。React 19 的 Compiler 目标是让 React 也达到 Vue 那样的自动优化效果。

---

## 八、面试高频问题

### Q1：useMemo 和 useCallback 的区别？

`useMemo` 缓存**计算结果值**，`useCallback` 缓存**函数本身**。
本质上 `useCallback(fn, deps)` 等价于 `useMemo(() => fn, deps)`。

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
