# Symbol 类型

> ES6 引入的第七种原始类型，创建唯一标识符

---

## 基本用法

```js
const s1 = Symbol();
const s2 = Symbol('desc');
const s3 = Symbol('desc');

s1 === s2;  // false — 每次调用返回唯一值
s2 === s3;  // false — 即使描述相同也不相等
```

## 特性

- **原始类型**：`typeof Symbol() === 'symbol'`
- **不可 new**：`new Symbol()` 会报错
- **隐式转字符串**：`String(s)` 或 `s.toString()`
- **不可运算**：不能与字符串拼接，会报错

## Symbol.for() — 全局共享

```js
const s1 = Symbol.for('key');
const s2 = Symbol.for('key');
s1 === s2;  // true — 全局注册表中查找，存在则复用

Symbol.keyFor(s1);  // 'key' — 获取登记名
```

## 内置 Symbol

| Symbol | 用途 |
|---|---|
| `Symbol.iterator` | 定义对象的默认迭代器 |
| `Symbol.toStringTag` | 自定义 `Object.prototype.toString` 返回值 |
| `Symbol.hasInstance` | 自定义 `instanceof` 行为 |
| `Symbol.toPrimitive` | 自定义对象转原始值 |
| `Symbol.match/search/replace/split` | 自定义字符串方法行为 |
| `Symbol.unscopables` | 指定 `with` 排除的属性 |

## 作为对象属性

```js
const obj = {
  [Symbol('id')]: 123,
  name: 'test'
};

// Symbol 属性不会被遍历
Object.keys(obj);         // ['name']
Object.getOwnPropertyNames(obj);  // ['name']

// 必须用专门方法获取
Object.getOwnPropertySymbols(obj);  // [Symbol(id)]
Reflect.ownKeys(obj);     // ['name', Symbol(id)]
```

## 实际应用场景

### 1. 防止属性名冲突
```js
// 库作者使用 Symbol 避免与用户属性冲突
const MY_LIB_KEY = Symbol('my-lib');
obj[MY_LIB_KEY] = { ... };
```

### 2. 模拟私有属性
```js
const _private = Symbol('private');
class MyClass {
  constructor() {
    this[_private] = 'secret';
  }
}
```

### 3. 定义常量
```js
const COLOR = {
  RED: Symbol('red'),
  GREEN: Symbol('green'),
  BLUE: Symbol('blue')
};
```
