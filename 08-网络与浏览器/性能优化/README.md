# 性能优化

> 本模块涵盖性能指标体系、性能检测工具实操、优化手段与监控落地。

## 📚 本模块文档

### 指标与度量

- [Web Vitals：INP 指标详解](./Web%20Vitals与INP指标详解.md) — INP 定义、三段拆解、5 种测量方法与优化手段
- [Performance API 全解](./Performance-API全解.md) — Navigation / Resource / Element / User Timing、LoAF、采集上报实战

### 检测与排查

- [DevTools Performance 面板实操](./DevTools-Performance面板实操.md) — 火焰图读法、四大视图、Long Task 与强制同步布局定位
- [内存泄漏排查实操](./内存泄漏排查实操.md) — 堆快照三快照法、Retainers 保留路径、游离 DOM（Detached DOM）

### 优化手段

- [前端性能优化全景](./前端性能优化全景.md) — 网络/渲染/JS/构建分层优化总览与白屏专题
- [大量 DOM 节点优化方案](./大量DOM节点优化方案.md) — 虚拟列表、DocumentFragment、rAF 节流

## 🔗 相关模块

- [网络与浏览器主索引](../00-🌟索引.md)
- [页面渲染流程与优化](../浏览器原理/渲染/页面渲染流程与优化.md) — 关键渲染路径与重排重绘
- [前端性能优化完全指南](../../11-项目实战/前端性能优化完全指南.md) — 分层优化正典（含决策树与面试 Q&A）
- [React 性能优化指南](../../05-React/React性能优化指南.md) — React 侧优化
- [V8 垃圾回收机制](../../02-JavaScript/10-性能与优化/V8垃圾回收机制.md) — 内存回收理论底座
- [工程化](../../09-工程化/00-🌟索引.md) — 构建产物瘦身与 CI 质量门禁
