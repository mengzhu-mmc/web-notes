# Day 19 (03-25) — 高频 Medium 补题

## 算法题

### 1. [15] 三数之和 ⭐ Medium
- 链接：https://leetcode.cn/problems/3sum/
- 思路：排序 + 双指针；固定 `i`，左右指针 `l/r` 向内收缩；关键是去重（`i` 与前一个相同跳过，`l/r` 移动后也跳过重复）

### 2. [31] 下一个排列 ⭐ Medium
- 链接：https://leetcode.cn/problems/next-permutation/
- 思路：从右往左找第一个下降点 `i`（`nums[i] < nums[i+1]`）→ 从右往左找第一个大于 `nums[i]` 的位置 `j`，交换 → 反转 `i+1` 到末尾

### 3. [215] 数组中的第 K 个最大元素 — Medium
- 链接：https://leetcode.cn/problems/kth-largest-element-in-an-array/
- 思路：快速选择（快排 partition 变体），平均 O(n)；或用大小为 k 的最小堆 O(n log k)

### 4. [139] 单词拆分 — Medium（DP）
- 链接：https://leetcode.cn/problems/word-break/
- 思路：`dp[i]` 表示 `s[0..i-1]` 是否可以被拆分；枚举分割点 `j`，若 `dp[j]` 为 true 且 `s[j..i-1]` 在 wordDict 中则 `dp[i] = true`

## 场景题
- 手写 throttle（时间戳版 + 定时器版）

## 知识点：Webpack + 性能优化（复习）
- **Webpack 核心流程**：entry → loader 转换 → plugin 处理 → chunk 分割 → bundle 输出
- **常用优化**：Tree Shaking（ES Module 静态分析）、Code Splitting（动态 import）、DLL 预编译、缓存（contenthash）
- **性能优化三板斧**：减少请求量（合并/缓存）、减少资源体积（压缩/懒加载）、提升渲染速度（骨架屏/SSR/虚拟列表）
- **Core Web Vitals**：LCP（最大内容绘制）< 2.5s、FID/INP < 100ms、CLS < 0.1

## 核心套路
> **双指针去重三步**：排序 → 固定一个指针 → 内层双指针 + 跳过重复值。  
> **快速选择**：partition 后根据 pivot 位置决定递归哪半边，平均 O(n) 找第 K 大。
