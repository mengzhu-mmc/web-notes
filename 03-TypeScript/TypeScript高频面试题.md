# TypeScript 高频面试题

## 关联笔记

- [[03-TypeScript/TypeScript基础到进阶]]
- [[03-TypeScript/TypeScript与React实战]]

---

## 一、类型基础类

### 1.1 any、unknown、never 的区别

这是 TS 面试出现频率最高的问题之一，考察对类型安全的理解。

```typescript
// any：完全放弃类型检查，可以赋值给任何类型，也可以接收任何类型
let a: any = 123;
a.foo.bar; // 不报错，但运行时可能崩溃

// unknown：类型安全的 any，可以接收任何类型，但使用前必须缩窄
let b: unknown = 123;
// b.toFixed(2); // ❌ 报错：Object is of type 'unknown'
if (typeof b === 'number') {
  b.toFixed(2); // ✅ 缩窄后才能使用
}

// never：表示永远不会出现的值，用于穷尽检查
function throwError(msg: string): never {
  throw new Error(msg);
}

// never 的经典用法：穷尽性检查
type Shape = 'circle' | 'square' | 'triangle';
function getArea(shape: Shape) {
  switch (shape) {
    case 'circle': return /* ... */;
    case 'square': return /* ... */;
    case 'triangle': return /* ... */;
    default:
      const _exhaustive: never = shape; // 如果漏掉了某个 case，这里会报错
      return _exhaustive;
  }
}
```

> [!tip] 面试回答要点
> any 是"我不管了"，unknown 是"我先收着但用之前要检查"，never 是"这不可能发生"。实际项目中应该用 unknown 替代 any，配合类型守卫来保证安全。

### 1.2 type 和 interface 的区别

```typescript
// 1. 声明合并：interface 可以，type 不行
interface User { name: string; }
interface User { age: number; }  // ✅ 自动合并为 { name: string; age: number }

type Animal = { name: string; };
// type Animal = { age: number; }; // ❌ 报错：重复标识符

// 2. 继承方式不同
interface Dog extends Animal { breed: string; }  // interface 用 extends
type Cat = Animal & { color: string; };           // type 用交叉类型 &

// 3. type 能做但 interface 不能做的事
type StringOrNumber = string | number;       // 联合类型
type Pair = [string, number];                // 元组
type Callback = (data: string) => void;      // 函数类型别名
type Keys = keyof User;                      // 提取键
type Mapped = { [K in 'a' | 'b']: number };  // 映射类型
```

> [!tip] 面试回答要点
> 能用 interface 就用 interface（支持声明合并、更好的错误提示），需要联合类型、元组、映射类型等高级特性时用 type。在 React 中定义 Props 两者都可以，团队统一即可。

### 1.3 const 断言与 as const

```typescript
// 没有 as const：类型被推断为宽泛类型
const config = { url: '/api', method: 'GET' };
// 类型：{ url: string; method: string }

// 使用 as const：类型被推断为字面量类型，且所有属性变为 readonly
const config2 = { url: '/api', method: 'GET' } as const;
// 类型：{ readonly url: "/api"; readonly method: "GET" }

// 实际场景：配合函数参数的字面量类型约束
function request(url: string, method: 'GET' | 'POST') { /* ... */ }
// request(config.url, config.method);   // ❌ string 不能赋给 'GET' | 'POST'
request(config2.url, config2.method);    // ✅
```

---

## 二、工具类型

### 2.1 内置工具类型及实现原理

面试常考"手写 Partial / Pick / Omit 的实现"。

```typescript
// Partial<T>：所有属性变为可选
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

// Required<T>：所有属性变为必选（去掉 ?）
type MyRequired<T> = {
  [K in keyof T]-?: T[K];
};

// Readonly<T>：所有属性变为只读
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};

// Pick<T, K>：从 T 中挑选部分属性
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Omit<T, K>：从 T 中排除部分属性
type MyOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
// 等价于：
type MyOmit2<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P];
};

// Record<K, V>：构造键为 K、值为 V 的对象类型
type MyRecord<K extends keyof any, V> = {
  [P in K]: V;
};

// ReturnType<T>：提取函数返回值类型
type MyReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

// Parameters<T>：提取函数参数类型（元组）
type MyParameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
```

### 2.2 Exclude / Extract / NonNullable

```typescript
// Exclude<T, U>：从 T 中排除可以赋值给 U 的类型
type MyExclude<T, U> = T extends U ? never : T;
type T1 = Exclude<'a' | 'b' | 'c', 'a'>; // 'b' | 'c'

// Extract<T, U>：从 T 中提取可以赋值给 U 的类型
type MyExtract<T, U> = T extends U ? T : never;
type T2 = Extract<'a' | 'b' | 'c', 'a' | 'f'>; // 'a'

// NonNullable<T>：排除 null 和 undefined
type MyNonNullable<T> = T extends null | undefined ? never : T;
```

> [!important] 面试高频
> 手写 Partial、Pick、Omit、ReturnType 是 TS 面试的常客。核心是理解 `keyof`、`in`、`extends`、`infer` 这四个关键字。

---

## 三、泛型进阶

### 3.1 泛型约束（extends）

```typescript
// 基本约束：T 必须有 length 属性
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length;
}
getLength('hello');    // ✅
getLength([1, 2, 3]); // ✅
// getLength(123);     // ❌ number 没有 length

// keyof 约束：K 必须是 T 的键
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { name: 'mmc', age: 27 };
getProperty(user, 'name'); // ✅ 返回类型是 string
// getProperty(user, 'email'); // ❌ 'email' 不在 keyof User 中
```

### 3.2 条件类型与 infer

```typescript
// 条件类型：T extends U ? X : Y
type IsString<T> = T extends string ? true : false;
type A = IsString<'hello'>; // true
type B = IsString<123>;     // false

// infer：在条件类型中推断类型变量
// 提取 Promise 的内部类型
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type C = UnwrapPromise<Promise<string>>; // string
type D = UnwrapPromise<number>;          // number

// 递归解包嵌套 Promise
type DeepUnwrap<T> = T extends Promise<infer U> ? DeepUnwrap<U> : T;
type E = DeepUnwrap<Promise<Promise<string>>>; // string

// 提取数组元素类型
type ElementOf<T> = T extends (infer U)[] ? U : never;
type F = ElementOf<string[]>; // string

// 提取函数第一个参数类型
type FirstArg<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never;
type G = FirstArg<(name: string, age: number) => void>; // string
```

### 3.3 模板字面量类型

```typescript
// 基本用法
type EventName = `on${Capitalize<'click' | 'focus' | 'blur'>}`;
// 'onClick' | 'onFocus' | 'onBlur'

// 实际场景：CSS 属性类型
type CSSUnit = 'px' | 'em' | 'rem' | '%';
type CSSValue = `${number}${CSSUnit}`;
const width: CSSValue = '100px';  // ✅
// const bad: CSSValue = '100vw'; // ❌

// 配合 infer 解析字符串
type ParseRoute<T> = T extends `${string}/:${infer Param}/${infer Rest}`
  ? Param | ParseRoute<`/${Rest}`>
  : T extends `${string}/:${infer Param}`
  ? Param
  : never;

type Params = ParseRoute<'/user/:id/post/:postId'>; // 'id' | 'postId'
```

---

## 四、类型体操实战

### 4.1 DeepReadonly（深度只读）

```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? T[K] extends Function
      ? T[K]                    // 函数不递归
      : DeepReadonly<T[K]>      // 对象递归
    : T[K];                     // 原始类型直接返回
};

interface Config {
  db: { host: string; port: number };
  debug: boolean;
}
type ReadonlyConfig = DeepReadonly<Config>;
// { readonly db: { readonly host: string; readonly port: number }; readonly debug: boolean }
```

### 4.2 DeepPartial（深度可选）

```typescript
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends Function
      ? T[K]
      : DeepPartial<T[K]>
    : T[K];
};
```

### 4.3 获取对象中值为指定类型的键

```typescript
// 从对象类型中提取值为 string 类型的键
type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

interface Person {
  name: string;
  age: number;
  email: string;
  active: boolean;
}
type T = StringKeys<Person>; // 'name' | 'email'
```

### 4.4 元组转联合类型

```typescript
type TupleToUnion<T extends any[]> = T[number];
type U = TupleToUnion<[string, number, boolean]>; // string | number | boolean
```

---

## 五、实际项目中的 TS 技巧

### 5.1 类型守卫

```typescript
// typeof 守卫
function padLeft(value: string, padding: string | number) {
  if (typeof padding === 'number') {
    return ' '.repeat(padding) + value; // padding 被缩窄为 number
  }
  return padding + value; // padding 被缩窄为 string
}

// in 守卫
interface Bird { fly(): void; }
interface Fish { swim(): void; }
function move(animal: Bird | Fish) {
  if ('fly' in animal) {
    animal.fly();  // Bird
  } else {
    animal.swim(); // Fish
  }
}

// 自定义类型守卫（is 关键字）
function isString(val: unknown): val is string {
  return typeof val === 'string';
}
function process(val: unknown) {
  if (isString(val)) {
    val.toUpperCase(); // ✅ val 被缩窄为 string
  }
}
```

### 5.2 函数重载

```typescript
// 场景：根据参数类型返回不同类型
function createElement(tag: 'div'): HTMLDivElement;
function createElement(tag: 'a'): HTMLAnchorElement;
function createElement(tag: 'input'): HTMLInputElement;
function createElement(tag: string): HTMLElement;
function createElement(tag: string): HTMLElement {
  return document.createElement(tag);
}

const div = createElement('div');   // HTMLDivElement
const link = createElement('a');    // HTMLAnchorElement
```

### 5.3 声明文件（.d.ts）

```typescript
// 当使用没有类型定义的第三方库时，需要手写声明文件
// types/my-lib.d.ts
declare module 'my-lib' {
  export function doSomething(input: string): number;
  export interface Config {
    timeout: number;
    retries: number;
  }
}

// 扩展已有类型（如给 Window 加属性）
declare global {
  interface Window {
    __APP_CONFIG__: {
      apiUrl: string;
      env: 'dev' | 'prod';
    };
  }
}
```

---

## 六、面试常见问答

### Q1：TypeScript 的编译过程是怎样的？

TS 代码经过以下步骤变成 JS：Scanner（词法分析）→ Parser（语法分析，生成 AST）→ Binder（语义分析，建立符号表）→ Checker（类型检查）→ Emitter（生成 JS 代码）。类型信息只存在于编译阶段，运行时完全擦除。

### Q2：协变和逆变是什么？

协变（Covariance）：子类型可以赋值给父类型，数组和对象属性默认协变。`Dog[] → Animal[]` 是合法的。

逆变（Contravariance）：父类型可以赋值给子类型，函数参数在 `strictFunctionTypes` 下是逆变的。`(animal: Animal) => void` 可以赋值给 `(dog: Dog) => void`，因为处理 Animal 的函数一定能处理 Dog。

### Q3：enum 和 const enum 的区别？

```typescript
// 普通 enum：编译后会生成一个对象（双向映射）
enum Direction { Up, Down }
// 编译为：var Direction; Direction[Direction["Up"] = 0] = "Up"; ...

// const enum：编译后直接内联为常量值，不生成对象
const enum Color { Red, Green }
const c = Color.Red;
// 编译为：const c = 0;
```

const enum 性能更好（无运行时开销），但不支持反向映射，且在某些场景（如 isolatedModules）下有限制。

### Q4：如何让 TS 支持导入 .css / .png 等非 JS 模块？

```typescript
// src/types/assets.d.ts
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  import React from 'react';
  const SVGComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVGComponent;
}
```
