# 动态规划（DP）进阶学习计划（力扣中国区）

这份学习计划专为解决“难以推导状态转移方程”的痛点设计。核心思路是：**通过“题型聚合”来刻意练习，并强制使用“四步思维法”进行推导**。所有的示例代码均使用 JavaScript。

## 💡 攻克递推方程的四步思维法

在做每一道题时，请在草稿纸上回答以下四个问题：

1. **最后一步是什么？**（这是推导方程的关键）
   - 假设已经知道了前面所有的最优解，现在要求当前这一个状态。你要面临什么**选择**？
   - 比如：当前这个物品我是“选”还是“不选”？当前这个字符我是“删除”、“替换”还是“保留”？
2. **状态怎么定义？**
   - 将“最后一步”需要的变量转化为数组的维度。
   - 比如 `dp[i]` 表示前 `i` 个元素的最优解；如果还受重量限制，就加一维 `dp[i][j]`。
3. **转移方程怎么写？**
   - 根据第1步的“选择”，写出所有可能的情况，然后取 `Math.max()`、`Math.min()` 或求和。
4. **初始条件和边界是什么？**
   - 比如 `dp[0]` 应该是什么？当 `i=0` 或 `j=0` 时，方程会不会越界？

> **终极建议**：如果直接写 `for` 循环（自底向上）很困难，**一定要先写递归（自顶向下），然后加上 Memoization（备忘录数组）**。熟练写出记忆化搜索后，转为递推水到渠成。

---

## 🚀 进阶刷题强化计划（按推导套路分类）

### 专项一：线性 DP 之“选与不选”模型

**推导套路**：当前第 `i` 个元素只有两种命运：要么选它，要么不选它。`dp[i] = Math.max(不选i的情况, 选i的情况)`。

*   **[198. 打家劫舍](https://leetcode.cn/problems/house-robber/)** (中等) - 必刷基础，当前房屋“偷”还是“不偷”。
*   **[740. 删除并获得点数](https://leetcode.cn/problems/delete-and-earn/)** (中等) - 打家劫舍的变种，需要先做一次频数统计。
*   **[139. 单词拆分](https://leetcode.cn/problems/word-break/)** (中等) - 字符串的“选与不选”（或者说是划分与不划分）。
*   **[91. 解码方法](https://leetcode.cn/problems/decode-ways/)** (中等) - 当前字符是单独解码（1位），还是和前面字符组合解码（2位）？
*   **[279. 完全平方数](https://leetcode.cn/problems/perfect-squares/)** (中等) - 最后一步是减去哪一个完全平方数。
*   **[343. 整数拆分](https://leetcode.cn/problems/integer-break/)** (中等) - 最后一步是拆分成两个数，还是拆分成多个数？

**【代码示例：打家劫舍 - 记忆化搜索思维】**
```javascript
/**
 * 记忆化搜索版本（更容易推导方程）
 */
var rob = function(nums) {
    const memo = new Array(nums.length).fill(-1);
    
    // dfs(i) 表示从第 i 间房子开始偷，能偷到的最大金额
    const dfs = (i) => {
        if (i >= nums.length) return 0;
        if (memo[i] !== -1) return memo[i];
        
        // 选择 1：偷当前房子，那么跳过下一间 (i + 2)
        // 选择 2：不偷当前房子，考虑下一间 (i + 1)
        const res = Math.max(nums[i] + dfs(i + 2), dfs(i + 1));
        memo[i] = res;
        return res;
    };
    
    return dfs(0);
};

/**
 * 递推 DP 版本
 */
var robDP = function(nums) {
    const n = nums.length;
    if (n === 1) return nums[0];
    
    // dp[i] 表示前 i 间房屋能偷窃到的最高总金额
    const dp = new Array(n).fill(0);
    dp[0] = nums[0];
    dp[1] = Math.max(nums[0], nums[1]);
    
    for (let i = 2; i < n; i++) {
        dp[i] = Math.max(dp[i - 2] + nums[i], dp[i - 1]);
    }
    
    return dp[n - 1];
};
```

### 专项二：子序列问题之“位置关联”模型

**推导套路**：这类问题状态通常定义为“**以第 i 个元素结尾**的最优解”。在推导时，必须向前回头看前 `j` 个元素（`0 <= j < i`），寻找能和第 `i` 个元素拼接的状态。

*   **[300. 最长递增子序列](https://leetcode.cn/problems/longest-increasing-subsequence/)** (中等) - 经典中的经典。
*   **[673. 最长递增子序列的个数](https://leetcode.cn/problems/number-of-longest-increasing-subsequence/)** (中等) - 求最值的同时求方案数，体会双数组 DP。
*   **[376. 摆动序列](https://leetcode.cn/problems/wiggle-subsequence/)** (中等) - 状态细化：以 `i` 结尾时，最后一步是“上升”还是“下降”？
*   **[873. 最长的斐波那契子序列的长度](https://leetcode.cn/problems/length-of-longest-fibonacci-subsequence/)** (中等) - 二维状态，需要知道最后两个数字。
*   **[1027. 最长等差数列](https://leetcode.cn/problems/longest-arithmetic-subsequence/)** (中等) - 状态需要记录“公差”。

**【代码示例：最长递增子序列】**
```javascript
var lengthOfLIS = function(nums) {
    if (nums.length === 0) return 0;
    
    // dp[i] 表示以 nums[i] 结尾的最长递增子序列的长度
    const dp = new Array(nums.length).fill(1);
    let maxLen = 1;
    
    for (let i = 1; i < nums.length; i++) {
        // 回头看前面的所有元素
        for (let j = 0; j < i; j++) {
            if (nums[i] > nums[j]) {
                dp[i] = Math.max(dp[i], dp[j] + 1);
            }
        }
        maxLen = Math.max(maxLen, dp[i]);
    }
    
    return maxLen;
};
```

### 专项三：双字符串/数组操作之“对齐与配对”模型

**推导套路**：涉及两个字符串 `s1` 和 `s2`，状态一律定义为二维 `dp[i][j]`，表示 `s1` 的前 `i` 个和 `s2` 的前 `j` 个的状态。推导时，最后一步看 `s1[i-1]` 和 `s2[j-1]` 是否相等。

*   **[1143. 最长公共子序列](https://leetcode.cn/problems/longest-common-subsequence/)** (中等) - 基础，相等时 `+1`，不相等时继承 `Math.max(左, 上)`。
*   **[72. 编辑距离](https://leetcode.cn/problems/edit-distance/)** (中等) - 不相等时的三种选择对应增、删、改。
*   **[97. 交错字符串](https://leetcode.cn/problems/interleaving-string/)** (中等) - 最后一步是 `s1` 出了一个字符，还是 `s2` 出了一个字符？
*   **[115. 不同的子序列](https://leetcode.cn/problems/distinct-subsequences/)** (困难) - 当字符相等时，你可以选择“用它匹配”，也可以选择“不用它匹配”。
*   **[712. 两个字符串的最小ASCII删除和](https://leetcode.cn/problems/minimum-ascii-delete-sum-for-two-strings/)** (中等) - 最长公共子序列变种。

**【代码示例：最长公共子序列】**
```javascript
var longestCommonSubsequence = function(text1, text2) {
    const m = text1.length;
    const n = text2.length;
    
    // dp[i][j] 表示 text1 的前 i 个字符和 text2 的前 j 个字符的最长公共子序列长度
    // 多开一行一列处理边界条件 (i=0 或 j=0 时长度为 0)
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            // 注意字符串索引比 dp 数组索引小 1
            if (text1[i - 1] === text2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1; // 找到了一个公共字符
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); // 继承之前的结果
            }
        }
    }
    
    return dp[m][n];
};
```

### 专项四：网格/矩阵 DP 之“多重限制”模型

**推导套路**：在基础的“只能向右/向下”走的基础上，增加一些维度（比如剩余血量、剩余步数、钥匙数量等）。

*   **[64. 最小路径和](https://leetcode.cn/problems/minimum-path-sum/)** (中等) - 基础复习。
*   **[174. 地下城游戏](https://leetcode.cn/problems/dungeon-game/)** (困难) - **逆向思维！** 从终点往起点推导。
*   **[576. 出界的路径数](https://leetcode.cn/problems/out-of-boundary-paths/)** (中等) - 引入第三个维度：剩余步数 `dp[i][j][k]`。
*   **[931. 下降路径最小和](https://leetcode.cn/problems/minimum-falling-path-sum/)** (中等) - 类似三角形路径和，但变为矩形。

### 专项五：状态机 DP 强化（复杂流转）

**推导套路**：当一个物体在不同时刻有多种固定的“状态”时，画出**状态转换图**，直接根据图写方程。

*   **股票买卖全家桶**（[121](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock/), [122](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-ii/), [123](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-iii/), [188](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-iv/), [309](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-with-cooldown/), [714](https://leetcode.cn/problems/best-time-to-buy-and-sell-stock-with-transaction-fee/)）- 用通用的状态机模板秒杀全场。
*   **[152. 乘积最大子数组](https://leetcode.cn/problems/maximum-product-subarray/)** (中等) - 需要同时维护最大值和最小值状态。
*   **[801. 使序列递增的最小交换次数](https://leetcode.cn/problems/minimum-swaps-to-make-sequences-increasing/)** (困难) - 当前位置的状态只有两个：“交换”或“不交换”。

**【代码示例：买卖股票的最佳时机含冷冻期 (309)】**
```javascript
var maxProfit = function(prices) {
    if (prices.length === 0) return 0;
    const n = prices.length;
    
    // 状态定义：
    // dp[i][0]：持有股票
    // dp[i][1]：不持有股票，且处于冷冻期（说明今天刚卖出）
    // dp[i][2]：不持有股票，不在冷冻期
    const dp = Array.from({ length: n }, () => new Array(3).fill(0));
    
    dp[0][0] = -prices[0];
    
    for (let i = 1; i < n; i++) {
        // 持有股票：昨天就持有，或者昨天不在冷冻期今天刚买入
        dp[i][0] = Math.max(dp[i - 1][0], dp[i - 1][2] - prices[i]);
        // 刚卖出，进入冷冻期：昨天必须持有股票
        dp[i][1] = dp[i - 1][0] + prices[i];
        // 不持有且不在冷冻期：昨天就在冷冻期，或者昨天也是不持有且不在冷冻期
        dp[i][2] = Math.max(dp[i - 1][1], dp[i - 1][2]);
    }
    
    return Math.max(dp[n - 1][1], dp[n - 1][2]);
};
```
