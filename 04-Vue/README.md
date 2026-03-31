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

---

## 🆕 Vue 3.4+ 新特性

### `defineModel()` — 双向绑定语法糖（Vue 3.4）

> 以前实现 `v-model` 需要 `props` + `emits` 两步，3.4 合并为一步。

```vue
<!-- 子组件：之前（冗长写法）-->
<script setup>
const props = defineProps(['modelValue']);
const emit = defineEmits(['update:modelValue']);
</script>
<template>
  <input :value="props.modelValue" @input="emit('update:modelValue', $event.target.value)" />
</template>

<!-- 子组件：3.4 新写法 ✅ -->
<script setup>
const model = defineModel(); // 自动处理 props + emit
// 带类型和默认值
// const model = defineModel<string>({ default: '' });
</script>
<template>
  <input v-model="model" /> <!-- 直接双向绑定！ -->
</template>

<!-- 父组件使用方式不变 -->
<MyInput v-model="username" />

<!-- 多个 v-model -->
<!-- 子组件 -->
<script setup>
const firstName = defineModel('firstName');
const lastName = defineModel('lastName');
</script>
<!-- 父组件 -->
<UserForm v-model:firstName="user.firstName" v-model:lastName="user.lastName" />
```

### `v-bind` shorthand — 属性缩写（Vue 3.4）

```vue
<!-- 之前：属性名和变量名相同时，还需写两遍 -->
<img :src="src" :alt="alt" />
<input :value="value" :name="name" />

<!-- Vue 3.4：属性名和变量名相同时，可以省略值 -->
<img :src :alt />
<input :value :name />

<!-- 等价于 -->
<img :src="src" :alt="alt" />
```

### `useTemplateRef()` — 模板引用（Vue 3.5）

```vue
<script setup>
import { useTemplateRef, onMounted } from 'vue';

// 替代旧的 ref + 同名模板 ref 写法
const inputEl = useTemplateRef('myInput'); // 传入模板中的 ref 名称

onMounted(() => {
  inputEl.value?.focus();
});
</script>

<template>
  <input ref="myInput" placeholder="自动聚焦" />
</template>

<!-- 对比旧写法：-->
<!-- <script setup>
const myInput = ref(null); // 旧写法：变量名必须和模板 ref 名完全相同
</script>
<template>
  <input ref="myInput" />
</template> -->
```

---

## 📊 Pinia vs Vuex 对比

| 维度 | Pinia（推荐） | Vuex 4 |
|------|--------------|--------|
| **TypeScript** | 开箱即用，完整类型推断 | 需要手动声明类型 |
| **Mutations** | ❌ 没有，直接修改 state | ✅ 必须通过 mutation |
| **模块化** | 每个 Store 独立，无嵌套 | modules 嵌套，较复杂 |
| **Devtools** | ✅ 原生支持 Vue Devtools | ✅ 支持 |
| **SSR** | ✅ 原生支持 | 需要手动处理 |
| **包大小** | ~1KB | ~10KB |
| **写法风格** | Options / Composition 均支持 | 只有 Options 风格 |
| **插件系统** | 简单，`store.$subscribe` 等 | 复杂 |
| **Vue 3 官方推荐** | ✅ 官方推荐 | ❌ 已不再推荐 |

```js
// Pinia：Composition API 风格（推荐）
export const useUserStore = defineStore('user', () => {
  const user = ref(null);
  const isLoggedIn = computed(() => !!user.value);
  
  async function login(credentials) {
    user.value = await api.login(credentials);
  }
  
  function logout() {
    user.value = null;
  }
  
  return { user, isLoggedIn, login, logout };
});

// 跨 Store 引用（Pinia 直接导入另一个 Store 即可）
export const useCartStore = defineStore('cart', () => {
  const userStore = useUserStore(); // 直接引用！
  const items = ref([]);
  
  const canCheckout = computed(() => userStore.isLoggedIn && items.value.length > 0);
  return { items, canCheckout };
});
```

```js
// Vuex 4（对比参考，新项目不推荐）
const store = createStore({
  state: { user: null },
  getters: {
    isLoggedIn: state => !!state.user
  },
  mutations: {
    SET_USER(state, user) { state.user = user; } // 必须有 mutation
  },
  actions: {
    async login({ commit }, credentials) {
      const user = await api.login(credentials);
      commit('SET_USER', user); // 通过 mutation 修改
    }
  }
});
```

---

## ✅ Vue 3 Composition API 最佳实践清单

### 1. 响应式数据选择

```js
// ✅ 基本类型用 ref
const count = ref(0);
const name = ref('');
const isLoading = ref(false);

// ✅ 对象/数组用 reactive
const form = reactive({ email: '', password: '' });
const list = reactive([]);

// ✅ 解构 reactive 时用 toRefs 保持响应性
const { email, password } = toRefs(form);

// ❌ 直接解构会丢失响应性
const { email } = form; // 这个 email 不是响应式的！
```

### 2. Composable 函数规范

```js
// ✅ 好的 Composable：逻辑聚合、可复用、有清理逻辑
export function useWindowSize() {
  const width = ref(window.innerWidth);
  const height = ref(window.innerHeight);
  
  const update = () => {
    width.value = window.innerWidth;
    height.value = window.innerHeight;
  };
  
  onMounted(() => window.addEventListener('resize', update));
  onUnmounted(() => window.removeEventListener('resize', update)); // ✅ 清理！
  
  return { width, height };
}

// ✅ 在组件中使用
const { width, height } = useWindowSize();
```

### 3. 异步数据获取模式

```vue
<script setup>
// ✅ 方式1：组合式 API 配合 async/await（Nuxt 推荐）
const { data, pending, error } = await useFetch('/api/users');

// ✅ 方式2：手动管理（适用于纯 Vue）
const users = ref([]);
const loading = ref(false);
const error = ref(null);

async function fetchUsers() {
  loading.value = true;
  try {
    users.value = await api.getUsers();
  } catch (e) {
    error.value = e;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchUsers);
</script>
```

### 4. watchEffect vs watch 选择

```js
// ✅ watchEffect：副作用依赖响应式数据，自动追踪
watchEffect(() => {
  document.title = `${count.value} 未读消息`; // 自动追踪 count
});

// ✅ watch：需要新旧值对比 / 懒执行 / 精确控制依赖
watch(userId, async (newId, oldId) => {
  if (newId !== oldId) {
    await fetchUserProfile(newId);
  }
}, { immediate: false }); // 不立即执行
```

### 5. 组件通信最佳实践

```js
// ✅ 父子通信：defineModel（3.4+）> props + emit
// ✅ 跨层级：provide/inject（配合 readonly）
provide('userStore', readonly(userStore)); // ✅ 防止子组件直接修改

// ✅ 全局状态：Pinia（不再需要 Vuex）
// ✅ 兄弟通信：通过父组件 / 共享 Pinia Store（不用 mitt/EventBus）
```

### 6. 性能优化要点

```js
// ✅ v-memo：跳过子树重渲染（类似 React.memo）
// 只有 item.id 或 item.selected 变化时才重渲染
<div v-for="item in list" :key="item.id" v-memo="[item.id, item.selected]">
  {{ item.name }}
</div>

// ✅ shallowRef / shallowReactive：大对象用浅层响应
const bigData = shallowRef({ /* 大量数据 */ }); // 只追踪 .value 引用变化

// ✅ defineAsyncComponent：按需加载重组件
const HeavyModal = defineAsyncComponent(() => import('./HeavyModal.vue'));

// ✅ 计算属性有缓存，优先于方法
const filteredList = computed(() => list.value.filter(item => item.active));
```

---

## 📝 建议补充笔记方向

- [ ] `响应式原理深入.md` — 手写 reactive/ref 的实现，track/trigger 依赖收集
- [ ] `Diff算法详解.md` — 图解双端比较 + LIS 算法过程
- [ ] `组件通信完全指南.md` — 每种方式附完整代码示例
- [ ] `Composition API最佳实践.md` — Composable 函数封装模式
- [ ] `Pinia使用指南.md` — 定义 Store、跨 Store 调用、持久化
- [ ] `Vue性能优化.md` — v-memo、静态提升、shallowRef、异步组件
- [ ] `Vue3新特性总览.md` — Teleport、Suspense、Fragment、自定义指令 v4
