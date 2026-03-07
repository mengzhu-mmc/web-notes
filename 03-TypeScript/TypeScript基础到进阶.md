# TypeScript 基础到进阶

## 关联笔记

- [[03-TypeScript/[3182] 第11讲：为什么说 JavaScript 不适合大型项目？]]
- [[03-TypeScript/TypeScript与React实战]]
- [[03-TypeScript/README]]
- [[02-JavaScript/[6173] 开篇词  打好 JS 基石，走稳前端进阶之路]]

---

## 一、基本类型系统

### 1.1 原始类型

```typescript
let str: string = 'hello';
let num: number = 42;
let bool: boolean = true;
let n: null = null;
let u: undefined = undefined;
let big: bigint = 100n;
let sym: symbol = Symbol('id');
```

### 1.2 数组与元组

```typescript
// 数组
let arr1: number[] = [1, 2, 3];
let arr2: Array<string> = ['a', 'b'];

// 元组：固定长度和类型
let tuple: [string, number] = ['age', 25];

// 带标签的元组（TS 4.0+）
type Pair = [first: string, second: number];

// 可选元素
type OptTuple = [string, number?];
```

### 1.3 特殊类型

```typescript
// any —— 关闭类型检查，尽量避免
let anything: any = 'whatever';

// unknown —— 安全的 any，使用前必须缩窄
let val: unknown = getExternalData();
if (typeof val === 'string') {
  console.log(val.toUpperCase()); // OK，已缩窄
}

// void —— 没有返回值
function log(msg: string): void {
  console.log(msg);
}

// never —— 永远不会有值（死循环、必定抛异常）
function throwError(msg: string): never {
  throw new Error(msg);
}

// never 在联合类型中会被自动移除
type T = string | never; // => string
```

### 1.4 字面量类型

```typescript
type Direction = 'up' | 'down' | 'left' | 'right';
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;

// const 断言 —— 推导为字面量类型
const config = {
  url: 'https://api.example.com',
  method: 'GET',
} as const;
// config.method 的类型是 "GET" 而不是 string
```

---

## 二、联合类型与交叉类型

### 2.1 联合类型（Union Types）

表示「或」关系：

```typescript
type StringOrNumber = string | number;

// 可辨识联合（Discriminated Union）—— 面试重点
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    case 'triangle':
      return (shape.base * shape.height) / 2;
    default:
      // exhaustive check —— 如果漏了分支编译报错
      const _exhaustive: never = shape;
      return _exhaustive;
  }
}
```

### 2.2 交叉类型（Intersection Types）

表示「且」关系：

```typescript
type HasName = { name: string };
type HasAge = { age: number };
type Person = HasName & HasAge;

const person: Person = { name: 'Alice', age: 30 }; // 必须同时满足

// 注意：原始类型的交叉会产生 never
type Impossible = string & number; // never
```

### 2.3 类型缩窄（Type Narrowing）

```typescript
function process(val: string | number | null) {
  // typeof guard
  if (typeof val === 'string') {
    return val.toUpperCase();
  }
  // truthiness guard
  if (val) {
    return val.toFixed(2); // number
  }
  return 'null';
}

// in 操作符缩窄
function move(animal: Fish | Bird) {
  if ('swim' in animal) {
    animal.swim();
  } else {
    animal.fly();
  }
}

// instanceof 缩窄
function handleError(err: Error | string) {
  if (err instanceof Error) {
    console.log(err.stack);
  }
}

// 自定义类型守卫
function isFish(pet: Fish | Bird): pet is Fish {
  return (pet as Fish).swim !== undefined;
}
```

---

## 三、Interface vs Type

### 3.1 对比表

| 特性 | interface | type |
|------|-----------|------|
| 声明对象形状 | ✅ | ✅ |
| extends 继承 | ✅ `extends` | ✅ `&` 交叉 |
| implements | ✅ | ✅ |
| 声明合并 | ✅（同名自动合并） | ❌ |
| 联合类型 | ❌ | ✅ |
| 映射类型 | ❌ | ✅ |
| 元组 | ❌ | ✅ |
| 原始类型别名 | ❌ | ✅ |

### 3.2 声明合并

```typescript
// interface 可以声明合并 —— 这是扩展第三方类型的关键能力
interface Window {
  __MY_LIB__: { version: string };
}
// 现在 window.__MY_LIB__ 合法了

// type 不行，会报 Duplicate identifier
```

### 3.3 什么时候用哪个？

```typescript
// 推荐 interface：定义对象/类的契约、需要声明合并时
interface User {
  id: string;
  name: string;
}

// 推荐 type：联合类型、映射类型、工具类型组合、函数类型
type Result<T> = { ok: true; data: T } | { ok: false; error: Error };
type Callback = (err: Error | null, data: unknown) => void;
```

> **面试答法**：两者功能高度重合。interface 擅长描述对象形状和支持声明合并，type 更灵活（联合、映射、元组等都行）。团队保持一致即可，React 社区倾向用 type，库作者常用 interface。

---

## 四、泛型（Generics）深入

### 4.1 基本泛型

```typescript
// 函数泛型
function identity<T>(arg: T): T {
  return arg;
}

// 泛型接口
interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

// 泛型类
class Stack<T> {
  private items: T[] = [];
  push(item: T) { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
}
```

### 4.2 泛型约束（extends）

```typescript
// 约束 T 必须有 length 属性
function logLength<T extends { length: number }>(arg: T): T {
  console.log(arg.length);
  return arg;
}
logLength('hello');    // OK
logLength([1, 2, 3]);  // OK
logLength(123);         // ❌ number 没有 length

// keyof 约束
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { name: 'Alice', age: 25 };
getProperty(user, 'name'); // OK, 返回 string
getProperty(user, 'foo');  // ❌ 'foo' 不在 keyof typeof user 中
```

### 4.3 条件类型（Conditional Types）

```typescript
// 基本语法：T extends U ? X : Y
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false

// 分布式条件类型 —— 当 T 是联合类型时，自动分发
type ToArray<T> = T extends any ? T[] : never;
type C = ToArray<string | number>; // string[] | number[]

// 避免分发：用 [T] 包装
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type D = ToArrayNonDist<string | number>; // (string | number)[]
```

### 4.4 infer 关键字

```typescript
// 提取函数返回值类型
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 提取 Promise 的值类型
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type E = UnwrapPromise<Promise<string>>; // string

// 提取数组元素类型
type ElementOf<T> = T extends (infer E)[] ? E : never;
type F = ElementOf<number[]>; // number

// 提取函数第一个参数
type FirstArg<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never;

// 嵌套 infer —— 提取嵌套 Promise
type DeepUnwrap<T> = T extends Promise<infer U> ? DeepUnwrap<U> : T;
type G = DeepUnwrap<Promise<Promise<string>>>; // string
```

### 4.5 泛型默认值

```typescript
interface PaginatedResult<T = any> {
  items: T[];
  total: number;
  page: number;
}

// 使用时可以不传泛型参数
const result: PaginatedResult = { items: [], total: 0, page: 1 };
const typedResult: PaginatedResult<User> = { items: [], total: 0, page: 1 };
```

---

## 五、工具类型详解

### 5.1 内置工具类型

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  role: 'admin' | 'user';
}

// Partial<T> —— 所有属性变可选
type PartialUser = Partial<User>;

// Required<T> —— 所有属性变必选
type RequiredUser = Required<Partial<User>>;

// Readonly<T> —— 所有属性变只读
type ReadonlyUser = Readonly<User>;

// Pick<T, K> —— 挑选指定属性
type UserBasic = Pick<User, 'id' | 'name'>;

// Omit<T, K> —— 排除指定属性
type UserWithoutId = Omit<User, 'id'>;

// Record<K, V> —— 构造键值对类型
type UserMap = Record<string, User>;
type RoleCount = Record<User['role'], number>;
// { admin: number; user: number }

// ReturnType<T> —— 函数返回值类型
function createUser() { return { id: '1', name: 'Alice' }; }
type NewUser = ReturnType<typeof createUser>;

// Parameters<T> —— 函数参数类型（元组）
type CreateUserParams = Parameters<typeof createUser>;

// Exclude<T, U> —— 从联合类型中排除
type NonNullStr = Exclude<string | null | undefined, null | undefined>;

// Extract<T, U> —— 从联合类型中提取
type OnlyStrNum = Extract<string | number | boolean, string | number>;

// NonNullable<T> —— 排除 null 和 undefined
type SafeString = NonNullable<string | null | undefined>;

// Awaited<T> —— 递归 unwrap Promise（TS 4.5+）
type H = Awaited<Promise<Promise<string>>>; // string
```

### 5.2 手写实现（面试常考）

```typescript
// 手写 Partial
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

// 手写 Required
type MyRequired<T> = {
  [K in keyof T]-?: T[K]; // -? 移除可选标记
};

// 手写 Readonly
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};

// 手写 Pick
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// 手写 Omit
type MyOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// 手写 Record
type MyRecord<K extends keyof any, V> = {
  [P in K]: V;
};

// 手写 ReturnType
type MyReturnType2<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : any;

// 手写 Exclude
type MyExclude<T, U> = T extends U ? never : T;

// 手写 NonNullable
type MyNonNullable<T> = T extends null | undefined ? never : T;
```

---

## 六、类型体操：常见面试题

### 6.1 DeepReadonly

```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? T[K] extends Function
      ? T[K]
      : DeepReadonly<T[K]>
    : T[K];
};
```

### 6.2 DeepPartial

```typescript
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends Function
      ? T[K]
      : DeepPartial<T[K]>
    : T[K];
};
```

### 6.3 TupleToUnion

```typescript
type TupleToUnion<T extends any[]> = T[number];
type I = TupleToUnion<[string, number, boolean]>; // string | number | boolean
```

### 6.4 UnionToIntersection

```typescript
// 利用函数参数的逆变性
type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends
  (k: infer I) => void ? I : never;

type J = UnionToIntersection<{ a: 1 } | { b: 2 }>; // { a: 1 } & { b: 2 }
```

### 6.5 Flatten（递归展平数组类型）

```typescript
type Flatten<T> = T extends Array<infer U> ? Flatten<U> : T;
type K = Flatten<number[][][]>; // number
```

### 6.6 字符串操作类型（TS 4.1+）

```typescript
// 内置：Uppercase / Lowercase / Capitalize / Uncapitalize
type CamelCase<S extends string> =
  S extends `${infer L}-${infer R}`
    ? `${Lowercase<L>}${CamelCase<Capitalize<R>>}`
    : S;

type L = CamelCase<'hello-world-foo'>; // "helloWorldFoo"
```

### 6.7 获取对象可选键

```typescript
type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];
```

---

## 七、枚举（enum）vs 联合类型

### 7.1 数字枚举

```typescript
enum Direction {
  Up = 0,
  Down = 1,
  Left = 2,
  Right = 3,
}
// 编译后生成双向映射对象
// Direction[0] === "Up"
// Direction["Up"] === 0
```

### 7.2 字符串枚举

```typescript
enum Status {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Pending = 'PENDING',
}
// 不会生成反向映射
```

### 7.3 const enum

```typescript
const enum Color {
  Red = 0,
  Green = 1,
  Blue = 2,
}
// 编译后直接内联值，不生成对象
// let c = Color.Red; => let c = 0;
```

### 7.4 联合类型替代（推荐）

```typescript
// 大多数场景推荐用联合类型代替 enum
type Direction2 = 'up' | 'down' | 'left' | 'right';
type Status2 = 'active' | 'inactive' | 'pending';

// 如果需要值-标签映射，用 as const 对象
const STATUS = {
  Active: 'ACTIVE',
  Inactive: 'INACTIVE',
  Pending: 'PENDING',
} as const;
type StatusValue = typeof STATUS[keyof typeof STATUS];
// "ACTIVE" | "INACTIVE" | "PENDING"
```

> **面试答法**：enum 会生成运行时代码（增加包体积），数字枚举有双向映射容易出错。联合类型是纯类型，零运行时开销，Tree Shaking 友好。除非需要反向映射或 `const enum` 内联，推荐联合类型 + `as const`。

---

## 八、声明文件（.d.ts）

### 8.1 什么时候需要

- 给纯 JS 库写类型声明
- 扩展全局类型（Window、NodeJS.ProcessEnv）
- 声明模块类型（CSS Modules、图片导入等）

### 8.2 常见场景

```typescript
// global.d.ts —— 全局类型声明
declare global {
  interface Window {
    __APP_CONFIG__: {
      apiUrl: string;
      env: 'dev' | 'staging' | 'prod';
    };
  }
}

// env.d.ts —— 环境变量
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    API_URL: string;
  }
}

// modules.d.ts —— 模块声明
declare module '*.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.svg' {
  import React from 'react';
  const SVGComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVGComponent;
}

declare module '*.png' {
  const src: string;
  export default src;
}

// 给没有类型的 npm 包写声明
declare module 'untyped-lib' {
  export function doSomething(input: string): number;
  export default class MyLib {
    constructor(config: { key: string });
    run(): Promise<void>;
  }
}
```

### 8.3 DefinitelyTyped（@types/xxx）

```bash
# 安装第三方类型声明
npm install -D @types/lodash @types/node @types/react

# 查看某个包是否有类型：
# 1. 包自带 types/typings 字段 → 不需要 @types
# 2. DefinitelyTyped 上有 → npm i -D @types/xxx
# 3. 都没有 → 自己写 .d.ts
```

---

## 九、tsconfig 常用配置

### 9.1 完整配置示例（React + Vite 项目）

```jsonc
{
  "compilerOptions": {
    // ========== 基础 ==========
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",

    // ========== 严格模式 ==========
    "strict": true,
    "noUncheckedIndexedAccess": true,

    // ========== 输出 ==========
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    // ========== 路径 ==========
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"]
    },

    // ========== JSX ==========
    "jsx": "react-jsx",

    // ========== 互操作 ==========
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,

    // ========== 检查 ==========
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 9.2 关键配置说明

| 配置项 | 说明 | 面试重点 |
|--------|------|----------|
| `strict` | 一键开启所有严格模式 | 新项目必开 |
| `strictNullChecks` | null/undefined 不能赋给其他类型 | 避免运行时空指针 |
| `noImplicitAny` | 不允许隐式 any | 强制类型标注 |
| `moduleResolution` | 模块查找策略 | node/bundler/node16 区别 |
| `isolatedModules` | 单文件编译兼容 | Vite/esbuild 必需 |
| `esModuleInterop` | CJS/ESM 互操作 | 解决 `import * as` 问题 |
| `paths` | 路径别名 | 需配合 Vite/Webpack alias |

---

## 十、面试高频问题总结

### Q1：any、unknown、never 的区别？

- `any`：放弃类型检查，赋值和使用都不受限
- `unknown`：安全的 any，必须缩窄后才能使用
- `never`：不可能存在的类型，用于穷尽检查和类型运算

### Q2：type 和 interface 怎么选？

见第三节对比表。简单说：对象形状和需要声明合并用 interface，其他用 type。

### Q3：泛型有什么实际应用？

- API 请求/响应类型：`ApiResponse<T>`
- 组件 Props：`ListComponent<T extends { id: string }>`
- 工具函数：`pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>`

### Q4：如何理解协变和逆变？

```typescript
// 协变：子类型可以赋给父类型（数组、返回值位置）
// Dog extends Animal → Dog[] 可赋给 Animal[]

// 逆变：父类型可以赋给子类型（函数参数位置）
// (a: Animal) => void 可以赋给 (d: Dog) => void
// 因为接受 Animal 的函数自然能处理 Dog

// strictFunctionTypes: true 时启用严格的函数参数逆变检查
```

### Q5：const 断言有什么用？

```typescript
const routes = ['home', 'about', 'contact'] as const;
// 类型：readonly ["home", "about", "contact"]
// 而不是 string[]

// 用于：枚举值、配置对象、路由定义等需要字面量类型的场景
```

### Q6：如何给第三方库扩展类型？

```typescript
// 利用 interface 的声明合并
// 比如给 express 的 Request 加自定义属性
declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; role: string };
  }
}
```
