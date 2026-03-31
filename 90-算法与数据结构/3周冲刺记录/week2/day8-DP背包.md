# Day 8 — DP 基础（背包）

> 日期：03-14 | Week 2 | 状态：✅

## 🧠 今日套路

DP 三步法：递归暴力 → 记忆化 → 推导状态转移方程。
**01背包**（每件用一次）倒序遍历容量；**完全背包**（可重复）正序遍历容量。

## 🔢 算法题（2h）

### [70] 爬楼梯 Easy
- 链接：https://leetcode.cn/problems/climbing-stairs/
- 核心：`dp[i] = dp[i-1] + dp[i-2]`，斐波那契变体

### [198] 打家劫舍 Medium
- 链接：https://leetcode.cn/problems/house-robber/
- 核心：`dp[i] = max(dp[i-1], dp[i-2] + nums[i])`，偷或不偷

### [322] 零钱兑换 Medium
- 链接：https://leetcode.cn/problems/coin-change/
- 核心：完全背包，`dp[j] = min(dp[j], dp[j-coin] + 1)`，正序

### [300] 最长递增子序列 Medium
- 链接：https://leetcode.cn/problems/longest-increasing-subsequence/
- 核心：`dp[i] = max(dp[j]+1)`，j < i 且 nums[j] < nums[i]

## 🎨 场景题（1h）

- 手写 flat（数组扁平化）

## 📚 知识点

**跨域解决方案**：CORS、JSONP、Nginx 代理、postMessage
- 面试问：什么是跨域？CORS 怎么配置？简单请求和复杂请求的区别？

---
[[week2-answers]] | [[README]]
