# Proxy vs Object.defineProperty 对比

## 核心区别

`Object.defineProperty` 基于"属性"维度，只能拦截属性的读取（get）和设置（set），必须遍历已有属性逐个绑定。`Proxy` 基于"对象"维度，拦截整个对象的操作，支持 13 种拦截操作（get、set、deleteProperty、has、ownKeys、apply、construct 等）。

## 关键差异

### 数组支持

`Object.defineProperty` 无法监听通过下标改变数组元素（`arr[1] = 10`）或改变数组长度。Vue 2 不得不重写了数组的 `push`、`pop`、`splice` 等 7 个方法。`Proxy` 完美支持数组，下标赋值和方法调用都能触发拦截。

### 新增属性感知

`Object.defineProperty` 只能劫持初始化时定义的属性，新增属性监听不到（Vue 2 需要 `Vue.set()`）。`Proxy` 代理整个对象，后续新增的属性也能被拦截。

## 代码对比

```javascript
// Object.defineProperty：必须遍历现有属性
Object.keys(obj).forEach(key => {
  let value = obj[key];
  Object.defineProperty(obj, key, {
    get() { return value; },
    set(newValue) { value = newValue; }
  });
});
obj.newProp = 1; // 监听不到

// Proxy：代理整个对象
const proxy = new Proxy(obj, {
  get(target, key) { return Reflect.get(target, key); },
  set(target, key, value) { return Reflect.set(target, key, value); }
});
proxy.newProp = 1; // 能监听到
```

## 为什么还要了解 defineProperty

`Proxy` 是 ES6 特性，无法被 Polyfill（无法转译降级），不支持 IE 浏览器。如果需要兼容 IE，只能使用 `Object.defineProperty`。现代浏览器中性能差异已可忽略不计。

## 总结

`Proxy` 是 `getter/setter` 的超集和增强版。Vue 3 已全面切换到 `Proxy`，Vue 2 使用 `Object.defineProperty`。面向现代浏览器的应用首选 `Proxy`。
