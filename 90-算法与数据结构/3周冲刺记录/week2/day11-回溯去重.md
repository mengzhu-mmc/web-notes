# Day 11 — 回溯去重

> 日期：03-17 | Week 2 | 状态：⬜

## 🧠 今日套路

子集/分割问题用 for+startIndex 模板，同层去重。
N 皇后：按行放皇后，检查列、正斜线、反斜线是否冲突。

## 🔢 算法题（2h）

### [78] 子集 Medium
- 链接：https://leetcode.cn/problems/subsets/
- 核心：每次进入递归就收集结果（包括空集）

### [90] 子集 II Medium
- 链接：https://leetcode.cn/problems/subsets-ii/
- 核心：排序 + 同层跳过重复：`i > start && nums[i] === nums[i-1]`

### [131] 分割回文串 Medium
- 链接：https://leetcode.cn/problems/palindrome-partitioning/
- 核心：每次截取 [start, i] 判断是否回文，是则递归

### [51] N 皇后 🔴 Hard
- 链接：https://leetcode.cn/problems/n-queens/
- 核心：按行放置，用 Set 记录已占用的列/斜线

## 🎨 场景题（1h）

- 手写虚拟 DOM diff 算法（简化版）

## 📚 知识点

**Webpack 构建流程**
- Entry → Loader 转换 → Plugin 扩展 → Chunk → Output
- Loader：转换文件（单一职责链式）；Plugin：扩展构建能力（监听事件钩子）
- Tree Shaking 依赖 ES Module 静态分析；Code Splitting 按需加载

---
[[week2-answers]] | [[README]]
