# Vue3 响应式原理与 Proxy 深度解析

> 💡 **导读**：本文全面解析 Vue 3 是如何利用 ES6 的 `Proxy` 取代 Vue 2 的 `Object.defineProperty` 实现响应式系统，并深入探究其依赖收集与派发更新的底层机制。

## 一、为什么 Vue 3 要放弃 Object.defineProperty？

在 Vue 2 中，响应式系统是通过 `Object.defineProperty` 遍历对象的每一个属性，将它们转换为 getter/setter 来实现的。这种方式存在几个无法逾越的致命缺陷：

1. **无法检测对象属性的添加或删除**：由于初始化时只对已有的属性进行了响应式拦截，后续如果直接 `obj.newProp = 1` 是不会触发视图更新的。开发者只能被迫使用 `Vue.set()` 或 `this.$set()` 这样的补丁 API。
2. **无法拦截数组的索引修改和长度变更**：使用 `arr[0] = 1` 或者 `arr.length = 0` 不会触发更新。Vue 2 被迫重写了数组的 7 个变更方法（`push`, `pop`, `splice` 等）来解决这个问题。
3. **性能瓶颈**：如果数据结构嵌套很深，Vue 2 会在组件初始化时，**递归地深度遍历**整个大对象去绑定 getter/setter，非常消耗性能，拖慢首屏加载速度。

## 二、Vue 3 拥抱 Proxy

ES6 的 `Proxy` 不再是劫持对象的某个具体属性，而是直接劫持**整个对象**。

```javascript
const target = { a: 1 };
const proxy = new Proxy(target, {
  get(target, key, receiver) {
    // 依赖收集
    track(target, key);
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {
    const result = Reflect.set(target, key, value, receiver);
    // 派发更新
    trigger(target, key);
    return result;
  },
  deleteProperty(target, key) {
    const result = Reflect.deleteProperty(target, key);
    trigger(target, key);
    return result;
  }
});
```

### Proxy 带来的三大红利：
1. **天然支持对象新增和删除属性的拦截**。
2. **天然支持数组内部的所有操作拦截**（包括按索引修改和 length 的变更）。
3. **惰性处理深层嵌套**：在 Vue 3 中，只有当你真正**访问**到了对象深处的某个属性时，才会去对那一层包装 Proxy（在 getter 中递归）。这就是传说中的**懒代理（Lazy Proxy）**，极大地提升了大型对象的初始化性能。

## 三、Vue 3 核心机制：依赖收集与派发更新

Vue 3 响应式的核心实际上是三个角色：`Proxy` (拦截器)、`effect` (副作用函数)、`targetMap` (存储依赖关系的弱引用字典)。

### 1. targetMap 数据结构
Vue 3 在内部维护了一个全局的弱引用 Map，它的结构大致如下：
```text
targetMap: WeakMap
 └── key: target object (代理的原对象)
     └── value: Map (depsMap)
          └── key: property (如 'name', 'age')
               └── value: Set (dep)
                    └── 副作用函数集合 (effect 1, effect 2...)
```
> 使用 `WeakMap` 的好处是：当原对象被垃圾回收销毁时，它在 targetMap 里对应的依赖记录也会被自动清空，防止内存泄漏。

### 2. 依赖收集 (Track)
当我们在 Vue 组件的 `render` 函数（即一个包裹着组件渲染逻辑的 `effect`）中访问 `proxy.name` 时：
1. 触发 Proxy 的 `get` 拦截器。
2. 拦截器调用内部的 `track(target, 'name')` 函数。
3. `track` 会顺着 `targetMap` 找到当前属性对应的依赖 Set，并把**当前正在执行的 `effect` 塞进去**。

### 3. 派发更新 (Trigger)
当执行 `proxy.name = "Mira"` 修改属性时：
1. 触发 Proxy 的 `set` 拦截器。
2. 拦截器调用内部的 `trigger(target, 'name')` 函数。
3. `trigger` 顺着 `targetMap` 找出来之前存起来的所有 `effect` 集合，挨个重新执行。
4. `effect` 一执行，组件就重新渲染了。

## 四、Ref 与 Reactive 的本质区别

- **Reactive**：只能包装对象或数组（基于 `Proxy`）。如果你尝试包装一个基础数据类型（如数字、字符串），由于 JS 的限制，基础类型无法创建 Proxy。
- **Ref**：既可以包装基础类型，也可以包装对象。
  - 对于基础类型，`ref` 会在内部创建一个对象 `{ value: 基础值 }`，然后利用**对象的 getter/setter** (类似于 Object.defineProperty，这里叫做 class getter) 来收集和派发更新。
  - 对于对象类型，`ref` 内部其实会自动调用 `reactive()` 将其转换为 Proxy。

> ⚠️ **为什么重构低质量代码时建议使用 let 声明基本类型而不是全都包裹进 reactive?**
> 在 Vue3 setup 中解构 `reactive` 对象会导致响应式丢失，因为解构出的基本类型变量失去了对象的代理上下文。这就是为什么 Vue 推荐 `toRefs` 或者直接多使用 `ref`。
