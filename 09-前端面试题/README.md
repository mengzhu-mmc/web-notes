# 09-前端面试题

> 前端面试八股文题库，面向 2-3 年经验前端开发，涵盖核心知识点，深度适中。
> 
> 更新时间：2026-03-20

---

## 📚 题库索引

| 文件 | 题目数 | 涵盖考点 |
|---|---|---|
| [面试题-JavaScript.md](./面试题-JavaScript.md) | ~40 题 | 数据类型、原型链、闭包、this、异步、ES6+、内存管理、手写题 |
| [面试题-React.md](./面试题-React.md) | ~30 题 | 虚拟DOM、Fiber、Hooks、状态管理、性能优化、React 18 |
| [面试题-工程化.md](./面试题-工程化.md) | ~25 题 | Webpack、Vite、Babel、模块化、CI/CD、微前端、Monorepo |
| [面试题-网络.md](./面试题-网络.md) | ~30 题 | HTTP 版本、TLS、TCP、缓存、跨域、XSS/CSRF、DNS、WebSocket |
| [面试题-性能优化.md](./面试题-性能优化.md) | ~25 题 | 首屏优化、SSR/SSG、回流重绘、虚拟列表、Core Web Vitals、Lighthouse |
| [面试题-场景设计.md](./面试题-场景设计.md) | 20 题 | 虚拟列表、大文件上传、Promise、LRU、埋点SDK、错误监控、权限系统等 |

---

## 🗂️ 各文件知识点速览

### JavaScript 核心
- **数据类型**：类型判断（typeof/instanceof/toString）、隐式转换、`==` vs `===`
- **原型链**：`__proto__`、`prototype`、继承方式对比（5种）、手写 `new`
- **作用域与闭包**：闭包原理与应用、var/let/const、TDZ、变量提升
- **this**：四种绑定规则、call/apply/bind 手写
- **异步**：事件循环、微任务/宏任务、Promise 手写（all/race/allSettled）、async/await
- **ES6+**：Map/Set、Proxy/Reflect（Vue3 响应式基础）、Symbol、迭代器
- **内存管理**：标记清除、内存泄漏场景（定时器/闭包/DOM引用）
- **手写题**：防抖、节流、深拷贝、柯里化、instanceof、reduce

### React
- **核心原理**：虚拟DOM、O(n) Diff算法（三条假设）、Fiber 架构（双缓存、两阶段）
- **Hooks**：useState 批处理、useEffect 闭包陷阱、useCallback/useMemo 使用时机、useRef 三大用途
- **状态管理**：Redux 三原则、RTK 写法、Zustand 对比、Context 性能问题
- **性能优化**：React.memo + useCallback 链路、lazy/Suspense 代码分割
- **React 18**：并发模式、useTransition、自动批处理（flushSync 退出）
- **常见问题**：key 的作用（避免用 index）、受控/非受控组件、ErrorBoundary

### 工程化
- **Webpack**：构建流程（5步）、Loader vs Plugin、Tree Shaking 原理与局限、Code Splitting、HMR
- **Vite**：为什么快（不打包+esbuild）、依赖预构建、生产用 Rollup
- **Babel**：Parse→Transform→Generate、preset-env vs polyfill
- **模块化**：CJS（值拷贝/运行时）vs ESM（值引用/编译时）、循环依赖
- **架构**：Monorepo（pnpm workspaces）、微前端（qiankun/Module Federation）、CI/CD

### 网络
- **HTTP 版本**：1.1 队头阻塞 → 2.0 多路复用 → 3.0 QUIC（彻底解决）
- **HTTPS/TLS**：TLS 1.2 四次握手、会话密钥生成、TLS 1.3 改进（1-RTT）
- **TCP**：三次握手（为什么三次）、四次挥手（TIME_WAIT）、拥塞控制四阶段
- **缓存**：强缓存（Cache-Control/Expires）→ 协商缓存（ETag/Last-Modified）最佳实践
- **跨域**：CORS 简单请求/预检请求、SameSite Cookie、Nginx 反向代理
- **安全**：XSS（存储型/反射型/DOM型）+ 防御、CSRF 攻击流程 + CSRF Token/SameSite 防御、CSP

### 性能优化
- **加载**：代码分割+懒加载、preload/prefetch/preconnect、script defer vs async
- **渲染**：回流重绘（如何减少：批量操作/transform/will-change）、虚拟列表原理+实现、RAF
- **资源**：图片格式选择（WebP/AVIF）、picture 元素降级、IntersectionObserver 懒加载
- **指标**：FCP/LCP/CLS/INP 含义和优化方向、Performance API + web-vitals 库
- **工具**：Lighthouse 5个维度、DevTools Performance 火焰图分析

### 场景设计（20道）
| 题目 | 核心技术点 |
|---|---|
| 虚拟列表 | 可视区域渲染 + 滚动偏移计算 |
| 大文件上传 | 分片 + MD5 hash + 断点续传 + 并发控制 |
| 简易 Promise | 状态机 + queueMicrotask + 链式调用 |
| 事件总线 | Map 存储监听器 + once 包装 |
| LRU 缓存 | Map 有序特性 + O(1) get/put |
| 并发请求控制 | Promise.race 控制并发池 |
| JSON.stringify | 递归 + 类型处理 + 循环引用 |
| compose/pipe | reduceRight/reduce 函数组合 |
| useState 原理 | Hook 数组 + 索引 + 闭包 |
| useEffect 原理 | deps 比较 + 清理函数 |
| 埋点 SDK | sendBeacon + 批量队列 + 自动追踪 |
| call/apply/bind | Symbol 挂载 + new.target 处理 |
| URL 参数解析 | URLSearchParams + 同名参数处理 |
| 模板字符串解析 | 正则 + new Function |
| Vue 响应式 | Proxy + track/trigger + watchEffect |
| 前端错误监控 | 错误采集 + 采样 + 面包屑 + sendBeacon |
| 权限控制 | 路由守卫 + 动态路由 + 按钮级权限 |
| 数组扁平化 | 递归/迭代/reduce 多种实现 |
| Toast 组件 | createRoot 命令式调用 + 队列管理 |
| 图片懒加载 | IntersectionObserver + 预加载 |

---

## 📖 相关目录

- [02-JavaScript/](../02-JavaScript/) - JS 基础知识笔记
- [05-React/](../05-React/) - React 深度笔记
- [10-工程化/](../10-工程化/) - 工程化专题
- [13-面试手写/](../13-面试手写/) - 更多手写题

---

> 💡 **刷题建议**：先过一遍所有题目了解考点，再针对薄弱点深入学习，最后做到能不看答案独立写出关键代码。
