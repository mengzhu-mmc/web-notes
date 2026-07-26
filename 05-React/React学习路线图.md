# React 学习路线图

> 这篇笔记用于把 React 目录从“文件集合”整理成“可入门、可进阶、可复习”的学习路径。

## 一、先建立 React 的核心问题意识

React 解决的不是“如何写组件”这么简单，而是如何把 UI 描述、状态变化和 DOM 更新组织成可维护的系统。

学习 React 时建议始终围绕四个问题：

1. **组件如何描述 UI**：JSX、props、state、条件渲染、列表渲染。
2. **状态变化如何触发渲染**：setState、批处理、render/commit、闭包快照。
3. **React 如何协调更新**：Virtual DOM、Fiber、优先级、并发渲染。
4. **应用如何工程化落地**：路由、状态管理、性能优化、SSR、RSC。

## 二、推荐学习路径

### 阶段 1：组件与状态基础

目标：能写出可维护的组件。

1. [React JSX 原理与 Fragment 深度解析](./React组件单根元素原因.md)
2. [React 组件设计模式](./React组件设计模式.md)
3. [React 自定义 Hook 与自定义组件区别](./React自定义Hook与组件区别.md)
4. [手写自定义 Hook 合集](./React_Hooks原理与实战避坑.md)

### 阶段 2：Hooks 与闭包

目标：理解为什么 Hook 依赖、闭包、Effect 容易出 bug。

1. [React Hooks 深入实战指南](./React_Hooks原理与实战避坑.md)
2. [聊透 React 闭包陷阱与底层执行机制](./React_Hooks原理与实战避坑.md)
3. [React 19.2 实践心智模型](./React19.2实践心智模型.md)

### 阶段 3：Fiber 与并发渲染

目标：理解 React 为什么能中断、恢复、分优先级调度。

1. [React Fiber 架构与虚拟 DOM](./React_Fiber与Concurrent_Mode详解.md)
2. [React 性能优化实战](./React性能优化指南.md)
3. [React Compiler 自动记忆化心智模型](./React_Compiler自动记忆化.md)

### 阶段 4：现代 React：React 19、RSC、SSR

目标：理解客户端组件、服务端组件、Server Actions、SSR Streaming 和 Resume。

1. [React 19 新特性深度指南](./React18-19新特性与Server_Components.md)
2. [React SSR 实现原理](./React_SSR实现原理.md)
3. [Next.js 与 Nuxt.js 对比](./Next.js与Nuxt.js对比.md)

### 阶段 5：应用架构与面试复习

1. [React 状态管理方案对比](./React状态管理方案对比.md)
2. [useReducer 与 useContext 模拟 Redux](./useReducer与useContext模拟Redux.md)
3. [React 路由模式详解](./React路由模式详解.md)
4. [React 合成事件机制](./React合成事件机制.md)

## 三、不要一开始就陷入源码细节

源码课和 Fiber 细节很重要，但不建议作为第一站。更好的路径是：

```text
会写组件 → 理解 Hooks 和 Effect → 理解渲染过程 → 理解 Fiber 与并发 → 理解 SSR/RSC → 回看源码
```

这样学习时每个底层概念都有实际问题作为锚点。

## 四、React 目录后续整理方向

- 将课程笔记中的 React 16 生命周期内容归档为“历史演进”。
- 将 Hooks 课程笔记与现有 Hooks 主干文档继续合并。
- 将 Fiber 课程笔记和 Concurrent Mode 主干文档继续去重。
- 将 React 19 / 19.2 / RSC / SSR 作为现代 React 主线继续补齐。
