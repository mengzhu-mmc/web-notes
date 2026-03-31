# Day 16 (03-22) — 链表复习

## 算法题

### 1. [206] 反转链表 — Easy
- 链接：https://leetcode.cn/problems/reverse-linked-list/
- 思路：迭代三指针（prev / curr / next），逐节点反转指向；递归也可但理解迭代更重要

### 2. [92] 反转链表 II — Medium
- 链接：https://leetcode.cn/problems/reverse-linked-list-ii/
- 思路：用哑节点 dummy，先走到反转区间起点的前驱，再用头插法把后续节点插到前驱之后

### 3. [25] K 个一组翻转链表 🔴 Hard
- 链接：https://leetcode.cn/problems/reverse-nodes-in-k-group/
- 思路：迭代 + 子函数 reverseGroup；先检查剩余节点数 ≥ k 才翻转，否则直接接上；关键是拼接前后段

### 4. [148] 排序链表 — Medium
- 链接：https://leetcode.cn/problems/sort-list/
- 思路：归并排序（自顶向下），用快慢指针找中点 → 拆两段 → 递归排序 → 合并

### 5. [146] LRU 缓存 — Medium
- 链接：https://leetcode.cn/problems/lru-cache/
- 思路：HashMap + 双向链表；get/put 均 O(1)；用哑头/哑尾节点简化边界；最近使用 → 移到链表头

## 场景题
- 手写 LRU 缓存（面试超高频！能默写完整实现）

## 知识点：Vue 响应式 + React Fiber（复习）
- **Vue 2**：`Object.defineProperty` 递归劫持，数组变异方法包装，不能检测属性增删
- **Vue 3**：`Proxy` 代理整个对象，惰性深度代理，完美支持数组/Map/Set
- **React Fiber**：将渲染任务拆成可中断的 Fiber 节点链表，支持时间切片和优先级调度；双缓冲 current / workInProgress 树

## 核心套路
> **链表三件套**：哑节点（dummy）简化头部操作、快慢指针找中点、头插法实现区间反转。  
> **LRU 口诀**：Map 存 key→node，双向链表维护顺序，hit/put 都把节点移到头部，超容量删尾。
