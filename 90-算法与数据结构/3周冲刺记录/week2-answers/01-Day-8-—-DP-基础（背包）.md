# 01-Day-8-—-DP-基础（背包）

## Day 8 — DP 基础（背包）

### [70] 爬楼梯 ⭐ Easy

**题目描述**：假设你正在爬楼梯。需要 n 阶你才能到达楼顶。每次你可以爬 1 或 2 个台阶。你有多少种不同的方法可以爬到楼顶？

**自测用例**：

- 输入: n = 2 → 输出: 2（1+1 或 2）
- 输入: n = 3 → 输出: 3（1+1+1、1+2 或 2+1）
- 输入: n = 5 → 输出: 8

🔗 https://leetcode.cn/problems/climbing-stairs/

**思路**：每次可以爬1或2阶，到达第n阶的方案数 = 到达第n-1阶的方案数 + 到达第n-2阶的方案数，是典型的 Fibonacci 数列。递推方向：从左到右（从小状态推到大状态），因为 dp[i] 依赖 dp[i-1] 和 dp[i-2]，必须先算小的。

**代码**：

```js
/**
 * @param {number} n
 * @return {number}
 */
var climbStairs = function (n) {
  if (n <= 2) return n;
  // dp[i] 表示爬到第 i 阶的方案数
  const dp = new Array(n + 1).fill(0);
  dp[1] = 1;
  dp[2] = 2;
  // 从左到右递推：dp[i] 依赖 dp[i-1] 和 dp[i-2]
  for (let i = 3; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
};

// 空间优化版（滚动变量）
var climbStairsOpt = function (n) {
  if (n <= 2) return n;
  let prev2 = 1,
    prev1 = 2;
  for (let i = 3; i <= n; i++) {
    const cur = prev1 + prev2;
    prev2 = prev1;
    prev1 = cur;
  }
  return prev1;
};
```

**复杂度**：时间 O(n) | 空间 O(1)（优化版）

---

### [198] 打家劫舍 ⭐ Medium

**题目描述**：你是一个专业的小偷，计划偷窃沿街的房屋。每间房内都藏有一定的现金，影响你偷窃的唯一制约因素是相邻的房屋装有相互连通的防盗系统，如果两间相邻的房屋在同一晚上被小偷闯入，系统会自动报警。给定一个代表每个房屋存放金额的非负整数数组，计算你不触动警报装置的情况下，一夜之内能够偷窃到的最高金额。

**自测用例**：

- 输入: nums = [1,2,3,1] → 输出: 4（偷第1间+第3间）
- 输入: nums = [2,7,9,3,1] → 输出: 12（偷第1间+第3间+第5间）
- 输入: nums = [2,1] → 输出: 2

🔗 https://leetcode.cn/problems/house-robber/

**思路**：相邻房屋不能同时偷，对于第 i 间房，选择偷（dp[i-2] + nums[i]）或不偷（dp[i-1]），取较大值。递推方向：从左到右，因为 dp[i] 依赖前两个状态，必须从小到大计算。

**代码**：

```js
/**
 * @param {number[]} nums
 * @return {number}
 */
var rob = function (nums) {
  const n = nums.length;
  if (n === 0) return 0;
  if (n === 1) return nums[0];

  // dp[i] 表示偷到第 i 间房时能获得的最大金额
  const dp = new Array(n).fill(0);
  dp[0] = nums[0];
  dp[1] = Math.max(nums[0], nums[1]);

  // 从左到右：dp[i] = max(不偷i: dp[i-1], 偷i: dp[i-2] + nums[i])
  for (let i = 2; i < n; i++) {
    dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i]);
  }
  return dp[n - 1];
};
```

**复杂度**：时间 O(n) | 空间 O(n)（可优化到 O(1)）

---

### [322] 零钱兑换 ⭐ Medium

**题目描述**：给你一个整数数组 coins，代表不同面额的硬币；以及一个整数 amount，代表总金额。计算凑成总金额所需的最少的硬币个数。如果没有任何一种硬币组合能组成总金额，返回 -1。每种硬币的数量是无限的。

**自测用例**：

- 输入: coins = [1,2,5], amount = 11 → 输出: 3（5+5+1）
- 输入: coins = [2], amount = 3 → 输出: -1
- 输入: coins = [1], amount = 0 → 输出: 0

🔗 https://leetcode.cn/problems/coin-change/

**思路**：完全背包问题，每种硬币可以重复使用。dp[i] 表示凑成金额 i 所需的最少硬币数，初始化 dp[0]=0，其余为 Infinity。递推方向：从左到右（完全背包，物品可重复使用，正序遍历）。区别于 0/1 背包需要倒序，完全背包正序是为了允许同一枚硬币被多次使用。

**代码**：

```js
/**
 * @param {number[]} coins
 * @param {number} amount
 * @return {number}
 */
var coinChange = function (coins, amount) {
  // dp[i] = 凑成金额 i 所需最少硬币数
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0; // 凑成 0 元需要 0 枚

  // 完全背包：正序遍历，允许同一硬币重复使用
  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i && dp[i - coin] !== Infinity) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
};
```

**复杂度**：时间 O(amount × n) | 空间 O(amount)

---

### [300] 最长递增子序列 ⭐ Medium

**题目描述**：给你一个整数数组 nums，找到其中最长严格递增子序列的长度。子序列是由数组派生而来的序列，删除（或不删除）数组中的元素而不改变其余元素的顺序。

**自测用例**：

- 输入: nums = [10,9,2,5,3,7,101,18] → 输出: 4（[2,3,7,101]）
- 输入: nums = [0,1,0,3,2,3] → 输出: 4
- 输入: nums = [7,7,7,7,7,7,7] → 输出: 1

🔗 https://leetcode.cn/problems/longest-increasing-subsequence/

**思路**：dp[i] 表示以 nums[i] 结尾的最长递增子序列长度。对每个 i，往前找所有 j < i 且 nums[j] < nums[i] 的位置，取 dp[j]+1 的最大值。递推方向：从左到右，每个位置依赖其左侧所有位置的结果。最终答案是 dp 数组的最大值（不一定是最后一个）。

**代码**：

```js
/**
 * @param {number[]} nums
 * @return {number}
 */
var lengthOfLIS = function (nums) {
  const n = nums.length;
  if (n === 0) return 0;

  // dp[i] = 以 nums[i] 结尾的 LIS 长度，初始每个元素单独构成长度为 1 的子序列
  const dp = new Array(n).fill(1);

  let maxLen = 1;
  // 从左到右，每个 dp[i] 需要知道所有 j < i 的 dp[j]
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
    maxLen = Math.max(maxLen, dp[i]);
  }

  return maxLen;
};

// 进阶：二分查找优化到 O(n log n)
var lengthOfLISBinary = function (nums) {
  const tails = []; // tails[i] = 长度为 i+1 的递增子序列的最小结尾元素
  for (const num of nums) {
    let lo = 0,
      hi = tails.length;
    // 二分找第一个 >= num 的位置
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < num) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = num; // 替换或追加
  }
  return tails.length;
};
```

**复杂度**：时间 O(n²) 基础版 / O(n log n) 二分优化 | 空间 O(n)

---

### 场景题：手写 flat（数组扁平化）

```js
/**
 * 方法1：递归（经典写法）
 * @param {Array} arr
 * @param {number} depth - 展开深度，默认 Infinity
 */
function flatRecursive(arr, depth = Infinity) {
  const result = [];
  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) {
      // 递归展开，深度减 1
      result.push(...flatRecursive(item, depth - 1));
    } else {
      result.push(item);
    }
  }
  return result;
}

/**
 * 方法2：reduce + 递归（函数式风格）
 */
function flatReduce(arr, depth = Infinity) {
  return arr.reduce((acc, item) => {
    if (Array.isArray(item) && depth > 0) {
      acc.push(...flatReduce(item, depth - 1));
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
}

/**
 * 方法3：迭代（栈，完全展开）
 * 适合深层嵌套，避免递归栈溢出
 */
function flatIterative(arr) {
  const stack = [...arr];
  const result = [];
  while (stack.length) {
    const item = stack.pop(); // 取出末尾
    if (Array.isArray(item)) {
      // 将子数组元素推回栈（注意顺序）
      stack.push(...item);
    } else {
      result.unshift(item); // 头插保持原顺序
    }
  }
  return result;
}

/**
 * 方法4：toString + split（仅适用于纯数字数组，面试偶尔考）
 */
function flatToString(arr) {
  return arr.toString().split(",").map(Number);
}

/**
 * 方法5：JSON + 正则（更通用一些）
 */
function flatJSON(arr) {
  return JSON.parse("[" + JSON.stringify(arr).replace(/\[|\]/g, "") + "]");
}

// 测试
const nested = [1, [2, [3, [4, [5]]]]];
console.log(flatRecursive(nested)); // [1,2,3,4,5]
console.log(flatRecursive(nested, 1)); // [1,2,[3,[4,[5]]]]
console.log(flatReduce(nested, 2)); // [1,2,3,[4,[5]]]
console.log(flatIterative(nested)); // [1,2,3,4,5]
```

---

### 知识点：跨域解决方案

**核心概念**：同源策略（Same-Origin Policy）是浏览器的安全机制，当协议、域名、端口任一不同时，跨域请求被拦截。跨域限制的是**浏览器行为**，服务端之间通信不受限制。

**面试标准答案**：

跨域主要有以下 5 种解决方案：

1. **CORS（跨域资源共享）**：最主流方案，服务端设置响应头允许跨域。
   - 简单请求：服务端返回 `Access-Control-Allow-Origin: *` 或指定域名即可
   - 预检请求（OPTIONS）：非简单请求（PUT/DELETE/自定义Header）浏览器先发 OPTIONS 请求，服务端需额外设置 `Access-Control-Allow-Methods`、`Access-Control-Allow-Headers`
   - 携带 Cookie：需设置 `Access-Control-Allow-Credentials: true` 且 Origin 不能为 `*`

2. **JSONP**：利用 `<script>` 标签不受同源限制的特性，动态创建 script 标签请求，服务端返回函数调用形式的 JS 代码。
   - 缺点：只支持 GET 请求；有 XSS 风险；需要服务端配合

3. **Nginx 反向代理**：前端和 Nginx 同源，Nginx 将请求转发到后端服务。对前端完全透明，是生产中最常用的方案。

   ```nginx
   location /api/ {
     proxy_pass http://backend-server/;
   }
   ```

4. **postMessage**：用于跨窗口（iframe/popup）通信，不是用于 Ajax 跨域。

   ```js
   // 发送方
   otherWindow.postMessage("hello", "https://target.com");
   // 接收方
   window.addEventListener("message", (e) => {
     if (e.origin === "https://source.com") {
       /* 处理 */
     }
   });
   ```

5. **WebSocket**：WebSocket 协议不受同源策略限制，天然支持跨域。

**常见追问**：

Q: CORS 和 JSONP 的区别？

A: CORS 支持所有 HTTP 方法（GET/POST/PUT/DELETE），更安全，是标准方案；JSONP 只支持 GET，通过 script 标签绕过限制，较老的兼容方案。

Q: 简单请求和预检请求的区别？

A: 简单请求满足：方法为 GET/POST/HEAD，Content-Type 为 text/plain、multipart/form-data 或 application/x-www-form-urlencoded，无自定义 Header。否则浏览器先发 OPTIONS 预检请求确认服务器允许后再发实际请求。

Q: Nginx 代理和 CORS 怎么选？

A: 前后端分离项目生产环境优先 Nginx 代理（更安全、隐藏后端地址）；纯前端调用第三方 API 必须用 CORS；开发环境用 webpack devServer 的 proxy 配置。

---
