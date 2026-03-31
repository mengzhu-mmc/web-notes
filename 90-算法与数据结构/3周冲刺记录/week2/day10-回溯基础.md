# Day 10 — 回溯基础

> 日期：03-16 | Week 2 | 状态：🔶 进行中

## 🧠 今日套路

回溯 = 选择 → 递归 → 撤销。
去重前提：**数组排序**，同层遇到重复元素跳过：`i > start && nums[i] === nums[i-1]`。

## 🔢 算法题（2h）

### [46] 全排列 Medium
- 链接：https://leetcode.cn/problems/permutations/
- 核心：used 数组标记已选元素，每个位置遍历所有未选元素

### [47] 全排列 II Medium
- 链接：https://leetcode.cn/problems/permutations-ii/
- 核心：排序 + `i > 0 && nums[i] === nums[i-1] && !used[i-1]` 去重

### [39] 组合总和 Medium
- 链接：https://leetcode.cn/problems/combination-sum/
- 核心：元素可重复使用，递归时 startIndex 不 +1

### [40] 组合总和 II Medium
- 链接：https://leetcode.cn/problems/combination-sum-ii/
- 核心：每个元素只用一次，同层去重

## 🎨 场景题（1h）

- 手写 async/await（generator 实现）

## 📚 知识点

**HTTPS 与 TLS**
- 非对称加密交换密钥，对称加密传输数据，CA 证书防中间人攻击
- 握手过程：ClientHello → ServerHello+证书 → 验证+PreMasterKey → 对称密钥协商完成

---
[[week2-answers]] | [[README]]
