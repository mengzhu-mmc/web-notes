# 05 · React 知识体系与源码深度解析索引 (README)

> 这里是 React 知识库的中央索引页，所有 React 笔记和深度原理解析均在此归类。最新版已按照 **"原理/机制驱动"** 的工程化架构进行了重新梳理，所有超链接均已修复为直接指向当前目录下的实体 Markdown 文件。

---

## 一、核心机制与底层渲染深度解析

理解 React 不是学习 API，而是理解其如何管理状态、构建视图并与浏览器交互的。

1. **Fiber 架构与并发渲染核心**
   - [React_Fiber 与 Concurrent Mode 详解](./React_Fiber与Concurrent_Mode详解.md)
   - [React 18-19 新特性与 Server Components](./React18-19新特性与Server_Components.md) _(已合并 React 19 API 与 RSC 心智模型)_

2. **状态更新与闭包机制 (重点难点)**
   - [React 闭包陷阱与底层执行机制解析](./React闭包陷阱与底层执行机制解析.md) ⭐ _重点剖析执行上下文与 GC 引用链_

3. **事件系统与虚拟 DOM**
   - [React 合成事件机制](./React合成事件机制.md)
   - [React 组件为什么只能有一个根元素](./React组件单根元素原因.md)

---

## 二、Hooks 深度实战与第三方库解析

1. **原生 Hooks 实战避坑**
   - [React Hooks 原理与实战避坑](./React_Hooks原理与实战避坑.md)
   - [React 自定义 Hook 与组件的区别](./React自定义Hook与组件区别.md)

2. **`ahooks` 源码级学习指南 (硬核源码剖析)**
   - [01 网络请求与闭包对抗 (useRequest, useLatest, useMemoizedFn)](./ahooks源码解析/01_网络请求与闭包对抗.md)
   - [02 生命周期与状态增强 (useMount, useUpdateEffect, useSetState)](./ahooks源码解析/02_生命周期与状态增强.md)
   - [03 DOM 与通信进阶 (useEventListener, useInViewport, useEventEmitter)](./ahooks源码解析/03_DOM与通信进阶.md)
   - [手写自定义 Hook 合集](./手写自定义Hook合集.md)

---

## 三、架构、生态与性能优化

1. **性能优化**
   - [React 性能优化指南](./React性能优化指南.md) ⭐ _已重构合并的性能优化终极指南_

2. **状态管理**
   - [React 状态管理方案对比](./React状态管理方案对比.md)
   - [useReducer 与 useContext 模拟 Redux](./useReducer与useContext模拟Redux.md)

3. **路由与服务端渲染 (SSR)**
   - [React 路由模式详解](./React路由模式详解.md)
   - [React SSR 实现原理](./React_SSR实现原理.md)
   - [Next.js 与 Nuxt.js 架构对比](./Next.js与Nuxt.js对比.md)

4. **架构设计**
   - [React 组件设计模式](./React组件设计模式.md)

---

## 四、杂项与前沿追踪

- [AI 对话笔记 - React 专题](./AI对话笔记-React专题.md)
- [AI 对话笔记 - 综合前沿追踪](./AI对话笔记-综合.md)
- [SolidJS 2 Beta 新特性探索](./SolidJS2-Beta新特性.md)
