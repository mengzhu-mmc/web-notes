# TypeScript 与 React 实战

## 关联笔记

- [[03-TypeScript/TypeScript基础到进阶]]
- [[03-TypeScript/[3182] 第11讲：为什么说 JavaScript 不适合大型项目？]]
- [[03-TypeScript/README]]
- [[05-框架-React/]]

---

## 一、组件 Props 类型定义

### 1.1 函数组件基础

```tsx
// ✅ 推荐：直接用 type 定义 Props
type ButtonProps = {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick: () => void;
};

function Button({ label, variant = 'primary', size = 'md', disabled, onClick }: ButtonProps) {
  return (
    <button className={`btn btn-${variant} btn-${size}`} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}

// ❌ 不推荐：React.FC（已不建议使用）
// - 隐式包含 children（React 18 已移除）
// - 不支持泛型组件
// - 影响默认参数推导
const Button2: React.FC<ButtonProps> = ({ label }) => <button>{label}</button>;
```

### 1.2 children 类型

```tsx
type CardProps = {
  title: string;
  children: React.ReactNode; // 最宽泛：string | number | JSX | null | undefined | ...
};

type StrictCardProps = {
  title: string;
  children: React.ReactElement; // 只接受 JSX 元素，不接受 string/number
};

type RenderPropCardProps = {
  title: string;
  children: (data: { isOpen: boolean }) => React.ReactNode; // render prop
};

function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
```

### 1.3 常见 Props 模式

```tsx
// 继承原生 HTML 属性
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

function Input({ label, error, ...inputProps }: InputProps) {
  return (
    <div>
      <label>{label}</label>
      <input {...inputProps} />
      {error && <span className="error">{error}</span>}
    </div>
  );
}

// 多态组件（as prop）
type BoxProps<T extends React.ElementType = 'div'> = {
  as?: T;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'children'>;

function Box<T extends React.ElementType = 'div'>({ as, children, ...props }: BoxProps<T>) {
  const Component = as || 'div';
  return <Component {...props}>{children}</Component>;
}

// 使用
<Box as="a" href="/home">Link Box</Box>
<Box as="button" onClick={() => {}}>Button Box</Box>
```

### 1.4 组件 Props 的条件类型

```tsx
// 互斥 Props —— 面试常考
type BaseModalProps = {
  title: string;
  onClose: () => void;
};

type ConfirmModalProps = BaseModalProps & {
  variant: 'confirm';
  onConfirm: () => void;
  confirmText?: string;
};

type AlertModalProps = BaseModalProps & {
  variant: 'alert';
  severity: 'info' | 'warning' | 'error';
};

type ModalProps = ConfirmModalProps | AlertModalProps;

function Modal(props: ModalProps) {
  if (props.variant === 'confirm') {
    // TypeScript 知道这里有 onConfirm
    return <button onClick={props.onConfirm}>{props.confirmText ?? '确认'}</button>;
  }
  // 这里 TypeScript 知道是 AlertModalProps
  return <div className={props.severity}>Alert!</div>;
}
```

---

## 二、Hooks 类型标注

### 2.1 useState

```tsx
// 简单类型 —— 自动推导，不需要标注
const [count, setCount] = useState(0);           // number
const [name, setName] = useState('');             // string
const [isOpen, setIsOpen] = useState(false);      // boolean

// 需要显式标注的场景
const [user, setUser] = useState<User | null>(null); // 初始值是 null
const [items, setItems] = useState<string[]>([]);    // 空数组需要标注
const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle'); // 联合类型

// 惰性初始化
const [state, setState] = useState<ComplexState>(() => computeInitialState());
```

### 2.2 useRef

```tsx
// DOM 引用 —— 传入 null，返回 RefObject（.current 是只读的）
const inputRef = useRef<HTMLInputElement>(null);
// inputRef.current?.focus();

// 可变值存储 —— 不传 null 或传入初始值
const timerRef = useRef<number>(0);
// timerRef.current = window.setTimeout(...);

const renderCount = useRef(0); // 自动推导为 MutableRefObject<number>

// 常见 DOM 元素类型
// HTMLDivElement, HTMLInputElement, HTMLButtonElement,
// HTMLFormElement, HTMLAnchorElement, HTMLTextAreaElement,
// HTMLCanvasElement, HTMLVideoElement, HTMLImageElement
```

### 2.3 useEffect / useCallback / useMemo

```tsx
// useEffect —— 返回 void 或 cleanup 函数，不需要标注
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  return () => clearInterval(timer); // cleanup
}, []);

// ❌ 常见错误：传 async 函数给 useEffect
// useEffect(async () => { ... }); // 返回 Promise，不是 void
// ✅ 正确写法
useEffect(() => {
  async function fetchData() {
    const data = await api.get<User[]>('/users');
    setUsers(data);
  }
  fetchData();
}, []);

// useCallback —— 通常自动推导
const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
  console.log(e.currentTarget.name);
}, []);

// useMemo —— 自动推导返回类型
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);

// 需要显式标注时
const config = useMemo<AppConfig>(() => ({
  theme: 'dark',
  locale: 'zh-CN',
}), []);
```

### 2.4 useReducer

```tsx
type State = {
  count: number;
  step: number;
};

type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'setStep'; payload: number }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + state.step };
    case 'decrement':
      return { ...state, count: state.count - state.step };
    case 'setStep':
      return { ...state, step: action.payload };
    case 'reset':
      return { count: 0, step: 1 };
    default:
      // exhaustive check
      const _: never = action;
      return state;
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 });

  return (
    <div>
      <span>{state.count}</span>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'setStep', payload: 5 })}>Step=5</button>
    </div>
  );
}
```

### 2.5 自定义 Hook

```tsx
// 返回元组 —— 用 as const 保持精确类型
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle] as const;
  // 返回类型：readonly [boolean, () => void]
  // 不加 as const 会推导为 (boolean | (() => void))[]
}

// 带泛型的自定义 Hook
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue(prev => {
      const newValue = value instanceof Function ? value(prev) : value;
      localStorage.setItem(key, JSON.stringify(newValue));
      return newValue;
    });
  }, [key]);

  return [storedValue, setValue] as const;
}

// 使用
const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
```

---

## 三、事件类型

### 3.1 常见事件类型速查

```tsx
// 鼠标事件
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {};
const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {};

// 表单事件
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {};
const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {};
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};

// 键盘事件
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') { /* ... */ }
};

// 焦点事件
const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {};
const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {};

// 拖拽事件
const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {};
const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  const files = e.dataTransfer.files;
};

// 触摸事件
const handleTouch = (e: React.TouchEvent<HTMLDivElement>) => {};

// 滚动事件
const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {};

// 剪贴板事件
const handleCopy = (e: React.ClipboardEvent<HTMLInputElement>) => {};
```

### 3.2 事件处理器类型

```tsx
// 两种写法等价
type Props1 = {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

type Props2 = {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
};

// 如果不关心事件对象
type Props3 = {
  onClick: () => void; // 简洁，但组件内无法访问 event
};
```

---

## 四、泛型组件

### 4.1 列表组件

```tsx
type ListProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
};

function List<T>({ items, renderItem, keyExtractor, emptyMessage }: ListProps<T>) {
  if (items.length === 0) {
    return <div>{emptyMessage ?? '暂无数据'}</div>;
  }

  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

// 使用时自动推导 T
<List
  items={users}
  renderItem={(user) => <span>{user.name}</span>} // user 自动推导为 User
  keyExtractor={(user) => user.id}
/>
```

### 4.2 表格组件

```tsx
type Column<T> = {
  key: keyof T & string;
  title: string;
  render?: (value: T[keyof T], record: T) => React.ReactNode;
  width?: number;
};

type TableProps<T extends { id: string | number }> = {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (record: T) => void;
};

function Table<T extends { id: string | number }>({
  columns, data, loading, onRowClick
}: TableProps<T>) {
  if (loading) return <div>Loading...</div>;

  return (
    <table>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} style={{ width: col.width }}>{col.title}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(record => (
          <tr key={record.id} onClick={() => onRowClick?.(record)}>
            {columns.map(col => (
              <td key={col.key}>
                {col.render ? col.render(record[col.key], record) : String(record[col.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 4.3 Select 组件

```tsx
type SelectOption<V extends string | number> = {
  label: string;
  value: V;
  disabled?: boolean;
};

type SelectProps<V extends string | number> = {
  options: SelectOption<V>[];
  value: V;
  onChange: (value: V) => void;
  placeholder?: string;
};

function Select<V extends string | number>({ options, value, onChange, placeholder }: SelectProps<V>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as V)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// 使用
type Role = 'admin' | 'editor' | 'viewer';
const roles: SelectOption<Role>[] = [
  { label: '管理员', value: 'admin' },
  { label: '编辑者', value: 'editor' },
  { label: '查看者', value: 'viewer' },
];

<Select options={roles} value={selectedRole} onChange={setSelectedRole} />
// onChange 的参数类型自动推导为 Role
```

---

## 五、Context 类型

### 5.1 基础用法

```tsx
type Theme = 'light' | 'dark';

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

// 方式1：带默认值（推荐，使用时不需要判空）
const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

// 方式2：不提供默认值（需要自定义 Hook 兜底）
const ThemeContext2 = createContext<ThemeContextType | undefined>(undefined);

function useTheme() {
  const context = useContext(ThemeContext2);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context; // 返回类型是 ThemeContextType，不含 undefined
}
```

### 5.2 完整 Provider 模式

```tsx
type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

type AuthContextType = AuthState & {
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    setState(prev => ({ ...prev, isLoading: true }));
    const user = await api.login(credentials);
    setState({ user, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    const updated = await api.updateUser(data);
    setState(prev => ({ ...prev, user: updated }));
  }, []);

  const value = useMemo(
    () => ({ ...state, login, logout, updateProfile }),
    [state, login, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// 使用
function ProfilePage() {
  const { user, isLoading, logout } = useAuth();
  // user 类型是 User | null，isLoading 是 boolean
  if (isLoading) return <Spinner />;
  if (!user) return <Redirect to="/login" />;
  return <div>{user.name}</div>;
}
```

---

## 六、常见类型报错及解决

### 6.1 `Type 'X' is not assignable to type 'Y'`

```tsx
// 场景：事件处理器类型不匹配
// ❌
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {};
<select onChange={handleChange} /> // HTMLInputElement vs HTMLSelectElement

// ✅ 修正元素类型
const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {};

// 场景：对象字面量多了属性
type Props = { name: string };
// ❌ 直接传对象字面量会检查多余属性
<Component {...{ name: 'Alice', age: 25 } as Props} />
// ✅ 先赋值给变量（不会检查多余属性）
const props = { name: 'Alice', age: 25 };
<Component {...props} />
```

### 6.2 `Property 'X' does not exist on type 'Y'`

```tsx
// 场景：访问联合类型的非共有属性
type Response = SuccessResponse | ErrorResponse;
function handle(res: Response) {
  // ❌ name 只在 SuccessResponse 上
  console.log(res.name);

  // ✅ 先缩窄类型
  if ('name' in res) {
    console.log(res.name);
  }
}

// 场景：ref.current 可能为 null
const ref = useRef<HTMLDivElement>(null);
// ❌
ref.current.getBoundingClientRect();
// ✅ 可选链或断言
ref.current?.getBoundingClientRect();
ref.current!.getBoundingClientRect(); // 确定不为 null 时
```

### 6.3 `Argument of type 'string' is not assignable to parameter of type 'X'`

```tsx
// 场景：Object.keys 返回 string[] 而非 (keyof T)[]
const user = { name: 'Alice', age: 25 };
// ❌
Object.keys(user).forEach(key => {
  console.log(user[key]); // key 是 string，不能索引 User
});
// ✅ 方案1：类型断言
(Object.keys(user) as (keyof typeof user)[]).forEach(key => {
  console.log(user[key]);
});
// ✅ 方案2：用 for...in
for (const key in user) {
  console.log(user[key as keyof typeof user]);
}
// ✅ 方案3：封装工具函数
function typedKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}
```

### 6.4 `Cannot find module 'X' or its corresponding type declarations`

```bash
# 方案1：安装 @types
npm install -D @types/module-name

# 方案2：添加声明文件
# src/types/module-name.d.ts
declare module 'module-name' {
  const content: any;
  export default content;
}

# 方案3：CSS Modules / 图片等
# src/types/assets.d.ts
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
declare module '*.png';
declare module '*.svg?react' {
  const Component: React.FC<React.SVGProps<SVGSVGElement>>;
  export default Component;
}
```

### 6.5 `Type instantiation is excessively deep`

```tsx
// 通常是递归类型太深（如 DeepPartial 遇到复杂嵌套对象）
// 解决方案：
// 1. 增加递归终止条件
type DeepPartial<T> = T extends object
  ? T extends Function
    ? T // 函数不递归
    : { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// 2. 限制递归深度
type DeepPartialN<T, Depth extends number[] = []> =
  Depth['length'] extends 5 ? T : // 最多 5 层
  T extends object
    ? { [K in keyof T]?: DeepPartialN<T[K], [...Depth, 1]> }
    : T;

// 3. 使用 @ts-expect-error 临时跳过（不推荐）
```

### 6.6 React 18+ 常见问题

```tsx
// children 不再隐式包含在 FC 中
// ❌ React 18
const App: React.FC = ({ children }) => <div>{children}</div>;
// ✅
type AppProps = { children: React.ReactNode };
function App({ children }: AppProps) {
  return <div>{children}</div>;
}

// useRef 初始值与类型
// React 18 中 useRef 有重载
// useRef<T>(initialValue: T): MutableRefObject<T>
// useRef<T>(initialValue: T | null): RefObject<T>  当 T 不含 null
// useRef<T = undefined>(): MutableRefObject<T | undefined>
```

---

## 面试高频问题

### Q1：React.FC 还推荐用吗？

不推荐。React 18 已移除隐式 children，FC 的主要"优势"已不存在。直接用函数声明 + Props 类型更清晰、支持泛型、默认参数推导更好。

### Q2：如何类型安全地使用 Context？

用 `createContext<T | undefined>(undefined)` + 自定义 Hook 抛错兜底，既避免假默认值，又保证消费端不需要判空。

### Q3：泛型组件怎么配合 forwardRef？

```tsx
// React 18 的写法（比较繁琐）
type ListProps<T> = { items: T[] };
type ListRef = { scrollToTop: () => void };

const List = forwardRef(function List<T>(
  props: ListProps<T>,
  ref: React.ForwardedRef<ListRef>
) {
  // ...
}) as <T>(props: ListProps<T> & { ref?: React.Ref<ListRef> }) => React.ReactElement;

// React 19 支持 ref 作为 prop，不再需要 forwardRef
function List<T>({ items, ref }: ListProps<T> & { ref?: React.Ref<ListRef> }) {
  // ...
}
```

### Q4：如何处理联合类型的 Props？

用可辨识联合（discriminated union）+ switch/if 缩窄，避免用可选属性模拟互斥 Props。见第一节"组件 Props 的条件类型"示例。
