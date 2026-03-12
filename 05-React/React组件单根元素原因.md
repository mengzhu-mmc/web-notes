# React 组件为什么只能返回一个顶层元素

## 两个核心原因

### JavaScript 函数的限制

React 组件本质上是 JavaScript 函数，而函数只能返回一个值。JSX 会被编译成 `React.createElement` 函数调用，`return` 语句中不能返回两个独立的函数调用结果，必须包裹在一个容器中。

### 虚拟 DOM 的树状结构

虚拟 DOM 是树状结构，树必须有一个根节点。React 的协调算法（Reconciliation / Diffing）从根节点开始遍历和比较，多个平级根节点会极大增加 Diff 算法复杂度。

## 解决方案

使用 `<React.Fragment>` 或短语法 `<>...</>` 将子元素分组，不会在 DOM 中添加额外节点。也可以返回数组（需要手动给每个元素添加 `key`）。

```jsx
// Fragment 短语法（推荐）
function MyComponent() {
  return (
    <>
      <div>元素 A</div>
      <div>元素 B</div>
    </>
  );
}

// 返回数组（需要 key）
function MyComponent() {
  return [
    <div key="a">元素 A</div>,
    <div key="b">元素 B</div>
  ];
}
```
