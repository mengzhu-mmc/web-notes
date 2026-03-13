# TypeScript 进阶特性

## 面试高频考点

- 泛型的使用场景和约束？
- 条件类型和映射类型？
- 内置工具类型（Partial、Required、Pick、Omit 等）？
- 类型守卫有哪些方式？
- 装饰器的使用？
- TypeScript 如何处理第三方库的类型？

---

## 一、泛型（Generics）

### 基础用法

```typescript
// 泛型函数：保留类型信息
function identity<T>(arg: T): T {
  return arg;
}
identity<string>('hello'); // 显式指定
identity(42);              // 类型推断

// 泛型接口
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 使用
const userResponse: ApiResponse<{ name: string; age: number }> = {
  code: 200,
  message: 'success',
  data: { name: '张三', age: 25 }
};
```

### 泛型约束

```typescript
// extends 约束：T 必须有 length 属性
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length;
}
getLength('hello');  // ✅
getLength([1, 2, 3]); // ✅
getLength(42);        // ❌ number 没有 length

// keyof 约束：K 必须是 T 的键
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { name: '张三', age: 25 };
getProperty(user, 'name'); // ✅ 返回 string
getProperty(user, 'xxx');  // ❌ 编译错误

// 多个泛型参数
function merge<T extends object, U extends object>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}
```

### 泛型类

```typescript
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  get size(): number {
    return this.items.length;
  }
}

const numStack = new Stack<number>();
numStack.push(1);
numStack.push(2);
numStack.pop(); // 2
```

---

## 二、内置工具类型

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
}

// Partial<T>：所有属性变为可选
type PartialUser = Partial<User>;
// { id?: number; name?: string; email?: string; age?: number }

// Required<T>：所有属性变为必选
type RequiredUser = Required<User>;
// { id: number; name: string; email: string; age: number }

// Readonly<T>：所有属性变为只读
type ReadonlyUser = Readonly<User>;
// { readonly id: number; readonly name: string; ... }

// Pick<T, K>：选取指定属性
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: number; name: string }

// Omit<T, K>：排除指定属性
type UserWithoutId = Omit<User, 'id'>;
// { name: string; email: string; age?: number }

// Record<K, V>：创建键值对类型
type UserMap = Record<string, User>;
// { [key: string]: User }

// Exclude<T, U>：从联合类型中排除
type T1 = Exclude<'a' | 'b' | 'c', 'a' | 'b'>; // 'c'

// Extract<T, U>：从联合类型中提取
type T2 = Extract<'a' | 'b' | 'c', 'a' | 'b'>; // 'a' | 'b'

// NonNullable<T>：排除 null 和 undefined
type T3 = NonNullable<string | null | undefined>; // string

// ReturnType<T>：获取函数返回值类型
function fetchUser(): Promise<User> { /* ... */ }
type FetchResult = ReturnType<typeof fetchUser>; // Promise<User>

// Parameters<T>：获取函数参数类型
function createUser(name: string, age: number): User { /* ... */ }
type CreateParams = Parameters<typeof createUser>; // [string, number]

// InstanceType<T>：获取构造函数实例类型
class MyClass { value = 42; }
type MyInstance = InstanceType<typeof MyClass>; // MyClass
```

---

## 三、条件类型

```typescript
// 基础条件类型
type IsString<T> = T extends string ? 'yes' : 'no';
type A = IsString<string>; // 'yes'
type B = IsString<number>; // 'no'

// infer：在条件类型中推断类型
type UnpackPromise<T> = T extends Promise<infer U> ? U : T;
type C = UnpackPromise<Promise<string>>; // string
type D = UnpackPromise<number>;          // number

// 获取函数返回值（手写 ReturnType）
type MyReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : never;

// 分布式条件类型
type ToArray<T> = T extends any ? T[] : never;
type E = ToArray<string | number>; // string[] | number[]
```

---

## 四、映射类型

```typescript
// 基础映射类型
type Readonly2<T> = {
  readonly [K in keyof T]: T[K];
};

type Optional<T> = {
  [K in keyof T]?: T[K];
};

// 修改属性类型
type Stringify<T> = {
  [K in keyof T]: string;
};

// 过滤属性（条件类型 + 映射类型）
type FilterOptional<T> = {
  [K in keyof T as T[K] extends undefined ? never : K]: T[K];
};

// 重映射（as 子句）
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person { name: string; age: number; }
type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }
```

---

## 五、类型守卫

```typescript
// 1. typeof 守卫
function processValue(value: string | number) {
  if (typeof value === 'string') {
    return value.toUpperCase(); // 这里 value 是 string
  }
  return value.toFixed(2); // 这里 value 是 number
}

// 2. instanceof 守卫
class Dog { bark() {} }
class Cat { meow() {} }

function makeSound(animal: Dog | Cat) {
  if (animal instanceof Dog) {
    animal.bark(); // 这里 animal 是 Dog
  } else {
    animal.meow(); // 这里 animal 是 Cat
  }
}

// 3. in 守卫
interface Fish { swim(): void; }
interface Bird { fly(): void; }

function move(animal: Fish | Bird) {
  if ('swim' in animal) {
    animal.swim(); // Fish
  } else {
    animal.fly();  // Bird
  }
}

// 4. 自定义类型守卫（is 关键字）
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function processUnknown(value: unknown) {
  if (isString(value)) {
    console.log(value.toUpperCase()); // value 被收窄为 string
  }
}

// 5. 断言函数（asserts）
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('Not a string!');
  }
}

function process(value: unknown) {
  assertIsString(value);
  console.log(value.toUpperCase()); // 断言后，value 是 string
}
```

---

## 六、实用技巧

### 模板字面量类型

```typescript
type EventName = 'click' | 'focus' | 'blur';
type Handler = `on${Capitalize<EventName>}`; // 'onClick' | 'onFocus' | 'onBlur'

// API 路径类型
type ApiPath = `/api/${string}`;
const path: ApiPath = '/api/users'; // ✅
const invalid: ApiPath = '/users';  // ❌
```

### 递归类型

```typescript
// 深度 Readonly
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// 深度 Partial
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// JSON 类型
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
```

### 函数重载

```typescript
// 重载签名
function createElement(tag: 'div'): HTMLDivElement;
function createElement(tag: 'span'): HTMLSpanElement;
function createElement(tag: 'input'): HTMLInputElement;
// 实现签名（不对外暴露）
function createElement(tag: string): HTMLElement {
  return document.createElement(tag);
}

const div = createElement('div');   // HTMLDivElement
const span = createElement('span'); // HTMLSpanElement
```

### 声明合并与模块扩展

```typescript
// 扩展第三方库的类型
// 例如：给 Express Request 添加自定义属性
declare namespace Express {
  interface Request {
    user?: { id: string; name: string };
  }
}

// 扩展 Window 对象
declare interface Window {
  myGlobalVar: string;
  analytics: { track: (event: string) => void };
}
```
