# 聊透 React 闭包陷阱与底层执行机制

> 💡 **核心大白话**：在 React 里，组件的每一次重新渲染，就像是拍了一张**拍立得照片（状态快照）**。每一张照片里的变量都是当下的、被锁死的。理解了这个“快照”机制，你就彻底懂了 React 的闭包陷阱和内存回收！

---

## 一、 前置概念：用大白话理解闭包与上下文

1. **执行上下文（Execution Context）**：你可以把它当成组件每一次渲染时，React 给你搭的“临时操作台”。每次渲染，都会搭一个全新的操作台。
2. **词法环境（Lexical Environment）**：这就相当于操作台上的“物资清单”。函数在被**定义的那一刻**，就已经绑定了当时的那份物资清单。
3. **闭包（Closure）**：说白了，就是函数偷偷把自己诞生时的那份“物资清单”打包带走了。不管这个函数以后在哪里被调用，它认的永远是当时打包带走的那份旧清单。

---

## 二、 React 闭包陷阱是怎么产生的？

React 函数组件的每一次重新渲染，本质上就是把这个函数重新执行了一遍。

### 1. 独立的状态快照

每次渲染，React 会给当前的 `state` 和 `props` 拍一张快照。
如果你在这时定义了一个异步操作（比如 `setTimeout` 或者挂在 `window` 上的事件监听），这个异步回调就会把**当前这一帧**的快照死死抱住。

### 2. 案发现场再现 (Stale Closure)

假设我们在 `useEffect` 里绑定了一个滚动事件，依赖数组写了空 `[]`：

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // 这里的 count 是哪个时空的 count？
      console.log("当前 Count:", count);
    };
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []); // 依赖为空，意味着只在组件刚挂载时跑一次

  return <button onClick={() => setCount(count + 1)}>Add</button>;
}
```

**案发全过程**：

1. **第 1 次渲染（初始状态）**：`count` 是 0。代码创建了 `handleScroll`，它顺手抱走了 `count = 0` 的快照。接着 `useEffect` 把这个 `handleScroll` 挂到了全局的 `window` 上。
2. **点击按钮（第 2 次渲染）**：`count` 变成了 1。React 给你搭了个新操作台，生成了 `count = 1` 的新快照。
3. **陷阱出现**：因为 `useEffect` 的依赖是 `[]`，所以第二次渲染时它根本没重新执行！`window` 上绑定的滚动事件，**依然是第 1 次渲染时创建的那个旧的 `handleScroll`**。所以当你滚动屏幕时，它翻开自己手里抱着的旧快照，永远只打印出 `0`。这就是大名鼎鼎的“闭包陷阱”。

---

## 三、 垃圾回收（GC）：旧状态为什么不被销毁？

你可能会问：第 1 次渲染早就结束了，旧的“临时操作台”早该塌了，为什么 `count = 0` 还不被销毁？
这就得请出 V8 引擎的**垃圾回收机制（GC）—— 可达性分析**了。

简单来说，GC 就像个勤劳的清洁工，它会从根节点（比如全局的 `window`）顺藤摸瓜：**只要是顺着藤能摸到的东西，都说明“还有人在用”，绝对不准当垃圾扔掉**。

- **死锁的引用链条**：`window` 抓着绑定的 `handleScroll` 函数 -> `handleScroll` 作为闭包，又死死抓着 **第 1 次渲染的物资清单 (`count = 0`)**。
- **最终结果**：因为你把 `handleScroll` 绑在了全局对象上，这条藤就一直连着。清洁工 GC 顺藤摸瓜后判定“这块内存还在服役”，于是第 1 次渲染的内存空间死活回收不掉。老状态被“死死抓住了”。

---

## 四、 如何优雅地逃出闭包陷阱？

### 解法 1：老老实实写依赖 (Dependencies)

最本分的做法，就是把 `count` 写进 `useEffect` 的依赖数组里 `[count]`。
每次 `count` 变了，都把旧的监听器拆掉，绑上新的监听器（这样绑上去的就是拥有最新快照的新函数了）。
_代价：如果数据更新极其频繁，疯狂地拆装事件监听器会带来额外的性能损耗。_

### 解法 2：用 `useRef` 乾坤大挪移 (ahooks 等大神库的最爱)

`useRef` 是个很神奇的东西，你可以把它当成一个**在时间线之外的“魔法盒子”**（不管组件重新渲染多少次，这个盒子永远是同一个，内存地址绝不改变）。

```tsx
const [count, setCount] = useState(0);
// 1. 搞一个魔法盒子
const countRef = useRef(count);

// 2. 每次渲染，都把最新的 count 塞进盒子里，覆盖掉旧的
countRef.current = count;

useEffect(() => {
  const handleScroll = () => {
    // 3. 找数据的时候，别直接找 count 快照了，去魔法盒子里拿！
    // 因为盒子一直没换，所以闭包抓着这个盒子也没关系，盒子里装的永远是最新的东西。
    console.log("当前 Count:", countRef.current);
  };
  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, []);
```

**底层逻辑**：我们并没有换掉绑在 `window` 上的旧函数，旧函数还是那个旧函数。但旧函数现在不看旧快照了，它改看 `ref` 这个魔法盒子！这就是 `ahooks` 里面 `useLatest` 和 `useMemoizedFn` 对抗闭包陷阱的核心护城河原理！
