# React 重复知识点合并索引

> Updated: 2026-05-22 based on local note inspection. This file is a merge map rather than a deletion list; original course notes are kept until manual confirmation.

## 合并原则

1. **主干文档优先**：面向复习和实践的主干文档作为最新入口；课程笔记保留原始上下文与历史讲解。
2. **新版本优先**：React 18/19/19.2 的并发、RSC、Actions、Compiler 相关内容优先覆盖 React 16/17 时代的历史说法。
3. **不直接删除**：重复文件只标记“建议合并到哪里”，不在未确认的情况下删除。
4. **补 TS 类型**：新增示例优先使用 `tsx`，明确 props、返回值、泛型和 DOM ref 类型。

## 重复知识点分流表

| 知识点                     | 推荐主入口                                                                                                        | 重复/历史来源                                                          | 处理建议                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| Hooks 工作机制与依赖       | [React Hooks 深入实战指南](./React_Hooks原理与实战避坑.md)                                                        | `课程笔记/02-Hooks/*`、[手写自定义 Hook 合集](./手写自定义Hook合集.md) | 主干文档沉淀规则、反例和 TS 模板；课程笔记保留讲解过程 |
| Fiber / Concurrent Mode    | [React Fiber 架构与虚拟 DOM](./React_Fiber与Concurrent_Mode详解.md)                                               | `课程笔记/03-Fiber与虚拟DOM/*`                                         | 主干文档补 React 18/19 并发 API；课程笔记作为历史推导  |
| SSR / RSC / Server Actions | [React 19 新特性深度指南](./React18-19新特性与Server_Components.md)、[React SSR 实现原理](./React_SSR实现原理.md) | Next.js 对比、旧 SSR 笔记                                              | 主干文档保持官方 API 差异；框架文档只保留落地差异      |
| 性能优化 / memo            | [React 性能优化实战](./React性能优化指南.md)、[React Compiler 自动记忆化心智模型](./React_Compiler自动记忆化.md)  | 课程笔记性能章节、Hooks 依赖优化                                       | 手写 memo 经验迁移为“Compiler 前后如何判断”            |
| 状态管理 / Redux           | [React 状态管理方案对比](./React状态管理方案对比.md)                                                              | Redux 课程笔记、useReducer 模拟 Redux                                  | 主干文档保留选型矩阵；课程笔记保留原理细节             |

## 本轮已合并的口径

- 将 React 19/19.2、RSC、Concurrent Mode、Compiler 统一纳入主索引的现代 React 路径。
- 对新增示例统一补充 TypeScript 类型，减少 `any`、隐式 ref 返回值和不完整 props 的示例。
- Vue 相关内容本轮不继续扩写，只保留既有笔记；后续巡检默认优先 React。

## 后续可执行动作

1. 把 `课程笔记/02-Hooks` 中“依赖数组、闭包、Effect 清理”的重复段落抽象进主干 Hooks 文档。
2. 把 `课程笔记/03-Fiber与虚拟DOM/16-Fiber架构下Concurrent模式实现原理.md` 的历史实现细节压缩为“React 16/17 历史背景”。
3. 将性能优化章节中手写 `memo/useMemo/useCallback` 的建议补充“React Compiler 开启后如何降级为例外优化”。

## 2026-05-25 巡检补充

- React 19/19.2 新增内容继续收敛到 `React18-19新特性与Server_Components.md` 与 `React19.2实践心智模型.md`，避免在课程笔记中重复扩写。
- Fiber/Concurrent 的历史实现细节保留在 `React_Fiber与Concurrent_Mode详解.md`，新增 API 只补充“如何判断优先级、如何调试”的心智模型。
- 对短小占位文件和课程原文保留索引映射，不直接删除；低信息量文件由 `99-其他/低信息量文件合并索引.md` 和 `知识库整理规划.md` 继续跟踪。
- Vue 相关内容本轮不扩写，仅参与敏感信息和格式化巡检。

## 2026-05-31 巡检补充

- React 19.2 稳定 API 边界继续收敛到 `React18-19新特性与Server_Components.md` 和 `React19.2实践心智模型.md`。
- PPR、`cacheSignal`、`resumeAndPrerender`、Activity selective hydration 等内容不再分散扩写到课程笔记，课程笔记仅保留历史学习语境。
- React Compiler 与 hooks lint v6 的工程化策略统一维护在 `React_Compiler自动记忆化.md`。
- `<ViewTransition />`、`addTransitionType` 等 Canary 能力暂不作为稳定主干展开，只在边界说明中标注，避免和 React 19.2 稳定能力混淆。

## 2026-06-01 巡检补充

- Action 相关内容继续合并到 `React18-19新特性与Server_Components.md`，重点维护 `useActionState` 队列语义、Server Function 渐进增强、`startTransition` 触发边界。
- React DOM 资源加载 API 统一按 `preload/preinit/preloadModule/preinitModule` 的“下载 vs 执行、普通资源 vs ESM 模块”维度收敛，不在课程笔记中重复扩写。
- 课程笔记中的历史 React 18 并发内容保留为学习语境；主干答案以 React 19.2 官方文档边界为准。

## 2026-06-04 巡检补充

- `useOptimistic`、`useFormStatus`、`useActionState` 的组合边界继续合并到 `React18-19新特性与Server_Components.md`。
- 乐观 UI 相关碎片统一按“真实状态、临时投影、错误恢复”三层组织，不再分散到课程笔记中重复扩写。
- 表单提交相关碎片统一按“Action 负责提交、FormStatus 负责子组件感知、Optimistic 负责即时反馈”维护。
- 原始课程笔记和历史面试题暂不删除，仅作为复习来源保留。

## 2026-06-07 巡检补充

- React Compiler 的 directive、`compilationMode` 与 lint 接入策略继续统一维护在 `React_Compiler自动记忆化.md`。
- 性能优化类碎片后续按“默认 `infer`、灰度 `annotation`、临时 `use no memo`、谨慎 `all`”的工程化路径合并，不再在课程笔记中重复扩写。
- TypeScript 项目中关于 Compiler 的配置建议统一标注为避免常规使用 `syntax` 模式，防止与 Flow component / hook syntax 语义混淆。
- 原始性能优化课程笔记仍保留手写 memo 的历史语境；主干答案以 Compiler 官方配置和 React 纯度规则为准。

## 2026-06-10 巡检补充

- React 19.2 稳定能力与 Canary 动画能力继续统一维护在 `React19.2实践心智模型.md`，避免把 `<ViewTransition />`、`addTransitionType` 与稳定 API 混答。
- 路由动画、共享元素动画和 Transition Type 相关碎片后续按“稳定能力先讲 Activity / PPR，Canary 能力单独标注风险”的口径合并。
- Vue 相关内容本轮不扩写，仅保留既有索引和格式化治理。

## 2026-06-13 巡检补充

- RSC、Server Function、Server Action 与 `"use server"` 的安全边界继续统一维护在 `React18-19新特性与Server_Components.md`。
- Server Function 相关碎片后续按“可远程调用 async 函数、参数可序列化、客户端输入不可信、表单外调用进入 Transition、mutation 优先”的口径合并。
- 课程笔记中的 Server Actions 旧称保留历史语境；主干文档统一采用 React 19 文档中的 Server Function / Server Action 区分。
- Vue 相关内容本轮不扩写，仅参与索引、格式化和安全巡检。

## 2026-06-16 巡检补充

- Concurrent API 的输入边界、Action 异步边界和 `useDeferredValue` 旧内容保留策略继续统一维护在 `React_Fiber与Concurrent_Mode详解.md`。
- 课程笔记中把输入 `setState` 包进 `startTransition` 的历史示例后续按“输入同步、结果延后消费”的口径修正。
- 对需要提交顺序、错误状态和 pending 状态的异步交互，主干文档统一推荐优先考虑 `useActionState`、form Action 或 Server Function。
- Vue 相关内容本轮不扩写，仅参与索引、格式化和安全巡检。

## 2026-06-25 巡检补充

- React Compiler 的 `gating`、`target`、`compilationMode` 与 directive 接入策略继续统一维护在 `React_Compiler自动记忆化.md`。
- Compiler 灰度相关碎片后续按“lint 体检 → 控制编译范围 → gating 灰度 → target/runtime 版本匹配 → 性能验证”的工程路径合并。
- React 17 / 18 项目使用 Compiler 时，主干文档统一提醒安装 `react-compiler-runtime` 并把 runtime 依赖放入生产依赖。
- Vue 相关内容本轮不扩写，仅参与索引、格式化和安全巡检。

## 2026-06-28 巡检补充

- `useEffectEvent` 的 non-stable identity、调用位置和依赖数组边界继续统一维护在 `React19.2实践心智模型.md`。
- `prerender`、`resumeAndPrerender` 与 streaming SSR 的差异继续统一维护在 `React19.2实践心智模型.md`，避免把静态生成 API 当成普通 SSR API。
- React Compiler 的 `logger` 与 `panicThreshold` 作为“可观测性 + 失败策略”补充到 `React_Compiler自动记忆化.md`，后续 Compiler 碎片按“lint → 编译范围 → logger → gating → panicThreshold → 指标验证”路径收敛。
- Vue 相关内容本轮不扩写，仅参与索引、格式化和安全巡检。

## 2026-07-01 巡检补充

- RSC、`"use client"`、Server Function 与 Server Action 的命名边界继续统一维护在 `React18-19新特性与Server_Components.md`。
- `"use client"` 相关碎片后续按“module dependency tree boundary，不是 render tree boundary”的口径合并，避免把 JSX 父子关系误解为同一运行环境。
- Server Component 本身没有 directive；`"use server"` 只用于 Server Functions。后续遇到“给组件文件加 `"use server"`”的旧说法，统一改写为框架 RSC 默认边界说明。
- Server Action 只作为 Server Function 接入 `<form action>`、`formAction` 或 Action 流程时的具体场景；不是所有 Server Functions 都叫 Server Actions。
- Vue 相关内容本轮不扩写，仅参与索引、格式化和安全巡检。
