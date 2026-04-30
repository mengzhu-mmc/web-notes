# TypeScript 内置工具类型 (Utility Types) 深度全解

TypeScript 提供了一系列全局可用的工具类型（Utility Types），用于在已有的类型基础上进行类型转换与操作。理解这些内置类型的源码实现，不仅能在日常业务开发中游刃有余，更是迈向“类型体操”高阶玩家的必经之路。

---

## 零、前置知识：类型体操的三大基石

在深入学习内置工具类型之前，必须先掌握以下三个核心语法，它们是构建几乎所有复杂类型的基础。

### 1. 映射类型 (Mapped Types)
映射类型允许你遍历一个联合类型（通常由 `keyof` 产生），以此来构建一个新的对象类型。它的语法类似于 JavaScript 中的 `for...in` 循环。
**核心语法**：`[P in K]: T`
- **`P`**：遍历时的当前键变量。
- **`K`**：被遍历的联合类型（如 `"name" | "age"`）。
- **修饰符**：可以在前面加上 `+` 或 `-` 来添加或移除特定的修饰符。
  - `?`：表示可选属性。`-?` 表示移除可选特性（即变为必填）。
  - `readonly`：表示只读属性。`-readonly` 表示移除只读限制。

```typescript
// 示例：将所有的属性都变为 string 类型
type Stringify<T> = {
  [P in keyof T]: string;
};
```

### 2. 条件类型 (Conditional Types) & 分配律
条件类型类似于 JavaScript 中的三元表达式，用于根据条件推导类型。
**核心语法**：`T extends U ? X : Y`
- **分配律（Distributive）**：当 `T` 是一个**联合类型**（且没有被泛型对象如数组等包裹）时，条件类型会自动分发（遍历）联合类型中的每一个成员。
  即：`(A | B) extends U ? X : Y` 会被拆解并等价于 `(A extends U ? X : Y) | (B extends U ? X : Y)`。
- **`never` 的妙用**：在 TypeScript 的联合类型中，`never` 代表空集。表达式 `"a" | never` 会被直接折叠化简成 `"a"`。我们可以利用这一点在分配律中“过滤”或“剔除”掉不需要的类型。

### 3. 类型推断 (infer 关键字)
`infer` 只能在条件类型（`extends`）的 `true` 分支中使用。它的作用是**声明一个待推断的类型变量**，让 TypeScript 编译器在匹配结构时，帮我们把结构中的某一部分类型提取出来赋值给这个变量。
**核心思想**：基于结构的模式匹配。
```typescript
// 示例：提取数组的内部元素类型
type GetElementType<T> = T extends Array<infer E> ? E : T;
```

---

## 一、属性修饰类

这类工具主要通过**映射类型**和**修饰符**来改变原有对象属性的特征。

### `Partial<Type>` (全选变为可选)
- **作用**：将类型 `Type` 中的所有属性变为可选（Optional）。需要注意的是，它是浅层的，只作用于对象的第一层级。
- **使用场景**：常用于数据的更新（Update）接口。比如发请求更新用户信息时，可以只传 `name`，不需要把整个 User 结构全传。
- **源码实现**：映射所有属性并加上 `?` 修饰符。
```typescript
type Partial<T> = {
    [P in keyof T]?: T[P];
};
```
- **使用示例**：
```typescript
interface User { id: number; name: string; age: number; }
type UpdateUserDto = Partial<User>; // { id?: number; name?: string; age?: number; }
```

### `Required<Type>` (全选变为必填)
- **作用**：将类型 `Type` 中的所有属性强制变为必填（Required）。
- **使用场景**：组件设计时经常会接收一堆可选的配置项，在组件内部做完默认值合并（Merge）后，我们需要一个属性全部存在的安全类型，以避免在内部到处写 `?.` 可选链调用。
- **源码实现**：利用 `-?` 减去（移除）原有的可选修饰符。
```typescript
type Required<T> = {
    [P in keyof T]-?: T[P];
};
```

### `Readonly<Type>` (只读保护)
- **作用**：将类型 `Type` 中的所有属性变为只读（Readonly），在编译层面禁止重新赋值。同样是浅层的。
- **使用场景**：作为状态管理（如 Redux/Vuex 里的 State）的类型定义，或冻结某些不可变的核心配置对象。
- **源码实现**：在映射类型的前面直接加上 `readonly` 修饰符。
```typescript
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
};
```

---

## 二、结构提取与剔除类

这类工具用于在已有的大型对象类型中，精准地切分出我们需要的子集。

### `Pick<Type, Keys>` (精准拾取)
- **作用**：从对象类型 `Type` 中挑选出指定的属性集合 `Keys`，以此构造一个全新的类型。
- **使用场景**：在展示层（View）中，经常需要从庞大的 Model 类型中提取部分字段。例如文章列表卡片只需要 `title` 和 `author`，不需要巨大的 `content` 字段。
- **源码实现**：首先利用 `K extends keyof T` 限制泛型 `K` 必须是 `T` 已有键的子集，然后通过映射类型把选中的键遍历并映射出来。
```typescript
type Pick<T, K extends keyof T> = {
    [P in K]: T[P];
};

// 使用示例：
type Article = { id: string; title: string; content: string; author: string; };
type ArticleCard = Pick<Article, "title" | "author">;
```

### `Omit<Type, Keys>` (精准剔除)
- **作用**：从对象类型 `Type` 中剔除掉指定的属性集合 `Keys`，保留剩下的所有属性。
- **使用场景**：去除对象中包含敏感信息的字段（如 `password`、`salt`），或在新增数据的 DTO 中去除数据库系统自动生成的字段（如 `id`、`created_at`、`updated_at`）。
- **源码实现**：结合了 `Pick` 和 `Exclude` 实现。核心逻辑是：“先从 `Type` 所有的键里面，把我们不想要的 `Keys` 给 `Exclude` 掉，然后再把剩下的键给 `Pick` 出来”。
```typescript
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
```

---

## 三、联合类型操作类

这类工具的核心原理就是前面提到的**条件类型（Conditional Types）和分配律**。

### `Exclude<UnionType, ExcludedMembers>` (差集/排除)
- **作用**：从联合类型 `UnionType` 中排除掉那些能够赋值给 `ExcludedMembers` 的类型分支。
- **使用场景**：过滤状态字面量。比如一个组件的尺寸类型定义为 `'small' | 'medium' | 'large'`，而在某些特殊变体下不支持 `'small'` 尺寸。
- **源码实现**：
```typescript
type Exclude<T, U> = T extends U ? never : T;

// 运行过程解析：
// 假设执行 Exclude<"a" | "b" | "c", "a">
// => ("a" extends "a" ? never : "a") | ("b" extends "a" ? never : "b") | ("c" extends "a" ? never : "c")
// => never | "b" | "c"
// => "b" | "c"  (never 属于空集，在联合类型中自动消失)
```

### `Extract<Type, Union>` (交集/提取)
- **作用**：提取出 `Type` 中能够赋值给 `Union` 的类型（即求交集）。可以说是 `Exclude` 的反向操作。
- **使用场景**：查找两个不同联合类型中，共同支持的那些成员分支。
- **源码实现**：
```typescript
type Extract<T, U> = T extends U ? T : never;
```

### `NonNullable<Type>` (去空处理)
- **作用**：剔除联合类型中的 `null` 和 `undefined`。
- **使用场景**：在 `strictNullChecks` 开启的情况下，经常配合可选参数，或可能返回空值的 DOM 查询 API 使用，确保后续逻辑拿到的类型一定是实体数据。
- **源码实现**：
```typescript
// TypeScript 4.8 之后采用的高效底层实现（利用交叉类型的非空特性）
type NonNullable<T> = T & {}; 

// TypeScript 早期的实现版本，基于条件类型，更容易理解字面逻辑：
// type NonNullable<T> = T extends null | undefined ? never : T;
```

---

## 四、函数与类相关

这类工具的核心法宝是 **`infer` 关键字**。借助 `infer` 可以在条件类型判断时“顺手牵羊”把函数的出参入参提取出来。

### `Parameters<Type>` (提取入参类型)
- **作用**：获取函数类型 `Type` 的所有参数类型，并将它们按顺序组装成一个元组类型（Tuple）。
- **使用场景**：当我们在对第三方库进行二次封装（如编写高阶组件 HOC、用防抖节流函数包装原函数）时，如果第三方库只导出了函数本身，却没有单独导出它的参数接口类型，我们就可以用 `Parameters<typeof func>` 强行把参数类型“抠”出来复用。
- **源码实现**：使用 `infer P` 对 `(...args)` 整体的类型进行占位推断。
```typescript
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

// 使用示例：
function updateConfig(id: number, config: { text: string; silent?: boolean }) {}

type UpdateParams = Parameters<typeof updateConfig>; 
// 推导出的元组类型：[id: number, config: { text: string; silent?: boolean }]
```

### `ReturnType<Type>` (提取返回值类型)
- **作用**：获取某个函数类型 `Type` 执行后的返回值类型。
- **使用场景**：经常用于 Redux/Vuex 中推导 Action Creator 的返回对象类型；或者基于一些工厂函数的返回值，来逆向推导并定义整个系统下游的业务数据结构。
- **源码实现**：同样使用 `infer R` 放置在箭头 `=>` 的右侧，去截获返回类型。
```typescript
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
```

### （补充）`ConstructorParameters<Type>` & `InstanceType<Type>`
这两个方法与上面极为相似，区别在于它们专门作用于 **Class（类的构造函数）**。
- `ConstructorParameters`：用来提取 `new (...args: infer P) => any` 中的构造函数参数集 `P`。
- `InstanceType`：用来提取实例化后的对象类型，即提取 `new (...args: any) => infer R` 中的实例返回值 `R`。

---

## 五、字符串模版工具类 (TS 4.1+)

自 TS 4.1 引入**模板字面量类型**（Template Literal Types）后，新增了专门操作字符串类型的工具。这些类型在内部通过编译器指令映射到了底层实现，无法纯用 TS 语法完美 1:1 模拟，直接使用即可。

### 1. 转换大小写
- **`Uppercase<StringType>`**：将字符串字面量转为全大写。
- **`Lowercase<StringType>`**：将字符串字面量转为全小写。
### 2. 转换首字母
- **`Capitalize<StringType>`**：将字符串字面量首字母大写。
- **`Uncapitalize<StringType>`**：将字符串字面量首字母小写。

- **深度使用场景**：通常搭配**映射类型（Mapped Types）中引入的 `as` 重新映射语法**，用来做对象属性名的批量自动转换。比如基于一堆属性，自动生成并推导出与之对应的 `get` 和 `set` 拦截器方法名称。
```typescript
type State = { name: string; age: number; };

// 魔法：把 { name: type } 变成 { getName: () => type }
type StateGetters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
};

type MyGetters = StateGetters<State>;
/* 
推导结果：
{
   getName: () => string;
   getAge: () => number;
}
*/
```

---

## 六、其他高频实用类型

### `Record<Keys, Type>` (字典构造)
- **作用**：快速构造一个对象类型。它要求这个对象的所有键名必须被包容在 `Keys` 联合类型中，同时所有的属性值都必须是统一的 `Type` 类型。
- **使用场景**：非常高频！用于快速定义动态的字典对象、Hash Map 数据结构，或者用于统一定义一组具有相同配置形态的页面/表单映射。
- **源码实现**：极其简洁的一个映射遍历。
```typescript
type Record<K extends keyof any, T> = {
    [P in K]: T;
};

// 使用示例：
type PageInfo = { title: string; url: string; };
type AppRoutes = Record<"home" | "about" | "contact", PageInfo>;
```

### `Awaited<Type>` (Promise 深度解包)
- **作用**：递归地解包 `Promise` 的泛型参数类型（表现上完美模拟了原生 JavaScript 中的 `await` 关键字的行为）。
- **使用场景**：在处理多层嵌套的异步函数或进行 `Promise.all` 处理时，我们往往只关心它最底层 `resolve` 出来的实际数据类型是什么，无论外面嵌套了多少层 `Promise`。
- **源码实现**（简化理解版）：利用了条件类型和 `infer` 进行深度递归匹配。
```typescript
type Awaited<T> = T extends null | undefined 
    ? T // 如果是非对象或空值，直接返回
    : T extends object & { then(onfulfilled: infer F, ...args: infer _): any } // 鸭子类型判断是否含有 .then 
        ? F extends ((value: infer V, ...args: infer _) => any) // 如果含有，提取 then 的回调入参 V
            ? Awaited<V> // 拿到 V 后再次递归，拆解到底
            : never
        : T; // 如果不具备 then 方法（不是 Promise），则直接返回原类型 T 
```

---
> 💡 **进阶总结**：
> 掌握**映射类型**、**条件类型**和 **`infer` 推断** 是真正理解 TypeScript 高阶逻辑的万能钥匙。TypeScript 全局内置的这二十几个 Utility Types 不过是这三大基石组合运用出来的“冰山一角”。
> 熟悉了这些原理之后，你甚至可以完全脱离内置库，自己动手写出 `DeepPartial`（深度可选）、`DeepReadonly`（深度只读）、`Mutable`（去除只读） 甚至更复杂的 JSON 数据自动递归推断等强力工具类型！
