# 二叉树遍历与 BFS/DFS 专题

> 前端面试算法必考题型，掌握模板后可解决 80% 的树相关题目。

## 面试高频考点

1. **二叉树的四种遍历方式（前/中/后/层序）如何实现？**
2. **DFS 和 BFS 的区别？各适合解决什么问题？**
3. **如何用迭代（栈/队列）替代递归实现树的遍历？**
4. **二叉树的最大深度、最小深度怎么求？**
5. **路径和、路径总数类题目的解题思路？**

---

## 一、二叉树基础结构

```javascript
// 树节点定义
function TreeNode(val, left, right) {
  this.val = val === undefined ? 0 : val;
  this.left = left === undefined ? null : left;
  this.right = right === undefined ? null : right;
}
```

---

## 二、DFS 深度优先遍历（递归模板）

### 2.1 前序遍历（根 → 左 → 右）

```javascript
// 递归版
function preorder(root) {
  const result = [];
  function dfs(node) {
    if (!node) return;
    result.push(node.val);  // 先处理根
    dfs(node.left);
    dfs(node.right);
  }
  dfs(root);
  return result;
}

// 迭代版（用栈）
function preorder(root) {
  if (!root) return [];
  const result = [];
  const stack = [root];

  while (stack.length) {
    const node = stack.pop();
    result.push(node.val);
    // 注意：先压右再压左，这样左子树先出栈
    if (node.right) stack.push(node.right);
    if (node.left)  stack.push(node.left);
  }
  return result;
}
```

### 2.2 中序遍历（左 → 根 → 右）

```javascript
// 递归版
function inorder(root) {
  const result = [];
  function dfs(node) {
    if (!node) return;
    dfs(node.left);
    result.push(node.val);  // 中间处理根
    dfs(node.right);
  }
  dfs(root);
  return result;
}

// 迭代版（经典模板，面试常考）
function inorder(root) {
  const result = [];
  const stack = [];
  let curr = root;

  while (curr || stack.length) {
    // 一路向左走到底
    while (curr) {
      stack.push(curr);
      curr = curr.left;
    }
    // 弹出节点，处理，然后转向右子树
    curr = stack.pop();
    result.push(curr.val);
    curr = curr.right;
  }
  return result;
}
```

**中序遍历的重要性**：二叉搜索树（BST）的中序遍历结果是**有序数组**，很多 BST 题目都依赖这个性质。

### 2.3 后序遍历（左 → 右 → 根）

```javascript
// 递归版
function postorder(root) {
  const result = [];
  function dfs(node) {
    if (!node) return;
    dfs(node.left);
    dfs(node.right);
    result.push(node.val);  // 最后处理根
  }
  dfs(root);
  return result;
}

// 迭代版（前序变体：根→右→左，最后反转）
function postorder(root) {
  if (!root) return [];
  const result = [];
  const stack = [root];

  while (stack.length) {
    const node = stack.pop();
    result.push(node.val);
    if (node.left)  stack.push(node.left);  // 注意顺序与前序相反
    if (node.right) stack.push(node.right);
  }
  return result.reverse(); // 反转得到 左→右→根
}
```

---

## 三、BFS 广度优先遍历（层序遍历）

### 3.1 基础层序遍历

```javascript
// LeetCode 102：二叉树的层序遍历
function levelOrder(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];

  while (queue.length) {
    const levelSize = queue.length; // 当前层的节点数
    const level = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left)  queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}
```

**BFS 模板的核心**：用 `levelSize` 记录当前层的节点数，内层 for 循环处理完一整层后，再进入下一层。

### 3.2 层序遍历变体题

```javascript
// LeetCode 107：自底向上的层序遍历（结果反转即可）
function levelOrderBottom(root) {
  return levelOrder(root).reverse();
}

// LeetCode 103：锯齿形层序遍历
function zigzagLevelOrder(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];
  let leftToRight = true;

  while (queue.length) {
    const levelSize = queue.length;
    const level = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      // 根据方向决定插入位置
      if (leftToRight) level.push(node.val);
      else level.unshift(node.val);

      if (node.left)  queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
    leftToRight = !leftToRight; // 切换方向
  }
  return result;
}
```

---

## 四、DFS vs BFS 选择策略

| 场景 | 推荐方式 | 原因 |
|------|---------|------|
| 求树的深度/高度 | DFS | 天然递归，代码简洁 |
| 求树的最小深度 | BFS | 找到第一个叶子节点即可返回，无需遍历全树 |
| 路径问题（根到叶子） | DFS | 需要维护路径状态，递归回溯更自然 |
| 层级相关问题 | BFS | 天然按层处理 |
| 判断两棵树是否相同 | DFS | 同步递归两棵树 |
| 找最近公共祖先 | DFS（后序） | 需要子树信息来决定父节点 |

---

## 五、高频题型精讲

### 5.1 最大深度（LeetCode 104）

```javascript
// DFS 递归（最简洁）
function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

// BFS 迭代
function maxDepth(root) {
  if (!root) return 0;
  let depth = 0;
  const queue = [root];

  while (queue.length) {
    depth++;
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      if (node.left)  queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }
  return depth;
}
```

### 5.2 最小深度（LeetCode 111）

```javascript
// BFS 更优：找到第一个叶子节点就返回，不需要遍历全树
function minDepth(root) {
  if (!root) return 0;
  let depth = 0;
  const queue = [root];

  while (queue.length) {
    depth++;
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      // 叶子节点：左右子树都为空
      if (!node.left && !node.right) return depth;
      if (node.left)  queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }
  return depth;
}

// DFS 递归（注意：不能简单用 Math.min，单侧子树为空时要特殊处理）
function minDepth(root) {
  if (!root) return 0;
  if (!root.left && !root.right) return 1; // 叶子节点
  if (!root.left)  return 1 + minDepth(root.right); // 只有右子树
  if (!root.right) return 1 + minDepth(root.left);  // 只有左子树
  return 1 + Math.min(minDepth(root.left), minDepth(root.right));
}
```

### 5.3 路径总和（LeetCode 112 / 113）

```javascript
// LeetCode 112：是否存在根到叶子的路径和等于 target
function hasPathSum(root, targetSum) {
  if (!root) return false;
  // 到达叶子节点，检查剩余值
  if (!root.left && !root.right) return root.val === targetSum;
  // 递归检查左右子树，剩余目标值减去当前节点值
  return hasPathSum(root.left, targetSum - root.val) ||
         hasPathSum(root.right, targetSum - root.val);
}

// LeetCode 113：返回所有满足条件的路径
function pathSum(root, targetSum) {
  const result = [];

  function dfs(node, remaining, path) {
    if (!node) return;
    path.push(node.val);

    if (!node.left && !node.right && remaining === node.val) {
      result.push([...path]); // 找到一条路径，拷贝后加入结果
    }

    dfs(node.left,  remaining - node.val, path);
    dfs(node.right, remaining - node.val, path);
    path.pop(); // 回溯：撤销当前节点
  }

  dfs(root, targetSum, []);
  return result;
}
```

### 5.4 对称二叉树（LeetCode 101）

```javascript
function isSymmetric(root) {
  function isMirror(left, right) {
    if (!left && !right) return true;   // 都为空，对称
    if (!left || !right) return false;  // 一个为空，不对称
    return left.val === right.val &&
           isMirror(left.left, right.right) &&  // 外侧对比
           isMirror(left.right, right.left);    // 内侧对比
  }
  return isMirror(root.left, root.right);
}
```

### 5.5 最近公共祖先（LeetCode 236）

```javascript
function lowestCommonAncestor(root, p, q) {
  // 递归终止：到达空节点或找到目标节点
  if (!root || root === p || root === q) return root;

  const left  = lowestCommonAncestor(root.left,  p, q);
  const right = lowestCommonAncestor(root.right, p, q);

  // 左右都找到了：当前节点就是 LCA
  if (left && right) return root;
  // 只有一侧找到：返回找到的那侧
  return left || right;
}
```

**思路**：后序遍历（先处理子树，再处理当前节点）。如果 p 和 q 分别在左右子树，则当前节点是 LCA；如果都在同一侧，则 LCA 在那一侧的子树中。

### 5.6 二叉树的直径（LeetCode 543）

```javascript
function diameterOfBinaryTree(root) {
  let maxDiameter = 0;

  function depth(node) {
    if (!node) return 0;
    const leftDepth  = depth(node.left);
    const rightDepth = depth(node.right);
    // 经过当前节点的路径长度 = 左深度 + 右深度
    maxDiameter = Math.max(maxDiameter, leftDepth + rightDepth);
    // 返回当前节点的深度（取较长的一侧 + 1）
    return 1 + Math.max(leftDepth, rightDepth);
  }

  depth(root);
  return maxDiameter;
}
```

---

## 六、DFS 通用递归模板

```javascript
// 模板一：返回值型（自底向上收集信息）
function solve(root) {
  if (!root) return 初始值;

  const leftResult  = solve(root.left);
  const rightResult = solve(root.right);

  // 根据左右子树的结果，计算当前节点的结果
  return 根据 leftResult 和 rightResult 计算;
}

// 模板二：参数传递型（自顶向下传递状态）
function solve(root) {
  const result = [];

  function dfs(node, state) {
    if (!node) return;
    // 更新状态
    const newState = 根据 state 和 node.val 更新;
    // 到达叶子节点时收集结果
    if (!node.left && !node.right) {
      result.push(newState);
      return;
    }
    dfs(node.left,  newState);
    dfs(node.right, newState);
  }

  dfs(root, 初始状态);
  return result;
}
```

---

## 七、面试答题模板

**Q：DFS 和 BFS 怎么选？**

DFS 适合需要探索完整路径的问题（路径和、路径收集、树的深度），代码简洁，但对于最短路径问题效率不高；BFS 适合层级相关问题（层序遍历、最短路径、最小深度），能保证第一次到达目标时就是最短路径。树的题目中，如果需要"找到第一个满足条件的节点"优先 BFS，如果需要"收集所有路径"优先 DFS。

**Q：递归转迭代的思路？**

DFS 递归本质上是利用了函数调用栈，转迭代就是用显式的栈来模拟这个过程。前序遍历最简单（直接用栈，先压右再压左）；中序遍历需要"一路向左走到底"的指针配合栈；后序遍历可以用"前序变体（根→右→左）最后反转"的技巧。BFS 天然用队列实现，没有递归版本。
