# React Hooks 深入实战指南

> 收录日期：2026-03-07 | 来源：掘金精选 + 官方文档

## 关联笔记
- [[[4855] 06  React-Hook 设计动机与工作模式（上）]]
- [[[4856] 07  React-Hook 设计动机与工作模式（下）]]
- [[[4857] 08  深入 React-Hook 工作机制："原则"的背后，是"原理"]]
- [[React18-19新特性]] — React 19 的新 Hooks

---

## 一、常见 Hooks 使用陷阱

### 1. useState 的闭包陷阱

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    // ❌ 连续调用 3 次，count 还是只 +1
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);

    // ✅ 使用函数式更新
    setCount(c => c + 1);
    setCount(c => c + 1);
    setCount(c => c + 1); // count 最终 +3
  };
}
```

### 2. useEffect 依赖陷阱

```jsx
// ❌ 缺少依赖，拿到的永远是初始值
useEffect(() => {
  const timer = setInterval(() => {
    console.log(count); // 永远是 0
  }, 1000);
  return () => clearInterval(timer);
}, []);

// ✅ 用 ref 保存最新值
const countRef = useRef(count);
countRef.current = count;
useEffect(() => {
  const timer = setInterval(() => {
    console.log(countRef.current); // 始终最新
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

### 3. useCallback 的正确使用时机

```jsx
// ❌ 不需要 useCallback 的场景（没传给 memo 子组件）
const handleClick = useCallback(() => {
  console.log('clicked');
}, []);

// ✅ 需要 useCallback：传给 memo 子组件
const MemoChild = React.memo(({ onClick }) => <button onClick={onClick}>Click</button>);

function Parent() {
  const handleClick = useCallback(() => doSomething(), []);
  return <MemoChild onClick={handleClick} />;
}
```

---

## 二、自定义 Hooks 实战

### useLocalStorage
```jsx
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}
```

### useDebounce
```jsx
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
```

### useFetch
```jsx
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(setData)
      .catch(err => { if (err.name !== 'AbortError') setError(err); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [url]);

  return { data, loading, error };
}
```

### usePrevious
```jsx
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; });
  return ref.current;
}
```

### useClickOutside
```jsx
function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}
```

### useIntersectionObserver
```jsx
function useIntersectionObserver(ref, options = {}) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, options]);
  return isVisible;
}
```

---

## 三、Hooks 设计原则

- **逻辑复用**：多个组件需要相同的状态逻辑 → 抽 Hook
- **关注点分离**：复杂组件拆成多个 Hook
- **命名规范**：必须以 `use` 开头，名字体现功能
- **组合优于嵌套**：多个小 Hook 组合成大 Hook

---

## 四、面试手写题

### useUpdate（强制更新）
```jsx
function useUpdate() {
  const [, setState] = useState({});
  return useCallback(() => setState({}), []);
}
```

### useMount / useUnmount
```jsx
function useMount(fn) {
  useEffect(() => { fn(); }, []);
}
function useUnmount(fn) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => () => fnRef.current(), []);
}
```
