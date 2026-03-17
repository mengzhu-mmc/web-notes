# Day 13 — 链表进阶

> 日期：03-19 | Week 2 | 状态：⬜

## 🧠 今日套路

K组翻转：找到第K个节点，翻转这段，再递归处理剩余。
合并K个有序链表：优先队列（小顶堆）维护当前最小节点。

## 🔢 算法题（2h）

### [25] K 个一组翻转链表 🔴 Hard
- 链接：https://leetcode.cn/problems/reverse-nodes-in-k-group/
- 核心：找到第k个节点，翻转 [head, kth]，递归处理 kth.next

### [23] 合并 K 个升序链表 🔴 Hard
- 链接：https://leetcode.cn/problems/merge-k-sorted-lists/
- 核心：分治合并，或用最小堆每次取最小节点

### [148] 排序链表 Medium
- 链接：https://leetcode.cn/problems/sort-list/
- 核心：归并排序，找中点断开，递归合并

### [138] 复制带随机指针的链表 Medium
- 链接：https://leetcode.cn/problems/copy-list-with-random-pointer/
- 核心：Map 存原节点→新节点映射，两次遍历

## 🎨 场景题（1h）

- 手写 reduce / 手写 map

## 📚 知识点

**Vue 响应式原理**
- Vue2：Object.defineProperty，无法检测新增属性和数组索引变化
- Vue3：Proxy，可拦截任意属性访问，支持数组和动态属性
- 依赖收集：getter 中 track，setter 中 trigger

---
[[week2-answers]] | [[README]]
