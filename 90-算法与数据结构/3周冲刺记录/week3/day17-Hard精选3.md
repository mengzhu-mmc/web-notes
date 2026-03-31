# Day 17 (03-23) — 树 + 图复习（今天）

## 算法题

### 1. [102] 二叉树层序遍历 — Medium
- 链接：https://leetcode.cn/problems/binary-tree-level-order-traversal/
- 思路：BFS 队列，每次循环开始时记录 `size = queue.length`，只处理这一层的节点

### 2. [236] 二叉树的最近公共祖先 — Medium
- 链接：https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree/
- 思路：后序递归，左右子树分别找 p/q；若当前节点左右均返回非 null，则当前节点就是 LCA

### 3. [124] 二叉树中的最大路径和 🔴 Hard
- 链接：https://leetcode.cn/problems/binary-tree-maximum-path-sum/
- 思路：DFS 后序，每个节点返回"单边最大贡献值"（负则取 0）；在节点内用 `left + right + val` 更新全局最大值

### 4. [200] 岛屿数量 — Medium
- 链接：https://leetcode.cn/problems/number-of-islands/
- 思路：遍历网格，遇 '1' 则 count++，然后 DFS/BFS 把相连的 '1' 全部标记为 '0'（原地消除）

### 5. [207] 课程表 — Medium
- 链接：https://leetcode.cn/problems/course-schedule/
- 思路：拓扑排序（BFS Kahn's）；建邻接表 + 入度数组，入度为 0 入队，出队时减少邻居入度；最终判断出队数是否等于总节点数

## 场景题
- 手写深拷贝 deepClone（处理循环引用 + 多种类型）

## 知识点：浏览器渲染原理 + HTTP 缓存（复习）
- **渲染流程**：解析 HTML→DOM，解析 CSS→CSSOM，合并 Render Tree，Layout（回流），Paint（重绘），Composite
- **回流 vs 重绘**：回流（几何属性变化）代价 > 重绘（颜色变化）；减少方式：批量修改、用 transform 代替 top/left
- **HTTP 强缓存**：`Cache-Control: max-age` / `Expires`，不发请求
- **协商缓存**：`ETag` / `Last-Modified`，发请求但可返回 304

## 核心套路
> **树的遍历**：前序处理当前再递归，后序先递归再处理（LCA / 路径和 必须后序）。  
> **图的遍历**：DFS 用递归/栈 + visited 集合；BFS 用队列 + 层级记录；拓扑排序用入度 + 队列。
