# Proxy 与 Reflect 实际应用

## Proxy 核心应用场景

### 数据验证与拦截

通过 `set` 拦截器实现表单数据验证，在赋值时自动校验规则，不符合规则直接抛出错误。

```javascript
const createValidator = (target, rules) => {
  return new Proxy(target, {
    set(obj, prop, value) {
      if (rules[prop] && !rules[prop].test(value)) {
        throw new Error(`${prop}验证失败: ${rules[prop].message}`);
      }
      obj[prop] = value;
      return true;
    }
  });
};
```

### 响应式数据系统（Vue 3 原理）

Vue 3 的响应式核心就是基于 Proxy 实现的。在 `get` 中进行依赖收集（track），在 `set` 中触发更新（trigger），对嵌套对象递归代理实现深度响应。

```javascript
const reactive = (target) => {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      track(obj, prop);
      const value = Reflect.get(obj, prop, receiver);
      return typeof value === 'object' ? reactive(value) : value;
    },
    set(obj, prop, value, receiver) {
      const oldValue = obj[prop];
      const result = Reflect.set(obj, prop, value, receiver);
      if (oldValue !== value) trigger(obj, prop);
      return result;
    }
  });
};
```

### 私有属性保护

拦截以 `_` 开头的属性访问，模拟私有属性机制。

### 缓存代理

通过 `apply` 拦截器实现函数结果缓存，将参数序列化为 key，命中缓存直接返回。

```javascript
const createCacheProxy = (fn) => {
  const cache = new Map();
  return new Proxy(fn, {
    apply(target, thisArg, args) {
      const key = JSON.stringify(args);
      if (cache.has(key)) return cache.get(key);
      const result = Reflect.apply(target, thisArg, args);
      cache.set(key, result);
      return result;
    }
  });
};
```

### 默认值处理

访问不存在的属性时返回默认值，而非 `undefined`。

## Reflect 的必要性

大多数情况下 Reflect 看起来和直接操作没区别，但在以下场景中是必需的。

### 在 Proxy 中保证正确的 this 绑定（最重要）

当对象有 getter 且存在继承关系时，不使用 Reflect 会导致 `this` 绑定错误：

```javascript
const obj = {
  _name: 'John',
  get name() { return this._name; }
};

// ❌ 不使用 Reflect：继承链断裂
const proxy1 = new Proxy(obj, {
  get(target, prop) { return target[prop]; }
});
const child = Object.create(proxy1);
child._name = 'Child';
child.name; // "John" ❌ this 指向了 obj

// ✅ 使用 Reflect：正确传递 receiver
const proxy2 = new Proxy(obj, {
  get(target, prop, receiver) {
    return Reflect.get(target, prop, receiver);
  }
});
const child2 = Object.create(proxy2);
child2._name = 'Child';
child2.name; // "Child" ✅ this 正确指向 child2
```

`Reflect.get` 的第三个参数 `receiver` 会作为 getter 中的 `this`，确保原型链上的属性访问行为正确。

### 返回值更合理

直接赋值在严格模式下对不可写属性会抛错，而 `Reflect.set` 返回 `false` 表示失败，程序不中断：

```javascript
const obj = {};
Object.defineProperty(obj, 'name', { value: 'John', writable: false });

// 直接赋值：严格模式下报错
// Reflect.set：返回 false，代码继续执行
if (!Reflect.set(obj, 'name', 'Jane')) {
  console.log('设置失败，但程序不中断');
}
```

### 与 Proxy 的一一对应

Reflect 的 13 个静态方法与 Proxy 的 13 种拦截操作一一对应。在 Proxy 的 handler 中使用 Reflect 执行默认行为，是最安全和规范的做法。这样可以确保在添加自定义逻辑的同时，保留原始操作的语义。

## 总结

Proxy 的核心价值在于元编程能力——拦截和自定义对象的基本操作。Reflect 的核心价值在于为 Proxy 提供安全的默认行为实现，特别是在涉及 `this` 绑定和继承链的场景中不可替代。两者配合使用是现代 JavaScript 元编程的标准模式。
