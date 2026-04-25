# this 指向详解

> JavaScript 中 this 的绑定规则与常见场景

---

## 核心原则

**this 不是定义时确定的，而是调用时确定的。** 取决于函数的调用方式。

## 四种绑定规则（优先级从高到低）

### 1. new 绑定（最高优先级）
```js
function Person(name) {
  this.name = name;
}
const p = new Person('Tom');
// this → 新创建的对象
```

### 2. 显式绑定（call / apply / bind）
```js
function greet() { console.log(this.name); }
const obj = { name: 'Tom' };

greet.call(obj);     // 'Tom'
greet.apply(obj);    // 'Tom'
const bound = greet.bind(obj);
bound();             // 'Tom'
```

### 3. 隐式绑定（对象.方法）
```js
const obj = {
  name: 'Tom',
  greet() { console.log(this.name); }
};
obj.greet();  // 'Tom' — this → obj

// 丢失隐式绑定
const fn = obj.greet;
fn();  // undefined（严格模式）/ window（非严格）
```

### 4. 默认绑定（独立调用）
```js
function foo() { console.log(this); }
foo();  // 非严格 → window，严格模式 → undefined
```

## 箭头函数的 this

**箭头函数没有自己的 this，继承外层词法作用域的 this。**

```js
const obj = {
  name: 'Tom',
  regular() { setTimeout(function() { console.log(this.name); }, 100); },
  arrow()   { setTimeout(() => { console.log(this.name); }, 100); }
};

obj.regular();  // undefined — 回调中 this → window
obj.arrow();    // 'Tom' — 继承 obj
```

**箭头函数不能被 call/apply/bind 改变 this：**
```js
const arrow = () => console.log(this.name);
arrow.call({ name: 'Tom' });  // 无效，仍用外层 this
```

## 常见场景

### DOM 事件
```js
button.addEventListener('click', function() {
  console.log(this);  // → button 元素
});

button.addEventListener('click', () => {
  console.log(this);  // → 外层 this（不是 button）
});
```

### 类方法
```js
class Counter {
  count = 0;
  increment() { this.count++; }
  handleClick = () => { this.count++; }  // 箭头函数绑定 this
}
```

### 链式调用
```js
const obj = {
  a: { b: { fn() { console.log(this); } } }
};
obj.a.b.fn();  // this → obj.a.b（最后一层调用者）
```

## 优先级速记

```
new > call/apply/bind > obj.fn() > 独立调用
箭头函数 → 不走上述规则，继承外层
```
