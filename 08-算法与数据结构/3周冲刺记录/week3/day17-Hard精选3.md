# Day 17 — Hard 精选 3（数组/哈希 Hard）

> 日期：03-23 | Week 3 | 状态：⬜

## 🧠 今日套路

原地哈希：利用数组自身作为哈希表，把 nums[i] 放到「它该在的位置」。
十叉树计数：字典序问题转化为前缀树节点计数。

## 🔢 算法题（2h）

### [41] 缺失的第一个正数 🔴 Hard
- 链接：https://leetcode.cn/problems/first-missing-positive/
- 核心：原地哈希，将 nums[i] 放到索引 nums[i]-1 的位置，再遍历找第一个不满足的

### [128] 最长连续序列 Medium（Hard变体热身）
- 链接：https://leetcode.cn/problems/longest-consecutive-sequence/
- 核心：Set 存所有数，只从序列起点（num-1 不在Set中）开始往后数

### [440] 字典序的第 K 小数字 🔴 Hard
- 链接：https://leetcode.cn/problems/k-th-smallest-in-lexicographical-order/
- 核心：十叉树，计算每棵子树节点数，决定向下走还是向右走

### [164] 最大间距 🔴 Hard
- 链接：https://leetcode.cn/problems/maximum-gap/
- 核心：桶排序，相邻最大间距必然跨桶，桶内间距不会是最大值

## 🎨 场景题（1h）

- 设计题：扫码登录流程

## 📚 知识点

复习所有手写题模板：Promise、深拷贝、LRU、防抖节流、call/apply/bind

---
[[README]]
