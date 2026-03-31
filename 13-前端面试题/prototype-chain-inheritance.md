# 原型链与继承

> 面试频率：⭐⭐⭐⭐⭐ | 难度：高 | 最后更新：2026-03-31

## 相关笔记

- [原型与原型链（知识笔记版）](../02-JavaScript/原型与原型链.md) — 完整原理、代码示例、继承对比表

---

## 原型链图示

```
实例对象 obj
    │
    │ __proto__（内部属性，= Constructor.prototype）
    ▼
构造函数.prototype
    │ constructor → 指回构造函数
    │ __proto__
    ▼
Object.prototype
    │ __proto__
    ▼
   null（链的终点）
```

```js
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  return `${this.name} speaks`;
};

const dog = new Animal('Dog');

// 原型链：dog → Animal.prototype → Object.prototype → null
console.log(dog.__proto__ === Animal.prototype); // true
console.log(Animal.prototype.__proto__ === Object.prototype); // true
console.log(Object.prototype.__proto__); // null
```

---

## 5 种继承方式

### 1. 原型链继承

```js
function Parent() { this.colors = ['red', 'blue']; }
Parent.prototype.say = function () { console.log('hi'); };

function Child() {}
Child.prototype = new Parent(); // 继承

const c1 = new Child();
const c2 = new Child();
c1.colors.push('green');
console.log(c2.colors); // ['red', 'blue', 'green'] ← 引用共享 BUG！
```

**缺点：** 引用类型属性被所有实例共享；不能向父类传参。

### 2. 构造函数继承（借用构造函数）

```js
function Parent(name) {
  this.name = name;
  this.colors = ['red', 'blue'];
}
function Child(name, age) {
  Parent.call(this, name); // 借用父类构造函数
  this.age = age;
}

const c1 = new Child('Tom', 10);
const c2 = new Child('Jerry', 8);
c1.colors.push('green');
console.log(c2.colors); // ['red', 'blue'] ✅ 不共享
// 但 c1.say() → 报错，无法继承父类原型方法
```

**缺点：** 无法继承父类原型上的方法。

### 3. 组合继承（最常用经典方案）

```js
function Parent(name) {
  this.name = name;
  this.colors = ['red', 'blue'];
}
Parent.prototype.say = function () { console.log(this.name); };

function Child(name, age) {
  Parent.call(this, name); // 第1次调用 Parent
  this.age = age;
}
Child.prototype = new Parent(); // 第2次调用 Parent（多余）
Child.prototype.constructor = Child;

const c1 = new Child('Tom', 10);
c1.say(); // Tom ✅
```

**缺点：** 父类构造函数被调用了两次，Child.prototype 上有多余的属性。

### 4. 寄生组合继承（最优方案）

```js
function Parent(name) {
  this.name = name;
  this.colors = ['red'];
}
Parent.prototype.say = function () { console.log(this.name); };

function Child(name, age) {
  Parent.call(this, name); // 只调用一次
  this.age = age;
}

// 核心：用 Object.create 代替 new Parent()
Child.prototype = Object.create(Parent.prototype);
Child.prototype.constructor = Child;

const c = new Child('Tom', 10);
c.say(); // Tom ✅
console.log(c instanceof Child); // true
console.log(c instanceof Parent); // true
```

**最优：** 只调用一次父类构造函数，原型链干净。

### 5. ES6 Class 继承

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return `${this.name} speaks`;
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name); // 必须先调用 super
    this.breed = breed;
  }
  bark() {
    return `${this.name}: Woof!`;
  }
}

const d = new Dog('Rex', 'Husky');
console.log(d.speak()); // Rex speaks
console.log(d.bark());  // Rex: Woof!
// class 继承本质上是寄生组合继承的语法糖
```

---

## instanceof 原理实现

```js
// instanceof 检查右侧构造函数的 prototype 是否在左侧对象的原型链上
function myInstanceof(left, right) {
  let proto = Object.getPrototypeOf(left); // 等同于 left.__proto__
  const prototype = right.prototype;

  while (proto !== null) {
    if (proto === prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

console.log(myInstanceof([], Array));   // true
console.log(myInstanceof([], Object));  // true（Array.prototype → Object.prototype）
console.log(myInstanceof({}, Array));   // false
```

---

## new 操作符原理

```js
function myNew(Constructor, ...args) {
  // 1. 创建空对象，原型指向构造函数的 prototype
  const obj = Object.create(Constructor.prototype);
  // 2. 执行构造函数，this 绑定到新对象
  const result = Constructor.apply(obj, args);
  // 3. 若构造函数返回对象则用它，否则返回 obj
  return result instanceof Object ? result : obj;
}

function Person(name) { this.name = name; }
const p = myNew(Person, 'Tom');
console.log(p.name); // Tom
```

---

## 面试考点

### 常见问法

1. "原型链是什么？能画出来吗？"
2. "JS 有哪几种继承方式？各有什么优缺点？"
3. "instanceof 是怎么工作的？"
4. "class 和 function 实现继承有什么区别？"
5. "new 操作符做了什么？"

### 答题要点

| 方式 | 优点 | 缺点 |
|------|------|------|
| 原型链 | 简单 | 引用共享、不能传参 |
| 构造函数 | 解决引用共享 | 不继承原型方法 |
| 组合 | 完整 | 调用两次父类构造 |
| 寄生组合 | 最优 | 写法稍复杂 |
| ES6 class | 简洁优雅 | 语法糖，需了解底层 |

- **`__proto__` vs `prototype`**：`__proto__` 是实例的内部链接；`prototype` 是函数才有的属性
- **class 本质**：ES6 class 是寄生组合继承的语法糖，但有些行为不同（如 class 方法不可枚举）

---

`#javascript` `#prototype` `#inheritance` `#interview` `#frontend`
