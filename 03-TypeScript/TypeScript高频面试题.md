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

### 先理解：泛型到底解决什么问题？

泛型的核心价值用一句话概括：**让你写出"类型也能当参数传"的代码**。

没有泛型的世界里，你要么放弃类型安全（用 any），要么为每种类型写一遍重复代码：

```typescript
// ❌ 没有泛型：要么用 any 丢失类型信息
function firstItem(arr: any[]): any {
  return arr[0];
}
const item = firstItem([1, 2, 3]); // item 是 any，IDE 没有任何提示

// ❌ 或者为每种类型写一遍
function firstNumber(arr: number[]): number { return arr[0]; }
function firstString(arr: string[]): string { return arr[0]; }

// ✅ 有泛型：一份代码，类型自动推导
function first<T>(arr: T[]): T {
  return arr[0];
}
const a = first([1, 2, 3]);     // a 的类型是 number ✅
const b = first(['x', 'y']);    // b 的类型是 string ✅
```

你可以把 `<T>` 理解为"类型的占位符"——调用时传入什么类型，T 就变成什么类型，整条链路的类型信息都不会丢失。

### 3.1 泛型约束（extends）

泛型虽然灵活，但有时候太灵活了——你想访问 `.length`，但 T 可能是 number，根本没有 length。这时候就需要用 `extends` 给泛型加约束，告诉 TS："T 不是什么都行，它至少得满足某个条件"。

```typescript
// 没有约束：报错，因为 T 可能是任何类型
// function getLength<T>(arg: T): number {
//   return arg.length; // ❌ Property 'length' does not exist on type 'T'
// }

// ✅ 加约束：T 必须有 length 属性
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length;
}
getLength('hello');    // ✅ string 有 length
getLength([1, 2, 3]); // ✅ 数组有 length
// getLength(123);     // ❌ number 没有 length，编译报错
```

另一个极其常用的约束是 `K extends keyof T`，意思是"K 必须是 T 的某个属性名"：

```typescript
// 场景：安全地从对象中取值，且返回类型精确
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { name: 'mmc', age: 27 };
const name = getProperty(user, 'name');  // 返回类型是 string ✅
const age = getProperty(user, 'age');    // 返回类型是 number ✅
// getProperty(user, 'email');           // ❌ 编译报错：'email' 不在 'name' | 'age' 中

// 对比没有泛型约束的写法：
// function unsafeGet(obj: any, key: string): any { return obj[key]; }
// 返回 any，完全没有类型提示，还可能传入不存在的 key
```

> [!tip] 一句话记忆
> `extends` 在泛型里不是"继承"，而是"约束"——`T extends X` 意思是"T 至少得是 X 这个样子"。

### 3.2 条件类型与 infer

条件类型就是**类型层面的 if-else**，语法是 `T extends U ? X : Y`（如果 T 满足 U 的约束，则结果是 X，否则是 Y）。

```typescript
// 最简单的例子：判断一个类型是不是 string
type IsString<T> = T extends string ? true : false;
type A = IsString<'hello'>; // true
type B = IsString<123>;     // false

// 实际用途：根据输入类型决定输出类型
type ApiResponse<T> = T extends 'user'
  ? { name: string; age: number }
  : T extends 'post'
  ? { title: string; content: string }
  : never;

type UserResp = ApiResponse<'user'>; // { name: string; age: number }
type PostResp = ApiResponse<'post'>; // { title: string; content: string }
```

**infer 关键字**是条件类型中最强大的工具，它的作用是"在模式匹配中声明一个待推断的类型变量"。你可以把它理解为**类型层面的正则捕获组**：

```typescript
// 类比理解：
// 正则：/Promise<(.+)>/  →  捕获组提取 Promise 里的类型
// TS：  T extends Promise<infer U> ? U : T  →  infer U 就是那个捕获组

// 提取 Promise 的内部类型
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type C = UnwrapPromise<Promise<string>>; // string（匹配成功，U = string）
type D = UnwrapPromise<number>;          // number（匹配失败，返回 T 本身）

// 递归解包嵌套 Promise（像剥洋葱一样一层层拆）
type DeepUnwrap<T> = T extends Promise<infer U> ? DeepUnwrap<U> : T;
type E = DeepUnwrap<Promise<Promise<string>>>; // string

// 提取数组元素类型
type ElementOf<T> = T extends (infer U)[] ? U : never;
type F = ElementOf<string[]>; // string

// 提取函数第一个参数类型
type FirstArg<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never;
type G = FirstArg<(name: string, age: number) => void>; // string
```

> [!tip] infer 的使用口诀
> 在 `extends` 右边的类型结构中，把你想"抠出来"的那部分用 `infer X` 替代，然后在 `?` 后面的 true 分支中使用 X。就像在类型上"挖洞"，让 TS 帮你填上实际的类型。

### 3.3 模板字面量类型

模板字面量类型让你能在**类型层面**做字符串拼接和模式匹配，这在处理事件名、路由参数、CSS 值等场景非常实用。

```typescript
// 基本用法：自动生成事件处理器名称
type EventName = `on${Capitalize<'click' | 'focus' | 'blur'>}`;
// 'onClick' | 'onFocus' | 'onBlur'
// 联合类型会自动展开做排列组合

// 实际场景：约束 CSS 值的格式
type CSSUnit = 'px' | 'em' | 'rem' | '%';
type CSSValue = `${number}${CSSUnit}`;
const width: CSSValue = '100px';  // ✅
// const bad: CSSValue = '100vw'; // ❌ vw 不在 CSSUnit 中

// 高级场景：配合 infer 从路由字符串中提取参数名
// 这就像在类型层面写了一个路由解析器
type ParseRoute<T> = T extends `${string}/:${infer Param}/${infer Rest}`
  ? Param | ParseRoute<`/${Rest}`>
  : T extends `${string}/:${infer Param}`
  ? Param
  : never;

type Params = ParseRoute<'/user/:id/post/:postId'>; // 'id' | 'postId'
// 第一次匹配：Param = 'id', Rest = 'post/:postId'
// 递归匹配：Param = 'postId'
// 最终结果：'id' | 'postId'
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

#### 为什么需要类型守卫？

当一个变量的类型是联合类型（比如 `string | number`）或者 `unknown` 时，TS 不允许你直接使用某个具体类型的方法——因为它不确定运行时到底是哪个类型。类型守卫就是告诉 TS "我已经检查过了，这里一定是某个类型"，让 TS 在 if 分支内自动把类型**缩窄**（Narrowing）。

```typescript
function double(input: string | number) {
  // return input * 2;           // ❌ 报错：string 不能乘以 2
  // return input.toUpperCase(); // ❌ 报错：number 没有 toUpperCase

  // 必须先判断类型，TS 才知道你在做什么
  if (typeof input === 'number') {
    return input * 2;            // ✅ 这里 input 被缩窄为 number
  }
  return input.toUpperCase();    // ✅ 这里 input 被缩窄为 string
}
```

#### 四种类型守卫方式

**1. typeof 守卫**——最常用，适合原始类型判断：

```typescript
function padLeft(value: string, padding: string | number) {
  if (typeof padding === 'number') {
    return ' '.repeat(padding) + value; // padding 被缩窄为 number
  }
  return padding + value; // padding 被缩窄为 string
}
// typeof 只能判断：string / number / boolean / symbol / undefined / function / bigint
// 对于 null、数组、对象都返回 'object'，所以复杂类型需要其他方式
```

**2. instanceof 守卫**——适合类的实例判断：

```typescript
class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

function handleError(err: Error | ApiError) {
  if (err instanceof ApiError) {
    console.log(err.code);    // ✅ 缩窄为 ApiError，可以访问 code
  } else {
    console.log(err.message); // ✅ 缩窄为 Error
  }
}
```

**3. in 守卫**——通过检查属性是否存在来区分类型，适合接口/对象的判断：

```typescript
interface Bird { fly(): void; layEggs(): void; }
interface Fish { swim(): void; layEggs(): void; }

function move(animal: Bird | Fish) {
  if ('fly' in animal) {
    animal.fly();  // ✅ 缩窄为 Bird
  } else {
    animal.swim(); // ✅ 缩窄为 Fish
  }
  animal.layEggs(); // ✅ 两者都有的方法，不需要守卫
}
// 适用场景：后端返回的数据可能是不同结构，根据某个字段判断具体类型
```

**4. 自定义类型守卫（is 关键字）**——最灵活，适合复杂判断逻辑：

```typescript
// 语法：返回值类型写成 "参数 is 类型"
function isString(val: unknown): val is string {
  return typeof val === 'string';
}

// 为什么不直接用 typeof？因为自定义守卫可以封装复杂逻辑：
interface User {
  name: string;
  age: number;
  email: string;
}

// 判断一个 unknown 值是否是 User 类型
function isUser(val: unknown): val is User {
  return (
    typeof val === 'object' &&
    val !== null &&
    'name' in val &&
    'age' in val &&
    'email' in val &&
    typeof (val as User).name === 'string' &&
    typeof (val as User).age === 'number'
  );
}

// 使用：处理 API 返回的不确定数据
function handleApiData(data: unknown) {
  if (isUser(data)) {
    // ✅ data 被缩窄为 User，所有属性都有类型提示
    console.log(data.name, data.age, data.email);
  }
}
```

> [!tip] 什么时候用哪种守卫？
> 原始类型用 `typeof`，类实例用 `instanceof`，接口/对象用 `in`，复杂判断逻辑封装成 `is` 函数。实际项目中最常用的是 `typeof` 和自定义 `is` 守卫。

#### 可辨识联合（Discriminated Unions）

这是类型守卫在实际项目中最常见的模式——给联合类型的每个成员加一个"标签字段"，通过判断标签来缩窄类型：

```typescript
// 每个类型都有一个 type 字段作为"标签"
interface LoadingState { type: 'loading'; }
interface SuccessState { type: 'success'; data: string[]; }
interface ErrorState   { type: 'error'; message: string; }

type RequestState = LoadingState | SuccessState | ErrorState;

function render(state: RequestState) {
  switch (state.type) {
    case 'loading':
      return 'Loading...';
    case 'success':
      return state.data.join(', ');  // ✅ 自动缩窄，能访问 data
    case 'error':
      return state.message;          // ✅ 自动缩窄，能访问 message
  }
}

// 这个模式在 React 中非常常见：
// - Redux action 的 type 字段
// - API 响应的 status 字段
// - 组件 props 的 variant 字段
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
