# React 状态管理方案对比

> 面试高频考点 | 适用于 React 16.8+ 项目的状态管理选型

## 为什么需要状态管理

React 本身通过 `useState` 和 `useReducer` 提供了组件级别的状态管理能力，但当应用规模增长后，会遇到几个典型问题：跨层级组件通信繁琐（props drilling）、共享状态逻辑分散难以维护、服务端状态与客户端状态混杂不清。状态管理库的核心价值就是解决这些问题，让状态的存储、更新和消费变得可预测、可追踪。

面试中常被问到的切入点是"你在项目中用过哪些状态管理方案，为什么选它"，回答时需要展示对各方案设计理念和适用场景的理解，而不仅仅是 API 层面的使用经验。

---

## React 内置方案

### Context + useReducer

这是 React 官方提供的轻量级状态管理组合，不需要引入任何第三方库。

```jsx
// 定义 Context 和 Reducer
const TodoContext = createContext(null);
const TodoDispatchContext = createContext(null);

function todoReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return [...state, { id: Date.now(), text: action.text, done: false }];
    case 'TOGGLE':
      return state.map(todo =>
        todo.id === action.id ? { ...todo, done: !todo.done } : todo
      );
    case 'DELETE':
      return state.filter(todo => todo.id !== action.id);
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

// Provider 组件
function TodoProvider({ children }) {
  const [todos, dispatch] = useReducer(todoReducer, []);
  return (
    <TodoContext.Provider value={todos}>
      <TodoDispatchContext.Provider value={dispatch}>
        {children}
      </TodoDispatchContext.Provider>
    </TodoContext.Provider>
  );
}

// 消费端使用自定义 Hook
function useTodos() {
  return useContext(TodoContext);
}
function useTodoDispatch() {
  return useContext(TodoDispatchContext);
}
```

**核心原理**：Context 本质上是一个依赖注入机制，Provider 将值注入组件树，Consumer 通过 `useContext` 订阅。当 Provider 的 `value` 引用变化时，所有消费该 Context 的组件都会重新渲染。

**性能陷阱**：Context 没有 selector 机制，任何 value 变化都会导致所有消费者重渲染。常见的优化手段是将 state 和 dispatch 拆分到不同的 Context 中（如上面的例子），以及用 `React.memo` 包裹消费组件。

**适用场景**：主题切换、用户认证信息、国际化语言包等更新频率低的全局状态。不适合频繁更新的状态（如表单输入、动画状态）。

---

## Redux：可预测的状态容器

Redux 是 React 生态中最经典的状态管理方案，核心思想来自 Flux 架构和 Elm 语言。

### 三大原则

Redux 的设计围绕三个核心原则展开：单一数据源（整个应用的状态存储在一棵对象树中）、状态只读（唯一改变状态的方式是触发 action）、纯函数修改（通过 reducer 纯函数来描述状态如何变化）。

### Redux Toolkit（RTK）

现代 Redux 开发推荐使用 Redux Toolkit，它大幅简化了样板代码：

```js
import { createSlice, configureStore } from '@reduxjs/toolkit';

// 创建 Slice（集成了 action + reducer）
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0, history: [] },
  reducers: {
    increment(state) {
      // RTK 内部使用 Immer，可以直接"修改"状态
      state.value += 1;
      state.history.push({ action: 'increment', time: Date.now() });
    },
    decrement(state) {
      state.value -= 1;
      state.history.push({ action: 'decrement', time: Date.now() });
    },
    incrementByAmount(state, action) {
      state.value += action.payload;
    },
  },
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;

// 创建 Store
const store = configureStore({
  reducer: {
    counter: counterSlice.reducer,
  },
  // RTK 默认集成了 redux-thunk 和开发环境的序列化检查中间件
});
```

### 中间件机制

Redux 中间件是面试重点。中间件本质上是对 `dispatch` 方法的增强，采用洋葱模型（类似 Koa）：

```js
// 中间件签名：store => next => action => result
const loggerMiddleware = store => next => action => {
  console.log('dispatching:', action.type);
  console.log('prev state:', store.getState());
  const result = next(action); // 调用下一个中间件或原始 dispatch
  console.log('next state:', store.getState());
  return result;
};
```

`redux-thunk` 的实现非常简洁，核心只有几行代码：如果 action 是函数就执行它并传入 dispatch 和 getState，否则直接传给下一个中间件。这使得我们可以在 action creator 中编写异步逻辑。

### RTK Query

RTK Query 是 Redux Toolkit 内置的数据请求和缓存方案，类似于 React Query 但与 Redux 深度集成：

```js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['User'],
  endpoints: builder => ({
    getUsers: builder.query({
      query: () => '/users',
      providesTags: ['User'],
    }),
    addUser: builder.mutation({
      query: newUser => ({
        url: '/users',
        method: 'POST',
        body: newUser,
      }),
      invalidatesTags: ['User'], // 自动重新请求 getUsers
    }),
  }),
});

export const { useGetUsersQuery, useAddUserMutation } = apiSlice;
```

---

## Zustand：极简主义的状态管理

Zustand 是近年来增长最快的 React 状态管理库，以极简的 API 和优秀的性能著称。

### 核心用法

```js
import { create } from 'zustand';

// 创建 store，不需要 Provider
const useStore = create((set, get) => ({
  count: 0,
  users: [],
  
  increment: () => set(state => ({ count: state.count + 1 })),
  decrement: () => set(state => ({ count: state.count - 1 })),
  
  // 异步操作直接写，不需要中间件
  fetchUsers: async () => {
    const response = await fetch('/api/users');
    const users = await response.json();
    set({ users });
  },
  
  // 通过 get() 访问当前状态
  getDoubleCount: () => get().count * 2,
}));

// 组件中使用 - 通过 selector 精确订阅
function Counter() {
  // 只有 count 变化时才重渲染，users 变化不会触发
  const count = useStore(state => state.count);
  const increment = useStore(state => state.increment);
  return <button onClick={increment}>{count}</button>;
}
```

### 实现原理

Zustand 的核心实现非常精巧，大约只有 40 行代码。它基于发布-订阅模式，内部维护一个 state 对象和一个 listeners 集合。`set` 方法更新 state 并通知所有 listener，每个 `useStore(selector)` 调用会注册一个 listener，在 listener 回调中通过 `Object.is` 比较 selector 的返回值是否变化来决定是否触发组件重渲染。

```js
// 简化版核心实现
function createStore(createState) {
  let state;
  const listeners = new Set();
  
  const getState = () => state;
  
  const setState = (partial) => {
    const nextState = typeof partial === 'function' ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      state = Object.assign({}, state, nextState);
      listeners.forEach(listener => listener(state));
    }
  };
  
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  
  state = createState(setState, getState);
  return { getState, setState, subscribe };
}
```

### 中间件生态

Zustand 通过函数组合的方式支持中间件，常用的有 `persist`（持久化）、`devtools`（Redux DevTools 集成）、`immer`（不可变更新）：

```js
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const useStore = create(
  devtools(
    persist(
      immer((set) => ({
        todos: [],
        addTodo: (text) =>
          set((state) => {
            state.todos.push({ id: Date.now(), text, done: false });
          }),
      })),
      { name: 'todo-storage' }
    )
  )
);
```

---

## MobX：响应式状态管理

MobX 是基于**观察者模式**的响应式状态管理库，设计哲学与 Redux 截然相反——它不强调不可变数据和单向数据流，而是通过让状态变得"可观察"，自动追踪依赖并触发更新。在 Angular/Vue 生态中类似的思想随处可见，MobX 把这套机制带进了 React。

### 核心概念

MobX 有三个核心角色：

- **Observable**：可观察的状态，相当于数据源
- **Computed**：由 observable 派生的计算值，自动缓存，依赖不变不重算
- **Action**：修改 observable 的函数，推荐在 strict mode 下强制要求所有状态变更必须在 action 内发生

```js
import { makeAutoObservable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';

// 定义 Store 类
class TodoStore {
  todos = [];
  filter = 'all'; // 'all' | 'active' | 'done'

  constructor() {
    // 自动将所有属性变为 observable，方法变为 action
    makeAutoObservable(this);
  }

  // action：直接"修改"状态，MobX 内部处理响应式更新
  addTodo(text) {
    this.todos.push({ id: Date.now(), text, done: false });
  }

  toggleTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) todo.done = !todo.done;
  }

  setFilter(filter) {
    this.filter = filter;
  }

  // computed：依赖变化时自动重算，组件读取时返回缓存值
  get filteredTodos() {
    if (this.filter === 'active') return this.todos.filter(t => !t.done);
    if (this.filter === 'done') return this.todos.filter(t => t.done);
    return this.todos;
  }

  get doneCount() {
    return this.todos.filter(t => t.done).length;
  }

  // 异步 action：需要用 runInAction 包裹状态变更
  async fetchTodos() {
    const response = await fetch('/api/todos');
    const data = await response.json();
    // 异步回调中的状态修改必须放在 runInAction 内
    runInAction(() => {
      this.todos = data;
    });
  }
}

// 创建 store 实例（可以是单例，也可以用 React Context 注入）
const todoStore = new TodoStore();

// 用 observer 包裹组件，自动订阅用到的 observable
const TodoList = observer(function TodoList() {
  return (
    <ul>
      {todoStore.filteredTodos.map(todo => (
        <li
          key={todo.id}
          style={{ textDecoration: todo.done ? 'line-through' : 'none' }}
          onClick={() => todoStore.toggleTodo(todo.id)}
        >
          {todo.text}
        </li>
      ))}
      <p>已完成：{todoStore.doneCount}</p>
    </ul>
  );
});
```

### 响应式原理

MobX 通过 ES5 的 `Object.defineProperty`（或 ES6 Proxy）拦截对 observable 属性的读取和写入：

- **读取时（track）**：记录"当前是谁在读我"，建立依赖关系图
- **写入时（trigger）**：通知所有依赖这个属性的 computed/reaction 重新计算或触发更新

`observer(Component)` 本质上是在组件渲染期间开启一个 "autorun"，记录这次渲染读取了哪些 observable。下次这些 observable 变化时，组件自动重渲染，且只重渲染真正用到该数据的组件。这种**细粒度的自动订阅**是 MobX 性能好的核心原因。

### 与 Redux 的对比视角

| | MobX | Redux |
|---|---|---|
| 数据可变性 | 直接修改（Mutable） | 不可变（Immutable） |
| 更新方式 | 自动追踪依赖，响应式触发 | 手动 dispatch action |
| 样板代码 | 极少 | 较多（RTK 已大幅减少） |
| 调试能力 | 较弱（状态变更分散） | 强（时间旅行、action 日志）|
| 适合团队 | 小团队、快速迭代 | 大团队、需要严格规范 |

### 适用场景

MobX 特别适合**数据模型复杂、对象关系深**的应用（如 ERP、复杂表单、数据可视化编辑器），因为 OOP 的 Store 类写法能很自然地建模领域对象。在有 Angular/Vue 背景的团队中接受度也更高。缺点是代码风格和其他 React 状态管理库差异较大，混用时会产生心智割裂；同时由于状态可以随处修改，大型项目中需要额外的纪律约束。

---

## Jotai：原子化状态管理

> **说明**：Jotai 在实际项目中使用范围较小，主流选型通常在 Redux、Zustand、MobX 中产生。但 Jotai 的原子化模型有其独特的设计价值，在状态依赖关系复杂的场景下仍值得了解。面试中提到它会加分，但不作为首选推荐。

Jotai 受 Recoil 启发，采用自底向上的原子化（atomic）模型，每个状态单元称为一个 atom。

### 核心概念

```js
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';

// 基础 atom
const countAtom = atom(0);
const nameAtom = atom('');

// 派生 atom（只读）- 类似 computed/selector
const doubleCountAtom = atom((get) => get(countAtom) * 2);

// 派生 atom（可写）
const incrementAtom = atom(
  null, // 读取值为 null
  (get, set) => {
    set(countAtom, get(countAtom) + 1);
  }
);

// 异步 atom
const userAtom = atom(async () => {
  const response = await fetch('/api/user');
  return response.json();
});

// 组件中使用
function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const doubleCount = useAtomValue(doubleCountAtom); // 只读
  const increment = useSetAtom(incrementAtom); // 只写
  
  return (
    <div>
      <p>Count: {count}, Double: {doubleCount}</p>
      <button onClick={increment}>+1</button>
    </div>
  );
}
```

**设计理念**：Jotai 的 atom 是最小粒度的状态单元，组件只订阅自己用到的 atom，天然避免了不必要的重渲染。与 Zustand 的"一个大 store"模式不同，Jotai 鼓励将状态拆分成尽可能小的原子，通过派生 atom 组合出复杂状态。

**适用场景**：状态之间存在复杂依赖关系的场景（如表单联动、数据可视化配置面板），以及需要细粒度渲染控制的场景。

---

## 方案横向对比

### 一张表看清所有方案

| 维度 | Context + useReducer | Redux (RTK) | Zustand | MobX | Jotai |
|------|---------------------|-------------|---------|------|-------|
| **设计模式** | 依赖注入 | Flux 单向数据流 | 发布订阅 | 响应式（观察者） | 原子化 |
| **数据结构** | 树形 Context | 单一 Store 树 | 单一 Store | 可观察对象/类 | 分散原子图 |
| **状态可变性** | 不可变 | 不可变（Immer） | 不可变（Immer 可选） | **可变**（直接修改） | 不可变 |
| **更新方式** | dispatch action | dispatch action | 直接调用函数 | 直接修改属性 | set atom |
| **精确订阅** | ❌ 无 selector | ✅ useSelector | ✅ selector | ✅ observer 自动追踪 | ✅ 原子级订阅 |
| **样板代码** | 少 | 中（RTK 已优化） | **极少** | 少 | 少 |
| **学习曲线** | 低 | 高 | **最低** | 中（OOP 思维） | 中 |
| **需要 Provider** | ✅ 必须 | ✅ 必须 | ❌ 不需要 | 可选 | ❌ 不需要 |
| **DevTools 支持** | ❌ | ✅ 一流 | ✅（中间件） | ✅ MobX DevTools | ✅ jotai-devtools |
| **异步处理** | 手动 | thunk / saga | 直接 async | runInAction | async atom |
| **服务端状态** | ❌ | ✅ RTK Query | 配合 TanStack Query | 配合 TanStack Query | 配合 TanStack Query |
| **包体积** | 0（内置） | ~40KB | **~1KB** | ~16KB | ~3KB |
| **npm 周下载量** | — | ~8M（redux） | ~4M | ~1.5M | ~700K |
| **适合规模** | 小型 | 中大型 | 小~中型 | 中型（复杂模型） | 中型（复杂依赖） |
| **典型使用方** | 小应用/组件库 | 企业级应用 | 个人/中小项目 | ERP/编辑器类 | 原子化 UI 状态 |

### 选型决策树

```
你的项目需要状态管理吗？
│
├─ 状态只在少数几个组件间共享，更新不频繁
│   └─ Context + useReducer（无需引入额外依赖）
│
├─ 快速开发，追求极简 API
│   └─ Zustand ✅（主流推荐，npm 下载量第二）
│
├─ 大型团队 / 需要严格规范 / 复杂异步流程
│   └─ Redux Toolkit ✅（生态最成熟，调试能力最强）
│
├─ 有复杂的领域模型（嵌套对象、对象关系）/ 来自 OOP 背景
│   └─ MobX（响应式，天然支持 class 模型）
│
└─ 状态之间有复杂依赖关系，需要细粒度派生
    └─ Jotai（原子化，适合联动表单/可视化配置）

另外：服务端数据（接口请求）推荐单独用 TanStack Query 管理，
     不要混进客户端状态管理库里。
```

### 现实项目中的分布

根据 2024 年 npm 下载量和社区调查：

- **Redux**：仍是企业级项目首选，历史项目存量大，RTK 已大幅改善开发体验
- **Zustand**：增长最快，新项目首选，简单直接，越来越多中小团队从 Redux 迁移过来
- **MobX**：在特定领域（复杂数据模型、来自 Angular 的团队）有稳定用户群
- **Jotai / Recoil**：实际项目使用偏少，Recoil 已停止维护，Jotai 社区还在活跃但规模较小

### 选型建议

```
新项目首选：Zustand（小~中型）/ Redux Toolkit（大型/团队）
旧项目迁移：RTK 是 Redux 的直接升级，迁移成本低
复杂领域模型：MobX（OOP 写法更自然）
了解即可：Jotai（面试加分项，实际选型排第四）
不用在项目里混用多个状态管理库，选一个就够
```

---

## 面试高频问题

### "Redux 和 Zustand 的核心区别是什么？"

从架构层面看，Redux 遵循严格的 Flux 架构，要求通过 action → reducer 的方式更新状态，这种约束带来了可预测性和可追溯性（每次状态变化都有明确的 action 记录）。Zustand 则去掉了这些约束，允许直接通过函数修改状态，更加灵活但也意味着在大型团队中可能缺少统一的更新模式。从实现层面看，Redux 依赖 React Context 传递 store 引用（需要 Provider），Zustand 则是模块级别的 store（不需要 Provider），这使得 Zustand 在跨组件树共享状态时更加方便。

### "为什么 Context 不适合做高频更新的状态管理？"

Context 的更新机制是：当 Provider 的 value 发生变化时，所有调用了 `useContext` 的组件都会重新渲染，无论它们是否真正使用了变化的那部分数据。这意味着如果把一个包含多个字段的对象作为 Context value，任何一个字段的变化都会导致所有消费者重渲染。虽然可以通过拆分 Context、使用 `React.memo` 等方式优化，但这些都是 workaround，不如 Zustand/Redux 的 selector 机制来得直接。React 团队也在探索 `useContextSelector` 这样的 API，但目前还没有正式发布。

### "如何区分服务端状态和客户端状态？"

服务端状态是指来源于服务端的数据（如用户列表、商品信息），它的特点是：数据的所有权在服务端、可能被其他用户修改、需要处理缓存和失效策略。客户端状态是指只存在于前端的数据（如 UI 状态、表单输入、主题设置），它的特点是：数据的所有权在客户端、同步且可预测。最佳实践是用 TanStack Query 或 RTK Query 管理服务端状态（它们提供了缓存、重试、轮询、乐观更新等能力），用 Zustand/Jotai 等管理客户端状态，避免把所有状态都塞进一个 Redux store 里。
