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
