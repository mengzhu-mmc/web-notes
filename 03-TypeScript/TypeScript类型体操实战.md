# TypeScript 类型体操实战

> 从入门到进阶，掌握 TypeScript 高级类型编程技巧，轻松应对面试中的类型体操题目。

## 面试高频考点

1. **实现一个 DeepPartial、DeepRequired、DeepReadonly**
2. **实现元组转联合类型、联合类型转元组**
3. **实现字符串类型的解析（如 CamelCase、KebabCase）**
4. **实现递归类型的扁平化**
5. **实现类型的柯里化（Curry）**

---

## 一、类型体操基础工具

### 1.1 类型关键字速查

| 关键字 | 作用 |
|--------|------|
| `extends` | 条件判断、泛型约束 |
| `infer` | 类型推断，用于提取类型 |
| `keyof` | 获取对象类型的所有键 |
| `typeof` | 获取值的类型 |
| `in` | 映射类型的遍历 |
| `as` | 类型断言、重映射 |
| `&` | 交叉类型 |
| `\|` | 联合类型 |

### 1.2 递归基础

```typescript
// 递归终止条件 + 递归调用
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object 
    ? DeepReadonly<T[K]> 
    : T[K];
};
```

---

## 二、实用工具类型实现

### 2.1 深度工具类型

```typescript
// 深度 Partial：所有属性变为可选，递归处理嵌套对象
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 深度 Required：所有属性变为必选，递归处理嵌套对象
type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// 深度 Readonly：所有属性变为只读，递归处理嵌套对象
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// 使用示例
interface User {
  name: string;
  address: {
    city: string;
    street: string;
  };
}

type PartialUser = DeepPartial<User>;
// { name?: string; address?: { city?: string; street?: string; }; }
```

### 2.2 对象路径相关

```typescript
// 获取对象的所有路径（用于深层取值）
type Path<T, K extends keyof T = keyof T> = K extends string
  ? T[K] extends object
    ? `${K}` | `${K}.${Path<T[K]>}`
    : `${K}`
  : never;

// 根据路径获取值的类型
type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
  ? T[P]
  : never;

// 使用示例
interface Data {
  user: {
    name: string;
    age: number;
  };
  list: string[];
}

type DataPaths = Path<Data>; // "user" | "user.name" | "user.age" | "list"
type NameType = PathValue<Data, "user.name">; // string
```

---

## 三、字符串类型操作

### 3.1 字符串模板匹配

```typescript
// CamelCase 转 KebabCase
type KebabCase<S extends string> = S extends `${infer C}${infer Rest}`
  ? Rest extends Uncapitalize<Rest>
    ? `${Lowercase<C>}${KebabCase<Rest>}`
    : `${Lowercase<C>}-${KebabCase<Rest>}`
  : S;

// 使用示例
type T1 = KebabCase<"FooBarBaz">; // "foo-bar-baz"
type T2 = KebabCase<"fooBar">;    // "foo-bar"

// KebabCase 转 CamelCase
type CamelCase<S extends string> = S extends `${infer P}-${infer Q}${infer R}`
  ? `${P}${Uppercase<Q>}${CamelCase<R>}`
  : S;

// 使用示例
type T3 = CamelCase<"foo-bar-baz">; // "fooBarBaz"
```

### 3.2 字符串解析

```typescript
// 解析 URL 参数
type ParseQueryString<S extends string> = 
  S extends `${infer Param}&${infer Rest}`
    ? ParseParam<Param> & ParseQueryString<Rest>
    : ParseParam<S>;

type ParseParam<S extends string> = 
  S extends `${infer K}=${infer V}`
    ? { [P in K]: V }
    : {};

// 使用示例
type Query = ParseQueryString<"a=1&b=2&c=3">;
// { a: "1"; b: "2"; c: "3"; }
```

---

## 四、数组/元组操作

### 4.1 元组长度与元素获取

```typescript
// 获取元组长度
type Length<T extends readonly any[]> = T['length'];

// 获取元组第一个元素
type First<T extends readonly any[]> = T extends [infer F, ...any[]] ? F : never;

// 获取元组最后一个元素
type Last<T extends readonly any[]> = T extends [...any[], infer L] ? L : never;

// 去掉第一个元素
type Tail<T extends readonly any[]> = T extends [any, ...infer Rest] ? Rest : never;

// 去掉最后一个元素
type Init<T extends readonly any[]> = T extends [...infer Rest, any] ? Rest : never;

// 使用示例
type T1 = Length<[1, 2, 3]>;  // 3
type T2 = First<[1, 2, 3]>;   // 1
type T3 = Last<[1, 2, 3]>;    // 3
type T4 = Tail<[1, 2, 3]>;    // [2, 3]
```

### 4.2 元组转联合类型

```typescript
// 元组转联合类型
type TupleToUnion<T extends readonly any[]> = T[number];

// 使用示例
type T = TupleToUnion<[string, number, boolean]>;
// string | number | boolean

// 联合类型转元组（需要递归）
type UnionToTuple<U, Last = LastInUnion<U>> = [U] extends [never]
  ? []
  : [...UnionToTuple<Exclude<U, Last>>, Last];

type LastInUnion<U> = UnionToIntersection<
  U extends any ? (x: U) => void : never
> extends (x: infer L) => void
  ? L
  : never;

type UnionToIntersection<U> = (
  U extends any ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

// 使用示例
type T5 = UnionToTuple<"a" | "b" | "c">;
// ["a", "b", "c"] 或类似顺序
```

---

## 五、高级类型挑战

### 5.1 柯里化（Curry）

```typescript
// 函数柯里化类型
type Curried<T> = T extends (...args: infer A) => infer R
  ? A extends [infer F, ...infer Rest]
    ? (arg: F) => Curried<(...args: Rest) => R>
    : R
  : never;

// 使用示例
declare function curry<T extends (...args: any[]) => any>(fn: T): Curried<T>;

const add = (a: number, b: number, c: number) => a + b + c;
const curriedAdd = curry(add);
// curriedAdd: (a: number) => (b: number) => (c: number) => number
```

### 5.2 Promise 链式类型

```typescript
// 提取 Promise 的返回值类型
type MyAwaited<T> = T extends Promise<infer R> ? MyAwaited<R> : T;

// 使用示例
type T1 = MyAwaited<Promise<string>>;           // string
type T2 = MyAwaited<Promise<Promise<number>>>;  // number

// 实现 Promise.all 类型
type PromiseAll<T extends readonly unknown[]> = Promise<{
  -readonly [P in keyof T]: MyAwaited<T[P]>;
}>;

// 使用示例
declare function promiseAll<T extends readonly unknown[]>(
  values: T
): PromiseAll<T>;

const p = promiseAll([Promise.resolve(1), Promise.resolve("a"), Promise.resolve(true)]);
// p: Promise<[number, string, boolean]>
```

### 5.3 扁平化类型

```typescript
// 数组扁平化类型
type Flatten<T extends any[]> = T extends [infer F, ...infer R]
  ? F extends any[]
    ? [...Flatten<F>, ...Flatten<R>]
    : [F, ...Flatten<R>]
  : [];

// 使用示例
type T1 = Flatten<[1, [2, 3], [[4]]]>;
// [1, 2, 3, 4]

// 指定深度的扁平化
type FlattenDepth<
  T extends any[],
  D extends number = 1,
  C extends any[] = []
> = C['length'] extends D
  ? T
  : T extends [infer F, ...infer R]
  ? F extends any[]
    ? [...FlattenDepth<F, D, [...C, 1]>, ...FlattenDepth<R, D, C>]
    : [F, ...FlattenDepth<R, D, C>]
  : [];

// 使用示例
type T2 = FlattenDepth<[1, [2, [3, [4]]]], 2>;
// [1, 2, 3, [4]]
```

---

## 六、实战面试题

### 6.1 实现一个完整的 DeepOmit

```typescript
// 深度 Omit：可以省略嵌套对象的属性
type DeepOmit<T, K extends string> = K extends `${infer F}.${infer R}`
  ? F extends keyof T
    ? { [P in keyof T]: P extends F ? DeepOmit<T[P], R> : T[P] }
    : T
  : Omit<T, K>;

// 使用示例
interface User {
  name: string;
  age: number;
  address: {
    city: string;
    street: string;
  };
}

type T1 = DeepOmit<User, "age">;
// { name: string; address: { city: string; street: string; }; }

type T2 = DeepOmit<User, "address.city">;
// { name: string; age: number; address: { street: string; }; }
```

### 6.2 实现类型守卫

```typescript
// 根据值类型创建类型守卫
type TypeGuard<T, U extends T> = (value: T) => value is U;

// 实现 isString 类型守卫
type IsString = TypeGuard<unknown, string>;
const isString: IsString = (value): value is string => 
  typeof value === 'string';

// 实现 isArrayOf 高阶类型守卫
type IsArrayOf<T> = (value: unknown) => value is T[];
function isArrayOf<T>(guard: (x: unknown) => x is T): IsArrayOf<T> {
  return (value): value is T[] => 
    Array.isArray(value) && value.every(guard);
}
```

---

## 七、类型体操技巧总结

### 7.1 解题步骤

1. **分析输入输出**：明确泛型参数和返回值类型
2. **确定终止条件**：递归类型需要明确的终止条件
3. **使用 infer 提取**：利用条件类型 + infer 提取子类型
4. **组合基础工具**：将复杂类型拆解为简单类型的组合

### 7.2 常见模式

```typescript
// 模式 1：条件分发
T extends SomeType ? TrueCase : FalseCase;

// 模式 2：infer 提取
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 模式 3：递归处理
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// 模式 4：模板字符串匹配
T extends `${infer A}${infer B}` ? ... : never;

// 模式 5：映射类型重映射
{ [K in keyof T as NewKey]: NewValue }
```

---

## 参考资源

- [TypeScript 官方文档 - 高级类型](https://www.typescriptlang.org/docs/handbook/advanced-types.html)
- [type-challenges](https://github.com/type-challenges/type-challenges) - 类型体操练习题库
- [utility-types](https://github.com/piotrwitek/utility-types) - 实用工具类型集合
