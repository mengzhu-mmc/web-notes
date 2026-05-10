# ahooks 源码级学习指南：精选 30 个高频 Hook 封装原理解析

> 学习 ahooks 的源码，本质上是在学习如何**对抗 React 闭包陷阱**、**如何优雅地管理生命周期**以及**如何提取可复用的 DOM/BOM 操作逻辑**。ahooks 的底层哲学是：**重度依赖 `useRef` 来保持数据的最新状态且不触发重复渲染**。

---

## 一、核心网络与架构体系

### 1. `useRequest`

- **作用：** 管理异步数据请求的终极 Hook。
- **使用场景：** 所有的 API 请求（轮询、防抖、错误重试、SWR 缓存、分页、加载更多等）。
- **实现原理：** 采用**洋葱模型/插件化架构**。底层维护了一个 `Fetch` 实例来管理 `loading`、`data`、`error` 等核心状态，并将防抖、缓存、轮询等功能拆分为独立的插件（Plugins）。在各个生命周期（onBefore, onRequest, onSuccess）依次执行插件逻辑。
- **拓展：** React 19 虽然推出了 `use()` 和 Server Actions，但对于客户端复杂的请求调度（如竞态处理、自动重试），`useRequest` 依然是目前的工程化标配。

---

## 二、对抗闭包陷阱与性能优化

### 2. `useMemoizedFn`

- **作用：** 持久化 function 的引用，并且保证内部一定能拿到最新的 state/props。
- **使用场景：** 传递给子组件的事件回调函数，避免子组件因为函数引用变化而引发无效的重新渲染（配合 `React.memo`）。
- **实现原理：** 利用两个 `useRef`。一个 `fnRef` 永远在每次 render 时更新为最新的函数（解决闭包陷阱），另一个 `memoizedFnRef` 保存一个不变的包装函数，在包装函数内部通过 `fnRef.current.apply(this, args)` 调用。
- **拓展：** 它是替代 `useCallback` 的杀手锏，官方 React 团队曾经也提议过类似的 `useEvent`（现已搁置），目前 `useMemoizedFn` 是业界标准解法。

### 3. `useLatest`

- **作用：** 永远返回 state 或 props 的最新值。
- **使用场景：** 在 `setTimeout`、`setInterval`、事件监听器等存在闭包陷阱的异步回调中获取最新状态。
- **实现原理：** `const ref = useRef(value); ref.current = value; return ref;`。
- **拓展：** 非常基础但极度高频。ahooks 内部几乎一半以上的 hook 都依赖了它来处理外部传入的依赖。

### 4. `useCreation`

- **作用：** 替代 `useMemo` 或 `useRef` 的强化版，确保实例真正只被创建一次。
- **使用场景：** 创建复杂的实例（如 new 出来的第三方库对象 `new Subject()`），因为 React 官方明确表示 `useMemo` 可能会在内存不足时“遗忘”并重新计算，不能作为语义上的保证。
- **实现原理：** 内部使用 `useRef` 保存对象。对比依赖数组（类似 `useMemo`），如果依赖改变，重新执行工厂函数更新 `ref.current`。

### 5. `useDebounce` / 6. `useDebounceFn`

- **作用：** 值防抖 / 函数防抖。
- **使用场景：** 输入框搜索输入联动（值防抖）、按钮频繁点击防护（函数防抖）。
- **实现原理：** 底层引入了 `lodash/debounce`。`useDebounceFn` 利用 `useMemo` 创建 debounced 函数，并在 `useUnmount` 时调用 `cancel()` 取消未执行的调用；`useDebounce` 则是监听值的变化，调用防抖后的 setter。
- **拓展：** React 18 引入的 `useDeferredValue` 也是一种防抖机制，但它是基于并发调度的“宏观防抖”，而 `useDebounce` 则是严格基于时间轴的。

### 7. `useThrottle` / 8. `useThrottleFn`

- **作用：** 值节流 / 函数节流。
- **使用场景：** 窗口 resize、滚动事件 (scroll)、鼠标移动跟随等高频触发场景。
- **实现原理：** 底层依赖 `lodash/throttle`，生命周期管理与 `useDebounceFn` 相同，必须在组件卸载时 `cancel` 以防内存泄漏。

---

## 三、生命周期与 Effect 管理

### 9. `useMount`

- **作用：** 组件挂载时只执行一次。
- **使用场景：** 初始化拉取数据、绑定某些不可在 React 体系内绑定的原生事件。
- **实现原理：** `useEffect(fn, [])`。
- **拓展：** 在 React 18 Strict Mode 开发环境下会执行两次。但这只在开发环境发生，生产环境仍是一次。

### 10. `useUnmount`

- **作用：** 组件卸载时执行。
- **使用场景：** 清除定时器、销毁第三方实例（echarts、地图等）。
- **实现原理：** `useEffect(() => () => fn(), [])`。
- **拓展：** 内部会配合 `useLatest` 来包裹 `fn`，确保卸载时执行的函数内部能访问到闭包最新的 state。

### 11. `useUpdateEffect`

- **作用：** 忽略首次渲染，只在依赖更新时执行的 `useEffect`。
- **使用场景：** 类似于 Vue 的 watch。某些逻辑不需要在组件刚挂载时触发，只有后续用户操作改变了依赖时才触发。
- **实现原理：** 内部维护一个 `isMounted` 的 `useRef`。初始为 `false`，首次执行时设为 `true` 并 `return`；第二次起才真正执行传入的 effect 函数。

### 12. `useDeepCompareEffect`

- **作用：** 用法与 `useEffect` 一致，但依赖数组采用深度比较（Deep Compare）。
- **使用场景：** 当依赖项是对象或数组，且每次都会生成新引用（例如直接传字面量对象），导致普通 `useEffect` 无限循环时使用。
- **实现原理：** 通过 `useRef` 保存上一次的依赖。在重新渲染时，使用 `lodash/isEqual` 深度对比新旧依赖，如果不一致，再触发一个内部递增的 `signal` 引用作为真正 `useEffect` 的依赖。

### 13. `useUpdate`

- **作用：** 返回一个函数，调用该函数会强制组件重新渲染。
- **使用场景：** 内部状态变更无法被 React 捕获时（如直接修改了某个 `useRef` 的内部属性并希望更新 UI）。
- **实现原理：** `const [, setState] = useState({}); return () => setState({})`。（利用新对象的内存地址变更触发 render）。

### 14. `useUnmountedRef`

- **作用：** 获取当前组件是否已经卸载。
- **使用场景：** 在异步请求 resolve 时，如果组件已卸载，继续 `setState` 会报内存泄漏警告。
- **实现原理：** `const unmountedRef = useRef(false); useUnmount(() => { unmountedRef.current = true; }); return unmountedRef;`。

---

## 四、状态管理增强

### 15. `useSetState`

- **作用：** 管理对象类型的状态，用法类似 Class 组件的 `this.setState`，支持对象合并。
- **使用场景：** 复杂表单数据或拥有多个属性的对象，不想写多行 `setObj(prev => ({...prev, a: 1}))`。
- **实现原理：** 对 `useState` 的一层包装，传入的参数如果是函数则调用获取新对象，然后利用 `Object.assign` 与旧状态合并。

### 16. `useBoolean` / 17. `useToggle`

- **作用：** 优雅地管理布尔值或两个状态之间的切换。
- **使用场景：** 弹窗的显隐 (`visible`/`setVisible`)、展开收起。
- **实现原理：** `useToggle` 内部 `useState` 两个可选值，暴露 `toggle/setLeft/setRight` 等动作。`useBoolean` 则是基于 `useToggle` 封装的特定布尔值版本，暴露 `setTrue/setFalse`。

### 17. `usePrevious`

- **作用：** 保存状态的上一次的值。
- **使用场景：** 比较新旧值决定是否要做某项过渡动画，或者判断具体是从哪个旧状态转移到当前状态的。
- **实现原理：** 维护两个 `ref`（`prevRef` 和 `curRef`）。如果传入值与 `curRef.current` 不等，就将 `curRef` 的值赋给 `prevRef`，然后更新 `curRef`。返回 `prevRef.current`。

### 18. `useGetState`

- **作用：** 给 `useState` 增加了一个 `getter` 方法。
- **使用场景：** 在复杂的异步回调、定时器内快速读取最新的 state 而不用依赖 `useLatest`。
- **实现原理：** 内部通过 `useState` 创建状态，同时用一个 `useRef` 同步该状态，最后返回 `[state, setState, getState]`。

### 19. `useMap` / 20. `useSet`

- **作用：** 将 ES6 的 `Map` 和 `Set` 数据结构引入 React 状态。
- **使用场景：** 管理大量需要去重的数据（Set）或复杂键值对映射且需要触发视图更新时。
- **实现原理：** 内部不是真的把 Map/Set 放到 state 里，而是只在 ref 里维护真实实例。每次通过暴露出的 `set/delete/clear` 方法操作真实实例后，调用内部的 `useUpdate` 强制刷新组件。

---

## 五、DOM、BOM 与事件机制

### 21. `useEventListener`

- **作用：** 极其优雅的事件监听绑定。
- **使用场景：** 监听 window 窗口大小变化、document 点击、按键等。
- **实现原理：** 在 `useEffect` 内部调用 `target.addEventListener`。关键点在于它支持传入 `ref` 作为 target，能在 `ref.current` 挂载成功后自动绑定，并在组件卸载时自动 `removeEventListener`。

### 22. `useClickAway`

- **作用：** 监听点击元素外部的事件。
- **使用场景：** 下拉菜单、抽屉、自定义 Modal 展开后，点击屏幕空白处自动关闭。
- **实现原理：** `useEventListener` 监听 `document` 的 `click/mousedown`。在回调中利用 `targetElement.contains(event.target)` 来判断点击源是否在目标元素内部。如果不在内部，则触发外界传入的回调。

### 23. `useHover`

- **作用：** 监听 DOM 元素是否被鼠标悬停。
- **使用场景：** Hover 弹出浮层、卡片 Hover 阴影效果等。
- **实现原理：** 基于 `useEventListener` 监听目标 DOM 的 `mouseenter` (设为 true) 和 `mouseleave` (设为 false) 事件。

### 24. `useInViewport`

- **作用：** 观察元素是否在可见视口中。
- **使用场景：** 突破传统滚动的图片懒加载、无限滚动底部监听、曝光埋点上报。
- **实现原理：** 底层封装了原生的 `IntersectionObserver` API，监听 `isIntersecting` 和 `intersectionRatio`，性能完爆传统的监听 scroll 高度计算法。

### 25. `useSize`

- **作用：** 监听 DOM 元素或 window 尺寸变化。
- **使用场景：** 响应式图表重绘（Echarts）、根据容器宽度自适应布局。
- **实现原理：** 封装浏览器原生的 `ResizeObserver` API。它能够精确捕捉某个具体 DOM 容器的尺寸变化，而不是仅仅监听 window。

### 26. `useScroll`

- **作用：** 监听元素的滚动位置 `(left, top)`。
- **使用场景：** 滚动吸顶（Sticky）、阅读进度条、页面回到顶部按钮。
- **实现原理：** `useEventListener` 监听 `scroll` 事件，读取并设定 `scrollTop/scrollLeft` 到内部 state。

### 27. `useKeyPress`

- **作用：** 优雅地监听键盘按键。
- **使用场景：** 回车提交表单（Enter）、Esc 关闭弹窗、快捷键组合（Ctrl.C / Shift.Enter）。
- **实现原理：** 对 `keydown/keyup` 的深度封装，支持配置按键别名（如 `enter`, `space`, `uparrow`），并在内部比对 `event.key` 和 `event.keyCode`，同时支持处理修饰键（`ctrlKey`, `metaKey`）。

### 28. `useLocalStorageState` / 29. `useSessionStorageState`

- **作用：** 将状态同步存储到 `localStorage` 或 `sessionStorage`。
- **使用场景：** 记住用户主题偏好、保存表单草稿避免刷新丢失、简易的持久化登录状态。
- **实现原理：** 在 `useState` 初始化时通过 `localStorage.getItem` 取值（考虑 SSR 环境判空）。当更新 state 时，不仅调用 `setState`，同时执行 `localStorage.setItem`。内部还会监听同源窗口的 `storage` 事件，实现多标签页的状态同步。

---

## 六、进阶通信机制

### 30. `useEventEmitter`

- **作用：** 组件间极简的事件总线（发布/订阅）。
- **使用场景：** 无关的兄弟组件通信、不想引入 Redux 等全局状态库但又要跨级调用事件时。
- **实现原理：** 利用 `useRef` 保存一个内置的 `EventEmitter` 实例池。该实例暴露 `useSubscription(callback)` 供订阅方使用（卸载时自动解除订阅），并暴露 `emit(val)` 供发布方使用。

---

## 总结：从 ahooks 中学到的封装心法

1. **所有的 DOM 监听，最终都需归宿于 `useEffect` 的 return 卸载函数。**
2. **所有接收外部传递进来的 Function，为了防止死循环，第一时间用 `useRef` (即 `useLatest`) 缓存起来。**
3. **对于复合类型的状态管理，不需要强行追求 Redux，`useSetState` 加上 React 自己的 `Context` 已经能解决 80% 的业务场景。**
4. **性能优化不一定要写满 `useMemo/useCallback`，善用 `useMemoizedFn` 可以彻底告别依赖数组的烦恼。**
