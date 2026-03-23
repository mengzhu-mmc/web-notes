# Day 15 (03-21) — 单调栈复习 + Hard 补题

## 算法题

### 1. [32] 最长有效括号 🔴 Hard ✅
- 链接：https://leetcode.cn/problems/longest-valid-parentheses/
- 思路：单调栈存索引，初始压入 -1 作为哨兵；遇 `(` 压栈，遇 `)` 弹栈后计算 `i - 栈顶` 即为当前有效长度
- 关键：栈空时把当前 `)` 的索引压入作为新哨兵

### 2. [84] 柱状图中最大的矩形 🔴 Hard（进行中）
- 链接：https://leetcode.cn/problems/largest-rectangle-in-histogram/
- 思路：单调递增栈，每次弹栈时以弹出柱为高，计算以它为最矮柱的最大矩形面积；首尾加哨兵 0 简化边界
- 关键：`width = right - left - 1`，left/right 均由栈中元素给出

### 3. 复习 Day1 单调栈题目
- [739] 每日温度 / [496] 下一个更大元素 I / [503] 下一个更大元素 II
- 快速过一遍思路，重点确认"栈里存索引"的写法

## 场景题
- 手写 debounce（要能默写）

## 知识点：事件循环 Event Loop（复习）
- JS 单线程，事件循环驱动异步
- 执行顺序：同步代码 → 微任务（Promise.then / queueMicrotask）→ 宏任务（setTimeout / setInterval）
- 每个宏任务执行完后，清空所有微任务队列
- 面试高频：async/await 本质是 Promise 语法糖，await 后的代码相当于 `.then` 回调

## 核心套路
> **单调栈**：用栈维护单调递增/递减序列，弹栈时即为"找到了左/右边界"的时机。栈里存**索引**，不存值。  
> **Hard 变体**：哨兵简化边界（首尾加 0 或初始压 -1）是常用技巧。
