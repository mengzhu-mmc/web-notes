# TypeScript infer 关键字深度解析

> 来源：前端面试每日推送 2026-04-25（周六·TypeScript + 进阶）
> 难度：⭐⭐

## 关联笔记

- [[03-TypeScript/TypeScript类型体操实战]]
- [[03-TypeScript/TypeScript进阶特性]]

---

## 一句话秒懂

让 TypeScript 的类型系统学会模式匹配和推断。

---

## 核心原理

TypeScript 的 `infer` 关键字只能在条件类型 `extends` 的分支中使用，它的作用类似正则中的**捕获组**——在类型匹配的过程中把某个子类型"提取"出来并赋值给一个临时类型变量。本质上是在编译期做**模式匹配与解构**。

当 `T extends SomePattern<infer U>` 匹配成功时，`U` 就被绑定到对应位置的类型。如果条件不成立（`never` 分支），则 `infer U` 不会被赋值。这构成了所有高级类型体操（DeepPartial、ReturnType、Promise 解包等）的基础设施。

---

## 代码示例

```typescript
// 1. ReturnType 的本质就是 infer
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function getUser(id: string): { name: string; age: number } {
  return { name: 'Alice', age: 30 };
}

type User = MyReturnType<typeof getUser>;
// User = { name: string; age: number }

// 2. 提取数组元素类型
type Unpacked<T> = T extends (infer U)[] ? U : never;
type Item = Unpacked<string[] | number[]>; // string | number

// 3. 提取 Promise 内部类型（递归解包）
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
type Result = Awaited<Promise<Promise<string>>>; // string

// 4. 面试题：实现一个提取函数第一个参数类型的工具类型
type FirstParam<T> = T extends (first: infer F, ...args: any[]) => any ? F : never;
type P = FirstParam<(a: string, b: number, c: boolean) => void>; // string
```

---

## 进阶：协变与逆变位置的 infer

```typescript
// 协变位置（返回值位置）：多个候选 → 联合类型
type ElementsOf<T> = T extends Array<infer E> ? E : never;
type R = ElementsOf<string[] | number[]>; // string | number

// 逆变位置（函数参数位置）：多个候选 → 交叉类型
type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type UI = UnionToIntersection<string | number>; // string & number = never

// TS 4.7+ 可以用 infer U extends any 约束推断结果
type FirstNonNullable<T> = T extends [infer F extends NonNullable<unknown>, ...any[]] ? F : never;
type FN = FirstNonNullable<[null, undefined, string, number]>; // string
```

---

## 面试高频问题

1. **`infer` 只能在哪里使用？** → 只能在条件类型 `extends ? :` 的 `extends` 子句中，且一个条件类型中可以用多个 `infer`
2. **`infer` 是运行时还是编译期？** → 纯编译期，生成 JS 后完全消失，零运行时开销
3. **`infer` 在协变位置和逆变位置有什么区别？** → 默认推断出现在 `extends` 右侧的协变位置；出现在函数参数（逆变位置）时，多个候选会被推断为 `never` 的交叉类型（除非用 `infer U extends any`）

---

## 延伸阅读

- 模板字面量类型（Template Literal Types）与 `infer` 结合做字符串解析
- 分布式条件类型的陷阱：`T extends U ? X : Y` 在 `T` 是联合类型时的行为
- TypeScript 5.0+ 的 `infer U extends Constraint` 语法
