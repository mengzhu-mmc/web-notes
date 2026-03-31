# 手写 EventEmitter

## 面试高频考点

- 实现一个完整的事件发射器（发布-订阅模式）
- `on`、`off`、`emit`、`once` 的实现细节
- `once` 如何保证只触发一次？

---

## 完整实现

```js
class EventEmitter {
  constructor() {
    this._events = Object.create(null);
  }

  // 注册事件监听器
  on(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function');
    }
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(listener);
    return this; // 支持链式调用
  }

  // 注册只触发一次的监听器
  once(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function');
    }
    // 包装函数：执行一次后自动移除
    const wrapper = (...args) => {
      listener.apply(this, args);
      this.off(event, wrapper);
    };
    // 保存原始函数引用，便于通过 off 移除
    wrapper._originalListener = listener;
    this.on(event, wrapper);
    return this;
  }

  // 触发事件
  emit(event, ...args) {
    if (!this._events[event] || this._events[event].length === 0) {
      return false;
    }
    // 浅拷贝，防止执行过程中监听器数组被修改
    const listeners = [...this._events[event]];
    listeners.forEach((listener) => {
      listener.apply(this, args);
    });
    return true;
  }

  // 移除指定监听器
  off(event, listener) {
    if (!this._events[event]) return this;
    this._events[event] = this._events[event].filter((fn) => {
      // 同时兼容 once 包装的函数
      return fn !== listener && fn._originalListener !== listener;
    });
    if (this._events[event].length === 0) {
      delete this._events[event];
    }
    return this;
  }

  // 移除某事件的所有监听器
  removeAllListeners(event) {
    if (event) {
      delete this._events[event];
    } else {
      this._events = Object.create(null);
    }
    return this;
  }

  // 获取某事件的监听器数量
  listenerCount(event) {
    return this._events[event] ? this._events[event].length : 0;
  }

  // 获取所有已注册的事件名
  eventNames() {
    return Object.keys(this._events);
  }
}
```

## 使用示例

```js
const emitter = new EventEmitter();

// 基础用法
emitter.on('data', (msg) => console.log('收到数据:', msg));
emitter.emit('data', 'hello'); // 收到数据: hello

// once - 只触发一次
emitter.once('login', (user) => console.log('用户登录:', user));
emitter.emit('login', 'Alice'); // 用户登录: Alice
emitter.emit('login', 'Bob'); // 无输出（已自动移除）

// off - 移除监听器
const handler = (v) => console.log('value:', v);
emitter.on('change', handler);
emitter.emit('change', 1); // value: 1
emitter.off('change', handler);
emitter.emit('change', 2); // 无输出

// 链式调用
emitter
  .on('event', () => console.log('listener 1'))
  .on('event', () => console.log('listener 2'))
  .emit('event');
```

## 核心要点

| 方法 | 说明 |
| --- | --- |
| `on` | 注册监听器 |
| `once` | 注册一次性监听器（包装函数 + `_originalListener` 引用） |
| `emit` | 触发事件（浅拷贝 listeners 防止遍历中修改） |
| `off` | 移除指定监听器（兼容 once 包装函数） |
| `removeAllListeners` | 移除所有监听器 |
