# 手写：虚拟 DOM diff 算法

> 面试频率：⭐⭐⭐⭐ | 难度：中高

---

## 题目要求

实现一个简版虚拟 DOM diff 算法，对比新旧两棵虚拟 DOM 树，生成最小操作序列（patch），并应用到真实 DOM 上。

```typescript
// 虚拟 DOM 节点定义
interface VNode {
  type: string;           // 标签名，如 'div'、'span'
  props: Record<string, any>; // 属性，包含 key
  children: (VNode | string)[];
}

// 期望效果
const oldTree: VNode = {
  type: 'div',
  props: {},
  children: [
    { type: 'p', props: { key: 'a' }, children: ['Hello'] },
    { type: 'span', props: { key: 'b' }, children: ['World'] },
  ],
};

const newTree: VNode = {
  type: 'div',
  props: {},
  children: [
    { type: 'span', props: { key: 'b' }, children: ['World!'] }, // 移动 + 更新
    { type: 'p', props: { key: 'a' }, children: ['Hello'] },    // 移动
  ],
};

diff(oldTree, newTree); // 生成最小 patch 操作
```

---

## 思路分析

### 为什么 diff 复杂？

直接对比两棵树是 O(n³) 问题（找到两棵树最小编辑距离）。React/Vue 做了三个关键假设，将复杂度降到 **O(n)**：

```
假设 1：不同类型的节点产生不同的树
  → 遇到不同 type，直接销毁旧树、创建新树（不深入比较）

假设 2：同层节点比较（不跨层移动）
  → 只比较同一深度的兄弟节点
  → 跨层移动的节点不做优化（直接销毁重建）

假设 3：开发者用 key 标识可复用的列表项
  → key 相同的节点认为是同一个，只更新属性/子节点
  → 没有 key 时按索引位置对比
```

### Diff 三步骤

```
1. 对比节点本身
   - type 不同 → REPLACE（直接替换）
   - type 相同 → 更新 props（PATCH_PROPS）

2. 对比子节点（核心复杂度）
   无 key：按索引对比（简单但低效）
   有 key：用 Map 建立 key → 旧节点映射，找可复用节点并确定移动

3. 递归处理子节点
```

---

## 完整实现

### 虚拟节点创建

```typescript
interface VNode {
  type: string;
  props: { key?: string | number; [key: string]: any };
  children: (VNode | string)[];
}

function h(
  type: string,
  props: VNode['props'] = {},
  ...children: (VNode | string)[]
): VNode {
  return { type, props, children };
}
```

### Patch 类型定义

```typescript
type PatchType =
  | { type: 'REPLACE'; node: VNode | string }   // 整节点替换
  | { type: 'PATCH_PROPS'; props: Record<string, any> } // 属性更新
  | { type: 'PATCH_CHILDREN'; patches: ChildPatch[] }   // 子节点更新
  | { type: 'REMOVE' }                           // 删除节点
  | { type: 'TEXT'; content: string }            // 文本内容更新

interface ChildPatch {
  index: number;
  patch: PatchType;
}
```

### 核心 diff 函数

```typescript
function diff(oldNode: VNode | string, newNode: VNode | string): PatchType | null {
  // 文本节点
  if (typeof oldNode === 'string' || typeof newNode === 'string') {
    if (oldNode !== newNode) {
      return { type: 'REPLACE', node: newNode };
    }
    return null;
  }

  // 类型不同，直接替换（不复用）
  if (oldNode.type !== newNode.type) {
    return { type: 'REPLACE', node: newNode };
  }

  // 类型相同：对比属性
  const propsPatches = diffProps(oldNode.props, newNode.props);

  // 对比子节点
  const childrenPatches = diffChildren(oldNode.children, newNode.children);

  if (!propsPatches && childrenPatches.length === 0) return null;

  return {
    type: 'PATCH_PROPS',
    props: propsPatches || {},
    // 实际项目中会合并 PATCH_PROPS 和 PATCH_CHILDREN
  } as any;
}

// 对比属性，返回需要更新的属性 diff
function diffProps(
  oldProps: Record<string, any>,
  newProps: Record<string, any>
): Record<string, any> | null {
  const patches: Record<string, any> = {};
  let hasDiff = false;

  // 新属性（新增或更新）
  for (const key in newProps) {
    if (key === 'key') continue;
    if (oldProps[key] !== newProps[key]) {
      patches[key] = newProps[key];
      hasDiff = true;
    }
  }

  // 已删除的属性
  for (const key in oldProps) {
    if (key === 'key') continue;
    if (!(key in newProps)) {
      patches[key] = undefined; // undefined 表示删除
      hasDiff = true;
    }
  }

  return hasDiff ? patches : null;
}

// 子节点 diff（按 key / 按索引）
function diffChildren(
  oldChildren: (VNode | string)[],
  newChildren: (VNode | string)[]
): ChildPatch[] {
  const patches: ChildPatch[] = [];

  // 有 key 的情况：建立 key → 旧节点的映射
  const oldKeyMap = new Map<string | number, { node: VNode; index: number }>();
  for (let i = 0; i < oldChildren.length; i++) {
    const child = oldChildren[i];
    if (typeof child !== 'string' && child.props.key != null) {
      oldKeyMap.set(child.props.key, { node: child, index: i });
    }
  }

  const hasKeyedChildren = oldKeyMap.size > 0;

  if (hasKeyedChildren) {
    // 基于 key 的对比（简版，不涉及最长递增子序列优化）
    const usedOldIndices = new Set<number>();

    for (let i = 0; i < newChildren.length; i++) {
      const newChild = newChildren[i];
      if (typeof newChild !== 'string' && newChild.props.key != null) {
        const oldEntry = oldKeyMap.get(newChild.props.key);
        if (oldEntry) {
          usedOldIndices.add(oldEntry.index);
          const childPatch = diff(oldEntry.node, newChild);
          if (childPatch) patches.push({ index: i, patch: childPatch });
        } else {
          // 新增节点
          patches.push({ index: i, patch: { type: 'REPLACE', node: newChild } });
        }
      }
    }

    // 未被复用的旧节点 → 删除
    for (let i = 0; i < oldChildren.length; i++) {
      if (!usedOldIndices.has(i)) {
        patches.push({ index: i, patch: { type: 'REMOVE' } });
      }
    }
  } else {
    // 按索引对比（无 key）
    const maxLen = Math.max(oldChildren.length, newChildren.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= newChildren.length) {
        patches.push({ index: i, patch: { type: 'REMOVE' } });
      } else if (i >= oldChildren.length) {
        patches.push({ index: i, patch: { type: 'REPLACE', node: newChildren[i] } });
      } else {
        const childPatch = diff(oldChildren[i], newChildren[i]);
        if (childPatch) patches.push({ index: i, patch: childPatch });
      }
    }
  }

  return patches;
}
```

### 将 patch 应用到真实 DOM

```typescript
function patch(el: Node, vnode: VNode | string, patches: PatchType | null) {
  if (!patches) return;

  if (patches.type === 'REPLACE') {
    const newEl = createEl(patches.node);
    el.parentNode?.replaceChild(newEl, el);
    return;
  }

  if (patches.type === 'REMOVE') {
    el.parentNode?.removeChild(el);
    return;
  }

  if (patches.type === 'TEXT') {
    el.textContent = patches.content;
    return;
  }

  if (patches.type === 'PATCH_PROPS' && el instanceof Element) {
    for (const [key, value] of Object.entries(patches.props)) {
      if (value === undefined) {
        el.removeAttribute(key);
      } else {
        el.setAttribute(key, value);
      }
    }
  }
}

function createEl(vnode: VNode | string): Node {
  if (typeof vnode === 'string') return document.createTextNode(vnode);
  const el = document.createElement(vnode.type);
  for (const [key, value] of Object.entries(vnode.props)) {
    if (key !== 'key') el.setAttribute(key, value);
  }
  vnode.children.forEach(child => el.appendChild(createEl(child)));
  return el;
}
```

---

## 测试用例

```typescript
// 测试 1：文本节点更新
const old1 = h('p', {}, 'Hello');
const new1 = h('p', {}, 'World');
const p1 = diffProps(old1.props, new1.props);
console.log('props diff:', p1); // null（无 props 变化）

// 测试 2：属性更新
const old2 = h('div', { class: 'a', id: 'x' });
const new2 = h('div', { class: 'b' });
const p2 = diffProps(old2.props, new2.props);
console.log('props diff:', p2);
// { class: 'b', id: undefined }（id 被删除）

// 测试 3：子节点列表（带 key）
const oldList = [
  h('li', { key: 'a' }, 'A'),
  h('li', { key: 'b' }, 'B'),
  h('li', { key: 'c' }, 'C'),
];
const newList = [
  h('li', { key: 'b' }, 'B'),
  h('li', { key: 'a' }, 'A'),  // 顺序互换
  h('li', { key: 'd' }, 'D'),  // 新增
  // c 被删除
];
const childPatches = diffChildren(oldList, newList);
console.log('child patches:', JSON.stringify(childPatches, null, 2));
```

---

## 追问与扩展

### Q1：React Diff 和 Vue3 Diff 有什么区别？

```
React Diff（单向链表 Fiber，不做最长递增子序列）：
  - 只做单向遍历（旧 → 新），发现 key 失配就停止复用旧节点
  - 剩余旧节点 → Map，新节点从 Map 找复用
  - 简单但可能产生多余的 DOM 移动

Vue3 Diff（最长递增子序列，最小化 DOM 移动）：
  - 前后双端预处理（头头、尾尾对比）
  - 中间乱序部分：找"最长递增子序列"，序列内节点不需要移动
  - 只移动序列外的节点，DOM 操作最少
  - 比 React 多一步 O(n log n) 计算，但减少了 DOM 操作
```

### Q2：为什么列表要用 key？不用 key 有什么问题？

```
场景：[A, B, C] → [B, A, C]（交换 A 和 B）

无 key（按索引）：
  index 0: A → B（更新内容）
  index 1: B → A（更新内容）
  index 2: C → C（无变化）
  → 2 次 DOM 更新

有 key（key='a','b','c'）：
  找到 key='b' 的节点 → 移动到前面
  找到 key='a' 的节点 → 移动到后面
  → 1 次 DOM 移动（或 0 次，取决于实现）
```

更严重的问题：有内部状态（输入框）的节点，无 key 时会错误复用节点导致状态错乱。

### Q3：为什么不能用 index 作为 key？

当列表发生增删时，index 会重新分配。例如删除第一项后，原来 index=1 的节点现在变成 index=0，框架会误以为是同一个节点，导致错误的复用和状态混乱。**唯一稳定的 key 应来自数据本身（如 ID）。**

### Q4：Fiber 架构和 diff 有什么关系？

React 16 引入 Fiber 将 diff 过程变成**可中断的**。每个 Fiber 节点代表一个工作单元，diff 过程可以在需要时暂停（让出主线程给高优先级任务），然后恢复继续。Fiber 本质上是树结构改成了链表，方便中断和恢复遍历。
