# Day 12 — 滑动窗口进阶

> 日期：03-18 | Week 2 | 状态：⬜

## 🧠 今日套路

右扩左缩模板：右指针不断扩大窗口，满足收缩条件时左指针右移。
[3][438][567] 已在 Day6 做过，今天专注进阶题和 Hard。

## 🔢 算法题（2h）

### [209] 长度最小的子数组 Medium
- 链接：https://leetcode.cn/problems/minimum-size-subarray-sum/
- 核心：窗口和 ≥ target 时收缩，记录最小长度（Day6 已接触，今日巩固）

### [76] 最小覆盖子串 🔴 Hard
- 链接：https://leetcode.cn/problems/minimum-window-substring/
- 核心：need Map 记录缺口数，满足所有字符后收缩取最小窗口

### [239] 滑动窗口最大值 🔴 Hard
- 链接：https://leetcode.cn/problems/sliding-window-maximum/
- 核心：单调递减双端队列，队头始终是窗口最大值，队尾维护单调性

### [424] 替换后的最长重复字符 Medium
- 链接：https://leetcode.cn/problems/longest-repeating-character-replacement/
- 核心：窗口内「最多字符数」+ 替换次数 ≤ k 时合法，否则左缩

## 🎨 场景题（1h）

- 手写 LRU 缓存（Map + 双向链表，get/put O(1)）

## 📚 知识点

**React Fiber 架构**
- 核心：把渲染拆成可中断的小任务（时间切片），链表结构替代递归，支持优先级调度
- 面试会问：Fiber 是什么？解决了 Stack Reconciler 的什么问题？可中断渲染怎么实现的？

---
[[week2-answers]] | [[README]]
