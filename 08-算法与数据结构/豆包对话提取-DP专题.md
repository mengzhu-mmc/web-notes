# 豆包对话提取 - 动态规划专题

> 来源：豆包历史对话，提取时间：2026-03-17

---

## 编辑距离（Edit Distance）—— LC 72

### 核心思路

**问题**：将 word1 转换成 word2 所使用的最少操作数（插入、删除、替换）。

**定义**：`dp[i][j]` 表示 word1 前 i 个字符转换为 word2 前 j 个字符的最少操作数。

**初始化边界**：
- `dp[0][j] = j`（word1 为空，需要插入 j 个字符）
- `dp[i][0] = i`（word2 为空，需要删除 i 个字符）

**状态转移**：
- 若 `word1[i-1] === word2[j-1]`：`dp[i][j] = dp[i-1][j-1]`（无需操作）
- 否则：`dp[i][j] = Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]) + 1`
  - `dp[i-1][j-1]` → 替换
  - `dp[i-1][j]` → 删除
  - `dp[i][j-1]` → 插入

### 代码实现（二维 DP）

```js
var minDistance = function(word1, word2) {
    const m = word1.length;
    const n = word2.length;
    const dp = new Array(m + 1).fill(0).map(() => new Array(n + 1).fill(0));

    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 0; i <= m; i++) dp[i][0] = i;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (word1[i - 1] === word2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j - 1], // 替换
                    dp[i - 1][j],     // 删除
                    dp[i][j - 1]      // 插入
                ) + 1;
            }
        }
    }

    return dp[m][n];
};
```

### 空间优化版（一维 DP）

**核心对应关系**：
- `dp[j]` 旧值 = 正上方 `dp[i-1][j]`
- `dp[j-1]` 新值 = 左边 `dp[i][j-1]`
- `prev` = 左上角 `dp[i-1][j-1]`（会被覆盖，必须提前保存）

```js
var minDistance = function(word1, word2) {
    const m = word1.length;
    const n = word2.length;
    const dp = new Array(n + 1).fill(0);
    for (let j = 0; j <= n; j++) dp[j] = j;

    for (let i = 1; i <= m; i++) {
        let prev = dp[0]; // 保存左上角（dp[i-1][0]）
        dp[0] = i;        // dp[i][0] = i

        for (let j = 1; j <= n; j++) {
            const temp = dp[j]; // 保存当前 up，供下一轮用作 lu
            const left = dp[j - 1]; // 左边
            const up = dp[j];       // 正上（旧值）
            const lu = prev;        // 左上角

            if (word1[i - 1] === word2[j - 1]) {
                dp[j] = lu;
            } else {
                dp[j] = Math.min(left, up, lu) + 1;
            }
            prev = temp; // 更新左上角
        }
    }

    return dp[n];
};
```

### 复杂度

- 时间：O(m×n)
- 空间：二维 O(m×n)，一维优化后 O(min(m,n))

### 常见 Bug

> ❗ 字符串索引偏移：`word1[i]` 应写为 `word1[i-1]`（dp 索引从 1 开始，字符串从 0 开始）

---

## 最大子数组和（Maximum Subarray）—— LC 53

### 核心思路：Kadane 算法

**精简版（原地修改数组）**：如果前一个位置的累加和 > 0，就把当前元素加上前序和；否则从当前元素重新开始。最后取数组最大值。

```js
var maxSubArray = function(nums) {
    for (let i = 1; i < nums.length; i++) {
        if (nums[i-1] > 0) {
            nums[i] += nums[i-1];
        }
    }
    return Math.max(...nums);
};
```

**标准版（不修改原数组）**：

```js
var maxSubArray = function(nums) {
    let currentSum = nums[0];
    let maxSum = nums[0];
    for (let i = 1; i < nums.length; i++) {
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        maxSum = Math.max(maxSum, currentSum);
    }
    return maxSum;
};
```

### 其他解法对比

| 方法 | 时间 | 空间 | 说明 |
|---|---|---|---|
| 暴力枚举 | O(n²) | O(1) | 两层循环枚举所有子数组 |
| 前缀和 + 最小前缀和 | O(n) | O(n) | preSum[j+1] - minPreSum 取最大 |
| 分治法 | O(n log n) | O(log n) | 左右 + 跨中间三者取最大 |
| 动态规划（标准） | O(n) | O(n) | dp[i] = max(nums[i], dp[i-1]+nums[i]) |
| **Kadane（DP 优化）** | **O(n)** | **O(1)** | **最优** |

### 前缀和方案核心

```js
// 子数组 nums[i..j] 的和 = preSum[j+1] - preSum[i]
// 最大化 preSum[j+1] - preSum[i] 等价于找 j 之前最小的 preSum[i]
let minPreSum = preSum[0];
for (let j = 0; j < n; j++) {
    maxSum = Math.max(maxSum, preSum[j+1] - minPreSum);
    minPreSum = Math.min(minPreSum, preSum[j+1]);
}
```

### 复杂度

- 时间：O(n)，空间：O(1)（Kadane 最优）

---

## 乘积最大子数组（Maximum Product Subarray）—— LC 152

### 核心难点

乘法和加法不同：**负数 × 负数 = 正数**，所以不能直接用 Kadane 思路。需要**同时维护最大值和最小值**。

### 状态定义

- `curMax`：以当前元素结尾的子数组**最大**乘积
- `curMin`：以当前元素结尾的子数组**最小**乘积（负数可能翻转为最大）

### 状态转移

```
curMax[i] = max(nums[i], curMax[i-1]*nums[i], curMin[i-1]*nums[i])
curMin[i] = min(nums[i], curMax[i-1]*nums[i], curMin[i-1]*nums[i])
```

每个位置有三种选择：
1. 只选自己（重新开始子数组）
2. 前一个最大乘积 × 当前元素
3. 前一个最小乘积 × 当前元素（负×负=正，可能变最大）

### 代码实现（O(1) 空间）

```js
var maxProduct = function(nums) {
    if (nums.length === 0) return 0;

    let curMax = nums[0];
    let curMin = nums[0];
    let res = nums[0];

    for (let i = 1; i < nums.length; i++) {
        const tempMax = curMax; // 先保存，避免更新 curMin 时被覆盖

        curMax = Math.max(nums[i], tempMax * nums[i], curMin * nums[i]);
        curMin = Math.min(nums[i], tempMax * nums[i], curMin * nums[i]);

        res = Math.max(res, curMax);
    }

    return res;
};
```

### 与最大子数组和的区别

| | 最大子数组和 | 乘积最大子数组 |
|---|---|---|
| 核心状态 | 1 个变量（当前最大和） | 2 个变量（当前最大积 + 最小积） |
| 原因 | 加法单调 | 乘法有负数翻转特性 |
| 重置条件 | 前序和 ≤ 0 则重置 | 三种情况取 max/min |

### 复杂度

- 时间：O(n)，空间：O(1)

---

## 最长回文子串（Longest Palindromic Substring）—— LC 5

### 解法一：中心扩展法（推荐）

**思路**：从每个字符（奇数长度）和每对相邻字符（偶数长度）向外扩展，找最长回文。

```js
var longestPalindrome = function(s) {
    if (s.length <= 1) return s;
    let res = '';

    for (let i = 0; i < s.length; i++) {
        handle(i, i);   // 奇数长度回文（中心为单字符）
        handle(i, i+1); // 偶数长度回文（中心为两字符）
    }

    function handle(i, j) {
        while (i >= 0 && j < s.length && s[i] === s[j]) {
            i--;
            j++;
        }
        // 退出时 i/j 已越界，有效子串是 s[i+1...j-1]
        const temp = s.slice(i+1, j);
        res = res.length > temp.length ? res : temp;
    }
    return res;
};
```

### 解法二：动态规划

**状态定义**：`dp[i][j]` 表示 `s[i..j]` 是否为回文串。

**状态转移**：
- `s[i] !== s[j]`：`dp[i][j] = false`
- `s[i] === s[j]`：
  - 子串长度 ≤ 3（如 "aa"、"aba"）：`dp[i][j] = true`
  - 子串长度 > 3：`dp[i][j] = dp[i+1][j-1]`（依赖内部子串）

```js
var longestPalindrome = function(s) {
    const n = s.length;
    if (n < 2) return s;

    const dp = Array.from(new Array(n), () => new Array(n).fill(false));
    let start = 0, maxLen = 1;

    // 初始化：单字符都是回文
    for (let i = 0; i < n; i++) dp[i][i] = true;

    // 按子串长度从小到大枚举
    for (let l = 2; l <= n; l++) {
        for (let i = 0; i < n; i++) {
            const j = i + l - 1;
            if (j >= n) break;

            if (s[i] !== s[j]) {
                dp[i][j] = false;
            } else {
                dp[i][j] = (j - i < 3) ? true : dp[i + 1][j - 1];
            }

            if (dp[i][j] && (j - i + 1) > maxLen) {
                maxLen = j - i + 1;
                start = i;
            }
        }
    }

    return s.slice(start, start + maxLen);
};
```

### 两种解法对比

| 维度 | 中心扩展法 | 动态规划 |
|---|---|---|
| 时间复杂度 | O(n²) | O(n²) |
| 空间复杂度 | **O(1)** | O(n²) |
| 实现难度 | 简单 | 中等 |
| 推荐 | ✅ 面试首选 | 理解状态转移思想 |

---

## 最长公共子序列（LCS）—— LC 1143

### 核心思路

**定义**：`dp[i][j]` = text1 前 i 个字符和 text2 前 j 个字符的最长公共子序列长度。

**初始化**：`dp[0][j] = 0`，`dp[i][0] = 0`（空串和任何串的 LCS 为 0）

**状态转移**：
- `text1[i-1] === text2[j-1]`：`dp[i][j] = dp[i-1][j-1] + 1`（字符加入公共子序列）
- 否则：`dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1])`

**不等时为何取最大值**？
- `dp[i-1][j]`：去掉 text1 第 i 个字符后的最优解（从上方继承）
- `dp[i][j-1]`：去掉 text2 第 j 个字符后的最优解（从左方继承）
- 取最大值因为目标是**最长**，选更优的那个

### 代码实现

```js
function longestCommonSubsequence(text1, text2) {
    const m = text1.length;
    const n = text2.length;
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
```

### 空间优化（一维 DP）

```js
function longestCommonSubsequence(text1, text2) {
    if (text1.length < text2.length) [text1, text2] = [text2, text1];
    const m = text1.length, n = text2.length;
    const dp = new Array(n + 1).fill(0);

    for (let i = 1; i <= m; i++) {
        let prev = 0; // 保存 dp[i-1][j-1]
        for (let j = 1; j <= n; j++) {
            const temp = dp[j]; // 保存旧值（下一轮的 prev）
            if (text1[i - 1] === text2[j - 1]) {
                dp[j] = prev + 1;
            } else {
                dp[j] = Math.max(dp[j], dp[j - 1]);
            }
            prev = temp;
        }
    }

    return dp[n];
}
```

### 复杂度

- 时间：O(m×n)，空间：O(m×n) → 优化后 O(min(m,n))

---

## 最长递增子序列（LIS）—— LC 300

### 解法一：动态规划 O(n²)

**状态定义**：`dp[i]` = 以 `nums[i]` 结尾的最长递增子序列长度。

**初始化**：`dp[i] = 1`（每个元素自身是长度为 1 的子序列）

**状态转移**：对每个 i，遍历所有 j < i：
```
if (nums[i] > nums[j]):
    dp[i] = Math.max(dp[i], dp[j] + 1)
```

> **为何需要 maxLen 而不是 dp[n-1]？**
> `dp[i]` 只描述"以 i 结尾"的最优解，最后一个元素不一定是最长子序列的结尾（例如 `[1,3,6,7,9,4,10,5,6]`，dp[6]=6 但 dp[8]=5）。
> 需要遍历所有 dp[i] 取全局最大值。

> **关于 `dp[i] = Math.max(dp[i], dp[j]+1)` 的理解**：
> `dp[i]` 初始为 1（已知保底值，非"未知"），每遍历一个 j 就更新一次临时最大值，类比"每次看到更长的绳子就换手里那根"，遍历完所有 j 后得到最终最大值。

```js
var lengthOfLIS = function(nums) {
    const n = nums.length;
    if (n === 0) return 0;

    const dp = new Array(n).fill(1);
    let maxLen = 1;

    for (let i = 1; i < n; i++) {
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

### 解法二：贪心 + 二分查找 O(n log n)

**核心思想**：
- 维护 `tails` 数组，`tails[i]` = 长度为 i+1 的 LIS 的**最小末尾元素**
- `tails` 始终严格递增（保证二分可用）
- 贪心：让末尾元素尽可能小，方便后续接更大的数

**操作规则**：
- 当前元素 > `tails` 末尾 → 追加（LIS 长度 +1）
- 否则 → 二分找第一个 ≥ 当前元素的位置，**替换**（优化末尾潜力，不改变长度）

```js
var lengthOfLIS = function(nums) {
    if (nums.length === 0) return 0;
    const tails = [nums[0]];

    for (let i = 1; i < nums.length; i++) {
        const num = nums[i];
        if (num > tails[tails.length - 1]) {
            tails.push(num);
        } else {
            // 二分查找第一个 >= num 的位置
            let left = 0, right = tails.length - 1;
            while (left < right) {
                const mid = Math.floor((left + right) / 2);
                if (tails[mid] < num) left = mid + 1;
                else right = mid;
            }
            tails[left] = num; // 替换，不改变 tails 长度
        }
    }

    return tails.length;
};
```

**关键理解**：
- `tails` **不是**真实的 LIS！只是辅助工具，其**长度**等于真实 LIS 的长度
- 替换操作：只优化某长度 LIS 的最小末尾值，不"剪切"其他元素，不改变数组长度
- 例：`[1,3,4,5,2]` → tails 最终为 `[1,2,4,5]`，但真实 LIS 是 `[1,3,4,5]`，长度均为 4 ✅
- tails 的顺序不需要和原数组 LIS 对应，只需自身严格递增（方便二分）

**解法对比**：

| 方法 | 时间 | 空间 | 特点 |
|---|---|---|---|
| 动态规划 | O(n²) | O(n) | 思路直观，可还原具体子序列 |
| **贪心 + 二分** | **O(n log n)** | **O(n)** | **面试高频最优解** |
| 树状数组/线段树 | O(n log n) | O(n) | 可扩展动态修改场景 |

---

## 路径总和 III（Path Sum III）—— LC 437

### 核心思路：前缀和 + DFS + 回溯

**问题**：二叉树中路径（方向向下，不必从根到叶）和等于 targetSum 的数量。

**关键转化**：
- 设从根到当前节点的前缀和为 `s`
- 若某段路径 `A→B` 的和 = targetSum，则 `s[B] - s[A-1] = targetSum`，即 `s[A-1] = s[B] - targetSum`
- 用哈希表记录前缀和出现次数，快速查询有多少个起点

**初始化 `cnt.set(0, 1)` 的意义**：处理"从根节点到当前节点的路径刚好等于 targetSum"的情况（此时 `s - targetSum = 0`，需要有一个对应的"虚拟前缀和 0"）

```js
const pathSum = function(root, targetSum) {
    const cnt = new Map();
    cnt.set(0, 1); // 把前缀和 0 统计进来
    let ans = 0;

    function dfs(node, s) {
        if (node === null) return;

        s += node.val;
        ans += cnt.get(s - targetSum) ?? 0; // 以 node 为终点的符合路径数

        cnt.set(s, (cnt.get(s) ?? 0) + 1); // 记录当前前缀和
        dfs(node.left, s);
        dfs(node.right, s);
        cnt.set(s, cnt.get(s) - 1); // 回溯：撤销当前前缀和
    }

    dfs(root, 0);
    return ans;
};
```

### 回溯的重要性

`cnt.set(s, cnt.get(s) - 1)` 必须撤销！
- DFS 先遍历左子树，再遍历右子树
- 若不回溯，左子树路径上的前缀和会被错误地计入右子树的路径统计
- 左子树的节点并不在"根→右子树节点"的路径上

### 复杂度

- 时间：O(n)（每个节点只遍历一次）
- 空间：O(n)（哈希表 + 递归栈深度）

---

## 最长连续序列（Longest Consecutive Sequence）—— LC 128

### 解法一：排序（O(n log n)）

```js
var longestConsecutive = function(nums) {
    if (nums.length === 0) return 0;

    const arrCopy = [...new Set(nums)].sort((a, b) => a - b); // 去重 + 排序
    let maxLength = 1;
    let currentLength = 1;

    for (let i = 1; i < arrCopy.length; i++) {
        if (arrCopy[i] === arrCopy[i - 1] + 1) {
            currentLength++;
            maxLength = Math.max(maxLength, currentLength);
        } else {
            currentLength = 1;
        }
    }

    return maxLength;
};
```

### 解法二：哈希集合（O(n)）

```js
var longestConsecutive = function(nums) {
    const numSet = new Set(nums);
    let maxLength = 0;

    for (const num of numSet) {
        if (!numSet.has(num - 1)) { // 只从序列起点开始计数
            let currentNum = num;
            let currentLength = 1;

            while (numSet.has(currentNum + 1)) {
                currentNum++;
                currentLength++;
            }

            maxLength = Math.max(maxLength, currentLength);
        }
    }

    return maxLength;
};
```

### 常见 Bug（来自豆包对话）

```js
// ❌ 原始代码问题：
// 1. 未处理空数组：arrCopy[0] 为 undefined，tempArr = [undefined]
// 2. 最后一段序列未参与比较（仅在 else 分支更新 res）
// 3. res 初始化为 0（数字），res.length === undefined

// ✅ 修复要点：
// 1. 加 if (nums.length === 0) return 0
// 2. 用 new Set 去重，用 maxLength 变量追踪最大值（不用数组）
// 3. 每次连续时就更新 maxLength，确保末尾序列也被统计
```

### 复杂度对比

| 方法 | 时间 | 空间 |
|---|---|---|
| 排序 | O(n log n) | O(n) |
| **哈希集合** | **O(n)** | **O(n)** |

---

## 解码字符串（Decode String）—— LC 394

### 问题描述

将 `k[encoded_string]` 格式解码，支持嵌套。如：`3[a2[c]]` → `accaccacc`

### 核心思路：双栈模拟

- `strStack`：保存待拼接的前缀字符串
- `numStack`：保存对应的重复次数
- `res`：当前正在构建的字符串
- `num`：当前解析的数字（需支持多位数）

**遍历规则**：

| 字符 | 操作 |
|---|---|
| 数字 | `num = num * 10 + Number(i)`（处理多位数如 `12[a]`） |
| `[` | 压栈 `res` 和 `num`，重置为 `""` 和 `0` |
| `]` | `res = strStack.pop() + res.repeat(numStack.pop())` |
| 字母 | `res += i` |

```js
var decodeString = function(s) {
    const strStack = [], numStack = [];
    let num = 0, res = '';

    for (let i of s) {
        if (/[0-9]/.test(i)) {
            num = num * 10 + Number(i);
        } else if (i === '[') {
            strStack.push(res);
            numStack.push(num);
            res = '';
            num = 0;
        } else if (i === ']') {
            res = strStack.pop() + res.repeat(numStack.pop());
        } else {
            res += i;
        }
    }

    return res;
};
```

### 核心操作解析：`res = strStack.pop() + res.repeat(numStack.pop())`

| 步骤 | 操作 | 含义 |
|---|---|---|
| `numStack.pop()` | 弹出重复次数 k | 当前括号的 k 值 |
| `res.repeat(k)` | 重复括号内字符串 | 括号内内容 × k 次 |
| `strStack.pop()` | 弹出前缀字符串 | 括号外已拼接的内容 |
| 拼接 → res | 局部解码完成 | 为外层括号做准备 |

### 连续 `[[` 的处理（以 `2[3[ab]]` 为例）
| 遍历字符 | strStack | numStack | res | 操作 |
|---|---|---|---|---|
| `2` | [] | [] | "" | num=2 |
| `[` | [""] | [2] | "" | 压栈，重置 |
| `3` | [""] | [2] | "" | num=3 |
| `[` | ["",""] | [2,3] | "" | 压栈，重置（连续 [ 再次压栈） |
| `a` | ["",""] | [2,3] | "a" | res += 'a' |
| `b` | ["",""] | [2,3] | "ab" | res += 'b' |
| `]` | [""] | [2] | "ababab" | res = "" + "ab".repeat(3) |
| `]` | [] | [] | "abababababab" | res = "" + "ababab".repeat(2) |

**规律**：每个 `[` 对应一次压栈，每个 `]` 对应一次弹栈，严格配对。连续 `[` 只是让栈更深，不改变核心逻辑。

### 复杂度

- 时间：O(n × max_k)（n 为字符串长度，max_k 为最大重复次数）
- 空间：O(n)（栈的深度）

---

## 附录：动态规划核心套路

### DP 通用步骤

1. **定义状态**：`dp[i]` 或 `dp[i][j]` 代表什么含义（最关键！）
2. **初始化边界**：最小子问题的答案（通常是 0 或 1）
3. **状态转移**：大问题如何由小问题推导（公式）
4. **遍历顺序**：确保计算时子问题已解决
5. **返回结果**：通常是 `dp[n]` 或遍历取最大值

### 常见 DP 空间优化技巧

- **滚动数组**：若状态只依赖前一行/前一个，用一维数组代替二维
- **prev 变量**：保存被覆盖前的左上角/对角线值
- **示例对应**：
  - 编辑距离：prev = dp[i-1][j-1]（左上角）
  - LCS：prev = dp[i-1][j-1]（对角线）
  - 乘积最大子数组：tempMax 保存被覆盖前的 curMax

### 二维 DP 的三个方向

```
dp[i-1][j-1]  dp[i-1][j]
              ↙    ↑
dp[i][j-1]  ←  dp[i][j]

左上（对角线）= 替换/匹配
上方 = 删除/跳过
左方 = 插入/跳过
```
