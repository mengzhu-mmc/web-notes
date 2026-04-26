# 发布-订阅模式 vs 观察者模式（源码级理解）

> 来源：前端面试每日推送 2026-04-25（周六·TypeScript + 进阶）
> 难度：⭐⭐⭐⭐

## 关联笔记

- [[12-面试手写/手写EventEmitter]]
- [[13-前端面试题/牛客网-面试题-场景设计]]

---

## 一句话秒懂

这两个名字经常被混用，但它们的架构差异直接影响你的技术选型。

---

## 核心原理

**观察者模式（Observer）** 是**一对多直接依赖**：Subject 直接维护 Observer 列表并通知。核心特征是 Subject 知道 Observer 的存在（直接引用），耦合度较高。典型实现：`Redux.subscribe`、`Vue3 的 watchEffect`。

**发布-订阅模式（Pub/Sub）** 引入了**事件中心（Event Bus / Event Channel）**作为中介，发布者和订阅者互不知道对方的存在。解耦更彻底，但调试更困难。典型实现：Node.js `EventEmitter`、浏览器 `EventTarget`、微前端通信。

关键区别：观察者模式中 Subject 调 Observer 的 `update()` 方法（**推模型**）；Pub/Sub 中发布者发事件，订阅者通过回调接收（**事件驱动**）。在实际框架源码中，两者经常组合使用——比如 Vue 的响应式系统内部是观察者模式（Dep→Watcher），对外暴露的 `$on/$emit` 是 Pub/Sub。

---

## 代码示例

### 观察者模式：Vue3 reactive 的极简复刻

核心：依赖收集（track） + 派发更新（trigger）

```typescript
type EffectFn = () => void;

class Dep {
  private subscribers = new Set<EffectFn>();

  depend() {
    if (activeEffect) {
      this.subscribers.add(activeEffect);
    }
  }

  notify() {
    this.subscribers.forEach(fn => fn());
  }
}

let activeEffect: EffectFn | null = null;

function effect(fn: EffectFn) {
  activeEffect = fn;
  fn();           // 执行时触发 getter → 自动收集依赖
  activeEffect = null;
}

// 弱引用 Map：目标对象 → 属性 → Dep
const targetMap = new WeakMap<object, Map<string, Dep>>();

function track(target: object, key: string) {
  let depsMap = targetMap.get(target);
  if (!depsMap) targetMap.set(target, (depsMap = new Map()));
  let dep = depsMap.get(key);
  if (!dep) depsMap.set(key, (dep = new Dep()));
  dep.depend();
}

function trigger(target: object, key: string) {
  const dep = targetMap.get(target)?.get(key);
  dep?.notify();
}

// 使用：声明式响应式
const state = reactive({ count: 0, name: 'hello' });
function reactive<T extends object>(obj: T): T {
  return new Proxy(obj, {
    get(target, key) {
      track(target, String(key));  // 读的时候收集依赖
      return Reflect.get(target, key);
    },
    set(target, key, value) {
      Reflect.set(target, key, value);
      trigger(target, String(key)); // 写的时候触发更新
      return true;
    }
  });
}

effect(() => {
  console.log(`count = ${state.count}`);
});

state.count++; // 输出: count = 1
state.count++; // 输出: count = 2
```

### 发布-订阅模式：EventEmitter

```typescript
class EventEmitter {
  private events = new Map<string, Set<(...args: any[]) => void>>();

  on(event: string, listener: (...args: any[]) => void) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener);
    // 返回取消订阅函数（面试加分项）
    return () => this.events.get(event)?.delete(listener);
  }

  emit(event: string, ...args: any[]) {
    this.events.get(event)?.forEach(fn => fn(...args));
  }

  once(event: string, listener: (...args: any[]) => void) {
    const unsub = this.on(event, (...args) => {
      unsub();
      listener(...args);
    });
    return unsub;
  }
}

// 微前端通信场景
const bus = new EventEmitter();

// 模块 A 发布
bus.emit('user:login', { userId: 'u001', role: 'admin' });

// 模块 B 订阅
const off = bus.on('user:login', (payload) => {
  console.log(`收到登录事件:`, payload);
  // 模块 B 可以更新自己的权限状态，完全不知道模块 A 的存在
});

// 清理
off();
```

---

## 面试高频问题

1. **发布-订阅和观察者模式的本质区别？** → 观察者模式是 Subject 直接通知 Observer（耦合）；Pub/Sub 通过事件中心中转（解耦），发布者不知道订阅者的存在
2. **Vue3 的 `reactive` 用的是哪种？** → 内部是观察者模式（`track`/`trigger`），但 `provide/inject` 层面有 Pub/Sub 的影子。两者结合使用是现代框架的常态
3. **EventEmitter 内存泄漏怎么防？** → ① `on` 返回 `unsubscribe` 函数，组件卸载时调用；② 用 `WeakMap` 存储订阅者引用避免阻止 GC；③ 对单次事件用 `once` 代替 `on`

---

## 延伸阅读

- Vue3 响应式系统源码 `@vue/reactivity`（packages/reactivity/src）
- Redux 的 `subscribe` + `dispatch` 源码实现
- RxJS Observable vs EventEmitter 的设计哲学对比
- 微前端通信方案对比（EventBus vs CustomEvent vs Proxy）
