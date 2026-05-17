# 03 · TypeScript 知识地图

> 返回知识库首页请点击上层目录。最新版 TS 笔记已修复双链失效问题。

## 关联笔记

- [JavaScript 目录](../02-JavaScript/README.md)
- [React 目录](../05-React/README.md)
- [工程化 目录](../09-工程化/README.md)

---

## 📚 笔记索引

### 基础与进阶（重点梳理）

- [TypeScript 基础到进阶 - 标准答案索引](./TypeScript基础到进阶 - 标准答案索引.md) — 涵盖类型系统、泛型、基础用法
- [TypeScript 基础到进阶 - 深挖专题索引](./TypeScript基础到进阶 - 深挖专题索引.md) — 工具类型、类型体操、tsconfig 全覆盖

### 框架实战

- [TypeScript 与 React 实战](./TypeScript与React实战.md) — Props 类型、Hooks 标注、泛型组件、Context、事件类型

### 工具库与内置能力

- [TypeScript 内置工具类型全解](./TypeScript内置工具类型全解.md)
- [TypeScript 进阶特性](./TypeScript进阶特性.md)
- [TypeScript 高频面试题](./TypeScript高频面试题.md)

---

## 🗺️ 知识脉络

```
TypeScript
├── 类型基础
│   ├── 原始类型 / 数组 / 元组
│   ├── 字面量类型 / const 断言
│   ├── any / unknown / never / void
│   └── 联合类型 / 交叉类型 / 类型缩窄
│
├── 高级类型
│   ├── interface vs type
│   ├── 泛型：约束 / 条件类型 / infer / 默认值
│   ├── 映射类型 / 索引类型
│   ├── 工具类型：Partial / Pick / Omit / Record / ReturnType ...
│   └── 类型体操：DeepReadonly / UnionToIntersection / CamelCase ...
│
├── 工程实践
│   ├── tsconfig 配置详解
│   ├── 声明文件（.d.ts）/ @types
│   ├── enum vs 联合类型
│   └── 模块解析策略
│
└── React + TypeScript
    ├── 组件 Props / children 类型
    ├── Hooks 类型标注
    ├── 事件类型速查
    ├── 泛型组件 / 多态组件
    ├── Context 类型安全
    └── 常见类型报错排查
```
