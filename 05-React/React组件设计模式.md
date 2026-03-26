# React 组件设计模式

> 面试高频考点：HOC、Render Props、组合模式是 React 代码复用的三大核心方案，也是理解 React 设计哲学的关键。

## 一、为什么需要组件设计模式

React 组件复用面临两个核心问题：

1. **UI 复用**：相同的 UI 结构在多处使用 → 抽成组件即可
2. **逻辑复用**：相同的状态逻辑在多处使用 → 需要设计模式

React 历史上出现了三种主流逻辑复用方案，演进路径为：Mixin（已废弃）→ HOC → Render Props → 自定义 Hook（现代推荐）。

---

## 二、高阶组件（HOC）

### 核心概念

高阶组件是一个**函数**，接收一个组件作为参数，返回一个新的增强组件。本质是**装饰器模式**在 React 中的应用。

```javascript
// HOC 基本结构
function withXxx(WrappedComponent) {
  return function EnhancedComponent(props) {
    // 在这里注入额外的逻辑或 props
    return <WrappedComponent {...props} extraProp="value" />;
  };
}
```

### 实战示例：权限控制 HOC

```javascript
// withAuth.jsx
function withAuth(WrappedComponent) {
  return function AuthComponent(props) {
    const { isLoggedIn, user } = useAuth(); // 假设有 useAuth hook

    if (!isLoggedIn) {
      return <Navigate to="/login" replace />;
    }

    return <WrappedComponent {...props} user={user} />;
  };
}

// 使用
const ProtectedDashboard = withAuth(Dashboard);
```

### 实战示例：数据加载 HOC

```javascript
// withLoading.jsx
function withLoading(WrappedComponent) {
  return function LoadingComponent({ isLoading, ...rest }) {
    if (isLoading) {
      return <div className="spinner">加载中...</div>;
    }
    return <WrappedComponent {...rest} />;
  };
}

// 实战示例：日志记录 HOC
function withLogger(WrappedComponent) {
  return function LoggedComponent(props) {
    useEffect(() => {
      console.log(`[${WrappedComponent.displayName || WrappedComponent.name}] 挂载`);
      return () => {
        console.log(`[${WrappedComponent.displayName || WrappedComponent.name}] 卸载`);
      };
    }, []);

    return <WrappedComponent {...props} />;
  };
}
```

### HOC 的注意事项

**1. 透传 props（必须）**

```javascript
// ❌ 错误：丢失了原始 props
function withBad(WrappedComponent) {
  return function(props) {
    return <WrappedComponent newProp="value" />; // 忘记透传 props
  };
}

// ✅ 正确：展开透传所有 props
function withGood(WrappedComponent) {
  return function(props) {
    return <WrappedComponent {...props} newProp="value" />;
  };
}
```

**2. 设置 displayName（调试用）**

```javascript
function withAuth(WrappedComponent) {
  function AuthComponent(props) { /* ... */ }
  // 设置 displayName，方便 React DevTools 调试
  AuthComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;
  return AuthComponent;
}
```

**3. 不要在 render 中创建 HOC**

```javascript
// ❌ 错误：每次渲染都创建新组件，导致子树完全重新挂载
function Parent() {
  const EnhancedChild = withAuth(Child); // 每次渲染都是新组件！
  return <EnhancedChild />;
}

// ✅ 正确：在组件外部创建
const EnhancedChild = withAuth(Child);
function Parent() {
  return <EnhancedChild />;
}
```

**4. HOC 与 ref 的问题**

HOC 包裹后，ref 指向的是外层包装组件，而非原始组件。需要用 `React.forwardRef` 解决：

```javascript
function withAuth(WrappedComponent) {
  const AuthComponent = React.forwardRef((props, ref) => {
    const { isLoggedIn } = useAuth();
    if (!isLoggedIn) return <Navigate to="/login" />;
    return <WrappedComponent {...props} ref={ref} />;
  });
  AuthComponent.displayName = `withAuth(${WrappedComponent.name})`;
  return AuthComponent;
}
```

### HOC 的缺点

- **props 命名冲突**：多个 HOC 嵌套时，同名 props 会被覆盖
- **来源不透明**：组件接收的 props 不知道来自哪个 HOC
- **嵌套地狱**：多个 HOC 组合时代码可读性差 `withA(withB(withC(Component)))`

---

## 三、Render Props

### 核心概念

Render Props 是一种通过 **prop 传递函数** 来共享代码的技术。组件接收一个函数类型的 prop，调用该函数来决定渲染什么内容。

```javascript
// Render Props 基本结构
<DataProvider render={(data) => <Child data={data} />} />

// 也可以用 children 作为函数（更常见）
<DataProvider>
  {(data) => <Child data={data} />}
</DataProvider>
```

### 实战示例：鼠标位置追踪

```javascript
// MouseTracker.jsx
class MouseTracker extends React.Component {
  state = { x: 0, y: 0 };

  handleMouseMove = (e) => {
    this.setState({ x: e.clientX, y: e.clientY });
  };

  render() {
    return (
      <div onMouseMove={this.handleMouseMove} style={{ height: '100vh' }}>
        {/* 调用 render prop，将状态传出去 */}
        {this.props.render(this.state)}
      </div>
    );
  }
}

// 使用：不同组件复用同一份鼠标追踪逻辑
function App() {
  return (
    <MouseTracker
      render={({ x, y }) => (
        <div>鼠标位置：({x}, {y})</div>
      )}
    />
  );
}
```

### children as function（更优雅的写法）

```javascript
// Toggle.jsx - 控制显示/隐藏的逻辑组件
function Toggle({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  return children({
    isOpen,
    toggle: () => setIsOpen(prev => !prev),
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  });
}

// 使用：完全自定义 UI，复用 toggle 逻辑
function App() {
  return (
    <Toggle>
      {({ isOpen, toggle }) => (
        <div>
          <button onClick={toggle}>{isOpen ? '收起' : '展开'}</button>
          {isOpen && <div className="content">这是内容</div>}
        </div>
      )}
    </Toggle>
  );
}
```

### 实战示例：数据获取组件

```javascript
// DataFetcher.jsx
function DataFetcher({ url, children }) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(data => setState({ data, loading: false, error: null }))
      .catch(error => setState({ data: null, loading: false, error }));
  }, [url]);

  return children(state);
}

// 使用
function UserList() {
  return (
    <DataFetcher url="/api/users">
      {({ data, loading, error }) => {
        if (loading) return <Spinner />;
        if (error) return <ErrorMessage error={error} />;
        return <ul>{data.map(user => <li key={user.id}>{user.name}</li>)}</ul>;
      }}
    </DataFetcher>
  );
}
```

### Render Props 的缺点

- **回调地狱**：多层嵌套时代码难以阅读
- **性能问题**：每次父组件渲染都会创建新的函数，可能导致子组件不必要的重渲染（可用 `useCallback` 缓解）

---

## 四、组合模式（Compound Components）

### 核心概念

复合组件模式将一个复杂组件拆分为多个子组件，这些子组件通过 **Context** 隐式共享状态，对外提供灵活的组合 API。

典型案例：HTML 的 `<select>` 和 `<option>` 就是天然的复合组件。

```jsx
// 使用者视角：灵活组合，语义清晰
<Tabs defaultValue="tab1">
  <Tabs.List>
    <Tabs.Tab value="tab1">标签一</Tabs.Tab>
    <Tabs.Tab value="tab2">标签二</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="tab1">内容一</Tabs.Panel>
  <Tabs.Panel value="tab2">内容二</Tabs.Panel>
</Tabs>
```

### 实战示例：Tabs 组件

```javascript
// Tabs.jsx
const TabsContext = createContext(null);

function Tabs({ defaultValue, children }) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function TabList({ children }) {
  return <div className="tab-list" role="tablist">{children}</div>;
}

function Tab({ value, children }) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      className={`tab ${isActive ? 'active' : ''}`}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

function TabPanel({ value, children }) {
  const { activeTab } = useContext(TabsContext);
  if (activeTab !== value) return null;
  return <div role="tabpanel">{children}</div>;
}

// 挂载子组件到父组件上（命名空间）
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

export default Tabs;
```

### 实战示例：Accordion 手风琴

```javascript
const AccordionContext = createContext(null);

function Accordion({ children, allowMultiple = false }) {
  const [openItems, setOpenItems] = useState(new Set());

  const toggle = (id) => {
    setOpenItems(prev => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
}

function AccordionItem({ id, title, children }) {
  const { openItems, toggle } = useContext(AccordionContext);
  const isOpen = openItems.has(id);

  return (
    <div className="accordion-item">
      <button onClick={() => toggle(id)}>
        {title} {isOpen ? '▲' : '▼'}
      </button>
      {isOpen && <div className="accordion-content">{children}</div>}
    </div>
  );
}

Accordion.Item = AccordionItem;
```

### 复合组件的优势

- **灵活性高**：使用者可以自由排列子组件顺序，插入自定义内容
- **语义清晰**：组件结构一目了然，类似 HTML 原生元素
- **状态封装**：内部状态对外透明，使用者无需关心实现细节

---

## 五、三种模式对比

| 维度 | HOC | Render Props | 复合组件 |
|------|-----|-------------|---------|
| 复用类型 | 逻辑复用 | 逻辑复用 | UI + 逻辑复用 |
| 代码可读性 | 中（嵌套多时差） | 中（回调嵌套） | 高（声明式） |
| 灵活性 | 低（固定增强方式） | 高（完全自定义 UI） | 高（自由组合） |
| 调试难度 | 高（来源不透明） | 低 | 低 |
| 适用场景 | 横切关注点（权限、日志） | 逻辑与 UI 解耦 | 复杂 UI 组件库 |
| 现代替代 | 自定义 Hook | 自定义 Hook | 仍然适用 |

---

## 六、现代 React 的推荐方案

### 自定义 Hook 替代 HOC 和 Render Props

```javascript
// ❌ 旧方式：HOC
const EnhancedComponent = withMousePosition(MyComponent);

// ❌ 旧方式：Render Props
<MouseTracker render={({ x, y }) => <MyComponent x={x} y={y} />} />

// ✅ 现代方式：自定义 Hook（React 16.8+）
function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);
  return position;
}

function MyComponent() {
  const { x, y } = useMousePosition(); // 直接调用，简洁清晰
  return <div>({x}, {y})</div>;
}
```

### 何时仍然使用 HOC

- 需要包裹第三方组件（无法修改源码）
- 需要拦截 props 或 ref（如 `React.forwardRef` 场景）
- 与 Class 组件交互（Class 组件无法使用 Hook）

### 何时使用复合组件

- 构建组件库（如 Ant Design、Radix UI 的设计方式）
- 组件内部有多个协作的子组件
- 需要给使用者提供灵活的布局控制权

---

## 七、面试常见问题

**Q：HOC 和自定义 Hook 有什么区别？**

HOC 是组件层面的复用，返回新组件，可以拦截渲染逻辑；自定义 Hook 是函数层面的复用，只能在函数组件中使用，不能控制渲染。HOC 适合需要包裹 UI 的场景，Hook 适合纯逻辑复用。

**Q：Render Props 和 HOC 解决的是同一个问题吗？**

是的，两者都是为了解决逻辑复用问题，只是实现方式不同。Render Props 更灵活（使用者完全控制 UI），HOC 更适合"透明增强"（使用者感知不到增强逻辑）。

**Q：复合组件为什么用 Context 而不是 props 传递？**

如果用 props 传递，中间层组件必须透传所有 props（props drilling），而且使用者无法在子组件之间插入自定义内容。Context 让子组件直接读取共享状态，使用者可以自由排列子组件顺序。

**Q：HOC 会导致 props 命名冲突怎么解决？**

1. 约定 HOC 注入的 props 使用特定前缀（如 `auth_user`）
2. 使用 namespace 对象传递（如 `authProps={{ user, isLoggedIn }}`）
3. 改用自定义 Hook，彻底避免 props 污染
