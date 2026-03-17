# Day 15 — Hard 精选 1（单调栈 Hard）

> 日期：03-21 | Week 3 | 状态：⬜

## 🧠 今日套路

单调栈 Hard 变种：维护栈内元素的单调性，利用「前一个更小/更大元素」的位置关系求解面积。

## 🔢 算法题（2h）

### [32] 最长有效括号 🔴 Hard
- 链接：https://leetcode.cn/problems/longest-valid-parentheses/
- 核心：栈存索引，遇 ')' 弹栈，栈空则压入当前索引作为基准

### [84] 柱状图中最大的矩形 🔴 Hard
- 链接：https://leetcode.cn/problems/largest-rectangle-in-histogram/
- 核心：单调递增栈，找每根柱子左右第一个更小柱子

### [85] 最大矩形 🔴 Hard
- 链接：https://leetcode.cn/problems/maximal-rectangle/
- 核心：每行转化为柱状图，复用 [84] 的解法

## 🎨 场景题（1h）

- 设计题：前端错误监控 SDK

## 📚 知识点

复习 Week 1-2 高频考点：单调栈模板、二分模板、DP 背包、回溯去重

---
[[README]]
