# Day 9 — DP 进阶（子序列）

> 日期：03-15 | Week 2 | 状态：✅

## 🧠 今日套路

子序列 DP 核心：二维 dp 表，`dp[i][j]` 表示前 i/j 个字符的状态。
编辑距离是经典三选一：增/删/替换。

## 🔢 算法题（2h）

### [518] 零钱兑换 II Medium
- 链接：https://leetcode.cn/problems/coin-change-ii/
- 核心：完全背包求组合数，外层物品内层容量（正序）

### [1143] 最长公共子序列 Medium
- 链接：https://leetcode.cn/problems/longest-common-subsequence/
- 核心：`dp[i][j]`，字符相等 +1，否则取 max(上, 左)

### [72] 编辑距离 🔴 Hard
- 链接：https://leetcode.cn/problems/edit-distance/
- 核心：增删替三种操作取最小值 +1

### [10] 正则表达式匹配 🔴 Hard
- 链接：https://leetcode.cn/problems/regular-expression-matching/
- 核心：`*` 匹配零次或多次，分情况讨论

## 🎨 场景题（1h）

- 手写 Promise.allSettled / Promise.any

## 📚 知识点

**TCP 三次握手四次挥手**
- 为什么三次？两次不够，四次浪费
- TIME_WAIT 的作用：确保对方收到最后一个 ACK

---
[[week2-answers]] | [[README]]
