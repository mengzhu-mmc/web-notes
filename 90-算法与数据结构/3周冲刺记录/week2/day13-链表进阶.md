# Day 13 — 链表进阶

> 日期：03-19 | Week 2 | 状态：⬜

## 🧠 今日套路

K组翻转：找到第K个节点，翻转这段，再递归处理剩余。
排序链表：归并排序，快慢指针找中点断开再合并。
[23] 合并K个升序链表已在 Day6 做过，今日专注新题。

## 🔢 算法题（2h）

### [25] K 个一组翻转链表 🔴 Hard
- 链接：https://leetcode.cn/problems/reverse-nodes-in-k-group/
- 核心：找到第 k 个节点，翻转 [head, kth]，递归处理 kth.next

### [148] 排序链表 Medium
- 链接：https://leetcode.cn/problems/sort-list/
- 核心：归并排序，快慢指针找中点断开，递归合并两段

### [138] 复制带随机指针的链表 Medium
- 链接：https://leetcode.cn/problems/copy-list-with-random-pointer/
- 核心：Map 存原节点→新节点映射，两次遍历分别设 next 和 random

### [82] 删除排序链表中的重复元素 II Medium
- 链接：https://leetcode.cn/problems/remove-duplicates-from-sorted-list-ii/
- 核心：哑节点 + 双指针，跳过所有值等于 next 的连续节点

## 🎨 场景题（1h）

- 手写 reduce / 手写 map

## 📚 知识点

**Vue 响应式原理**
- Vue2：Object.defineProperty，无法检测新增属性和数组索引变化
- Vue3：Proxy，可拦截任意属性访问，支持数组和动态属性
- 依赖收集：getter 中 track，setter 中 trigger

---
[[week2-answers]] | [[README]]
