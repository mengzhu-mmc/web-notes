# TypeScript 知识地图

## 关联笔记

- [[02-JavaScript/README]]
- [[05-框架-React/]]
- [[10-工程化/README]]

---

## 📚 笔记索引

### 基础与进阶

- [[03-TypeScript/TypeScript基础到进阶]] — 类型系统、泛型、工具类型、类型体操、tsconfig 全覆盖
- [[03-TypeScript/[3182] 第11讲：为什么说 JavaScript 不适合大型项目？]] — JS 的痛点与 TS 的解决方案

### 框架实战

- [[03-TypeScript/TypeScript与React实战]] — Props 类型、Hooks 标注、泛型组件、Context、事件类型

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

---

## 🎯 面试重点

| 主题 | 关键点 | 笔记链接 |
|------|--------|----------|
| type vs interface | 声明合并、联合类型、映射类型 | [[TypeScript基础到进阶#三、Interface vs Type]] |
| 泛型 | 约束、条件类型、infer、协变逆变 | [[TypeScript基础到进阶#四、泛型（Generics）深入]] |
| 工具类型手写 | Partial、Pick、Omit、ReturnType | [[TypeScript基础到进阶#五、工具类型详解]] |
| React + TS | Props、Hooks、事件、Context | [[TypeScript与React实战]] |
| tsconfig | strict、isolatedModules、paths | [[TypeScript基础到进阶#九、tsconfig 常用配置]] |
