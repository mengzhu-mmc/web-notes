# Day 16 — Hard 精选 2（区间 DP）

> 日期：03-22 | Week 3 | 状态：⬜

## 🧠 今日套路

区间 DP：`dp[i][j]` 表示区间 [i,j] 的最优解，从小区间推大区间。
二分答案：答案具有单调性时，猜答案 + 验证。

## 🔢 算法题（2h）

### [312] 戳气球 🔴 Hard
- 链接：https://leetcode.cn/problems/burst-balloons/
- 核心：区间 DP，`dp[i][j]` = 戳破 (i,j) 内所有气球的最大金币，枚举最后戳的那个

### [410] 分割数组的最大值 🔴 Hard
- 链接：https://leetcode.cn/problems/split-array-largest-sum/
- 核心：二分答案，贪心验证能否在 m 组内使最大值 ≤ mid

### [887] 鸡蛋掉落 🔴 Hard
- 链接：https://leetcode.cn/problems/super-egg-drop/
- 核心：换维度 DP，`dp[m][k]` = m 次操作k个蛋最多能确定的楼层数

## 🎨 场景题（1h）

- 设计题：简易 Excel 表格组件

## 📚 知识点

系统设计基础（前端视角）：BFF层、微前端、模块联邦

---
[[README]]
