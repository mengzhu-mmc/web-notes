# TypeScript 装饰器（Decorators）

> 来源：前端面试每日推送 2026-04-25（周六·TypeScript + 进阶）
> 难度：⭐⭐⭐

## 关联笔记

- [[03-TypeScript/TypeScript进阶特性]]
- [[03-TypeScript/TypeScript基础到进阶]]

---

## 一句话秒懂

用声明式语法实现元编程，AOP 切面编程的落地方式。

---

## 核心原理

装饰器是 TypeScript 5.0 正式标准化的特性（之前是实验性 `experimentalDecorators`），它本质上是一个**高阶函数**，在类定义时被元编程式地"注入"到目标（类/方法/属性/访问器）上。装饰器函数接收 `context` 对象（包含 `kind` 标识装饰目标类型、`name` 属性名、`addInitializer` 添加初始化逻辑等），返回一个替换函数来"包裹"原始实现。

标准装饰器分为 5 种 kind：`class`、`method`、`getter`、`setter`、`field`、`accessor`。它在编译期被转换为 `__decorate` 或 `__esDecorate` 运行时调用，因此是有运行时开销的——这与纯类型工具（`infer`/`Mapped Types`）不同。

---

## 代码示例

### 1. 类装饰器：自动注册到 DI 容器（NestJS 核心机制）

```typescript
function Injectable(target: Function, context: ClassDecoratorContext) {
  console.log(`[DI] 注册类: ${String(context.name)}`);
  // 真实场景：将 target 存入 IoC 容器的 Provider Map
}

@Injectable
class UserService {
  constructor(private db: Database) {}

  getUsers() {
    return this.db.query('SELECT * FROM users');
  }
}
```

### 2. 方法装饰器：日志和耗时统计（AOP 经典场景）

```typescript
function Log(
  target: Function,
  context: ClassMethodDecoratorContext
) {
  const methodName = String(context.name);
  // 替换原始方法
  return function (this: any, ...args: any[]) {
    console.log(`[LOG] ${methodName} 调用，参数:`, args);
    const start = performance.now();
    const result = target.apply(this, args);
    const cost = (performance.now() - start).toFixed(2);
    console.log(`[LOG] ${methodName} 完成，耗时: ${cost}ms`);
    return result;
  };
}

class OrderService {
  @Log
  createOrder(productId: string, quantity: number) {
    return { orderId: 'ORD-001', productId, quantity };
  }
}

new OrderService().createOrder('P001', 3);
// [LOG] createOrder 调用，参数: ['P001', 3]
// [LOG] createOrder 完成，耗时: 0.12ms
```

### 3. 属性装饰器 + accessor：实现响应式（类 Vue3 reactive 简化版）

```typescript
function Observable(
  _target: undefined,
  context: ClassFieldDecoratorContext
) {
  const key = context.name as string;
  return function (initialValue: any) {
    return {
      get() { return this[`__${key}`]; },
      set(value: any) {
        const oldValue = this[`__${key}`];
        this[`__${key}`] = value;
        if (oldValue !== value) {
          this.notify?.(key, value, oldValue);
        }
      },
      init(initialValue) {
        this[`__${key}`] = initialValue;
      }
    };
  };
}

class Store {
  notify(key: string, newVal: any, oldVal: any) {
    console.log(`[REACTIVE] ${key}: ${oldVal} → ${newVal}`);
  }

  @Observable count = 0;
}

const s = new Store();
s.count = 1;  // [REACTIVE] count: 0 → 1
s.count = 5;  // [REACTIVE] count: 1 → 5
```

---

## 面试高频问题

1. **装饰器和 Mixin 有什么区别？** → 装饰器是声明式的元编程（注解+逻辑分离），Mixin 是编程式的类组合（多重继承替代），两者可以结合使用
2. **`experimentalDecorators` 和标准装饰器有什么不同？** → 旧的实验版用 PropertyDescriptor 方式，签名是 `(target, propertyKey, descriptor?)`；标准版用 context 对象，支持 `addInitializer`，不支持 `accessor` 类型之外的属性装饰
3. **装饰器的执行顺序是什么？** → 实例成员 → 静态成员 → 构造函数（类装饰器）。同类中从下到上执行（因为装饰器栈是 LIFO）

---

## 延伸阅读

- NestJS 依赖注入系统源码中的装饰器实现
- ECMAScript Stage 3 Decorator Metadata 提案（`@metadata`）
- Angular 的 `@Injectable` / `@Component` 源码对比 NestJS 的实现差异
