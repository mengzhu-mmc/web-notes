# useReducer 与 useContext 模拟 Redux

## 实现思路

使用 React 内置的 `useReducer` + `useContext` 可以模拟 Redux 的核心功能：集中状态管理、可预测的状态更新、dispatch action 模式。

## 实现步骤

### 1. 创建 Reducer

```javascript
// store/reducer.js
export const initialState = { user: null, count: 0, todos: [] };

export const actionTypes = {
  SET_USER: 'SET_USER',
  INCREMENT: 'INCREMENT',
  ADD_TODO: 'ADD_TODO',
  REMOVE_TODO: 'REMOVE_TODO'
};

export const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.INCREMENT:
      return { ...state, count: state.count + 1 };
    case actionTypes.ADD_TODO:
      return { ...state, todos: [...state.todos, action.payload] };
    case actionTypes.REMOVE_TODO:
      return { ...state, todos: state.todos.filter(t => t.id !== action.payload) };
    default:
      return state;
  }
};
```

### 2. 创建 Context 和 Provider

```javascript
// store/StoreProvider.jsx
const StateContext = createContext();
const DispatchContext = createContext();

export const StoreProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
};

// 自定义 Hooks
export const useStore = () => useContext(StateContext);
export const useDispatch = () => useContext(DispatchContext);
```

性能优化关键：分离 `StateContext` 和 `DispatchContext`，避免 dispatch 不变时因 state 变化导致只使用 dispatch 的组件不必要重渲染。

### 3. 组件中使用

```javascript
function Counter() {
  const { count } = useStore();
  const dispatch = useDispatch();
  return (
    <div>
      <h2>Count: {count}</h2>
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+</button>
    </div>
  );
}
```

## Redux Toolkit vs 传统 Redux

Redux Toolkit 和 React Redux 是不同层面的东西：React Redux 是 React 的 Redux 绑定库（提供 `Provider`、`useSelector`、`useDispatch`），Redux Toolkit 是 Redux 官方推荐的工具集（简化 Redux 使用）。它们是配合使用的，不是替代关系。

### 传统 Redux 的痛点

需要分别创建 actionTypes、actions、reducer 三个文件，样板代码多。深层嵌套更新需要逐层展开（`...state`）。

### Redux Toolkit 的简化

`createSlice` 将 action types、action creators、reducer 合并在一个文件中，自动生成 action creators。内置 Immer，可以直接"修改"状态（实际是不可变更新）。`configureStore` 自动包含 Redux DevTools 和中间件。

```javascript
const counterSlice = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  reducers: {
    increment: (state) => { state.count += 1; }, // Immer 处理
    incrementByAmount: (state, action) => { state.count += action.payload; }
  }
});

export const { increment, incrementByAmount } = counterSlice.actions;
export default counterSlice.reducer;
```

## 选择建议

`useReducer` + `useContext` 适合中小型应用，无需额外依赖。Redux Toolkit 适合大型应用，提供更完善的生态（中间件、DevTools、异步处理）。
