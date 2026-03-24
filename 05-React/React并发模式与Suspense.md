# React 并发模式与 Suspense

> React 18 最重要的特性，面试高频考点：并发渲染原理、useTransition、useDeferredValue、Suspense 数据获取。

## 面试高频考点

1. **React 18 的并发模式是什么？和之前有什么区别？**
2. **useTransition 和 useDeferredValue 的区别和使用场景？**
3. **Suspense 的工作原理是什么？如何配合数据获取使用？**
4. **startTransition 解决了什么问题？**
5. **并发模式下 React 如何保证 UI 一致性？**

---

## 一、并发模式的核心思想

### 1.1 同步渲染 vs 并发渲染

**React 17 及之前（同步渲染）**：

```
用户输入 → React 开始渲染 → 渲染完成（中途不可中断）
```

渲染一旦开始就必须执行到底，如果组件树很大，会长时间占用主线程，导致用户输入无响应（卡顿）。

**React 18 并发渲染**：

```
用户输入 → React 开始渲染 → 发现更高优先级任务 → 暂停当前渲染 → 处理高优先级任务 → 恢复渲染
```

并发模式让 React 可以**中断、暂停、恢复、丢弃**渲染工作，始终保持 UI 对用户输入的响应。

### 1.2 开启并发模式

```javascript
// React 17（旧版，同步模式）
ReactDOM.render(<App />, document.getElementById('root'));

// React 18（并发模式）
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

使用 `createRoot` 即开启并发模式，这是 React 18 的默认行为。

---

## 二、useTransition — 标记低优先级更新

### 2.1 问题场景

搜索框输入时，同时触发两件事：更新输入框显示（高优先级）和过滤大量列表（低优先级）。如果两者同步执行，列表过滤会阻塞输入框更新，导致输入卡顿。

### 2.2 基本用法

```javascript
import { useState, useTransition } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    // 高优先级：立即更新输入框
    setQuery(e.target.value);

    // 低优先级：标记为 transition，可被中断
    startTransition(() => {
      const filtered = heavyFilter(e.target.value); // 耗时操作
      setResults(filtered);
    });
  };

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <span>搜索中...</span>}
      <ResultList results={results} />
    </div>
  );
}
```

**`isPending`**：transition 更新还在进行中时为 `true`，可用于显示 loading 状态。

### 2.3 工作原理

`startTransition` 内的状态更新被标记为"过渡更新"（Transition Update），优先级低于"紧急更新"（Urgent Update，如用户输入、点击）。当有紧急更新时，React 会中断过渡更新，先处理紧急更新，再恢复过渡更新。

```
优先级从高到低：
SyncLane（同步）> InputContinuousLane（连续输入）> DefaultLane（默认）> TransitionLane（过渡）> IdleLane（空闲）
```

---

## 三、useDeferredValue — 延迟派生值

### 3.1 基本用法

```javascript
import { useState, useDeferredValue } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query); // 延迟版本的 query

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {/* 使用延迟值渲染列表，不阻塞输入框 */}
      <SlowList query={deferredQuery} />
    </div>
  );
}
```

`deferredQuery` 会"滞后"于 `query`：当 `query` 快速变化时，`deferredQuery` 保持旧值，等到浏览器空闲时才更新，避免每次击键都触发昂贵的列表重渲染。

### 3.2 useTransition vs useDeferredValue

| 对比项 | `useTransition` | `useDeferredValue` |
|--------|----------------|-------------------|
| 控制对象 | 状态更新（setter） | 值（已有的 state/prop） |
| 使用场景 | 你能控制状态更新的地方 | 接收 prop 或无法修改更新逻辑时 |
| loading 状态 | ✅ `isPending` | ❌ 需要自己对比新旧值 |
| 典型场景 | 搜索、Tab 切换 | 接收父组件传来的 prop 做昂贵渲染 |

**选择原则**：能用 `useTransition` 就用它（更明确）；当你无法控制状态更新的来源（如 prop 来自父组件），用 `useDeferredValue`。

---

## 四、Suspense — 声明式异步处理

### 4.1 基本用法（代码分割）

```javascript
import { Suspense, lazy } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 4.2 Suspense 的工作原理

Suspense 的核心机制是**抛出 Promise**：

```javascript
// 简化版原理
function fetchData(url) {
  let status = 'pending';
  let result;
  const promise = fetch(url).then(res => res.json()).then(
    data => { status = 'success'; result = data; },
    err  => { status = 'error';   result = err;  }
  );

  return {
    read() {
      if (status === 'pending') throw promise;  // ← 抛出 Promise！
      if (status === 'error')   throw result;
      return result;
    }
  };
}
```

当组件调用 `resource.read()` 时：
1. 数据未就绪 → 抛出 Promise → React 捕获 → 渲染最近的 `<Suspense>` 的 `fallback`
2. Promise resolve → React 重新尝试渲染该组件
3. 数据就绪 → `read()` 返回数据 → 正常渲染

### 4.3 React 18 的 use Hook（新方式）

React 18 引入了 `use` Hook，可以在组件内直接 await Promise：

```javascript
import { use, Suspense } from 'react';

// 在组件外创建 Promise（不能在组件内创建，否则每次渲染都是新 Promise）
const userPromise = fetchUser(userId);

function UserProfile() {
  const user = use(userPromise); // 如果 Promise 未完成，自动触发 Suspense
  return <div>{user.name}</div>;
}

function App() {
  return (
    <Suspense fallback={<Skeleton />}>
      <UserProfile />
    </Suspense>
  );
}
```

### 4.4 Suspense + 错误边界

```javascript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <div>出错了：{this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <AsyncComponent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## 五、并发特性综合实战

### 场景：搜索 + 分页 + 懒加载

```javascript
import { useState, useTransition, Suspense, lazy } from 'react';

const ResultDetail = lazy(() => import('./ResultDetail'));

function SearchApp() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (value) => {
    setQuery(value); // 高优先级：立即更新输入框

    startTransition(() => {
      setPage(1); // 低优先级：重置分页
    });
  };

  const handlePageChange = (newPage) => {
    startTransition(() => {
      setPage(newPage); // 翻页是低优先级操作
    });
  };

  return (
    <div>
      <input onChange={e => handleSearch(e.target.value)} />

      {isPending ? (
        <div className="loading-overlay">更新中...</div>
      ) : null}

      <SearchResults query={query} page={page} onSelect={setSelectedId} />

      {selectedId && (
        <Suspense fallback={<DetailSkeleton />}>
          <ResultDetail id={selectedId} />
        </Suspense>
      )}
    </div>
  );
}
```

---

## 六、并发模式的注意事项

### 副作用可能执行多次

并发模式下，React 可能多次调用渲染函数（包括 render 阶段的生命周期和函数组件体）。副作用必须放在 `useEffect` 中，不能放在渲染函数里：

```javascript
// ❌ 危险：渲染函数中的副作用可能执行多次
function Component() {
  console.log('渲染了'); // 可能打印多次
  analytics.track('view'); // 可能上报多次！
  return <div />;
}

// ✅ 正确：副作用放在 useEffect 中
function Component() {
  useEffect(() => {
    analytics.track('view'); // 只在挂载时执行一次
  }, []);
  return <div />;
}
```

### StrictMode 双重调用

React 18 的 StrictMode 在开发环境下会故意调用组件函数两次，用于检测副作用问题。这是正常行为，生产环境不会发生。

---

## 七、面试答题模板

**Q：React 18 并发模式解决了什么问题？**

React 17 的同步渲染模型中，一旦开始渲染就无法中断，大型组件树会长时间占用主线程，导致用户输入卡顿。React 18 的并发模式让渲染变得可中断、可暂停、可恢复，通过优先级调度保证高优先级更新（用户输入）始终能及时响应，低优先级更新（数据过滤、列表渲染）在空闲时执行。

**Q：useTransition 和 useDeferredValue 怎么选？**

两者都用于标记低优先级更新，区别在于控制点：`useTransition` 包裹状态更新的 setter 调用，适合你能控制更新来源的场景，且提供 `isPending` 状态；`useDeferredValue` 接收一个值并返回其延迟版本，适合接收来自 prop 或无法修改更新逻辑的场景。能用 `useTransition` 就优先用它，语义更清晰。
