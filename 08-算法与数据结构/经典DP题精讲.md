# 经典DP题精讲

> 动态规划面试核心专题，涵盖字符串DP、序列DP、背包DP等高频题型

---

## 一、编辑距离 —— LC 72 ⭐⭐⭐

### 面试考点
- 二维DP经典模板
- 字符串比较类DP
- 空间优化（滚动数组 + prev变量）

### 思路
**定义**：`dp[i][j]` = word1 前 i 个字符转换为 word2 前 j 个字符的最少操作数（插入/删除/替换）

**初始化**：
- `dp[0][j] = j`（word1 为空，需插入 j 次）
- `dp[i][0] = i`（word2 为空，需删除 i 次）

**状态转移**：
- 字符相同：`dp[i][j] = dp[i-1][j-1]`
- 字符不同：`dp[i][j] = Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]) + 1`
  - `dp[i-1][j-1]` → 替换
  - `dp[i-1][j]` → 删除
  - `dp[i][j-1]` → 插入

### 代码（JS）

```js
// 二维DP
var minDistance = function(word1, word2) {
    const m = word1.length, n = word2.length;
    const dp = new Array(m + 1).fill(0).map(() => new Array(n + 1).fill(0));
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 0; i <= m; i++) dp[i][0] = i;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (word1[i - 1] === word2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
            }
        }
    }
    return dp[m][n];
};

// 一维DP（空间优化）
var minDistance = function(word1, word2) {
    const m = word1.length, n = word2.length;
    const dp = new Array(n + 1).fill(0);
    for (let j = 0; j <= n; j++) dp[j] = j;

    for (let i = 1; i <= m; i++) {
        let prev = dp[0]; // 保存左上角 dp[i-1][j-1]
        dp[0] = i;
        for (let j = 1; j <= n; j++) {
            const temp = dp[j]; // 保存旧值，供下轮作 prev
            dp[j] = word1[i - 1] === word2[j - 1]
                ? prev
                : Math.min(dp[j - 1], dp[j], prev) + 1;
            prev = temp;
        }
    }
    return dp[n];
};
```

> ❗ 易错：字符串索引用 `word1[i-1]`，不是 `word1[i]`（dp 从 1 开始，字符串从 0 开始）

### 复杂度
- 时间：O(m×n)
- 空间：二维 O(m×n)，一维优化后 O(min(m,n))

### 面试一句话
> 二维DP经典，字符相同继承左上角，字符不同取替换/删除/插入三者最小值+1；空间优化用 prev 保存被覆盖的左上角。

---

## 二、最大子数组和 —— LC 53 ⭐⭐⭐

### 面试考点
- Kadane 算法（DP + 贪心融合）
- 前缀和优化思路
- 分治法扩展

### 思路
**Kadane 核心**：若前序累积和 > 0，就接着加；否则从当前元素重新开始。

**状态定义**：`dp[i]` = 以 `nums[i]` 结尾的最大子数组和
**转移**：`dp[i] = Math.max(nums[i], dp[i-1] + nums[i])`
**空间优化**：只需保留上一个值，O(1) 空间

### 代码（JS）

```js
// Kadane 标准版 O(n) O(1)
var maxSubArray = function(nums) {
    let currentSum = nums[0], maxSum = nums[0];
    for (let i = 1; i < nums.length; i++) {
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        maxSum = Math.max(maxSum, currentSum);
    }
    return maxSum;
};

// 前缀和方案（理解用）
// 子数组 nums[i..j] 的和 = preSum[j+1] - preSum[i]
// 最大子数组和 = 最大 (preSum[j+1] - minPreSum[0..j])
```

### 方法对比

| 方法 | 时间 | 空间 | 说明 |
|------|------|------|------|
| 暴力枚举 | O(n²) | O(1) | 两层循环 |
| 前缀和 | O(n) | O(n) | preSum[j+1] - minPreSum |
| 分治法 | O(nlogn) | O(logn) | 左右 + 跨中间三者取最大 |
| **Kadane** | **O(n)** | **O(1)** | **最优** ✅ |

### 复杂度
- 时间：O(n)，空间：O(1)

### 面试一句话
> Kadane 算法：前序和为正则继续累加，否则从当前元素重置，O(n) 时间 O(1) 空间，面试首选。

---

## 三、乘积最大子数组 —— LC 152 ⭐⭐⭐

### 面试考点
- 与 LC53 的核心差异：负数翻转特性
- 同时维护最大值和最小值
- tempMax 变量的必要性

### 思路
乘法有负负得正，所以不能只维护最大值，要**同时维护最大值和最小值**。

**状态定义**：
- `curMax`：以当前元素结尾的子数组最大乘积
- `curMin`：以当前元素结尾的子数组最小乘积

**转移（三选一）**：
- 只选自己（重新开始）
- 前一个最大乘积 × 当前
- 前一个最小乘积 × 当前（负×负=正）

### 代码（JS）

```js
var maxProduct = function(nums) {
    let curMax = nums[0], curMin = nums[0], res = nums[0];

    for (let i = 1; i < nums.length; i++) {
        const tempMax = curMax; // 必须先保存！更新 curMin 时需要原始 curMax
        curMax = Math.max(nums[i], tempMax * nums[i], curMin * nums[i]);
        curMin = Math.min(nums[i], tempMax * nums[i], curMin * nums[i]);
        res = Math.max(res, curMax);
    }
    return res;
};
```

### 与 LC53 对比

| 维度 | 最大子数组和（LC53） | 乘积最大子数组（LC152） |
|------|---------------------|------------------------|
| 核心状态 | 1个变量（当前最大和） | 2个变量（最大积+最小积） |
| 原因 | 加法单调 | 乘法有负数翻转 |
| 重置条件 | 前序和 ≤ 0 则重置 | 三种情况取 max/min |

### 复杂度
- 时间：O(n)，空间：O(1)

### 面试一句话
> 乘法特殊在负负得正，同时维护最大值和最小值，状态转移前必须用 tempMax 保存原 curMax。

---

## 四、最长回文子串 —— LC 5 ⭐⭐⭐

### 面试考点
- 中心扩展法 vs DP
- DP 状态转移的"内部子串依赖"
- 遍历顺序（按长度枚举）

### 思路：中心扩展法（推荐）
从每个字符（奇）和相邻字符对（偶）向外扩展，找最长回文。

### 思路：动态规划
`dp[i][j]` = s[i..j] 是否为回文串
- `s[i] !== s[j]`：false
- `s[i] === s[j]`：
  - 子串长度 ≤ 3（"aa"/"aba"）：直接 true
  - 长度 > 3：取 `dp[i+1][j-1]`

### 代码（JS）

```js
// 中心扩展法 O(n²) O(1) ✅ 面试首选
var longestPalindrome = function(s) {
    if (s.length <= 1) return s;
    let res = '';

    for (let i = 0; i < s.length; i++) {
        handle(i, i);   // 奇数长度
        handle(i, i+1); // 偶数长度
    }

    function handle(i, j) {
        while (i >= 0 && j < s.length && s[i] === s[j]) { i--; j++; }
        const temp = s.slice(i + 1, j);
        res = res.length > temp.length ? res : temp;
    }
    return res;
};

// DP解法 O(n²) O(n²)
var longestPalindrome = function(s) {
    const n = s.length;
    if (n < 2) return s;
    const dp = Array.from(new Array(n), () => new Array(n).fill(false));
    let start = 0, maxLen = 1;
    for (let i = 0; i < n; i++) dp[i][i] = true;

    for (let l = 2; l <= n; l++) {     // 按子串长度枚举（保证内部子串先计算）
        for (let i = 0; i < n; i++) {
            const j = i + l - 1;
            if (j >= n) break;
            if (s[i] !== s[j]) {
                dp[i][j] = false;
            } else {
                dp[i][j] = (j - i < 3) ? true : dp[i + 1][j - 1];
            }
            if (dp[i][j] && l > maxLen) { maxLen = l; start = i; }
        }
    }
    return s.slice(start, start + maxLen);
};
```

### 两种解法对比

| 维度 | 中心扩展法 | 动态规划 |
|------|-----------|---------|
| 时间复杂度 | O(n²) | O(n²) |
| 空间复杂度 | **O(1)** | O(n²) |
| 实现难度 | 简单 | 中等 |
| 推荐 | ✅ 面试首选 | 理解状态转移 |

### 复杂度
- 中心扩展：时间 O(n²)，空间 O(1)

### 面试一句话
> 中心扩展法从每个字符向外扩，奇偶分别处理，O(n²) 时间 O(1) 空间，比DP简单且省空间。

---

## 五、最长公共子序列（LCS）—— LC 1143 ⭐⭐⭐

### 面试考点
- 二维DP经典（和编辑距离同类）
- 不等时为何取 max（继承更优方向）
- 空间优化（一维 + prev）

### 思路
**定义**：`dp[i][j]` = text1 前 i 个字符与 text2 前 j 个字符的 LCS 长度

**状态转移**：
- 相同：`dp[i][j] = dp[i-1][j-1] + 1`
- 不同：`dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1])`（去掉其中一个字符，取最优）

### 代码（JS）

```js
// 二维DP
function longestCommonSubsequence(text1, text2) {
    const m = text1.length, n = text2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (text1[i - 1] === text2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[m][n];
}

// 一维DP（空间优化）
function longestCommonSubsequence(text1, text2) {
    if (text1.length < text2.length) [text1, text2] = [text2, text1];
    const m = text1.length, n = text2.length;
    const dp = new Array(n + 1).fill(0);

    for (let i = 1; i <= m; i++) {
        let prev = 0; // 保存 dp[i-1][j-1]
        for (let j = 1; j <= n; j++) {
            const temp = dp[j];
            dp[j] = text1[i - 1] === text2[j - 1]
                ? prev + 1
                : Math.max(dp[j], dp[j - 1]);
            prev = temp;
        }
    }
    return dp[n];
}
```

### 复杂度
- 时间：O(m×n)，空间：O(m×n) → 一维优化后 O(min(m,n))

### 面试一句话
> 字符相同加1继承左上角，字符不同取上方和左方最大值；和编辑距离同一类模板，核心差异是转移方向。

---

## 六、最长递增子序列（LIS）—— LC 300 ⭐⭐⭐

### 面试考点
- O(n²) DP 思路
- O(nlogn) 贪心+二分（最优解）
- tails 数组的含义（不是真实LIS，只是辅助工具）

### 思路：DP O(n²)
**定义**：`dp[i]` = 以 `nums[i]` 结尾的 LIS 长度（初始值为 1）
**转移**：对所有 j < i，若 `nums[i] > nums[j]`，则 `dp[i] = Math.max(dp[i], dp[j]+1)`
**结果**：`Math.max(...dp)`（最后元素不一定是LIS结尾）

### 思路：贪心+二分 O(nlogn) ✅ 最优
- 维护 `tails[k]` = 长度为 k+1 的 LIS 的最小末尾值
- 当前元素 > tails 末尾 → 追加（长度+1）
- 否则 → 二分找第一个 ≥ 当前元素的位置，替换（优化末尾，不改变长度）
- `tails` 不是真实LIS，但其**长度等于真实LIS长度**

### 代码（JS）

```js
// DP O(n²)
var lengthOfLIS = function(nums) {
    const dp = new Array(nums.length).fill(1);
    let maxLen = 1;
    for (let i = 1; i < nums.length; i++) {
        for (let j = 0; j < i; j++) {
            if (nums[i] > nums[j]) dp[i] = Math.max(dp[i], dp[j] + 1);
        }
        maxLen = Math.max(maxLen, dp[i]);
    }
    return maxLen;
};

// 贪心+二分 O(nlogn) ✅ 面试最优解
var lengthOfLIS = function(nums) {
    if (!nums.length) return 0;
    const tails = [nums[0]];

    for (let i = 1; i < nums.length; i++) {
        const num = nums[i];
        if (num > tails[tails.length - 1]) {
            tails.push(num);
        } else {
            let l = 0, r = tails.length - 1;
            while (l < r) {
                const mid = (l + r) >> 1;
                if (tails[mid] < num) l = mid + 1;
                else r = mid;
            }
            tails[l] = num; // 替换，不改变长度
        }
    }
    return tails.length;
};
```

> 🔑 关键：`[1,3,4,5,2]` → tails 最终 `[1,2,4,5]`，真实LIS是 `[1,3,4,5]`，长度同为 4 ✅

### 方法对比

| 方法 | 时间 | 空间 | 特点 |
|------|------|------|------|
| 动态规划 | O(n²) | O(n) | 思路直观，可还原具体子序列 |
| **贪心+二分** | **O(nlogn)** | **O(n)** | **面试最优解** ✅ |

### 复杂度
- DP：时间 O(n²)，空间 O(n)
- 贪心+二分：时间 O(nlogn)，空间 O(n)

### 面试一句话
> 贪心维护每个长度的最小末尾值，二分找插入位置，tails 长度即为 LIS 长度；O(nlogn) 是面试最优解。

---

## 七、分割等和子集 —— LC 416 ⭐⭐

### 面试考点
- 0-1背包模板题
- **倒序遍历容量**（确保每个元素只用一次）
- 问题转化：总和为偶数且能找到 sum/2 的子集

### 思路
转化为：能否从数组中选若干元素，和恰好等于 `target = sum/2`？
→ 典型 0-1 背包，`dp[i]` = 容量为 i 的背包是否能装满

**关键**：外层遍历物品，内层**倒序**遍历容量（防止同一元素被选多次）

### 代码（JS）

```js
function canPartition(nums) {
    const sum = nums.reduce((a, b) => a + b, 0);
    if (sum % 2 !== 0) return false;
    const target = sum / 2;
    const dp = new Array(target + 1).fill(false);
    dp[0] = true;

    for (let num of nums) {
        for (let i = target; i >= num; i--) {  // 倒序！0-1背包关键
            dp[i] = dp[i] || dp[i - num];
            // dp[i] = 不选 num；dp[i-num] = 选 num
        }
    }
    return dp[target];
}
```

### 复杂度
- 时间：O(n × target)，空间：O(target)

### 面试一句话
> 0-1背包模板：先遍历物品，再**倒序**遍历容量；倒序是为了确保每个元素只被选一次。

---

## 八、路径总和 III —— LC 437 ⭐⭐⭐

### 面试考点
- 前缀和在树上的应用
- DFS + 哈希表
- **回溯撤销**的必要性（左子树前缀和不能污染右子树）
- `cnt.set(0, 1)` 初始化的意义

### 思路：前缀和 + DFS + 回溯
**关键转化**：
- 设从根到当前节点的前缀和为 `s`
- 找路径和等于 targetSum → 找 `s - targetSum` 在之前出现过多少次
- 初始化 `cnt.set(0, 1)`：处理从根节点出发直接等于 target 的路径

**回溯必要性**：DFS 遍历完左子树后，左子树的前缀和记录必须撤销，否则会污染右子树的统计。

### 代码（JS）

```js
const pathSum = function(root, targetSum) {
    const cnt = new Map();
    cnt.set(0, 1); // 虚拟前缀和 0，处理从根出发的路径
    let ans = 0;

    function dfs(node, s) {
        if (node === null) return;
        s += node.val;
        ans += cnt.get(s - targetSum) ?? 0; // 以 node 为终点的符合路径数
        cnt.set(s, (cnt.get(s) ?? 0) + 1);  // 记录当前前缀和
        dfs(node.left, s);
        dfs(node.right, s);
        cnt.set(s, cnt.get(s) - 1);          // 回溯：撤销当前前缀和
    }

    dfs(root, 0);
    return ans;
};
```

### 复杂度
- 时间：O(n)，空间：O(n)

### 面试一句话
> 树上前缀和：哈希表记录前缀和频次，查找 `s - target` 的出现次数；回溯时必须撤销，防止左子树污染右子树。

---

## DP 通用套路

### 五步走
1. **定义状态**：`dp[i]` 或 `dp[i][j]` 代表什么（最关键！确定后一切顺理成章）
2. **初始化边界**：最小子问题的答案（通常是 0、1 或边界条件）
3. **状态转移**：大问题如何由小问题推导（公式）
4. **遍历顺序**：确保计算 `dp[i]` 时，所依赖的子问题已计算完毕
5. **返回结果**：通常是 `dp[n]`、`dp[m][n]` 或遍历取最大值

### 常见空间优化技巧

| 场景 | 技巧 | 示例 |
|------|------|------|
| 只依赖上一行 | 滚动到一维数组 | 编辑距离、LCS |
| 需要左上角值 | `prev` 变量保存被覆盖的对角值 | 编辑距离、LCS |
| 0-1背包 | 内层**倒序**遍历容量 | 分割等和子集 |
| 乘积类 | 同时保存最大/最小值 | 乘积最大子数组 |

### 二维DP的三个来源方向

```
dp[i-1][j-1]  dp[i-1][j]
              ↙    ↑
dp[i][j-1]  ←  dp[i][j]

左上（对角线）= 替换/匹配（字符相同时继承）
上方          = 删除 text1 当前字符 / 跳过
左方          = 删除 text2 当前字符 / 跳过
```

### 几类DP的核心对比

| 题目 | 类型 | dp含义 | 转移核心 |
|------|------|--------|---------|
| LC72 编辑距离 | 字符串DP | 最少操作数 | 字符相同继承，不同取三方最小+1 |
| LC53 最大子数组和 | 序列DP | 以i结尾的最大和 | Kadane：接上or重新开始 |
| LC152 乘积最大 | 序列DP | 以i结尾的最大/最小积 | 同时维护max和min |
| LC5 最长回文子串 | 区间DP | s[i..j]是否回文 | 两端相同看内部 |
| LC1143 LCS | 字符串DP | 前i/j字符的LCS长度 | 相同+1，不同取max |
| LC300 LIS | 序列DP | 以i结尾的LIS长度 | 遍历j<i，满足条件取max+1 |
| LC416 分割等和 | 背包DP | 容量i能否被装满 | 0-1背包倒序遍历 |
| LC437 路径总和 | 树+前缀和 | 前缀和频次 | DFS+回溯，查s-target |
