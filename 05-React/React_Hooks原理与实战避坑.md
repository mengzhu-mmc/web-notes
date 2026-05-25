# React Hooks 深入实战与底层机制指南

> 收录日期：2026-05-24 | 来源：核心主干整合（包含基础用法、闭包陷阱解析与自定义 Hooks 实战）

## 一、理解 React 的心智模型：状态快照与闭包

在 React 里，组件的每一次重新渲染，就像是拍了一张**拍立得照片（状态快照）**。每一次渲染都有它自己独立的 `props` 和 `state`。

### 1. 什么是闭包陷阱？

React 函数组件的每一次重新渲染，本质上就是把组件函数重新执行了一遍。
如果在某次渲染中定义了一个异步操作（如 `setTimeout`）或缓存了一个函数（如依赖为空的 `useCallback`），这个函数就会把**当前这一帧**的快照死死抱住（闭包）。当异步操作执行时，它读取的依然是那张“旧照片”里的数据，这就是所谓的“闭包陷阱”。

### 2. useState 闭包陷阱经典案例

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    // ❌ 连续调用 3 次，闭包捕获的 count 都是 0
    // 相当于：setCount(0 + 1); setCount(0 + 1); setCount(0 + 1);
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
    // 最终 count 只会变成 1，而不是 3

    // ✅ 正确解法：使用函数式更新
    // 函数式更新不依赖闭包中的旧值，而是由 React 传入最新状态
    setCount((prev) => prev + 1);
    setCount((prev) => prev + 1);
    setCount((prev) => prev + 1);
    // count 最终 +3，且 React 会进行批处理，只触发 1 次渲染
  };
}
```

### 3. useEffect 依赖陷阱

```tsx
function Timer() {
  const [count, setCount] = useState(0);

  // ❌ 缺少依赖，闭包永远拿到初始值 0
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(count + 1); // count 永远是 0
    }, 1000);
    return () => clearInterval(timer);
  }, []); // 空依赖导致 effect 永远不会重新执行并捕获新闭包

  // ✅ 解法一：函数式更新（推荐）
  useEffect(() => {
    const timer = setInterval(() => {
      setCount((c) => c + 1); // 总是基于内部维护的最新值
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ 解法二：用 ref 保存最新值（适用于需要读取值做判断的场景）
  const countRef = useRef(count);
  countRef.current = count; // 每次渲染都更新 ref
  useEffect(() => {
    const timer = setInterval(() => {
      console.log(countRef.current); // 始终能拿到最新值
    }, 1000);
    return () => clearInterval(timer);
  }, []);
}
```

### 4. useMemo / useCallback 的陷阱

传空数组 `[]` 作为依赖时，仅在**首次渲染时执行一次**，之后永远复用缓存。
如果内部依赖了 state 却没写进依赖数组，就会形成闭包陷阱，永远只能拿到初始的 state。

```tsx
// ❌ 错误示范：闭包陷阱
const handleClick = useCallback(() => {
  console.log("count:", count); // 永远打印 0
}, []);
// 💡 原则：内部依赖什么 state/props，就必须把它加入依赖数组。
```

---

## 二、自定义 Hooks 实战解析

自定义 Hook 的本质就是**逻辑复用**。命名必须以 `use` 开头。

### 1. 状态持久化：useLocalStorage

```tsx
import { useState, useEffect } from "react";

function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

### 2. 防抖控制：useDebounce

```tsx
import { useState, useEffect } from "react";

function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    // 关键点：每次 value 或 delay 变化时，清理上一个 timer
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### 3. 数据请求：useFetch (带竞态处理)

```tsx
import { useState, useEffect } from "react";

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 使用 AbortController 处理竞态问题和组件卸载
    const controller = new AbortController();
    setLoading(true);

    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then(setData)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [url]);

  return { data, loading, error };
}
```

### 4. 获取上一帧状态：usePrevious

利用 `useEffect` 在浏览器绘制完成后执行的特性。

```tsx
import { useRef, useEffect } from "react";

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
```

---

## 三、面试高频问题总结

### 1. 连续三次 setState 怎么处理？

**问题**：连续调用三次 `setCount(count + 1)` 如何让每次都生效？
**回答**：

1. **最优解**：使用函数式更新 `setCount(prev => prev + 1)`。React 会将三次更新放入队列，传入最新状态计算，三次都生效，且由于批处理（Batching）机制，只触发 1 次渲染。
2. **强制同步（不推荐）**：使用 `flushSync` 包裹，会强制打破批处理，触发 3 次渲染。
3. **宏任务（历史遗留）**：在 React 17 及以前，放在 `setTimeout` 中可以绕开批处理；但在 React 18 中，所有事件（包括 setTimeout）默认都会被批处理。

### 2. useCallback 的正确使用时机是什么？

**误区**：到处都在写 `useCallback` 以“提升性能”。
**正解**：`useCallback` 的唯一作用是**保持函数引用的稳定**。
它只有在以下两种情况才有意义：

1. 将函数作为 props 传给被 `React.memo` 包裹的子组件（防止子组件因为父组件渲染导致函数引用变化而无意义重渲染）。
2. 该函数被作为其他 Hook（如 `useEffect`）的依赖项。
   如果不符合这两种情况，包裹 `useCallback` 反而会因为额外的闭包创建和依赖对比带来性能损耗。

### 3. useMount 与 useUnmount 的手写实现

```tsx
function useMount(fn: () => void) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fn();
  }, []); // 仅挂载时执行
}

function useUnmount(fn: () => void) {
  // 必须用 ref 保存最新 fn，防止闭包陷阱导致卸载时执行的是旧函数
  const fnRef = useRef(fn);
  fnRef.current = fn;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => fnRef.current(), []);
}
```
