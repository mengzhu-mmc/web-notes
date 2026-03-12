# React 状态管理对比：Redux vs MobX

## 核心理念差异

Redux 采用函数式编程思想：单一数据源（整个应用一个 Store）、状态不可变（通过纯函数 Reducer 返回新状态）、显式更新（dispatch action）。MobX 采用面向对象编程思想：多数据源（多个 Store）、状态可变（直接修改，框架自动追踪依赖）、隐式更新（响应式自动更新）。

## 数据流对比

Redux 严格单向数据流：View → Action → Reducer → New State → View Update，所有状态变更可追溯。MobX 响应式数据流：View → 修改 Observable → 自动通知 → View Update，变更更隐式。

## 代码风格对比

```javascript
// Redux
const counterReducer = (state = { count: 0 }, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    default:
      return state;
  }
};
dispatch(increment());

// MobX
class CounterStore {
  count = 0;
  constructor() {
    makeObservable(this, { count: observable, increment: action });
  }
  increment() { this.count++; }
}
counterStore.increment();
```

## 不可变 vs 可变更新

### 变更检测机制

不可变更新通过引用对比（`===`）检测变化，简单高效，适合 `React.memo`、`PureComponent` 优化，支持时间旅行调试。可变更新通过 Proxy 追踪变化，精确知道哪些组件依赖了变化的数据，实现细粒度更新。

### 深层嵌套更新

不可变更新在深层嵌套时非常繁琐（需要逐层展开），可使用 Immer 库简化。可变更新直接修改即可（`state.users.byId['1'].profile.age = 21`）。

### 性能特点

不可变更新每次创建新对象，大数组复制开销大（`[...bigArray, newItem]` 约 0.5ms），但变更检测快。可变更新直接修改（`push` 约 0.001ms），且 MobX 自动精确追踪依赖，只更新真正依赖变化数据的组件。

### 副作用风险

可变状态存在意外共享引用的风险（获取对象引用后直接修改会影响 store），不可变状态更安全（必须通过 reducer 更新）。

## 现代实践：Redux Toolkit + Immer

```javascript
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addItem(state, action) {
      state.items.push(action.payload); // 写法像可变，Immer 处理成不可变
    }
  }
});
```

## 选择建议

Redux 适合大型应用、大型团队协作、需要时间旅行调试和严格状态管理规范的场景。MobX 适合快速原型开发、中小型项目、频繁深层更新和性能敏感场景。Redux 生态包括 Redux Toolkit、Redux-Saga/Thunk、Reselect、Redux DevTools；MobX 生态包括 mobx-react-lite、mobx-state-tree。
