# 手写 instanceof

> 考察原型链理解，高频基础题。

---

## 原理

`a instanceof B` 的本质：沿着 `a` 的原型链查找，看能否找到 `B.prototype`。

```js
function myInstanceof(obj, Constructor) {
  // 基础类型直接返回 false
  if (obj === null || typeof obj !== 'object' && typeof obj !== 'function') {
    return false;
  }

  let proto = Object.getPrototypeOf(obj); // 等同于 obj.__proto__

  while (proto !== null) {
    if (proto === Constructor.prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }

  return false;
}
```

---

## 测试用例

```js
myInstanceof([], Array)        // true
myInstanceof([], Object)       // true（Array.prototype 的原型是 Object.prototype）
myInstanceof({}, Array)        // false
myInstanceof(null, Object)     // false（特殊处理）
myInstanceof('hello', String)  // false（基础类型）

function Foo() {}
const foo = new Foo();
myInstanceof(foo, Foo)         // true
myInstanceof(foo, Object)      // true
```

---

## 面试追问

| 问题 | 答案 |
|------|------|
| `typeof` vs `instanceof` 区别？ | `typeof` 判断基础类型（返回字符串）；`instanceof` 判断引用类型的原型链归属 |
| `null instanceof Object` 为什么是 false？ | `instanceof` 左值必须是对象，`null` 不是对象 |
| `[] instanceof Array` 和 `Array.isArray([])` 哪个更可靠？ | `Array.isArray` 更可靠，跨 iframe 环境下原型链不同导致 `instanceof` 失效 |
| 原型链的终点是什么？ | `Object.prototype.__proto__ === null` |
