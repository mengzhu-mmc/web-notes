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

## 进阶：异步 Action（类似 redux-thunk）

原生 `useReducer` 的 `dispatch` 只接受普通对象，支持异步需要封装 `enhancedDispatch`：

```jsx
export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(rootReducer, initialState);

  // 增强版 dispatch，支持函数类型 action（类似 thunk）
  const enhancedDispatch = useCallback((action) => {
    if (typeof action === 'function') {
      // 异步 action：调用时传入 dispatch 和 getState
      action(enhancedDispatch, () => state);
    } else {
      dispatch(action);
    }
  }, [state]);

  return (
    <StoreContext.Provider value={{ state, dispatch: enhancedDispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

// 使用异步 action
function fetchTodos() {
  return async (dispatch) => {
    const data = await fetch('/api/todos').then(r => r.json());
    dispatch({ type: 'SET_TODOS', payload: data });
  };
}

// 组件中
dispatch(fetchTodos()); // 传入函数，enhancedDispatch 会执行它
```

## 进阶：状态持久化（localStorage）

```jsx
// 初始化时从 localStorage 读取
const savedState = localStorage.getItem('appState');
const initialStateWithPersist = savedState
  ? JSON.parse(savedState)
  : initialState;

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(rootReducer, initialStateWithPersist);

  // 每次 state 更新时同步到 localStorage
  useEffect(() => {
    localStorage.setItem('appState', JSON.stringify(state));
  }, [state]);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}
```

## 进阶：combineReducers（拆分 Reducer）

当状态复杂时，可以拆分成多个 reducer，再合并：

```js
// 各模块 reducer
function todosReducer(state = [], action) {
  switch (action.type) {
    case 'ADD_TODO': return [...state, action.payload];
    default: return state;
  }
}

function filterReducer(state = 'all', action) {
  switch (action.type) {
    case 'SET_FILTER': return action.payload;
    default: return state;
  }
}

// 手写 combineReducers
function combineReducers(reducers) {
  return function(state = {}, action) {
    return Object.keys(reducers).reduce((nextState, key) => {
      nextState[key] = reducers[key](state[key], action);
      return nextState;
    }, {});
  };
}

// 合并
const rootReducer = combineReducers({
  todos: todosReducer,
  filter: filterReducer,
});
// state.todos / state.filter 分开管理
```

## 选择建议

`useReducer` + `useContext` 适合中小型应用，无需额外依赖。Redux Toolkit 适合大型应用，提供更完善的生态（中间件、DevTools、异步处理）。

> ⚠️ **劣势提醒**：Context 更新会触发所有消费组件重渲染。优化方案：
> 1. 拆分 StateContext 和 DispatchContext（dispatch 不变时只使用 dispatch 的组件不重渲染）
> 2. 用 `React.memo` 包裹消费组件
> 3. 状态量大时考虑 zustand（内置精确订阅）
