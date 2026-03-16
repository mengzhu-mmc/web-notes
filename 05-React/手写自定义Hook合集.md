# 手写自定义 Hook 合集

> 面试高频考点，涵盖防抖、节流、请求、状态管理等常见场景

## 面试高频考点

- 手写 useDebounce（防抖 Hook）
- 手写 useDebouncedValue（值防抖 Hook）
- 手写 useThrottle（节流 Hook）
- 手写 usePrevious（获取上一次值）
- 手写 useLocalStorage（持久化状态）
- 手写 useFetch / useRequest（数据请求）
- 手写 useEventListener（事件监听）
- 手写 useIntersectionObserver（懒加载/无限滚动）
- 手写 useInterval / useTimeout（定时器）
- 手写 useLatest（始终获取最新值）

---

## 一、防抖 Hook

防抖有两种常见形式，面试中要能区分并说清楚适用场景。

### 1. useDebouncedCallback —— 防抖回调（非输入框场景）

适合：按钮点击、搜索触发等，**不需要**与输入框 `value` 直接绑定。

```jsx
import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * 返回一个防抖后的 setState，state 是防抖后的值
 * 注意：state 是延迟更新的，不能直接作为 input 的 value（会导致输入卡顿）
 */
const useDebouncedValue = (initialState, timeout) => {
  const [state, setState] = useState(initialState)
  const timer = useRef(null)

  const handleSetState = useCallback((newValue) => {
    if (timer.current) {
      clearTimeout(timer.current)
    }
    timer.current = setTimeout(() => setState(newValue), timeout)
  }, [timeout])

  useEffect(() => {
    // ✅ 清理时用 timer.current，不是 timeout.current（timeout 是数字，没有 .current）
    return () => timer.current && clearTimeout(timer.current)
  }, [])

  return [state, handleSetState]
}

// 使用示例
function SearchButton() {
  const [result, setResult] = useDebouncedValue('', 500)

  return (
    <button onClick={() => setResult('搜索结果')}>
      搜索（防抖 500ms）
    </button>
  )
}
```

> ⚠️ **常见 Bug**：清理函数里写成 `timeout.current`，但 `timeout` 是传入的数字参数，没有 `.current` 属性，应该是 `timer.current`。

---

### 2. useDebouncedValue —— 值防抖（输入框场景）

适合：搜索框输入，**输入框 `value` 用原始值**（响应流畅），**接口请求用 `debouncedVal`**（防止频繁请求）。

```jsx
import { useState, useEffect } from 'react'

/**
 * 对一个值做防抖处理，返回防抖后的值
 * 原始值变化时，延迟 timeout ms 后才更新返回值
 */
const useDebouncedValue = (value, timeout) => {
  // ✅ 内部 state 变量名不能与函数名同名，改为 debouncedVal
  const [debouncedVal, setDebouncedVal] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedVal(value)
    }, timeout)
    return () => clearTimeout(timer)
  }, [value, timeout])

  return debouncedVal
}

// 使用示例：输入框搜索
function SearchInput() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 500)

  useEffect(() => {
    if (debouncedQuery) {
      // 只有用户停止输入 500ms 后才发请求
      fetchSearchResults(debouncedQuery)
    }
  }, [debouncedQuery])

  return (
    // ✅ value 绑定原始 query，输入流畅无卡顿
    <input value={query} onChange={e => setQuery(e.target.value)} />
  )
}
```

> ⚠️ **常见 Bug**：函数名与内部 state 变量名同名（都叫 `debounceValue`），会导致命名冲突。另外自定义 Hook 命名必须以 `use` 开头。

---

### 3. useDebounce —— 防抖函数（通用版）

```jsx
import { useRef, useCallback } from 'react'

/**
 * 对任意函数做防抖处理
 */
const useDebounce = (fn, delay) => {
  const timer = useRef(null)

  return useCallback((...args) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      fn(...args)
    }, delay)
  }, [fn, delay])
}

// 使用示例
function Component() {
  const handleSearch = useDebounce((keyword) => {
    console.log('搜索：', keyword)
  }, 300)

  return <input onChange={e => handleSearch(e.target.value)} />
}
```

---

## 二、节流 Hook

```jsx
import { useRef, useCallback } from 'react'

/**
 * 对任意函数做节流处理
 * 在 delay 时间内，无论触发多少次，只执行第一次
 */
const useThrottle = (fn, delay) => {
  const lastTime = useRef(0)

  return useCallback((...args) => {
    const now = Date.now()
    if (now - lastTime.current >= delay) {
      lastTime.current = now
      fn(...args)
    }
  }, [fn, delay])
}

// 使用示例：滚动监听
function ScrollComponent() {
  const handleScroll = useThrottle(() => {
    console.log('scroll position:', window.scrollY)
  }, 200)

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return <div style={{ height: 2000 }}>滚动页面</div>
}
```

---

## 三、usePrevious —— 获取上一次的值

```jsx
import { useRef, useEffect } from 'react'

/**
 * 返回上一次渲染时的值
 * 原理：useEffect 在渲染后执行，所以 ref 保存的是上一次的值
 */
const usePrevious = (value) => {
  const ref = useRef(undefined)

  useEffect(() => {
    ref.current = value
  }) // 故意不传依赖数组，每次渲染后都更新

  return ref.current // 返回的是更新前的值
}

// 使用示例
function Counter() {
  const [count, setCount] = useState(0)
  const prevCount = usePrevious(count)

  return (
    <div>
      <p>当前：{count}，上一次：{prevCount}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </div>
  )
}
```

---

## 四、useLatest —— 始终获取最新值

解决闭包陷阱的通用方案，在 `useEffect` / 定时器 / 事件回调中获取最新 state。

```jsx
import { useRef, useEffect } from 'react'

/**
 * 返回一个 ref，ref.current 始终是最新的值
 * 用于解决 useEffect/定时器/事件回调中的闭包陷阱
 */
const useLatest = (value) => {
  const ref = useRef(value)
  ref.current = value // 每次渲染都同步更新，不需要 useEffect
  return ref
}

// 使用示例：定时器中获取最新 count
function Timer() {
  const [count, setCount] = useState(0)
  const countRef = useLatest(count)

  useEffect(() => {
    const timer = setInterval(() => {
      // ✅ 通过 ref 获取最新值，不受闭包影响
      console.log('当前 count：', countRef.current)
    }, 1000)
    return () => clearInterval(timer)
  }, []) // 依赖数组为空也没问题

  return <button onClick={() => setCount(c => c + 1)}>count: {count}</button>
}
```

---

## 五、useLocalStorage —— 持久化状态

```jsx
import { useState, useCallback } from 'react'

/**
 * 与 localStorage 同步的 useState
 */
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback((value) => {
    try {
      // 支持函数式更新
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(error)
    }
  }, [key, storedValue])

  const removeValue = useCallback(() => {
    setStoredValue(initialValue)
    window.localStorage.removeItem(key)
  }, [key, initialValue])

  return [storedValue, setValue, removeValue]
}

// 使用示例
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage('theme', 'light')

  return (
    <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
      当前主题：{theme}
    </button>
  )
}
```

---

## 六、useEventListener —— 事件监听

```jsx
import { useEffect, useRef } from 'react'

/**
 * 自动管理事件监听的添加和移除
 */
const useEventListener = (eventName, handler, element = window) => {
  const savedHandler = useRef(handler)

  // 每次渲染都更新 ref，保证 handler 始终是最新的
  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    const target = element?.current ?? element
    if (!target?.addEventListener) return

    const listener = (event) => savedHandler.current(event)
    target.addEventListener(eventName, listener)
    return () => target.removeEventListener(eventName, listener)
  }, [eventName, element])
}

// 使用示例
function KeyboardShortcut() {
  useEventListener('keydown', (e) => {
    if (e.key === 'Escape') console.log('按下了 ESC')
  })

  const divRef = useRef(null)
  useEventListener('click', () => console.log('点击了 div'), divRef)

  return <div ref={divRef}>点我</div>
}
```

---

## 七、useInterval / useTimeout —— 定时器

```jsx
import { useEffect, useRef } from 'react'

/**
 * 声明式 setInterval，自动处理清理
 * delay 为 null 时暂停
 */
const useInterval = (callback, delay) => {
  const savedCallback = useRef(callback)
  savedCallback.current = callback

  useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}

/**
 * 声明式 setTimeout，自动处理清理
 */
const useTimeout = (callback, delay) => {
  const savedCallback = useRef(callback)
  savedCallback.current = callback

  useEffect(() => {
    if (delay === null) return
    const id = setTimeout(() => savedCallback.current(), delay)
    return () => clearTimeout(id)
  }, [delay])
}

// 使用示例：可暂停的计时器
function StopwatchDemo() {
  const [count, setCount] = useState(0)
  const [running, setRunning] = useState(false)

  useInterval(() => setCount(c => c + 1), running ? 1000 : null)

  return (
    <div>
      <p>{count}s</p>
      <button onClick={() => setRunning(r => !r)}>
        {running ? '暂停' : '开始'}
      </button>
    </div>
  )
}
```

---

## 八、useFetch —— 数据请求

```jsx
import { useState, useEffect, useRef } from 'react'

/**
 * 封装 fetch 请求，自动处理 loading/error/data 状态
 * 支持竞态条件处理（组件卸载时取消请求）
 */
const useFetch = (url, options) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!url) return

    let cancelled = false // 处理竞态条件
    setLoading(true)
    setError(null)

    fetch(url, options)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (!cancelled) {
          setData(data)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => { cancelled = true } // 组件卸载时标记取消
  }, [url])

  return { data, loading, error }
}

// 使用示例
function UserProfile({ userId }) {
  const { data, loading, error } = useFetch(`/api/users/${userId}`)

  if (loading) return <div>加载中...</div>
  if (error) return <div>错误：{error}</div>
  return <div>{data?.name}</div>
}
```

---

## 九、useIntersectionObserver —— 懒加载 / 无限滚动

```jsx
import { useState, useEffect, useRef } from 'react'

/**
 * 监听元素是否进入视口
 * 适用于：图片懒加载、无限滚动、曝光埋点
 */
const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, options)

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return [ref, isIntersecting]
}

// 使用示例：图片懒加载
function LazyImage({ src, alt }) {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.1 })

  return (
    <div ref={ref} style={{ minHeight: 200 }}>
      {isVisible && <img src={src} alt={alt} />}
    </div>
  )
}

// 使用示例：无限滚动触发点
function InfiniteList() {
  const [items, setItems] = useState([...Array(20).keys()])
  const [bottomRef, isBottomVisible] = useIntersectionObserver()

  useEffect(() => {
    if (isBottomVisible) {
      // 加载更多数据
      setItems(prev => [...prev, ...Array(10).keys()].map((_, i) => prev.length + i))
    }
  }, [isBottomVisible])

  return (
    <div>
      {items.map(i => <div key={i} style={{ height: 50 }}>Item {i}</div>)}
      <div ref={bottomRef}>加载中...</div>
    </div>
  )
}
```

---

## 十、面试常见追问

**Q：自定义 Hook 和普通函数有什么区别？**

自定义 Hook 必须以 `use` 开头，内部可以调用其他 Hook（useState、useEffect 等）。普通函数不能调用 Hook（违反 Hook 规则）。本质上自定义 Hook 是对 Hook 逻辑的封装复用，不是组件，不返回 JSX。

**Q：useDebouncedValue 和 useDebouncedCallback 的区别？**

`useDebouncedValue(value, delay)` 接收一个值，返回防抖后的值，适合输入框场景（input 绑定原始值，请求用防抖值）。`useDebouncedCallback(fn, delay)` 接收一个函数，返回防抖后的函数，适合事件处理函数场景。

**Q：为什么 useInterval 要用 ref 保存 callback？**

如果直接在 `useEffect` 里用 `callback`，需要把它加入依赖数组，每次 callback 变化都会重新创建定时器（清除旧的，创建新的），导致计时不准确。用 ref 保存 callback，`useEffect` 依赖只有 `delay`，定时器稳定，同时 `savedCallback.current` 始终是最新的函数。

**Q：如何处理 useFetch 的竞态条件？**

当 url 快速变化时，可能后发的请求先返回，导致显示旧数据。解决方案：在 `useEffect` 内部用 `cancelled` 标志位，cleanup 函数中设为 `true`，请求回调中判断 `if (!cancelled)` 再更新状态。也可以用 `AbortController` 真正取消请求。
