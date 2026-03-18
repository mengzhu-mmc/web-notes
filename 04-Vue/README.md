# 04 · Vue

> [[README|← 返回知识库首页]]

快速索引 Vue 面试高频考点，每条附核心答题要点，适合考前快速回顾。

---

## 🔥 响应式原理

### Vue2 响应式原理（Object.defineProperty）
- 通过 `Object.defineProperty` 劫持对象属性的 `getter/setter`，在 setter 中通知依赖（Dep）更新。
- 缺陷：无法检测**新增/删除属性**，数组变异方法需要 hack 重写；需递归遍历对象，初始化性能开销大。

### Vue3 响应式原理（Proxy）
- 使用 ES6 `Proxy` 代理整个对象，可拦截 `get/set/deleteProperty/has` 等 13 种操作。
- 优势：天然支持动态新增属性、数组下标修改；懒代理（访问时才递归），性能更好。

---

## ⚡ Diff 算法

### Vue2 Diff（双端比较）
- 采用**双端四指针**同时从首尾向中间夹逼，命中则复用 DOM 节点，减少移动次数。
- 时间复杂度 O(n)，但要求组件列表使用唯一 `key`。

### Vue3 Diff（最长递增子序列优化）
- 在双端比较基础上，对乱序节点用**最长递增子序列（LIS）**算法找到无需移动的节点集合，最大化复用。
- 配合静态提升（Hoist）、靶向更新（patchFlag），Diff 范围从全树缩减到动态节点。

> 💡 **面试答题结构：** Vue2用双端比较 → Vue3加了LIS + 静态提升，性能更优。

---

## 📦 组件通信

| 场景 | 方式 |
|------|------|
| 父 → 子 | `props` |
| 子 → 父 | `$emit` / `defineEmits` |
| 跨层级 | `provide / inject` |
| 兄弟组件 | 事件总线（Vue2）/ `mitt`（Vue3）|
| 全局状态 | Vuex（Vue2）/ Pinia（Vue3）|
| 直接访问 | `$refs` / `defineExpose` |

---

## 🔄 生命周期

### Vue2 → Vue3 对应关系

| Vue2 | Vue3（Composition API）|
|------|----------------------|
| `beforeCreate` | `setup()` 本身 |
| `created` | `setup()` 本身 |
| `beforeMount` | `onBeforeMount` |
| `mounted` | `onMounted` |
| `beforeUpdate` | `onBeforeUpdate` |
| `updated` | `onUpdated` |
| `beforeDestroy` | `onBeforeUnmount` |
| `destroyed` | `onUnmounted` |

> 💡 Composition API 没有 `beforeCreate/created`，逻辑直接写在 `setup()` 中。

---

## 🧩 Vue3 Composition API

### setup() 与 Options API 的核心区别
- Options API 按选项类型组织代码（data/methods/computed），相关逻辑分散；Composition API 按**功能逻辑**组织，相关代码聚合，可复用为 **Composable 函数**。

### ref vs reactive
- `ref`：基本类型推荐用，访问需 `.value`；模板中自动解包。
- `reactive`：对象/数组推荐用，直接访问属性，但解构会丢失响应性（用 `toRefs` 解决）。

### computed vs watch vs watchEffect
- `computed`：有缓存，依赖不变不重算，用于派生值。
- `watch`：懒执行，可拿到新旧值，适合异步副作用。
- `watchEffect`：立即执行，自动追踪依赖，适合同步副作用。

---

## 🗃️ Pinia（Vue3 状态管理）

### Pinia vs Vuex 的核心区别
- 无需 mutations，直接在 action 里修改 state；支持 TypeScript 类型推断开箱即用。
- Store 定义更简洁（`defineStore`），支持 Composition API 风格写法。

```js
// 定义 Store
const useCounterStore = defineStore('counter', () => {
  const count = ref(0);
  const double = computed(() => count.value * 2);
  function increment() { count.value++; }
  return { count, double, increment };
});
```

---

## 🛣️ Vue Router

### hash 模式 vs history 模式
- `hash`：URL 带 `#`，兼容性好，不需要服务器配置，`hashchange` 事件监听。
- `history`：URL 干净，基于 `pushState/replaceState`，刷新时需服务器配置兜底（返回 `index.html`）。

### 导航守卫执行顺序
全局 `beforeEach` → 路由独享 `beforeEnter` → 组件 `beforeRouteEnter` → 全局 `afterEach`

---

## 🎯 其他高频考点

### v-if vs v-show
- `v-if`：条件为假时节点不存在于 DOM，有销毁/重建开销；适合**不频繁切换**。
- `v-show`：只是切换 `display`，节点始终存在；适合**频繁切换**。

### key 的作用
- 给 Diff 算法提供节点唯一标识，帮助识别复用节点。不写 key 时按顺序就地复用，可能产生 Bug（如表单状态错位）。

### nextTick 原理
- Vue 的 DOM 更新是异步的（批量更新），`nextTick` 将回调推入微任务队列（Promise → MutationObserver → MessageChannel → setTimeout 降级），在 DOM 更新完成后执行。

---

## 📝 建议补充笔记方向

- [ ] `响应式原理深入.md` — 手写 reactive/ref 的实现，track/trigger 依赖收集
- [ ] `Diff算法详解.md` — 图解双端比较 + LIS 算法过程
- [ ] `组件通信完全指南.md` — 每种方式附完整代码示例
- [ ] `Composition API最佳实践.md` — Composable 函数封装模式
- [ ] `Pinia使用指南.md` — 定义 Store、跨 Store 调用、持久化
- [ ] `Vue性能优化.md` — v-memo、静态提升、shallowRef、异步组件
- [ ] `Vue3新特性总览.md` — Teleport、Suspense、Fragment、自定义指令 v4
