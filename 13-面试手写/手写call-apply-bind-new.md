# 手写 call / apply / bind / new

## 面试高频考点

- 手写 `Function.prototype.call`
- 手写 `Function.prototype.new`
- `Object.create` 和直接赋值 `__proto__` 的区别？
- 为什么 call 实现中要用 `Object(ctx)` 包装原始值？

---

## 一、手写 call

```js
Function.prototype.myCall = function (ctx, ...args) {
  // 处理 null/undefined 指向 globalThis，原始值包装成对象
  ctx = ctx == null ? globalThis : Object(ctx);
  const symbol = Symbol();
  ctx[symbol] = this;
  const res = ctx[symbol](...args);
  delete ctx[symbol]; // 清理临时属性
  return res;
};
```

### 关键细节

**为什么用 `Object(ctx)` 包装原始值？**

原始值（如数字、字符串）无法添加属性，而我们的实现需要把函数挂到 `ctx` 上。同时原生 `call` 在非严格模式下会自动将原始值包装成对应的包装对象。

```js
const num = 1;
num.foo = 'bar';
console.log(num.foo); // undefined ❌ 原始值无法挂载属性

const numObj = Object(1); // Number {1}
numObj.foo = 'bar';
console.log(numObj.foo); // 'bar' ✅
```

**为什么用 `ctx == null` 而不是 `ctx ?? window`？**

`??` 只处理 `null`/`undefined`，但不处理原始值。`== null` 同时匹配 `null` 和 `undefined`，配合 `Object(ctx)` 处理原始值更严谨。

**为什么用 `globalThis` 而不是 `window`？**

Node.js 环境中没有 `window`，`globalThis` 是跨环境通用的全局对象引用。

## 二、手写 new

```js
function myNew(Constructor, ...args) {
  // 1. 创建空对象，并关联原型（一步到位）
  const obj = Object.create(Constructor.prototype);

  // 2. 执行构造函数，绑定 this
  const res = Constructor.apply(obj, args);

  // 3. 判断返回值：对象则用返回值，否则用创建的对象
  return res instanceof Object ? res : obj;
}
```

### new 背后做了什么？

1. 创建一个空对象
2. 将空对象的 `__proto__` 指向构造函数的 `prototype`
3. 将构造函数的 `this` 指向该空对象并执行
4. 判断构造函数返回值：返回对象则使用该返回值，返回原始值或无返回则使用创建的对象

### 为什么用 Object.create 而不是直接赋值？

| 写法 | 是否标准 | 性能 | 推荐度 |
| --- | --- | --- | --- |
| `Object.create(Constructor.prototype)` | ✅ 标准 | 最好 | ⭐⭐⭐ |
| `obj.__proto__ = Constructor.prototype` | ❌ 非标准 | 较差 | ⭐ |
| `Object.setPrototypeOf(obj, Constructor.prototype)` | ✅ 标准 | 较差 | ⭐⭐ |

`Object.create(proto)` 在创建对象时直接指定原型，一步完成，引擎可以直接优化。而修改已有对象的原型是一个很慢的操作，引擎需要破坏已有优化。

### 验证

```js
function Person(name, age) {
  this.name = name;
  this.age = age;
}
Person.prototype.sayHi = function () {
  console.log(`hi, I'm ${this.name}`);
};

const p = myNew(Person, '张三', 18);
console.log(p.name); // '张三'
p.sayHi(); // hi, I'm 张三
console.log(p instanceof Person); // true
```

## 三、手写 instanceof

```js
function myInstanceof(left, right) {
  let prototype = right.prototype;
  let proto = Object.getPrototypeOf(left);

  while (true) {
    if (proto === null) return false;
    if (proto === prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
}
```
