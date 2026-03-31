# 前端八股文题库

## JavaScript 核心

### 1. 事件循环 (Event Loop)
**题目**：请描述浏览器的事件循环机制，以及宏任务和微任务的执行顺序。
**要点**：调用栈 → 微任务队列 (Promise.then, MutationObserver, queueMicrotask) → 宏任务队列 (setTimeout, setInterval, requestAnimationFrame, I/O) → 每个宏任务执行后清空微任务队列 → 渲染（可选）

### 2. 闭包
**题目**：什么是闭包？请举例说明闭包的实际应用场景和可能的内存问题。
**要点**：函数 + 其词法环境的引用 → 数据私有化 / 函数工厂 / 柯里化 → 内存泄漏风险（未释放的引用）

### 3. 原型链
**题目**：解释 JavaScript 的原型链机制。`__proto__` 和 `prototype` 的区别？
**要点**：每个对象有 `[[Prototype]]` → `__proto__` 是访问器 → `prototype` 是函数的属性 → 查找顺序：自身 → `__proto__` → `__proto__.__proto__` → null

### 4. this 指向
**题目**：JavaScript 中 this 的指向规则有哪些？箭头函数的 this 有什么不同？
**要点**：默认绑定 / 隐式绑定 / 显式绑定 (call/apply/bind) / new 绑定 → 优先级 → 箭头函数继承外层 this（定义时确定）

### 5. Promise
**题目**：Promise 的三种状态是什么？如何实现 Promise 的并发控制？
**要点**：pending / fulfilled / rejected → 不可逆 → Promise.all / allSettled / race / any → 手写并发控制（队列 + 计数器）

### 6. 变量提升 & 暂时性死区
**题目**：var / let / const 的区别？什么是暂时性死区 (TDZ)？
**要点**：var 函数作用域 + 提升为 undefined → let/const 块作用域 + TDZ（声明前不可访问，ReferenceError）→ const 不可重新赋值（但对象属性可变）

### 7. 类型转换
**题目**：`[] == ![]` 的结果是什么？请解释过程。
**要点**：![] → false → 0 → [] → '' → 0 → 0 == 0 → true → 隐式转换规则 (ToPrimitive, valueOf, toString)

### 8. 垃圾回收
**题目**：V8 的垃圾回收机制是怎样的？
**要点**：新生代 (Scavenge/半空间复制) + 老生代 (Mark-Sweep + Mark-Compact) → 增量标记 → 并发标记

### 9. 模块化
**题目**：CommonJS 和 ES Module 的区别？
**要点**：CJS 运行时加载 / 值拷贝 / 同步 → ESM 编译时静态分析 / 值引用 / 异步 → Tree Shaking 只有 ESM 支持

### 10. 异步编程演进
**题目**：从回调到 async/await，JavaScript 异步编程经历了哪些演进？
**要点**：callback → callback hell → Promise 链 → Generator + co → async/await → 顶层 await

## CSS

### 11. BFC
**题目**：什么是 BFC？如何触发 BFC？BFC 有什么作用？
**要点**：块级格式化上下文 → 触发：overflow 非 visible / display: flow-root / float / position absolute/fixed → 作用：清除浮动 / 阻止 margin 合并 / 阻止被浮动元素覆盖

### 12. Flex 布局
**题目**：请解释 Flex 布局的核心概念和常用属性。
**要点**：主轴/交叉轴 → justify-content / align-items / flex-direction → flex: grow shrink basis → align-self → flex-wrap

### 13. CSS 选择器优先级
**题目**：CSS 选择器的优先级如何计算？
**要点**：!important > 内联 > ID (1,0,0) > 类/伪类/属性 (0,1,0) > 元素/伪元素 (0,0,1) → 同优先级后者覆盖

### 14. 层叠上下文
**题目**：什么是层叠上下文？z-index 什么情况下不生效？
**要点**：root / z-index 非 auto 的定位元素 / opacity < 1 / transform 非 none → 同层比较 → 父层叠上下文决定子元素最终层级

### 15. CSS 动画性能
**题目**：为什么推荐用 transform 做动画而不是 left/top？
**要点**：transform/opacity 只触发 Composite → left/top 触发 Layout + Paint + Composite → GPU 加速 → will-change 提示

## 浏览器 & 网络

### 16. 输入 URL 到页面显示
**题目**：从输入 URL 到页面显示，中间发生了什么？
**要点**：DNS → TCP 三次握手 → (TLS) → HTTP 请求 → 响应 → HTML 解析 → DOM + CSSOM → Render Tree → Layout → Paint → Composite

### 17. 跨域
**题目**：什么是同源策略？跨域解决方案有哪些？
**要点**：协议+域名+端口相同 → CORS (简单请求/预检请求) → JSONP → 代理 → postMessage → WebSocket

### 18. HTTP 缓存
**题目**：强缓存和协商缓存的区别？
**要点**：强缓存：Cache-Control (max-age) / Expires → 200 (from cache) → 协商缓存：Last-Modified/If-Modified-Since + ETag/If-None-Match → 304

### 19. HTTPS
**题目**：HTTPS 的加密过程是怎样的？
**要点**：TLS 握手 → 非对称加密交换密钥 → 对称加密传输数据 → CA 证书验证 → 前向保密 (PFS)

### 20. WebSocket
**题目**：WebSocket 与 HTTP 的区别？
**要点**：全双工 / 持久连接 / 二进制帧 → HTTP 升级握手 (101) → 心跳保活 (ping/pong) → 适用场景：实时通信/推送

## React

### 21. Virtual DOM
**题目**：React 的 Virtual DOM 是什么？Diff 算法是怎样的？
**要点**：JS 对象描述 UI 树 → 批量更新减少 DOM 操作 → Diff：同层比较 / 类型不同直接替换 / key 优化列表 → O(n) 复杂度

### 22. Fiber 架构
**题目**：React Fiber 解决了什么问题？
**要点**：解决同步渲染阻塞 → 可中断的协作式调度 → 优先级调度 (lanes) → requestIdleCallback 思想 → 双缓冲 (current + workInProgress)

### 23. Hooks 原理
**题目**：useState 的原理是什么？为什么不能在条件语句中使用 Hooks？
**要点**：链表顺序 → 每次渲染按序调用 → 条件语句导致顺序不一致 → 闭包陷阱 → useRef 解决

### 24. React 性能优化
**题目**：React 有哪些性能优化手段？
**要点**：React.memo / useMemo / useCallback → 列表 key → 懒加载 (Suspense + lazy) → 虚拟滚动 → 避免内联对象/函数 → 状态下沉

### 25. 状态管理
**题目**：React 常用状态管理方案有哪些？各自适用场景？
**要点**：useState/useReducer (组件级) → Context (跨层级但频繁更新有性能问题) → Redux (全局/中大型) → Zustand/Jotai (轻量) → React Query/SWR (服务端状态)

## Vue

### 26. 响应式原理
**题目**：Vue 2 和 Vue 3 的响应式实现有什么区别？
**要点**：Vue2: Object.defineProperty (getter/setter) → 无法检测新增/删除属性 → 数组需特殊处理 → Vue3: Proxy → 全面拦截 → 更好的性能和 API

### 27. Vue Diff 算法
**题目**：Vue 的 Diff 算法和 React 有什么区别？
**要点**：Vue3 双端 + 最长递增子序列 → React 单向扫描 + key map → Vue 编译时优化 (PatchFlag / 静态提升 / Block Tree)

## 工程化

### 28. Webpack 构建流程
**题目**：Webpack 的构建流程是怎样的？
**要点**：初始化参数 → 创建 Compiler → 确定入口 → 编译模块 (Loader 转换) → 完成编译 → 输出资源 → 写入文件 → 插件在各阶段通过 hooks 介入

### 29. Tree Shaking
**题目**：Tree Shaking 的原理是什么？为什么需要 ESM？
**要点**：静态分析 → 标记未使用导出 → Terser 删除死代码 → CJS 动态导入无法静态分析 → sideEffects 标记

### 30. Vite vs Webpack
**题目**：Vite 为什么比 Webpack 快？
**要点**：开发阶段不打包 / 原生 ESM / esbuild 预构建依赖 → HMR 只更新变化模块 → 生产用 Rollup → Webpack 全量打包
