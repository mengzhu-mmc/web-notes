# ahooks 源码级学习指南 (下)：DOM 与事件进阶机制

## 五、DOM、BOM 与事件机制

### 14. `useEventListener`

- **作用：** 优雅绑定事件，自动解绑。
- **核心源码实现：**

```tsx
function useEventListener(
  eventName: string,
  handler: Function,
  options: Options = {},
) {
  // 防闭包
  const handlerRef = useLatest(handler);

  useEffect(() => {
    // 兼容取值逻辑，支持传入 DOM ref 或 document/window
    const targetElement = getTargetElement(options.target, window);
    if (!targetElement?.addEventListener) return;

    // 真正绑定的事件代理
    const eventListener = (event: Event) => {
      return handlerRef.current(event);
    };

    targetElement.addEventListener(eventName, eventListener, {
      capture: options.capture,
      once: options.once,
      passive: options.passive,
    });

    // 卸载时自动清理
    return () => {
      targetElement.removeEventListener(eventName, eventListener, {
        capture: options.capture,
      });
    };
  }, [
    eventName,
    options.target,
    options.capture,
    options.once,
    options.passive,
  ]);
}
```

### 15. `useClickAway`

- **作用：** 监听点击元素外部（下拉菜单、Modal 点击空白关闭）。
- **核心源码实现：**

```tsx
function useClickAway(
  onClickAway: (event: Event) => void,
  target: Target | Target[],
) {
  const onClickAwayRef = useLatest(onClickAway);

  useEffect(() => {
    const handler = (event: any) => {
      const targets = Array.isArray(target) ? target : [target];

      // 判断点击源 event.target 是否在受保护的 targets 内部
      const isInner = targets.some((targetItem) => {
        const targetElement = getTargetElement(targetItem);
        // 原生 DOM API: contains
        return !targetElement || targetElement.contains(event.target);
      });

      // 如果不在内部，触发外部回调
      if (!isInner) {
        onClickAwayRef.current(event);
      }
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [target]);
}
```

### 16. `useInViewport`

- **作用：** 观察元素是否在可见视口中（懒加载、曝光埋点）。
- **核心源码思想：**

```tsx
function useInViewport(target: Target) {
  const [state, setState] = useState<boolean>();
  const [ratio, setRatio] = useState<number>();

  useEffect(() => {
    const el = getTargetElement(target);
    if (!el) return;

    // 使用现代浏览器原生的 IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // isIntersecting: 是否进入视口
          setState(entry.isIntersecting);
          // intersectionRatio: 露出比例 (0 - 1)
          setRatio(entry.intersectionRatio);
        }
      },
      { rootMargin: "0px", threshold: [0, 1] },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [target]);

  return [state, ratio] as const;
}
```

### 17. `useLocalStorageState`

- **作用：** 状态同步到 `localStorage`。
- **核心源码实现：**

```tsx
function useLocalStorageState<T>(key: string, options: Options<T>) {
  const [state, setState] = useState(() => {
    // 1. 初始化时尝试从 localStorage 读
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
    return typeof options.defaultValue === "function"
      ? (options.defaultValue as Function)()
      : options.defaultValue;
  });

  const updateState = useCallback(
    (value?: T | ((prevState: T) => T)) => {
      const currentState =
        typeof value === "function" ? (value as Function)(state) : value;

      // 2. setState 同时写入 localStorage
      setState(currentState);

      if (typeof currentState === "undefined") {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(currentState));
      }
    },
    [key, state],
  );

  return [state, updateState];
}
```

---

## 六、进阶通信机制

### 18. `useEventEmitter`

- **作用：** 无强关联组件间的事件总线（发布/订阅）。
- **核心源码实现：**

```tsx
class EventEmitter<T> {
  private subscriptions = new Set<Subscription<T>>();

  // 发布
  emit = (val: T) => {
    for (const subscription of this.subscriptions) {
      subscription(val);
    }
  };

  // 订阅 hook
  useSubscription = (callback: Subscription<T>) => {
    const callbackRef = useRef<Subscription<T>>();
    callbackRef.current = callback;

    useEffect(() => {
      function subscription(val: T) {
        if (callbackRef.current) {
          callbackRef.current(val);
        }
      }
      this.subscriptions.add(subscription);

      // 卸载组件时自动清除订阅
      return () => {
        this.subscriptions.delete(subscription);
      };
    }, []);
  };
}

// 通过 useRef 维持一个单例
function useEventEmitter<T>() {
  const ref = useRef<EventEmitter<T>>();
  if (!ref.current) {
    ref.current = new EventEmitter();
  }
  return ref.current;
}
```

## 总结心法

1. **闭包与死循环对抗**：只要是从外部传进来的 Function，立刻用 `useLatest`（`useRef`）缓存起来。
2. **重渲染拦截**：暴露出去的方法，尽量使用 `useMemoizedFn` 包装，防止引发子组件滥杀型渲染。
3. **原生监听的归宿**：所有的 `addEventListener`、`Observer`，最终必定在 `useEffect` 的 `return () => {}` 卸载钩子中销毁。
