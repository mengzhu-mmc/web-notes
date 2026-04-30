# TypeScript 内置工具类型 (Utility Types) 全解

TypeScript 提供了一系列全局可用的工具类型（Utility Types），用于在已有的类型基础上进行类型转换与操作。理解这些内置类型的源码实现，是迈向“类型体操”高阶玩家的必经之路。

## 1. 属性修饰类

### `Partial<Type>`
- **作用**：将类型 `Type` 中的所有属性变为可选（Optional）。
- **使用场景**：通常用于对象的更新（Update）操作，例如表单部分字段的更新、状态的局部 `setState` 等。
- **实现原理**：通过映射类型（Mapped Types）遍历所有键，并加上 `?` 修饰符。
```typescript
type Partial<T> = {
    [P in keyof T]?: T[P];
};

// 示例
interface User { name: string; age: number; }
type PartialUser = Partial<User>; // { name?: string; age?: number; }
```

### `Required<Type>`
- **作用**：将类型 `Type` 中的所有属性变为必填（Required）。
- **使用场景**：当配置项接口全部为可选属性时，我们在内部做默认值合并后，需要一个确定所有属性都存在的类型。
- **实现原理**：通过映射类型，并使用 `-?` 减去可选修饰符。
```typescript
type Required<T> = {
    [P in keyof T]-?: T[P];
};
```

### `Readonly<Type>`
- **作用**：将类型 `Type` 中的所有属性变为只读（Readonly），不可重新赋值。
- **使用场景**：保护数据在函数流转中不被意外修改（例如冻结配置对象）。
- **实现原理**：使用 `readonly` 修饰符。
```typescript
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
};
```

## 2. 结构提取与剔除类

### `Pick<Type, Keys>`
- **作用**：从类型 `Type` 中挑选出指定的属性集 `Keys` 组成新的类型。
- **使用场景**：当接口有大量属性，但某个函数只需要其中一部分字段时（例如仅展示用户的 `name` 和 `avatar`）。
- **实现原理**：映射选定的键，在原类型中提取对应的值类型。
```typescript
type Pick<T, K extends keyof T> = {
    [P in K]: T[P];
};

// 示例
type NameOnly = Pick<User, "name">; // { name: string; }
```

### `Omit<Type, Keys>`
- **作用**：从类型 `Type` 中剔除指定的属性集 `Keys`，保留剩下的属性。
- **使用场景**：去除对象中敏感字段（如 `password`）或自动生成的系统字段（如 `id`、`createdAt`，在新增数据时通常不需要传）。
- **实现原理**：结合 `Pick` 和 `Exclude` 实现。先剔除不需要的键，再把剩下的键挑出来。
```typescript
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
```

## 3. 联合类型操作类

### `Exclude<UnionType, ExcludedMembers>`
- **作用**：从联合类型 `UnionType` 中排除掉能赋值给 `ExcludedMembers` 的类型。
- **使用场景**：过滤掉不需要的联合类型成员，例如从一组状态字符串中排除错误状态。
- **实现原理**：利用条件类型（Conditional Types）的分配律特性，成立则返回 `never`（在联合类型中会被丢弃），不成立则保留本身。
```typescript
type Exclude<T, U> = T extends U ? never : T;

// 示例
type T0 = Exclude<"a" | "b" | "c", "a">; // "b" | "c"
```

### `Extract<Type, Union>`
- **作用**：提取出 `Type` 中能赋值给 `Union` 的类型（求交集）。
- **使用场景**：找出两个联合类型的公共部分。
- **实现原理**：条件类型分配律，匹配则保留，不匹配返回 `never`。
```typescript
type Extract<T, U> = T extends U ? T : never;
```

### `NonNullable<Type>`
- **作用**：剔除类型中的 `null` 和 `undefined`。
- **使用场景**：在严格模式下确保某个值一定是有效值，常用在获取 DOM 节点或可选参数后的断言。
- **实现原理**：使用交叉类型或条件类型排除空值。
```typescript
type NonNullable<T> = T & {}; // TS 4.8 后的简化实现
// 老版本实现：type NonNullable<T> = T extends null | undefined ? never : T;
```

## 4. 函数相关类

### `Parameters<Type>`
- **作用**：获取函数类型 `Type` 的所有参数类型，并返回一个元组类型（Tuple）。
- **使用场景**：当你需要调用第三方库的一个函数，但该库未导出其参数类型时，可通过 typeof 提取。
- **实现原理**：使用 `infer` 关键字在条件类型中提取参数推断类型。
```typescript
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

// 示例
declare function f1(arg: { a: number; b: string }): void;
type T1 = Parameters<typeof f1>; // [{ a: number, b: string }]
```

### `ReturnType<Type>`
- **作用**：获取函数类型 `Type` 的返回值类型。
- **使用场景**：经常用于 Redux 的 Action Creator 类型推导，或者基于现有函数的返回值定义其他依赖的类型。
- **实现原理**：同样使用 `infer` 提取函数的返回类型。
```typescript
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
```

## 5. 字符串模版工具类 (TS 4.1+)

### `Uppercase<StringType>` / `Lowercase<StringType>`
- **作用**：将字符串字面量类型转换为全大写 / 全小写。

### `Capitalize<StringType>` / `Uncapitalize<StringType>`
- **作用**：将字符串字面量类型的首字母转换为大写 / 小写。
- **使用场景**：配合映射类型和 `as` 子句，实现 getter/setter 方法名称的自动生成（如 `name` -> `getName`）。

```typescript
type GetterName<T extends string> = `get${Capitalize<T>}`;
type T1 = GetterName<'name'>; // "getName"
```

## 6. 其他实用类型

### `Record<Keys, Type>`
- **作用**：构造一个对象类型，其属性键为 `Keys`，属性值为 `Type`。
- **使用场景**：定义字典、Map 等键值对结构（如 `Record<string, any>`）。
- **实现原理**：映射遍历 Keys 联合类型。
```typescript
type Record<K extends keyof any, T> = {
    [P in K]: T;
};
```

### `Awaited<Type>`
- **作用**：递归地解包 Promise 的泛型参数（类似 `await` 的行为）。
- **使用场景**：获取异步函数最终 resolve 出的数据类型。
- **实现原理**：利用递归条件类型不断拆解 `Promise`，直到不是 Promise 为止。
```typescript
// 简化版概念
type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;
```

---
> 💡 **进阶建议**：
> 以上这些都是 TypeScript 全局自动注入的类型，它们绝大部分并不是通过底层 C++ 硬编码实现的，而是通过 `mapped types`、`conditional types`、`infer` 这三大法宝在声明文件中组合出来的。
> 掌握它们的源码，意味着你已经具备了手写复杂“类型体操”的基础能力！
