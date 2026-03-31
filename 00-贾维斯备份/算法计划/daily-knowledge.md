# 📚 21 天前端知识点（配合算法冲刺）

> 每天一个知识点，5-10 分钟快速过，重点是"能讲清楚"

---

## Week 1：JS 核心 + 浏览器

### Day 1 — 事件循环 Event Loop
- **一句话**：JS 单线程，通过事件循环处理异步，微任务优先于宏任务
- **关键词**：调用栈、任务队列、微任务（Promise.then）、宏任务（setTimeout）
- **面试问法**：说说事件循环？Promise 和 setTimeout 谁先执行？
- **代码题**：`console.log` 输出顺序题

### Day 2 — 闭包 Closure
- **一句话**：函数能访问定义时的作用域，即使在外部执行
- **关键词**：词法作用域、垃圾回收、内存泄漏
- **面试问法**：什么是闭包？有什么用？会导致什么问题？
- **经典场景**：循环绑定事件、防抖节流、模块化

### Day 3 — 原型链 Prototype
- **一句话**：对象通过 `__proto__` 链接到原型，形成查找链
- **关键词**：prototype、`__proto__`、constructor、Object.create
- **面试问法**：说说原型链？instanceof 原理？如何实现继承？
- **画图**：能画出 `Function`、`Object`、实例之间的关系

### Day 4 — this 指向
- **一句话**：this 取决于调用方式，不是定义位置
- **四种绑定**：默认（window）、隐式（obj.fn）、显式（call/apply/bind）、new
- **箭头函数**：没有自己的 this，继承外层
- **面试问法**：说说 this 指向规则？箭头函数的 this？

### Day 5 — 浏览器渲染流程
- **一句话**：HTML→DOM，CSS→CSSOM，合并→渲染树→布局→绘制→合成
- **关键词**：重排 Reflow、重绘 Repaint、合成层 Composite
- **面试问法**：输入 URL 到页面显示发生了什么？如何减少重排？
- **优化点**：will-change、transform、requestAnimationFrame

### Day 6 — 跨域 & 同源策略
- **一句话**：浏览器限制不同源的请求，保护用户安全
- **同源**：协议 + 域名 + 端口 都相同
- **解决方案**：CORS、JSONP、代理、postMessage
- **面试问法**：什么是跨域？怎么解决？CORS 怎么配置？

### Day 7 — HTTP 缓存
- **一句话**：通过响应头控制资源缓存，减少请求
- **强缓存**：Cache-Control、Expires（不发请求）
- **协商缓存**：ETag/If-None-Match、Last-Modified（发请求验证）
- **面试问法**：强缓存和协商缓存区别？如何实现缓存更新？

---

## Week 2：框架 + 工程化

### Day 8 — React Fiber
- **一句话**：把渲染拆成可中断的小任务，支持优先级调度
- **为什么**：老架构递归不可中断，长任务阻塞交互
- **关键词**：时间切片、链表结构、requestIdleCallback、优先级
- **面试问法**：Fiber 是什么？解决什么问题？

### Day 9 — React Hooks 原理
- **一句话**：Hooks 通过链表按顺序存储在 Fiber 节点上
- **为什么不能条件调用**：顺序必须一致，否则链表错位
- **关键词**：useState 链表、useEffect 副作用队列、闭包陷阱
- **面试问法**：Hooks 原理？为什么不能在条件语句里用？

### Day 10 — 虚拟 DOM & Diff 算法
- **一句话**：用 JS 对象描述 DOM，通过 Diff 找出最小变更
- **React Diff 策略**：同层比较、key 优化、类型不同直接替换
- **Vue Diff**：双端对比
- **面试问法**：虚拟 DOM 优势？Diff 算法怎么做的？key 的作用？

### Day 11 — Webpack 核心概念
- **一句话**：把模块打包成浏览器能运行的静态资源
- **核心**：Entry、Output、Loader（转换）、Plugin（扩展）
- **常用 Loader**：babel-loader、css-loader、file-loader
- **面试问法**：Webpack 构建流程？Loader 和 Plugin 区别？

### Day 12 — Webpack 优化
- **构建速度**：cache、多线程（thread-loader）、缩小范围
- **产物体积**：Tree Shaking、代码分割、压缩
- **关键词**：splitChunks、懒加载、CDN
- **面试问法**：项目里做过哪些 Webpack 优化？

### Day 13 — Vite 为什么快
- **一句话**：开发时用 ESM 原生 import，不打包；生产用 Rollup
- **对比 Webpack**：Webpack 启动要打包所有模块，Vite 按需加载
- **关键词**：ESM、预构建（esbuild）、HMR
- **面试问法**：Vite 原理？和 Webpack 区别？

### Day 14 — 模块化演进
- **历史**：全局变量 → IIFE → CommonJS → AMD → ESM
- **CommonJS vs ESM**：运行时 vs 静态分析，值拷贝 vs 引用
- **面试问法**：说说模块化发展？CJS 和 ESM 区别？

---

## Week 3：网络 + Node + 综合

### Day 15 — HTTP/1.1 vs HTTP/2 vs HTTP/3
- **HTTP/1.1 问题**：队头阻塞、连接数限制
- **HTTP/2**：多路复用、头部压缩、服务器推送
- **HTTP/3**：基于 QUIC（UDP），解决 TCP 队头阻塞
- **面试问法**：HTTP/2 有什么改进？

### Day 16 — HTTPS 原理
- **一句话**：HTTP + TLS 加密，防窃听、防篡改、防冒充
- **流程**：证书验证 → 密钥协商（非对称）→ 数据传输（对称）
- **关键词**：CA 证书、公钥私钥、对称加密、握手
- **面试问法**：HTTPS 怎么保证安全？握手过程？

### Day 17 — TCP 三次握手 & 四次挥手
- **三次握手**：SYN → SYN+ACK → ACK（确保双方收发能力）
- **四次挥手**：FIN → ACK → FIN → ACK（等数据发完）
- **为什么三次/四次**：握手要确认双向；挥手要等数据传完
- **面试问法**：为什么是三次握手？四次挥手？

### Day 18 — Node.js 事件驱动
- **一句话**：单线程 + 事件循环 + 非阻塞 I/O
- **和浏览器区别**：多了 setImmediate、process.nextTick
- **适合场景**：I/O 密集型，不适合 CPU 密集型
- **面试问法**：Node 事件循环和浏览器有什么不同？

### Day 19 — 前端性能优化
- **加载优化**：压缩、CDN、懒加载、预加载、缓存
- **渲染优化**：减少重排、虚拟列表、防抖节流
- **体验优化**：骨架屏、Loading、渐进式
- **面试问法**：做过哪些性能优化？怎么衡量？

### Day 20 — 前端安全
- **XSS**：注入恶意脚本 → 转义、CSP
- **CSRF**：伪造请求 → Token、SameSite Cookie
- **其他**：点击劫持、SQL 注入
- **面试问法**：说说 XSS 和 CSRF？怎么防范？

### Day 21 — 设计模式
- **常用模式**：单例、发布订阅、观察者、工厂、装饰器、代理
- **前端场景**：EventEmitter（发布订阅）、Redux（观察者）、HOC（装饰器）
- **面试问法**：说几个设计模式？在项目中怎么用的？
