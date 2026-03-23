# Week 2 完整题解 — Day 8~11

> 3周算法冲刺计划（2026-03-07 ~ 03-27）
> Week 2 涵盖：DP 基础/进阶 + 回溯基础/去重

---

## Day 8 — DP 基础（背包）

### [70] 爬楼梯 ⭐ Easy

**思路**：每次可以爬1或2阶，到达第n阶的方案数 = 到达第n-1阶的方案数 + 到达第n-2阶的方案数，是典型的 Fibonacci 数列。递推方向：从左到右（从小状态推到大状态），因为 dp[i] 依赖 dp[i-1] 和 dp[i-2]，必须先算小的。

**代码**：
```js
/**
 * @param {number} n
 * @return {number}
 */
var climbStairs = function(n) {
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
var climbStairsOpt = function(n) {
  if (n <= 2) return n;
  let prev2 = 1, prev1 = 2;
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

**思路**：相邻房屋不能同时偷，对于第 i 间房，选择偷（dp[i-2] + nums[i]）或不偷（dp[i-1]），取较大值。递推方向：从左到右，因为 dp[i] 依赖前两个状态，必须从小到大计算。

**代码**：
```js
/**
 * @param {number[]} nums
 * @return {number}
 */
var rob = function(nums) {
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

**思路**：完全背包问题，每种硬币可以重复使用。dp[i] 表示凑成金额 i 所需的最少硬币数，初始化 dp[0]=0，其余为 Infinity。递推方向：从左到右（完全背包，物品可重复使用，正序遍历）。区别于 0/1 背包需要倒序，完全背包正序是为了允许同一枚硬币被多次使用。

**代码**：
```js
/**
 * @param {number[]} coins
 * @param {number} amount
 * @return {number}
 */
var coinChange = function(coins, amount) {
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

**思路**：dp[i] 表示以 nums[i] 结尾的最长递增子序列长度。对每个 i，往前找所有 j < i 且 nums[j] < nums[i] 的位置，取 dp[j]+1 的最大值。递推方向：从左到右，每个位置依赖其左侧所有位置的结果。最终答案是 dp 数组的最大值（不一定是最后一个）。

**代码**：
```js
/**
 * @param {number[]} nums
 * @return {number}
 */
var lengthOfLIS = function(nums) {
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
var lengthOfLISBinary = function(nums) {
  const tails = []; // tails[i] = 长度为 i+1 的递增子序列的最小结尾元素
  for (const num of nums) {
    let lo = 0, hi = tails.length;
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
  return arr
    .toString()
    .split(',')
    .map(Number);
}

/**
 * 方法5：JSON + 正则（更通用一些）
 */
function flatJSON(arr) {
  return JSON.parse('[' + JSON.stringify(arr).replace(/\[|\]/g, '') + ']');
}

// 测试
const nested = [1, [2, [3, [4, [5]]]]];
console.log(flatRecursive(nested));      // [1,2,3,4,5]
console.log(flatRecursive(nested, 1));   // [1,2,[3,[4,[5]]]]
console.log(flatReduce(nested, 2));      // [1,2,3,[4,[5]]]
console.log(flatIterative(nested));      // [1,2,3,4,5]
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
   otherWindow.postMessage('hello', 'https://target.com');
   // 接收方
   window.addEventListener('message', (e) => {
     if (e.origin === 'https://source.com') { /* 处理 */ }
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

## Day 9 — DP 进阶（子序列）

### [518] 零钱兑换 II ⭐ Medium

**思路**：完全背包求方案数（与 322 的区别：322 求最少硬币数，这里求组合数）。dp[i] 表示凑成金额 i 的组合数，初始 dp[0]=1。外层遍历硬币（物品），内层从小到大遍历金额（完全背包正序）。注意：外层硬币、内层金额的顺序保证每种组合不重复计数（避免 [1,2] 和 [2,1] 被计为两种）。

**代码**：
```js
/**
 * @param {number} amount
 * @param {number[]} coins
 * @return {number}
 */
var change = function(amount, coins) {
  // dp[i] = 凑成金额 i 的组合数
  const dp = new Array(amount + 1).fill(0);
  dp[0] = 1; // 凑成 0 元有 1 种方式（什么都不选）

  // 外层遍历硬币（确保每种硬币只在当前位置使用一次组合视角）
  // 内层正序遍历金额（完全背包，允许重复使用同一硬币）
  for (const coin of coins) {
    for (let i = coin; i <= amount; i++) {
      dp[i] += dp[i - coin];
    }
  }

  return dp[amount];
};
```

**复杂度**：时间 O(n × amount) | 空间 O(amount)

---

### [1143] 最长公共子序列 ⭐ Medium

**思路**：经典二维 DP。dp[i][j] 表示 text1 前 i 个字符与 text2 前 j 个字符的最长公共子序列长度。如果 text1[i-1] === text2[j-1]，则 dp[i][j] = dp[i-1][j-1] + 1；否则取 dp[i-1][j] 和 dp[i][j-1] 的最大值。递推方向：从左到右，从上到下（每个 dp[i][j] 依赖左上、上方、左方三个位置）。

**代码**：
```js
/**
 * @param {string} text1
 * @param {string} text2
 * @return {number}
 */
var longestCommonSubsequence = function(text1, text2) {
  const m = text1.length, n = text2.length;
  // dp[i][j] = text1[0..i-1] 与 text2[0..j-1] 的 LCS 长度
  // 多开一行一列，边界初始化为 0
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        // 字符相同，LCS 长度 +1
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        // 字符不同，取删掉其中一个字符后的较大值
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
};
```

**复杂度**：时间 O(m×n) | 空间 O(m×n)

---

### [72] 编辑距离 ⭐⭐ Hard

**思路**：dp[i][j] 表示将 word1 前 i 个字符转换为 word2 前 j 个字符所需的最少操作数（插入/删除/替换）。当两字符相同时不需要操作，dp[i][j] = dp[i-1][j-1]；否则取三种操作的最小值：替换（dp[i-1][j-1]+1）、删除word1字符（dp[i-1][j]+1）、插入word2字符（dp[i][j-1]+1）。递推方向：从左到右，从上到下，依赖左、上、左上三个状态。

**代码**：
```js
/**
 * @param {string} word1
 * @param {string} word2
 * @return {number}
 */
var minDistance = function(word1, word2) {
  const m = word1.length, n = word2.length;
  // dp[i][j] = word1[0..i-1] 转换为 word2[0..j-1] 的最少操作数
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  // 边界初始化：
  // dp[i][0] = i（word1 前 i 个字符删除 i 次变为空串）
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  // dp[0][j] = j（空串插入 j 次变为 word2 前 j 个字符）
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        // 字符相同，不需要操作
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // 替换：将 word1[i-1] 替换为 word2[j-1]
          dp[i - 1][j] + 1,     // 删除：删除 word1[i-1]
          dp[i][j - 1] + 1      // 插入：在 word1 中插入 word2[j-1]
        );
      }
    }
  }

  return dp[m][n];
};
```

**复杂度**：时间 O(m×n) | 空间 O(m×n)

---

### [10] 正则表达式匹配 ⭐⭐ Hard

**思路**（思路为主）：dp[i][j] 表示 s 的前 i 个字符与 p 的前 j 个字符是否匹配。核心处理 `*` 通配符：`*` 匹配0次则忽略`x*`这两个字符（dp[i][j-2]），`*` 匹配1+次则需要 s[i-1] 与 p[j-2] 能匹配（dp[i-1][j]）。注意 `*` 不能独立出现，必须跟在字符或 `.` 后面。

**代码**：
```js
/**
 * @param {string} s
 * @param {string} p
 * @return {boolean}
 */
var isMatch = function(s, p) {
  const m = s.length, n = p.length;
  // dp[i][j] = s[0..i-1] 是否与 p[0..j-1] 匹配
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(false));
  dp[0][0] = true; // 空串匹配空模式

  // 初始化：空串匹配 "a*b*c*..." 形式的模式
  for (let j = 2; j <= n; j++) {
    if (p[j - 1] === '*') {
      dp[0][j] = dp[0][j - 2]; // x* 匹配 0 次
    }
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (p[j - 1] === '*') {
        // * 匹配 0 次：忽略 p[j-2] 和 p[j-1]（即 x*）
        dp[i][j] = dp[i][j - 2];
        // * 匹配 1+ 次：需要 s[i-1] 能和 p[j-2] 匹配
        if (p[j - 2] === '.' || p[j - 2] === s[i - 1]) {
          dp[i][j] = dp[i][j] || dp[i - 1][j];
        }
      } else if (p[j - 1] === '.' || p[j - 1] === s[i - 1]) {
        // 普通字符或 . 匹配：取左上角状态
        dp[i][j] = dp[i - 1][j - 1];
      }
    }
  }

  return dp[m][n];
};
```

**复杂度**：时间 O(m×n) | 空间 O(m×n)

---

### 场景题：手写 Promise.allSettled / Promise.any / Promise.race

```js
/**
 * Promise.allSettled - 等待所有 Promise 完成（无论成功失败），返回结果数组
 * 每个结果为 { status: 'fulfilled', value } 或 { status: 'rejected', reason }
 */
Promise.myAllSettled = function(promises) {
  return new Promise((resolve) => {
    const results = [];
    let count = 0;
    const total = promises.length;

    // 边界：空数组直接 resolve
    if (total === 0) {
      resolve([]);
      return;
    }

    promises.forEach((p, i) => {
      // 用 Promise.resolve 包裹，兼容非 Promise 值
      Promise.resolve(p).then(
        (value) => {
          results[i] = { status: 'fulfilled', value };
          if (++count === total) resolve(results);
        },
        (reason) => {
          results[i] = { status: 'rejected', reason };
          if (++count === total) resolve(results);
        }
      );
    });
  });
};

/**
 * Promise.any - 返回第一个成功的 Promise，全部失败则 reject AggregateError
 */
Promise.myAny = function(promises) {
  return new Promise((resolve, reject) => {
    const errors = [];
    let rejectedCount = 0;
    const total = promises.length;

    if (total === 0) {
      reject(new AggregateError([], 'All promises were rejected'));
      return;
    }

    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        (value) => {
          // 第一个成功就 resolve（后续的成功会被忽略，Promise 状态已定）
          resolve(value);
        },
        (reason) => {
          errors[i] = reason;
          // 只有全部失败才 reject
          if (++rejectedCount === total) {
            reject(new AggregateError(errors, 'All promises were rejected'));
          }
        }
      );
    });
  });
};

/**
 * Promise.race - 返回第一个完成（无论成功失败）的 Promise 的结果
 */
Promise.myRace = function(promises) {
  return new Promise((resolve, reject) => {
    // 边界：空数组永远 pending（符合规范）
    promises.forEach((p) => {
      // 第一个 settle 的 Promise 决定最终结果
      // 之后的 resolve/reject 调用会被忽略（Promise 状态不可逆）
      Promise.resolve(p).then(resolve, reject);
    });
  });
};

// 测试
const p1 = new Promise((res) => setTimeout(() => res(1), 100));
const p2 = new Promise((_, rej) => setTimeout(() => rej('error'), 200));
const p3 = new Promise((res) => setTimeout(() => res(3), 300));

Promise.myAllSettled([p1, p2, p3]).then(console.log);
// [{status:'fulfilled',value:1}, {status:'rejected',reason:'error'}, {status:'fulfilled',value:3}]

Promise.myAny([p2, p1]).then(console.log); // 1（p1 先成功）
Promise.myRace([p1, p2, p3]).then(console.log); // 1（p1 最先完成）
```

---

### 知识点：TCP 三次握手四次挥手

**核心概念**：TCP 是面向连接的可靠传输协议，连接建立需要三次握手，连接关闭需要四次挥手。

**面试标准答案**：

**三次握手（建立连接）**：
```
客户端                    服务端
  |  ----SYN(seq=x)---->  |   第一次：客户端发送 SYN，进入 SYN_SENT 状态
  |  <--SYN+ACK(ack=x+1)- |   第二次：服务端回 SYN+ACK，进入 SYN_RCVD 状态
  |  ----ACK(ack=y+1)----> |   第三次：客户端发送 ACK，双方进入 ESTABLISHED 状态
```

为什么需要三次？两次握手无法确认客户端接收能力，服务端可能对已失效的连接请求建立连接浪费资源；三次握手是确认双方发送和接收能力都正常的最少次数。

**四次挥手（关闭连接）**：
```
主动方                    被动方
  |  ----FIN(seq=u)----->  |   第一次：主动方发送 FIN，进入 FIN_WAIT_1
  |  <-----ACK----------   |   第二次：被动方确认，进入 CLOSE_WAIT；主动方进入 FIN_WAIT_2
  |  (被动方处理剩余数据)    |
  |  <-----FIN----------   |   第三次：被动方发送 FIN，进入 LAST_ACK
  |  ------ACK-----------> |   第四次：主动方发送 ACK，进入 TIME_WAIT（等待 2MSL）
```

为什么四次不是三次？因为 TCP 是全双工的，关闭需要双方各自发送 FIN。收到对方 FIN 只表示对方不再发送数据，但本方可能还有数据未发完，所以 ACK 和 FIN 不能合并（而握手时 SYN+ACK 可以合并是因为服务端没有额外数据要发）。

为什么 TIME_WAIT 需要等待 2MSL？确保被动方能收到最后一个 ACK；让本次连接的残留报文在网络中消散，防止影响下一次连接。

**常见追问**：

Q: 为什么握手两次不够？

A: 两次握手服务端无法确认客户端收到了 SYN+ACK，如果客户端的 SYN 延迟重传，服务端会误认为是新连接请求，造成资源浪费。

Q: SYN 洪泛攻击原理？

A: 攻击者发大量 SYN 但不回 ACK，服务端维护大量半连接（SYN_RCVD），耗尽连接队列。防御：SYN Cookie（无需维护半连接状态）、限制 SYN 频率。

Q: close_wait 过多的原因？

A: 被动方（服务端）收到 FIN 后没有及时调用 close() 关闭连接，通常是代码 bug（未正确关闭连接）或处理速度跟不上。

---

## Day 10 — 回溯基础

### [46] 全排列 ⭐ Medium

**思路**：回溯经典题。用 used 数组标记哪些元素已被使用，每次从所有未使用的元素中选一个加入路径，递归到路径长度等于 nums.length 时收集结果。回溯时撤销选择（used[i]=false）。

**代码**：
```js
/**
 * @param {number[]} nums
 * @return {number[][]}
 */
var permute = function(nums) {
  const result = [];
  const path = [];
  const used = new Array(nums.length).fill(false);

  function backtrack() {
    // 终止条件：路径长度等于数组长度
    if (path.length === nums.length) {
      result.push([...path]); // 注意要拷贝，不能直接 push path
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue; // 已使用，跳过
      // 做选择
      used[i] = true;
      path.push(nums[i]);
      // 递归
      backtrack();
      // 撤销选择（回溯核心）
      path.pop();
      used[i] = false;
    }
  }

  backtrack();
  return result;
};
```

**复杂度**：时间 O(n × n!) | 空间 O(n)

---

### [47] 全排列 II（去重） ⭐ Medium

**思路**：在全排列基础上，nums 有重复元素，需要去重。关键：先排序，然后在同一层递归中，若当前元素与前一个相同且前一个**未被使用**（used[i-1] === false），则跳过（说明是同一层的重复选择）。

去重条件含义：`i > 0 && nums[i] === nums[i-1] && !used[i-1]`
- `!used[i-1]`：前一个元素在当前递归层没有被选（即已被回溯撤销），说明我们在同一层重复选了相同的值，需要跳过
- 如果 `used[i-1] === true`，说明前一个元素在上层被选了，当前是不同的分支，不能跳过

**代码**：
```js
/**
 * @param {number[]} nums
 * @return {number[][]}
 */
var permuteUnique = function(nums) {
  nums.sort((a, b) => a - b); // 排序是去重的前提
  const result = [];
  const path = [];
  const used = new Array(nums.length).fill(false);

  function backtrack() {
    if (path.length === nums.length) {
      result.push([...path]);
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      // 去重：同一层中，相同的元素只选第一个
      // nums[i] === nums[i-1] 且 !used[i-1] 说明 nums[i-1] 在本层已被用过并撤销了
      if (i > 0 && nums[i] === nums[i - 1] && !used[i - 1]) continue;

      used[i] = true;
      path.push(nums[i]);
      backtrack();
      path.pop();
      used[i] = false;
    }
  }

  backtrack();
  return result;
};
```

**复杂度**：时间 O(n × n!) | 空间 O(n)

---

### [39] 组合总和 ⭐ Medium

**思路**：每个元素可以重复使用（完全背包的回溯版本）。关键：为避免重复组合（[2,3] 和 [3,2] 算同一个），使用 start 参数限制每次只能从当前位置往后选，这样保证组合不重复。

**代码**：
```js
/**
 * @param {number[]} candidates
 * @param {number} target
 * @return {number[][]}
 */
var combinationSum = function(candidates, target) {
  const result = [];
  const path = [];

  function backtrack(start, remain) {
    // 终止条件
    if (remain === 0) {
      result.push([...path]);
      return;
    }
    if (remain < 0) return; // 剪枝

    for (let i = start; i < candidates.length; i++) {
      // 剪枝：如果排序后当前元素已经超过剩余值，后面更大的都不用试
      if (candidates[i] > remain) break;

      path.push(candidates[i]);
      // 关键：i 不变（同一元素可重复使用），但不能往前选
      backtrack(i, remain - candidates[i]);
      path.pop();
    }
  }

  candidates.sort((a, b) => a - b); // 排序方便剪枝
  backtrack(0, target);
  return result;
};
```

**复杂度**：时间 O(n × 2^n) | 空间 O(target/min)

---

### [40] 组合总和 II（去重） ⭐ Medium

**思路**：每个元素只能使用一次，但 candidates 可能有重复。去重同样使用 `i > start && candidates[i] === candidates[i-1]` 跳过同层重复选择。注意这里是 `i > start` 而不是 `i > 0`，因为是 start 作为当前层的起始位置。

去重条件含义：`i > start && candidates[i] === candidates[i-1]`
- `i > start`：不是当前层的第一个元素（第一个不跳过，因为可能是上一层选了不同元素后的合法分支）
- `candidates[i] === candidates[i-1]`：与上一个相同，在同一层会产生重复结果

**代码**：
```js
/**
 * @param {number[]} candidates
 * @param {number} target
 * @return {number[][]}
 */
var combinationSum2 = function(candidates, target) {
  candidates.sort((a, b) => a - b); // 排序是去重的前提
  const result = [];
  const path = [];

  function backtrack(start, remain) {
    if (remain === 0) {
      result.push([...path]);
      return;
    }

    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remain) break; // 剪枝

      // 去重：同一层中跳过重复元素
      // i > start 表示不是本层第一个，避免跳过不同父路径下相同值的合法情况
      if (i > start && candidates[i] === candidates[i - 1]) continue;

      path.push(candidates[i]);
      // 关键：i+1 开始（每个元素只用一次）
      backtrack(i + 1, remain - candidates[i]);
      path.pop();
    }
  }

  backtrack(0, target);
  return result;
};
```

**复杂度**：时间 O(2^n) | 空间 O(n)

---

### 场景题：手写 async/await（用 Generator 实现）

```js
/**
 * 用 Generator 实现 async/await 的核心机制
 *
 * async/await 本质上是 Generator + 自动执行器（runner）的语法糖
 * Generator 函数执行到 yield 时暂停，由执行器在 Promise resolve 后恢复执行
 */

/**
 * 自动执行 Generator 函数的 runner
 * @param {GeneratorFunction} genFn - generator 函数
 * @returns {Promise}
 */
function asyncRunner(genFn) {
  return new Promise((resolve, reject) => {
    const gen = genFn(); // 创建 generator 迭代器

    function step(nextFn) {
      let result;
      try {
        result = nextFn(); // 执行 gen.next(value) 或 gen.throw(err)
      } catch (err) {
        // generator 内部抛出的同步错误
        reject(err);
        return;
      }

      if (result.done) {
        // generator 执行完毕，resolve 最终返回值
        resolve(result.value);
        return;
      }

      // result.value 是 yield 右边的值（通常是 Promise）
      Promise.resolve(result.value).then(
        (value) => {
          // Promise resolve 后，把值传回 generator（作为 yield 表达式的值）
          step(() => gen.next(value));
        },
        (err) => {
          // Promise reject 后，向 generator 抛出错误（触发 try/catch）
          step(() => gen.throw(err));
        }
      );
    }

    step(() => gen.next(undefined)); // 启动执行
  });
}

// 使用示例：等价于 async/await 写法
function fetchUser(id) {
  return new Promise((res) => setTimeout(() => res({ id, name: 'Alice' }), 100));
}

function fetchPosts(userId) {
  return new Promise((res) => setTimeout(() => res([`Post by ${userId}`]), 100));
}

// Generator 写法
function* main() {
  const user = yield fetchUser(1);     // 等价于 await fetchUser(1)
  console.log('user:', user);
  const posts = yield fetchPosts(user.id); // 等价于 await fetchPosts(user.id)
  console.log('posts:', posts);
  return posts;
}

// 运行
asyncRunner(main).then((result) => console.log('done:', result));

// 对比：async/await 写法
async function mainAsync() {
  const user = await fetchUser(1);
  const posts = await fetchPosts(user.id);
  return posts;
}

/**
 * 关键点总结：
 * 1. yield 暂停执行，gen.next(value) 恢复并传入 resolved 值
 * 2. gen.throw(err) 让 generator 内部抛出异常，可以被 try/catch 捕获
 * 3. 执行器递归调用 step，直到 result.done === true
 * 4. 整个过程包裹在 Promise 中，支持外部 await
 */
```

---

### 知识点：HTTPS 与 TLS

**核心概念**：HTTPS = HTTP + TLS（或 SSL）。TLS 在传输层提供加密、身份验证和数据完整性保护。

**面试标准答案**：

**TLS 握手过程（TLS 1.2 简化版）**：
```
客户端                              服务端
  |  --Client Hello(随机数A)-------->  |   支持的加密套件、TLS版本
  |  <-Server Hello(随机数B)---------  |   选定的加密套件
  |  <-Certificate(证书)-------------  |   包含服务端公钥
  |  <-Server Hello Done-------------  |
  |  --Client Key Exchange(预主密钥)--> |   用服务端公钥加密的预主密钥
  |  --Change Cipher Spec----------->  |   通知后续用协商的密钥加密
  |  --Finished(加密验证消息)-------->  |
  |  <-Change Cipher Spec-----------   |
  |  <-Finished(加密验证消息)--------   |
  |  ====== 开始加密通信 ======        |
```

双方用「随机数A + 随机数B + 预主密钥」通过 PRF 算法生成**会话密钥**（对称加密），后续通信用对称加密（快速）。

**为什么需要 CA 证书**：

防止中间人攻击（MITM）。服务端发来的公钥可能被替换，客户端需要**可信第三方（CA）来证明这个公钥确实属于这个域名**。

CA 证书验证链：
1. 服务端发送证书（含公钥 + CA 签名）
2. 客户端用操作系统内置的**根 CA 公钥**验证证书签名
3. 签名合法 → 证书可信 → 公钥可信 → 连接可信

如果没有 CA，攻击者可以伪造公钥，客户端无法分辨真假服务端。

**HTTPS 为什么快？**：TLS 握手后使用对称加密（AES），只有握手阶段才用非对称加密（RSA/ECDH），因为非对称加密计算代价大。

**常见追问**：

Q: TLS 1.3 和 1.2 的区别？

A: TLS 1.3 握手从 2-RTT 优化到 1-RTT（甚至 0-RTT 恢复连接），移除了 RSA 密钥交换（强制前向保密），废弃了 SHA-1、RC4 等弱算法。

Q: 为什么 HTTP/2 一般要 HTTPS？

A: 主流浏览器只对 HTTPS 支持 HTTP/2（ALPN 协议协商），明文 HTTP 无法使用 HTTP/2 的多路复用特性。

Q: 对称加密和非对称加密分别用在哪？

A: 握手阶段：非对称加密（RSA/ECDH）交换密钥材料；数据传输阶段：对称加密（AES-GCM）保证效率；消息摘要（HMAC）保证完整性。

---

## Day 11 — 回溯去重

### [78] 子集 ⭐ Medium

**思路**：求所有子集，包括空集。与组合类似，用 start 避免重复，但每次进入递归时就收集当前路径（不等到终止条件才收集）。递推方向：每个元素二选一（选或不选），因此共有 2^n 个子集。

**代码**：
```js
/**
 * @param {number[]} nums
 * @return {number[][]}
 */
var subsets = function(nums) {
  const result = [];
  const path = [];

  function backtrack(start) {
    // 每次进来都收集（不管是否"完成"）
    result.push([...path]);

    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);
      backtrack(i + 1); // i+1 保证不重复选
      path.pop();
    }
  }

  backtrack(0);
  return result;
};
```

**复杂度**：时间 O(n × 2^n) | 空间 O(n)

---

### [90] 子集 II（去重） ⭐ Medium

**思路**：在子集基础上，nums 有重复元素。先排序，然后在同一层中跳过重复元素：`i > start && nums[i] === nums[i-1]`。去重条件与 [40] 完全相同，理解记住一个就够了。

**代码**：
```js
/**
 * @param {number[]} nums
 * @return {number[][]}
 */
var subsetsWithDup = function(nums) {
  nums.sort((a, b) => a - b); // 排序是去重的前提
  const result = [];
  const path = [];

  function backtrack(start) {
    result.push([...path]); // 每次都收集

    for (let i = start; i < nums.length; i++) {
      // 去重：同一层中，跳过与上一个相同的元素
      // i > start 保证只在同层去重（不影响不同父路径下的合法分支）
      if (i > start && nums[i] === nums[i - 1]) continue;

      path.push(nums[i]);
      backtrack(i + 1);
      path.pop();
    }
  }

  backtrack(0);
  return result;
};
```

**复杂度**：时间 O(n × 2^n) | 空间 O(n)

---

### [131] 分割回文串 ⭐ Medium

**思路**：回溯 + 回文判断。对字符串从 start 位置开始，尝试所有可能的切割点，如果 s[start..i] 是回文则加入路径，继续从 i+1 开始递归；到达字符串末尾时收集结果。可以预处理 DP 判断任意子串是否是回文，避免重复计算。

**代码**：
```js
/**
 * @param {string} s
 * @return {string[][]}
 */
var partition = function(s) {
  const n = s.length;
  const result = [];
  const path = [];

  // 预处理：dp[i][j] = s[i..j] 是否是回文
  const isPalin = Array.from({ length: n }, () => new Array(n).fill(false));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i; j < n; j++) {
      if (s[i] === s[j] && (j - i <= 2 || isPalin[i + 1][j - 1])) {
        isPalin[i][j] = true;
      }
    }
  }

  function backtrack(start) {
    if (start === n) {
      result.push([...path]);
      return;
    }
    for (let i = start; i < n; i++) {
      // 如果 s[start..i] 是回文，才继续
      if (!isPalin[start][i]) continue;
      path.push(s.slice(start, i + 1));
      backtrack(i + 1);
      path.pop();
    }
  }

  backtrack(0);
  return result;
};
```

**复杂度**：时间 O(n × 2^n) | 空间 O(n²)

---

### [51] N 皇后 ⭐⭐ Hard

**思路**：经典回溯。逐行放皇后，每行选一列，验证当前位置与已放皇后不冲突（同列、主对角线、副对角线）。用三个 Set 分别记录已占用的列、主对角线（row-col 相同）、副对角线（row+col 相同），O(1) 判断冲突。

**代码**：
```js
/**
 * @param {number} n
 * @return {string[][]}
 */
var solveNQueens = function(n) {
  const result = [];
  const queens = new Array(n).fill(-1); // queens[row] = col，记录每行皇后的列
  const cols = new Set();        // 已占用的列
  const diag1 = new Set();       // 已占用的主对角线（row - col）
  const diag2 = new Set();       // 已占用的副对角线（row + col）

  function backtrack(row) {
    if (row === n) {
      // 收集结果：将 queens 数组转换为棋盘字符串
      const board = queens.map((col) =>
        '.'.repeat(col) + 'Q' + '.'.repeat(n - col - 1)
      );
      result.push(board);
      return;
    }

    for (let col = 0; col < n; col++) {
      // 判断当前位置是否合法
      if (cols.has(col) || diag1.has(row - col) || diag2.has(row + col)) {
        continue;
      }
      // 放置皇后
      queens[row] = col;
      cols.add(col);
      diag1.add(row - col);
      diag2.add(row + col);
      // 下一行
      backtrack(row + 1);
      // 撤销
      queens[row] = -1;
      cols.delete(col);
      diag1.delete(row - col);
      diag2.delete(row + col);
    }
  }

  backtrack(0);
  return result;
};
```

**复杂度**：时间 O(n!) | 空间 O(n)

---

### 场景题：手写虚拟 DOM diff 算法（简化版）

```js
/**
 * 虚拟 DOM diff 算法（简化版）
 *
 * 核心原则：
 * 1. 同层比较（不跨层级比较）
 * 2. key 相同才复用节点（否则销毁重建）
 * 3. 类型不同直接替换
 */

/**
 * VNode 结构
 * @typedef {{ type: string, key?: string, props?: object, children?: VNode[]|string, el?: Element }} VNode
 */

/**
 * 创建真实 DOM
 */
function createElement(vnode) {
  if (typeof vnode === 'string' || typeof vnode === 'number') {
    return document.createTextNode(String(vnode));
  }

  const el = document.createElement(vnode.type);
  vnode.el = el; // 保存引用，方便后续 diff

  // 设置属性
  if (vnode.props) {
    for (const [key, value] of Object.entries(vnode.props)) {
      if (key.startsWith('on')) {
        // 事件处理
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        el.setAttribute(key, value);
      }
    }
  }

  // 递归创建子节点
  if (vnode.children) {
    if (typeof vnode.children === 'string') {
      el.textContent = vnode.children;
    } else {
      vnode.children.forEach((child) => el.appendChild(createElement(child)));
    }
  }

  return el;
}

/**
 * 核心 diff 函数：比较新旧 VNode，更新真实 DOM
 * @param {Element} parent - 父节点
 * @param {VNode} oldVNode - 旧虚拟节点
 * @param {VNode} newVNode - 新虚拟节点
 */
function patch(parent, oldVNode, newVNode) {
  // Case 1：旧节点不存在，挂载新节点
  if (!oldVNode) {
    parent.appendChild(createElement(newVNode));
    return;
  }

  // Case 2：新节点不存在，卸载旧节点
  if (!newVNode) {
    parent.removeChild(oldVNode.el);
    return;
  }

  // Case 3：文本节点比较
  if (typeof newVNode === 'string' || typeof oldVNode === 'string') {
    if (oldVNode !== newVNode) {
      const newEl = createElement(newVNode);
      parent.replaceChild(newEl, oldVNode.el || parent.firstChild);
    }
    return;
  }

  // Case 4：类型不同，直接替换（key 不同也视为不同）
  if (oldVNode.type !== newVNode.type || oldVNode.key !== newVNode.key) {
    const newEl = createElement(newVNode);
    parent.replaceChild(newEl, oldVNode.el);
    return;
  }

  // Case 5：同类型节点，复用 DOM，更新属性和子节点
  const el = (newVNode.el = oldVNode.el); // 复用真实 DOM

  // 更新 props
  patchProps(el, oldVNode.props || {}, newVNode.props || {});

  // 更新子节点
  patchChildren(el, oldVNode.children, newVNode.children);
}

/**
 * 更新属性
 */
function patchProps(el, oldProps, newProps) {
  // 添加/更新新属性
  for (const [key, value] of Object.entries(newProps)) {
    if (oldProps[key] !== value) {
      if (key.startsWith('on')) {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        el.setAttribute(key, value);
      }
    }
  }
  // 删除已不存在的旧属性
  for (const key of Object.keys(oldProps)) {
    if (!(key in newProps)) {
      el.removeAttribute(key);
    }
  }
}

/**
 * 更新子节点 - 带 key 的同层 diff
 * 这是 diff 最核心的部分：通过 key 找到可复用的节点，最小化 DOM 操作
 */
function patchChildren(el, oldChildren = [], newChildren = []) {
  if (typeof oldChildren === 'string' || typeof newChildren === 'string') {
    // 文本子节点直接更新
    if (oldChildren !== newChildren) {
      el.textContent = String(newChildren);
    }
    return;
  }

  // 建立旧子节点的 key -> vnode 映射，O(1) 查找
  const oldKeyMap = new Map();
  oldChildren.forEach((child, i) => {
    if (child.key != null) {
      oldKeyMap.set(child.key, { vnode: child, index: i });
    }
  });

  const newLen = newChildren.length;
  const patched = new Set(); // 记录已复用的旧节点索引

  // 遍历新子节点
  newChildren.forEach((newChild, newIdx) => {
    if (newChild.key != null && oldKeyMap.has(newChild.key)) {
      // 有 key 且找到对应旧节点：复用并 diff
      const { vnode: oldChild } = oldKeyMap.get(newChild.key);
      patched.add(newChild.key);
      patch(el, oldChild, newChild);
      // 调整 DOM 位置（简化：直接按新顺序移动）
      el.appendChild(oldChild.el); // 移动到末尾（实际需要更精确的位置计算）
    } else {
      // 没有 key 或找不到：按索引比较（降级策略）
      const oldChild = oldChildren[newIdx];
      patch(el, oldChild, newChild);
    }
  });

  // 删除新节点中不存在的旧节点（有 key 的）
  oldKeyMap.forEach(({ vnode }, key) => {
    if (!patched.has(key)) {
      el.removeChild(vnode.el);
    }
  });
}

/**
 * key 的作用：
 * 1. 帮助 diff 算法识别哪些节点可以复用（相同 key = 相同身份）
 * 2. 没有 key 时只能按顺序比较，会导致大量不必要的 DOM 操作
 * 3. 列表渲染中禁止用 index 作 key：当列表顺序变化时，index 对应的节点内容也变了，
 *    diff 算法会误认为可以复用，导致状态错乱
 *
 * 同层比较原则：
 * - Vue/React 都只做同层节点的比较，不跨层级
 * - 跨层级的移动（如把子树挪到另一个父节点）会被当作 删除旧 + 新建新 处理
 * - 这是为了降低算法复杂度（O(n³) → O(n)）
 */
```

---

### 知识点：Webpack 构建流程

**核心概念**：Webpack 是现代前端的模块打包工具，将各种资源（JS/CSS/图片）视为模块，通过依赖图打包为静态资源。

**面试标准答案**：

**构建流程（Entry → Loader → Plugin → Output）**：

```
初始化  →  编译  →  输出
   ↓         ↓        ↓
读配置    构建依赖图  生成bundle
         + Loader
         + Plugin
```

1. **初始化**：读取 webpack.config.js，合并命令行参数，创建 Compiler 对象
2. **Entry**：从入口文件开始，分析依赖，构建模块依赖图（Module Graph）
3. **Loader**：对每个模块应用对应的 Loader 链（从右到左、从下到上执行），将非 JS 资源转换为 JS 模块
4. **Plugin**：在构建生命周期的各个钩子（Hook）节点执行自定义逻辑（压缩、注入HTML等）
5. **Output**：根据配置将打包结果输出到目标目录，生成 bundle 文件

**Loader vs Plugin 的区别**：

| 维度 | Loader | Plugin |
|------|--------|--------|
| 职责 | 文件转换（转译单个文件） | 扩展 Webpack 功能（整个构建过程） |
| 执行时机 | 模块加载时（per-file） | 生命周期钩子（全局） |
| 配置方式 | `module.rules` | `plugins` 数组 |
| 返回值 | 转换后的 JS 代码 | 无（通过 Tapable 钩子操作） |
| 例子 | babel-loader、css-loader | HtmlWebpackPlugin、MiniCssExtractPlugin |

**Tree Shaking**：

基于 ES Module 的静态结构（import/export 在编译时确定），Webpack 分析哪些导出没有被使用，在打包时删除「死代码」。

关键点：
- 只对 ES Module 有效（CommonJS 的 require 是动态的，无法静态分析）
- 需要在 production 模式下开启（设置 `mode: 'production'`）
- 副作用文件需在 package.json 中声明 `"sideEffects": false` 或指定文件列表

**Code Splitting**：

将代码分割为多个 chunk，按需加载，提升首屏速度：
- **入口分割**：配置多个 entry（适合多页应用）
- **动态导入**：`import('./module')` 返回 Promise，Webpack 自动分割（适合路由懒加载）
- **SplitChunks**：`optimization.splitChunks` 自动提取公共模块（如 node_modules → vendor chunk）

**常见追问**：

Q: Loader 为什么从右到左执行？

A: Loader 是函数组合（compose），遵循函数式编程惯例，从右到左相当于 `f(g(h(x)))`，最右边的 Loader 先处理原始文件，最左边的 Loader 输出最终结果。例如 `['style-loader', 'css-loader', 'sass-loader']` 执行顺序是 sass → css → style。

Q: Webpack 和 Vite 的核心区别？

A: Webpack 开发时也需要打包（全量 bundle），冷启动慢。Vite 开发时利用浏览器原生 ESM，不打包直接按需加载模块，冷启动极快；生产构建用 Rollup。

Q: 什么是 Tapable？

A: Webpack 内部的事件流/钩子系统，类似 Node.js 的 EventEmitter。Plugin 通过 `compiler.hooks.xxx.tap()` 在构建生命周期各阶段挂载自定义逻辑，实现对构建过程的扩展。

---

## 总结

| Day | 核心主题 | 算法题数 | 场景题 | 知识点 |
|-----|----------|----------|--------|--------|
| Day 8 | DP 基础（背包） | 4 题 | 手写 flat | 跨域解决方案 |
| Day 9 | DP 进阶（子序列） | 4 题 | Promise 三兄弟 | TCP 握手挥手 |
| Day 10 | 回溯基础 | 4 题 | async/await | HTTPS & TLS |
| Day 11 | 回溯去重 | 4 题 | 虚拟 DOM diff | Webpack 构建流程 |

**DP 核心要点**：
- 完全背包（可重复）→ 正序遍历
- 0/1 背包（不可重复）→ 倒序遍历
- 求最值 → `dp[i] = min/max(选, 不选)`
- 求方案数 → `dp[i] += dp[i-xxx]`

**回溯核心要点**：
- 去重必须先排序
- `i > start && arr[i] === arr[i-1]`：同层去重（组合/子集类）
- `i > 0 && arr[i] === arr[i-1] && !used[i-1]`：全排列去重
- start 参数控制起始位置，避免重复组合

---

## Day 12 — 滑动窗口（03-18）

> 核心模板：双指针维护窗口，左指针收缩条件是关键。

### [209] 长度最小的子数组 ⭐ Medium

**思路**：滑动窗口经典题。维护窗口 `[left, right]`，不断向右扩展 right，累加 sum；当 sum ≥ target 时，记录当前窗口长度，然后收缩 left（减去 nums[left]，left++），继续尝试更短的窗口。整个过程 left、right 各最多移动 n 次，总体 O(n)。

**代码**：
```js
/**
 * @param {number} target
 * @param {number[]} nums
 * @return {number}
 */
var minSubArrayLen = function(target, nums) {
  const n = nums.length;
  let left = 0, sum = 0;
  let ans = Infinity;

  for (let right = 0; right < n; right++) {
    sum += nums[right];
    // 窗口内 sum >= target 时，尝试收缩左边界
    while (sum >= target) {
      ans = Math.min(ans, right - left + 1);
      sum -= nums[left];
      left++;
    }
  }

  return ans === Infinity ? 0 : ans;
};
```

**复杂度**：时间 O(n) | 空间 O(1)

**常见追问**：

Q: 为什么用 while 而不是 if？

A: 收缩 left 后 sum 可能依然 ≥ target，还能继续收缩找更小窗口，所以要循环直到不满足条件为止。

---

### [76] 最小覆盖子串 🔴 Hard

**思路**：经典滑动窗口 + 哈希表计数。用 `need` 记录 t 中每个字符的需求数，用 `window` 记录当前窗口中对应字符的计数，用 `valid` 统计「已满足需求」的字符种数（当 window[c] === need[c] 时 valid++）。扩展 right 直到 valid === need 的 key 数，说明找到一个覆盖子串；然后收缩 left 直到不再满足，记录最短。

**代码**：
```js
/**
 * @param {string} s
 * @param {string} t
 * @return {string}
 */
var minWindow = function(s, t) {
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);

  const window = new Map();
  let left = 0, valid = 0;
  let start = 0, minLen = Infinity;

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    // 扩展右边界
    if (need.has(c)) {
      window.set(c, (window.get(c) || 0) + 1);
      if (window.get(c) === need.get(c)) valid++;
    }

    // 当所有字符都覆盖时，收缩左边界
    while (valid === need.size) {
      // 更新最小窗口
      if (right - left + 1 < minLen) {
        minLen = right - left + 1;
        start = left;
      }
      const d = s[left];
      left++;
      if (need.has(d)) {
        if (window.get(d) === need.get(d)) valid--;
        window.set(d, window.get(d) - 1);
      }
    }
  }

  return minLen === Infinity ? '' : s.substring(start, start + minLen);
};
```

**复杂度**：时间 O(|s| + |t|) | 空间 O(|s| + |t|)

**常见追问**：

Q: valid 的作用是什么，为什么不直接比较 window 和 need？

A: 每次比较两个 Map 的代价是 O(k)（k 为字符种数），而 valid 只需 O(1) 更新和比较，大幅提升效率。

Q: 什么时候 valid++，什么时候 valid--？

A: 只有当某字符恰好从「不足」变「刚好满足」时 valid++（`window[c]` 从 need[c]-1 变为 need[c]）；收缩时若 `window[d] === need[d]`，减掉后会不足，valid--。多出来的字符不影响 valid。

---

### [239] 滑动窗口最大值 🔴 Hard

**思路**：单调递减双端队列（Deque）。队列中存下标，维护单调递减性质（队头始终是当前窗口最大值）。扩展 right 时：
1. 从队尾移除所有小于 `nums[right]` 的元素（它们不可能成为后续窗口的最大值）
2. 将 right 入队
3. 如果队头下标 `<= right - k`，说明已超出窗口，弹出队头
4. 当 `right >= k - 1` 时，队头就是当前窗口最大值

**代码**：
```js
/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number[]}
 */
var maxSlidingWindow = function(nums, k) {
  const n = nums.length;
  const deque = []; // 存下标，单调递减队列
  const result = [];

  for (let right = 0; right < n; right++) {
    // 1. 维护单调性：移除队尾所有小于当前值的下标
    while (deque.length > 0 && nums[deque[deque.length - 1]] <= nums[right]) {
      deque.pop();
    }
    deque.push(right);

    // 2. 移除超出窗口的队头
    if (deque[0] <= right - k) {
      deque.shift();
    }

    // 3. 窗口形成后记录结果
    if (right >= k - 1) {
      result.push(nums[deque[0]]);
    }
  }

  return result;
};
```

**复杂度**：时间 O(n) | 空间 O(k)（每个元素最多入队/出队一次）

**常见追问**：

Q: 为什么队尾移除条件是 `<=` 而不是 `<`？

A: 相等时旧元素也应移除——若两者相等，新元素下标更靠右，旧元素出窗口后新元素依然可以表达最大值，保留旧的无意义且会增加判断复杂度。

Q: 为什么不用最大堆（优先队列）？

A: 最大堆可以做，但移除过期元素时需要懒删除，整体 O(n log n)。单调队列直接 O(n)，更优。

---

### [424] 替换后的最长重复字符 ⭐ Medium

**思路**：滑动窗口变种。维护窗口 `[left, right]`，同时记录窗口内出现次数最多的字符数 `maxCount`。窗口合法条件：`窗口长度 - maxCount <= k`（最多换掉 k 个非主角字符）。若不合法，left 右移（注意：maxCount 不需要重新计算最大值，因为只有更大的 maxCount 才能让窗口扩展）。

**代码**：
```js
/**
 * @param {string} s
 * @param {number} k
 * @return {number}
 */
var characterReplacement = function(s, k) {
  const count = new Array(26).fill(0);
  let left = 0, maxCount = 0, ans = 0;

  for (let right = 0; right < s.length; right++) {
    const idx = s.charCodeAt(right) - 65; // 'A'
    count[idx]++;
    maxCount = Math.max(maxCount, count[idx]);

    // 窗口不合法：需要替换的字符数 > k
    if (right - left + 1 - maxCount > k) {
      count[s.charCodeAt(left) - 65]--;
      left++;
    }

    ans = Math.max(ans, right - left + 1);
  }

  return ans;
};
```

**复杂度**：时间 O(n) | 空间 O(26) = O(1)

**常见追问**：

Q: 为什么 left 右移后不更新 maxCount？

A: 这是一个关键的优化点：我们只关心答案是否能变得更大，而 maxCount 只有变大时窗口才能扩展。left 右移只是维持窗口大小不变（不缩小），不需要精确跟踪当前最大值，答案不会因此错误。

---

### 场景题：手写 LRU 缓存（Map + 双向链表）

**思路**：LRU（Least Recently Used）最近最少使用缓存。核心要求：get/put 都是 O(1)。

- **哈希表**：O(1) 查找节点
- **双向链表**：O(1) 删除/插入节点，维护访问顺序（头部 = 最近使用，尾部 = 最久未使用）
- 每次 get/put 都把节点移到链表头部；超容量时删除尾部节点

**代码**：
```js
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map(); // key -> node

    // 哑节点（dummy）简化边界处理
    this.head = { key: 0, val: 0, prev: null, next: null }; // 最近使用端
    this.tail = { key: 0, val: 0, prev: null, next: null }; // 最久未使用端
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  // 从链表中移除节点
  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  // 插入到链表头部（head 之后）
  _insertToHead(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  /**
   * @param {number} key
   * @return {number}
   */
  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    // 移到头部（最近使用）
    this._remove(node);
    this._insertToHead(node);
    return node.val;
  }

  /**
   * @param {number} key
   * @param {number} value
   * @return {void}
   */
  put(key, value) {
    if (this.map.has(key)) {
      // 更新已有节点
      const node = this.map.get(key);
      node.val = value;
      this._remove(node);
      this._insertToHead(node);
    } else {
      // 插入新节点
      const node = { key, val: value, prev: null, next: null };
      this.map.set(key, node);
      this._insertToHead(node);

      // 超容量：删除尾部节点
      if (this.map.size > this.capacity) {
        const lruNode = this.tail.prev; // 最久未使用
        this._remove(lruNode);
        this.map.delete(lruNode.key);
      }
    }
  }
}

// 测试
const lru = new LRUCache(2);
lru.put(1, 1);   // {1:1}
lru.put(2, 2);   // {1:1, 2:2}
lru.get(1);      // 返回 1，顺序变为 {2:2, 1:1}（1 最近使用）
lru.put(3, 3);   // 超容量，淘汰 2，{1:1, 3:3}
lru.get(2);      // 返回 -1（已淘汰）
lru.put(4, 4);   // 超容量，淘汰 1（最久未使用），{3:3, 4:4}
lru.get(1);      // 返回 -1
lru.get(3);      // 返回 3
lru.get(4);      // 返回 4
```

**复杂度**：get/put 均 O(1)

**追问**：

Q: 为什么不直接用 JS 的 Map 实现 LRU？

A: JS 的 Map 是有序的（按插入顺序），可以用 Map 模拟 LRU：get 时删掉再重新 set（移到末尾），put 超容量时删掉 `map.keys().next().value`（最老的 key）。这是一个取巧写法，面试中可提，但手写链表更能展示对数据结构的理解。

```js
// Map 取巧版
class LRUCacheSimple {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val); // 移到末尾
    return val;
  }
  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      this.map.delete(this.map.keys().next().value); // 删最老
    }
  }
}
```

---

### 知识点：React Fiber 架构

**背景**：React 15 的 Stack Reconciler 是同步递归的，一旦开始更新就无法中断，长列表渲染会导致主线程被占用，造成卡帧（丢帧 > 16ms）。React 16 引入 Fiber 架构重写了协调器，核心目标：**可中断渲染 + 优先级调度**。

**Fiber 是什么**：

Fiber 是一种链表结构的虚拟 DOM 节点，每个组件对应一个 Fiber 节点：

```js
// Fiber 节点的核心字段（简化）
{
  type,           // 组件类型（'div' / MyComponent / ...)
  key,            // diff key
  stateNode,      // 对应的真实 DOM 或组件实例

  // 链表指针
  return,         // 父节点
  child,          // 第一个子节点
  sibling,        // 下一个兄弟节点

  // 工作状态
  pendingProps,   // 新 props
  memoizedProps,  // 已生效的 props
  memoizedState,  // 已生效的 state
  flags,          // 副作用标记（Placement / Update / Deletion）
  lanes,          // 优先级通道（Lane 模型）
}
```

**两棵树：current 树 & workInProgress 树**：

React 维护两棵 Fiber 树：
- **current 树**：当前渲染在屏幕上的状态
- **workInProgress 树**：正在构建的新状态（可被中断和重建）

更新完成后，`workInProgress` 树变成新的 `current` 树（指针交换，称为 double buffering 双缓冲）。

**三个阶段**：

```
触发更新
   ↓
①  Schedule（调度）  ← Scheduler：根据优先级决定何时执行
   ↓
②  Render/Reconcile（协调，可中断）
   - beginWork：向下遍历，构建 workInProgress 树，标记 flags
   - completeWork：向上回溯，收集副作用链表
   ↓
③  Commit（提交，不可中断，同步执行）
   - Before Mutation：执行 getSnapshotBeforeUpdate
   - Mutation：操作真实 DOM（插入/更新/删除）
   - Layout：执行 useLayoutEffect / componentDidMount/Update
```

**时间切片（Time Slicing）**：

Render 阶段利用 `MessageChannel`（模拟 requestIdleCallback）将长任务切割为 5ms 的小片。每执行完一个 Fiber 节点后检查时间是否用完：
- 时间未用完：继续处理下一个 Fiber
- 时间用完：暂停，将控制权交还给浏览器（处理用户输入、动画等），下一帧继续

```
主线程时间轴：
[render 5ms] → [浏览器处理] → [render 5ms] → [浏览器处理] → ... → [commit]
```

**优先级调度（Lane 模型）**：

React 18 用 Lane 模型替代了早期的 expirationTime，用二进制位表示优先级，支持批处理：

| 优先级 | 场景 | Lane |
|--------|------|------|
| SyncLane（同步） | `flushSync`、受控输入 | 最高 |
| InputContinuousLane | 连续用户输入（scroll/drag） | 高 |
| DefaultLane | 普通 setState | 中 |
| TransitionLane | `startTransition` | 低 |
| IdleLane | 后台任务 | 最低 |

`startTransition` 将状态更新标记为低优先级 Transition，紧急更新（如输入）可以打断它，从而保持 UI 响应。

**可中断渲染示例**：

```jsx
import { startTransition, useState } from 'react';

function SearchResults() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleChange = (e) => {
    // 紧急更新：立刻更新输入框（SyncLane）
    setQuery(e.target.value);

    // 非紧急更新：搜索结果可以延迟（TransitionLane）
    startTransition(() => {
      setResults(heavySearch(e.target.value));
    });
  };

  return (
    <>
      <input value={query} onChange={handleChange} />
      <ResultList results={results} />
    </>
  );
}
```

**常见追问**：

Q: Fiber 架构中 Render 阶段为什么可以中断，Commit 阶段为什么不能？

A: Render 阶段只是在内存中构建 workInProgress 树，没有实际 DOM 操作，中断后可以从断点重新开始（或丢弃重做），不影响用户看到的界面。Commit 阶段要实际操作 DOM，必须一次性完成，否则会出现 DOM 状态不一致（用户看到半更新的界面）。

Q: useEffect 和 useLayoutEffect 的区别？

A: 两者都在 Commit 阶段执行，但时机不同：`useLayoutEffect` 在 Mutation 阶段完成后、浏览器 Paint 之前同步执行（可以读取 DOM 布局）；`useEffect` 在 Paint 之后异步执行（不阻塞渲染）。大多数场景用 `useEffect`，只有需要在绘制前同步读取/修改 DOM 时才用 `useLayoutEffect`。

Q: React 18 的并发特性有哪些？

A: 主要有：`startTransition`（标记低优先级更新）、`useDeferredValue`（延迟非紧急值）、`Suspense` 流式 SSR、自动批处理（Automatic Batching，setTimeout/Promise 内的多次 setState 自动合并）。

---

## Day 13 — 链表进阶（03-19）

> 链表操作核心：画图理清指针顺序，注意 null 边界。

### [25] K 个一组翻转链表 🔴 Hard

**思路**：每次检查从当前位置往后是否有 k 个节点；有则翻转这 k 个节点，然后递归/迭代处理剩余部分。翻转时用哑节点 dummy 简化头节点处理，记录翻转区间的前驱节点 prevGroupTail，将每组翻转后重新连接。

**代码**：
```js
/**
 * @param {ListNode} head
 * @param {number} k
 * @return {ListNode}
 */
var reverseKGroup = function(head, k) {
  const dummy = new ListNode(0, head);
  let prevGroupTail = dummy;

  while (true) {
    // 找到下一组的 kth 节点
    let kth = getKth(prevGroupTail, k);
    if (!kth) break; // 剩余不足 k 个，停止

    const groupHead = prevGroupTail.next;
    const nextGroupHead = kth.next;

    // 翻转 [groupHead, kth] 这 k 个节点
    let prev = nextGroupHead;
    let cur = groupHead;
    while (cur !== nextGroupHead) {
      const next = cur.next;
      cur.next = prev;
      prev = cur;
      cur = next;
    }

    // 重新连接
    prevGroupTail.next = kth;      // 前驱 → 新头（原kth）
    prevGroupTail = groupHead;     // 下一组的前驱 = 原头（翻转后的尾）
  }

  return dummy.next;
};

// 辅助：从 node 往后数 k 步，返回第 k 个节点（不存在返回 null）
function getKth(node, k) {
  while (node && k > 0) {
    node = node.next;
    k--;
  }
  return k === 0 ? node : null;
}
```

**复杂度**：时间 O(n) | 空间 O(1)

**常见追问**：

Q: 如果要求不足 k 个时也翻转，怎么修改？

A: 去掉 `if (!kth) break` 的判断，遇到末尾直接翻转剩余节点即可。

---

### [82] 删除排序链表中的重复元素 II ⭐ Medium

**思路**：删除所有出现超过一次的节点（一个不留）。用哑节点 dummy，prev 指针跟在不重复的节点后面。当发现 `cur.next` 与 `cur` 值相同时，向前跑到重复段末尾，然后让 `prev.next` 跳过整段；否则 prev 正常后移。

**代码**：
```js
/**
 * @param {ListNode} head
 * @return {ListNode}
 */
var deleteDuplicates = function(head) {
  const dummy = new ListNode(0, head);
  let prev = dummy;
  let cur = head;

  while (cur) {
    // 检测是否有重复：cur 和 cur.next 值相同
    if (cur.next && cur.val === cur.next.val) {
      const dupVal = cur.val;
      // 跳过所有值为 dupVal 的节点
      while (cur && cur.val === dupVal) {
        cur = cur.next;
      }
      prev.next = cur; // 跳过整段重复节点
    } else {
      prev = cur;
      cur = cur.next;
    }
  }

  return dummy.next;
};
```

**复杂度**：时间 O(n) | 空间 O(1)

**与 [83] 的区别**：[83] 是保留一个重复节点，[82] 是一个不留。面试常问，要分清楚。

---

### [148] 排序链表 ⭐ Medium

**思路**：链表归并排序。自顶向下：用快慢指针找中点，断开两段，分别递归排序后合并。时间 O(n log n)，空间 O(log n)（递归栈）。

进阶：迭代归并排序（O(1) 空间）——从步长 1 开始，每次合并相邻的两个长度为 step 的子链，step 倍增。

**代码（递归版）**：
```js
/**
 * @param {ListNode} head
 * @return {ListNode}
 */
var sortList = function(head) {
  // 终止条件：0 或 1 个节点
  if (!head || !head.next) return head;

  // 快慢指针找中点（slow 停在左半段末尾）
  let slow = head, fast = head.next;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }

  const mid = slow.next;
  slow.next = null; // 断开两段

  const left = sortList(head);
  const right = sortList(mid);
  return mergeTwoSortedLists(left, right);
};

// 合并两个有序链表（[21] 的逻辑）
function mergeTwoSortedLists(l1, l2) {
  const dummy = new ListNode(0);
  let cur = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) {
      cur.next = l1;
      l1 = l1.next;
    } else {
      cur.next = l2;
      l2 = l2.next;
    }
    cur = cur.next;
  }
  cur.next = l1 || l2;
  return dummy.next;
}
```

**复杂度**：时间 O(n log n) | 空间 O(log n)（递归）

**常见追问**：

Q: 如何实现 O(1) 空间的链表排序？

A: 迭代归并排序。step 从 1 开始，每轮对链表按 step 大小两两合并，step 翻倍，共 log n 轮，每轮 O(n)。实现较复杂，面试了解思路即可。

---

### [138] 复制带随机指针的链表 ⭐ Medium

**思路**：哈希表法。第一遍遍历创建所有新节点，用 Map 存 `原节点 → 新节点` 的映射；第二遍遍历设置新节点的 next 和 random 指针。

进阶：O(1) 空间——将新节点插在每个原节点后面（1→1'→2→2'→...），设置 random，再拆分。

**代码（哈希表法）**：
```js
/**
 * @param {Node} head
 * @return {Node}
 */
var copyRandomList = function(head) {
  if (!head) return null;

  const map = new Map(); // 原节点 → 新节点

  // 第一遍：创建所有新节点
  let cur = head;
  while (cur) {
    map.set(cur, new Node(cur.val));
    cur = cur.next;
  }

  // 第二遍：设置 next 和 random
  cur = head;
  while (cur) {
    const newNode = map.get(cur);
    newNode.next = map.get(cur.next) || null;
    newNode.random = map.get(cur.random) || null;
    cur = cur.next;
  }

  return map.get(head);
};
```

**复杂度**：时间 O(n) | 空间 O(n)（哈希表）

**常见追问**：

Q: 如何做到 O(1) 空间？

A: 三步法：
1. 在每个原节点后插入克隆节点：`1 → 1' → 2 → 2' → 3 → 3'`
2. 设置克隆节点的 random：`node.next.random = node.random.next`（若 random 不为 null）
3. 拆分链表，恢复原链表并提取克隆链表

---

### 场景题：手写 reduce + 手写 map

**Array.prototype.reduce 实现**：

```js
/**
 * Array.prototype.reduce 手写实现
 * @param {Function} callback - (accumulator, currentValue, currentIndex, array) => newAcc
 * @param {*} [initialValue] - 可选初始值
 */
Array.prototype.myReduce = function(callback, initialValue) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  const arr = this;
  const len = arr.length;

  let acc;       // 累积器
  let startIdx;  // 遍历起始下标

  if (arguments.length >= 2) {
    // 提供了初始值
    acc = initialValue;
    startIdx = 0;
  } else {
    // 没有初始值：跳过空位，找第一个有效元素作为初始值
    if (len === 0) {
      throw new TypeError('Reduce of empty array with no initial value');
    }
    let i = 0;
    while (i < len && !(i in arr)) i++; // 跳过稀疏数组空位
    if (i >= len) {
      throw new TypeError('Reduce of empty array with no initial value');
    }
    acc = arr[i];
    startIdx = i + 1;
  }

  for (let i = startIdx; i < len; i++) {
    if (i in arr) { // 跳过稀疏数组空位
      acc = callback(acc, arr[i], i, arr);
    }
  }

  return acc;
};

// 测试
console.log([1, 2, 3, 4].myReduce((acc, cur) => acc + cur, 0));    // 10
console.log([1, 2, 3, 4].myReduce((acc, cur) => acc + cur));       // 10
console.log([[1,2],[3,4]].myReduce((acc, cur) => acc.concat(cur))); // [1,2,3,4]
```

**Array.prototype.map 实现**：

```js
/**
 * Array.prototype.map 手写实现
 * @param {Function} callback - (currentValue, index, array) => newValue
 * @param {*} [thisArg] - callback 执行时的 this
 */
Array.prototype.myMap = function(callback, thisArg) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  const arr = this;
  const len = arr.length;
  const result = new Array(len); // 预分配，保持稀疏数组特性

  for (let i = 0; i < len; i++) {
    if (i in arr) { // 跳过稀疏数组空位（map 不处理空位）
      result[i] = callback.call(thisArg, arr[i], i, arr);
    }
  }

  return result;
};

// 测试
console.log([1, 2, 3].myMap(x => x * 2));             // [2, 4, 6]
console.log([1, 2, 3].myMap(function(x) {             // [2, 4, 6]
  return x * this.multiplier;
}, { multiplier: 2 }));
```

**常见追问**：

Q: map 和 forEach 的区别？

A: map 返回新数组，forEach 返回 undefined；map 可链式调用，forEach 不能；两者都不修改原数组（除非在 callback 中手动修改）。

Q: reduce 能实现哪些数组方法？

A: 几乎所有数组方法都能用 reduce 实现：`map`（acc.push(transform(cur)）、`filter`（cur 满足条件才 push）、`flat`（递归展开）、`every`/`some` 等。

---

### 知识点：Vue 响应式原理

**核心思想**：数据劫持 + 依赖收集 + 派发更新。当数据被读取时收集依赖（谁在用我），当数据被修改时通知依赖（我变了，你们更新）。

#### Vue 2 — Object.defineProperty

**实现原理**：

```js
// Vue 2 响应式核心（简化）
function defineReactive(obj, key, val) {
  const dep = new Dep(); // 依赖收集器

  // 递归处理嵌套对象
  observe(val);

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      // 依赖收集：当前正在渲染的 Watcher 订阅此 dep
      if (Dep.target) {
        dep.depend();
      }
      return val;
    },
    set(newVal) {
      if (newVal === val) return;
      val = newVal;
      observe(newVal); // 新值也需要响应式处理
      dep.notify();    // 派发更新：通知所有 Watcher
    }
  });
}

function observe(obj) {
  if (typeof obj !== 'object' || obj === null) return;
  Object.keys(obj).forEach(key => defineReactive(obj, key, obj[key]));
}

// Dep：依赖管理器，存储所有依赖此数据的 Watcher
class Dep {
  constructor() { this.subs = []; }
  depend() { this.subs.push(Dep.target); }
  notify() { this.subs.forEach(watcher => watcher.update()); }
}
```

**Vue 2 的缺陷**：

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 新增属性无法检测 | defineProperty 只能拦截已存在的 key | `Vue.set(obj, key, val)` |
| 删除属性无法检测 | 同上 | `Vue.delete(obj, key)` |
| 数组下标赋值无法检测 | `arr[0] = val` 不触发 setter | 使用 splice/push 等方法 |
| 数组 length 变化无法检测 | 同上 | 重写了 7 个数组变异方法 |
| 深层嵌套初始化性能差 | 递归遍历所有 key | — |

#### Vue 3 — Proxy

**实现原理**：

```js
// Vue 3 响应式核心（简化）
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver);
      track(target, key); // 依赖收集
      // 深层响应式：懒处理（访问时才转换）
      if (typeof res === 'object' && res !== null) {
        return reactive(res);
      }
      return res;
    },
    set(target, key, value, receiver) {
      const oldVal = target[key];
      const result = Reflect.set(target, key, value, receiver);
      if (oldVal !== value) {
        trigger(target, key); // 派发更新
      }
      return result;
    },
    deleteProperty(target, key) {
      const result = Reflect.deleteProperty(target, key);
      trigger(target, key); // 删除属性也能触发
      return result;
    }
  });
}

// 依赖存储：WeakMap<target, Map<key, Set<effect>>>
const targetMap = new WeakMap();

function track(target, key) {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) targetMap.set(target, (depsMap = new Map()));
  let dep = depsMap.get(key);
  if (!dep) depsMap.set(key, (dep = new Set()));
  dep.add(activeEffect);
}

function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const dep = depsMap.get(key);
  if (dep) dep.forEach(effect => effect());
}
```

**Vue 3 相比 Vue 2 的优势**：

| 维度 | Vue 2 (defineProperty) | Vue 3 (Proxy) |
|------|------------------------|---------------|
| 新增属性 | 不支持，需 Vue.set | ✅ 自动检测 |
| 删除属性 | 不支持，需 Vue.delete | ✅ 自动检测 |
| 数组下标 | 不支持 | ✅ 自动检测 |
| 深层嵌套 | 初始化时递归，性能差 | 懒处理（访问时才递归），性能好 |
| Map/Set | 不支持 | ✅ 通过 collectionHandlers 支持 |
| 代码量 | 大量边界处理 | 统一由 Proxy 拦截 |

**ref vs reactive**：

```js
// ref：包装基本类型（或任意值）为响应式对象
const count = ref(0);
count.value++;        // 通过 .value 访问

// reactive：包装对象/数组为响应式（深度）
const state = reactive({ name: 'Vue', version: 3 });
state.name = 'Vue 3'; // 直接访问

// 解构会失去响应式！需要用 toRefs
const { name } = toRefs(state); // name.value 仍然响应式
```

**常见追问**：

Q: Proxy 和 Object.defineProperty 的本质区别？

A: defineProperty 是在对象的每个属性上定义 getter/setter，只能拦截单个属性，需要递归遍历；Proxy 是在对象层面代理，可以拦截所有操作（get/set/deleteProperty/has/ownKeys 等），无需递归，也能处理新增/删除属性。

Q: Vue 3 的 watchEffect 和 watch 的区别？

A: `watchEffect` 立即执行，自动追踪回调内访问的响应式数据，不需要明确指定依赖；`watch` 需要明确指定数据源，只有数据变化时才执行，可以获取新值和旧值，默认懒执行（不立即触发）。

---

## Day 14 — 复习 + 查漏（03-20）

> 收尾日：查漏补缺，把 LRU/LFU 做扎实，整理模板。

### [146] LRU 缓存 ⭐ Medium

> 今日第二次练习 LRU，验证 Day 12 手写成果，力扣版本完整代码。

**思路**：与 Day 12 场景题相同，Map + 双向链表。重点是 get/put 都需要将节点移到链表头部（最近使用位置），超容量时删除链表尾部节点（最久未使用）。

**代码（力扣完整版）**：
```js
class ListNode {
  constructor(key = 0, val = 0) {
    this.key = key;
    this.val = val;
    this.prev = null;
    this.next = null;
  }
}

/**
 * @param {number} capacity
 */
var LRUCache = function(capacity) {
  this.capacity = capacity;
  this.map = new Map();
  // 哑头尾节点
  this.head = new ListNode(); // 最近使用端
  this.tail = new ListNode(); // 最久未使用端
  this.head.next = this.tail;
  this.tail.prev = this.head;
};

LRUCache.prototype._remove = function(node) {
  node.prev.next = node.next;
  node.next.prev = node.prev;
};

LRUCache.prototype._addToHead = function(node) {
  node.next = this.head.next;
  node.prev = this.head;
  this.head.next.prev = node;
  this.head.next = node;
};

/**
 * @param {number} key
 * @return {number}
 */
LRUCache.prototype.get = function(key) {
  if (!this.map.has(key)) return -1;
  const node = this.map.get(key);
  this._remove(node);
  this._addToHead(node);
  return node.val;
};

/**
 * @param {number} key
 * @param {number} value
 * @return {void}
 */
LRUCache.prototype.put = function(key, value) {
  if (this.map.has(key)) {
    const node = this.map.get(key);
    node.val = value;
    this._remove(node);
    this._addToHead(node);
  } else {
    const node = new ListNode(key, value);
    this.map.set(key, node);
    this._addToHead(node);
    if (this.map.size > this.capacity) {
      const lru = this.tail.prev;
      this._remove(lru);
      this.map.delete(lru.key);
    }
  }
};
```

**复杂度**：get/put 均 O(1)

---

### [460] LFU 缓存 🔴 Hard

**思路**：LFU（Least Frequently Used）按访问频率淘汰，频率相同时淘汰最久未访问的。需要三个数据结构：

1. **keyMap**：`key → {val, freq}` — O(1) 查值和频率
2. **freqMap**：`freq → LinkedHashSet(有序 Set，按访问时间)` — O(1) 按频率找节点集合
3. **minFreq**：当前最小频率（用于淘汰）

每次 get/put 将 key 的频率 +1，从 `freqMap[oldFreq]` 移到 `freqMap[newFreq]`；若 `freqMap[minFreq]` 为空，minFreq++。插入新 key 时 minFreq 重置为 1。

**代码**：
```js
/**
 * @param {number} capacity
 */
var LFUCache = function(capacity) {
  this.capacity = capacity;
  this.size = 0;
  this.minFreq = 0;
  this.keyMap = new Map();  // key → {val, freq}
  this.freqMap = new Map(); // freq → Map<key, val>（用 Map 保持插入顺序，模拟有序集合）
};

LFUCache.prototype._getFreqBucket = function(freq) {
  if (!this.freqMap.has(freq)) {
    this.freqMap.set(freq, new Map());
  }
  return this.freqMap.get(freq);
};

LFUCache.prototype._increaseFreq = function(key) {
  const { val, freq } = this.keyMap.get(key);
  const newFreq = freq + 1;

  // 更新 keyMap
  this.keyMap.set(key, { val, freq: newFreq });

  // 从旧频率桶移除
  const oldBucket = this.freqMap.get(freq);
  oldBucket.delete(key);
  if (oldBucket.size === 0) {
    this.freqMap.delete(freq);
    if (this.minFreq === freq) this.minFreq = newFreq; // 最小频率更新
  }

  // 加入新频率桶
  this._getFreqBucket(newFreq).set(key, val);
};

/**
 * @param {number} key
 * @return {number}
 */
LFUCache.prototype.get = function(key) {
  if (!this.keyMap.has(key)) return -1;
  this._increaseFreq(key);
  return this.keyMap.get(key).val;
};

/**
 * @param {number} key
 * @param {number} value
 * @return {void}
 */
LFUCache.prototype.put = function(key, value) {
  if (this.capacity <= 0) return;

  if (this.keyMap.has(key)) {
    // 更新值
    this.keyMap.get(key).val = value;
    // 同步更新 freqMap 中的值（需要先增频，再把 freqMap 里的 val 也更新）
    this._increaseFreq(key);
    // _increaseFreq 内读的是 keyMap 的旧 val，需修正：直接更新 keyMap
    this.keyMap.get(key).val = value;
    // 同步到新频率桶
    const { freq } = this.keyMap.get(key);
    this.freqMap.get(freq).set(key, value);
  } else {
    // 超容量，淘汰 minFreq 桶中最久未访问的
    if (this.size >= this.capacity) {
      const minBucket = this.freqMap.get(this.minFreq);
      const evictKey = minBucket.keys().next().value; // Map 迭代器首个 key = 最久未访问
      minBucket.delete(evictKey);
      if (minBucket.size === 0) this.freqMap.delete(this.minFreq);
      this.keyMap.delete(evictKey);
      this.size--;
    }

    // 插入新 key，频率为 1
    this.keyMap.set(key, { val: value, freq: 1 });
    this._getFreqBucket(1).set(key, value);
    this.minFreq = 1;
    this.size++;
  }
};
```

**复杂度**：get/put 均 O(1)

**LRU vs LFU 对比**：

| 维度 | LRU | LFU |
|------|-----|-----|
| 淘汰策略 | 最久未访问 | 访问频率最低（频率相同则最久未访问） |
| 数据结构 | Map + 双向链表 | keyMap + freqMap（Map of Map） + minFreq |
| 实现复杂度 | 中 | 高 |
| 适用场景 | 热点数据具有时间局部性 | 热点数据访问频率差异明显 |

---

### Week 2 错题思路整理

#### 滑动窗口模板

```js
// 通用滑动窗口框架
function slidingWindow(s, t) {
  const need = new Map(); // 需求
  const window = new Map(); // 窗口状态

  let left = 0, right = 0;
  let valid = 0; // 满足条件的字符数

  while (right < s.length) {
    const c = s[right];
    right++;
    // ① 扩展窗口：更新 window 数据
    if (need.has(c)) {
      window.set(c, (window.get(c) || 0) + 1);
      if (window.get(c) === need.get(c)) valid++;
    }

    // ② 判断是否需要收缩（具体条件因题而异）
    while (/* 窗口需要收缩 */ valid === need.size) {
      // ③ 记录结果（最小窗口在此处记录）
      // update answer...

      const d = s[left];
      left++;
      // ④ 收缩窗口：更新 window 数据
      if (need.has(d)) {
        if (window.get(d) === need.get(d)) valid--;
        window.set(d, window.get(d) - 1);
      }
    }
    // ⑤ 记录结果（最大窗口在此处记录）
  }
}

// 变体总结：
// [76]  最小覆盖子串：收缩条件 valid===need.size，最小窗口在收缩前记录
// [209] 最小长度子数组：收缩条件 sum>=target，最小长度在收缩前记录
// [424] 最长重复字符：不合法时 left 右移（窗口不缩小），最大窗口在 right 处记录
// [239] 最大滑动窗口：单调递减队列，队头即最大值
```

**易错点**：

- **扩展 right 时**先更新 window，再判断 valid
- **收缩 left 时**先判断（记录/更新 valid），再更新 window
- 顺序颠倒会导致漏记或多记

#### 回溯去重模板

```js
// 组合/子集去重（元素不可重复选，数组有重复元素）
// 关键：先排序，同层相同元素跳过
function backtrack(nums, start, path, result) {
  result.push([...path]);
  for (let i = start; i < nums.length; i++) {
    // 同层去重：i > start 且与前一个相同
    if (i > start && nums[i] === nums[i - 1]) continue;
    path.push(nums[i]);
    backtrack(nums, i + 1, path, result);
    path.pop();
  }
}

// 全排列去重（元素不可重复选，数组有重复元素）
// 关键：先排序，used 数组标记
function backtrackPerm(nums, used, path, result) {
  if (path.length === nums.length) {
    result.push([...path]);
    return;
  }
  for (let i = 0; i < nums.length; i++) {
    if (used[i]) continue;
    // 同层去重：相邻相同且前一个未使用（说明是同层的）
    if (i > 0 && nums[i] === nums[i - 1] && !used[i - 1]) continue;
    used[i] = true;
    path.push(nums[i]);
    backtrackPerm(nums, used, path, result);
    path.pop();
    used[i] = false;
  }
}

// 两种去重的本质区别：
// i > start && nums[i]===nums[i-1]          → 用于组合/子集（start 标记同层起点）
// i > 0 && nums[i]===nums[i-1] && !used[i-1] → 用于全排列（used 标记同层）
```

---

### 场景题：手写发布订阅 + 观察者模式

#### 发布订阅模式（EventEmitter）

**核心思想**：事件中心（EventBus）解耦发布者和订阅者，两者互不知晓，通过事件名通信。

```js
class EventEmitter {
  constructor() {
    // 事件名 → 回调函数数组
    this._events = Object.create(null);
  }

  /**
   * 订阅事件
   * @param {string} event - 事件名
   * @param {Function} listener - 回调
   */
  on(event, listener) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(listener);
    return this; // 支持链式调用
  }

  /**
   * 取消订阅
   */
  off(event, listener) {
    if (!this._events[event]) return this;
    this._events[event] = this._events[event].filter(fn => fn !== listener);
    return this;
  }

  /**
   * 只订阅一次（触发后自动取消）
   */
  once(event, listener) {
    const wrapper = (...args) => {
      listener.apply(this, args);
      this.off(event, wrapper);
    };
    wrapper._original = listener; // 保存原始函数，方便 off 时匹配
    this.on(event, wrapper);
    return this;
  }

  /**
   * 发布事件
   * @param {string} event - 事件名
   * @param {...*} args - 传递给回调的参数
   */
  emit(event, ...args) {
    if (!this._events[event]) return false;
    // 复制一份，防止回调内 off 导致迭代异常
    const listeners = [...this._events[event]];
    listeners.forEach(listener => listener.apply(this, args));
    return true;
  }

  /**
   * 移除某事件的所有监听器（或全部事件）
   */
  removeAllListeners(event) {
    if (event) {
      delete this._events[event];
    } else {
      this._events = Object.create(null);
    }
    return this;
  }
}

// 测试
const emitter = new EventEmitter();

const handler = (msg) => console.log('收到消息:', msg);
emitter.on('message', handler);
emitter.once('connect', () => console.log('已连接（只触发一次）'));

emitter.emit('message', 'Hello');   // 收到消息: Hello
emitter.emit('connect');             // 已连接（只触发一次）
emitter.emit('connect');             // 不再触发

emitter.off('message', handler);
emitter.emit('message', 'World');    // 不再触发
```

#### 观察者模式

**核心思想**：被观察者（Subject）维护观察者（Observer）列表，状态变化时直接通知所有观察者。观察者和被观察者存在直接依赖关系。

```js
// 观察者接口
class Observer {
  /**
   * @param {string} name - 观察者名称
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * 被通知时调用
   * @param {Subject} subject - 被观察者
   */
  update(subject) {
    console.log(`${this.name} 收到通知：${subject.name} 状态变为 ${subject.getState()}`);
  }
}

// 被观察者（Subject）
class Subject {
  constructor(name) {
    this.name = name;
    this._state = null;
    this._observers = [];
  }

  // 注册观察者
  subscribe(observer) {
    if (!this._observers.includes(observer)) {
      this._observers.push(observer);
    }
  }

  // 移除观察者
  unsubscribe(observer) {
    this._observers = this._observers.filter(obs => obs !== observer);
  }

  // 通知所有观察者
  notify() {
    this._observers.forEach(observer => observer.update(this));
  }

  getState() { return this._state; }

  setState(state) {
    this._state = state;
    this.notify(); // 状态变化，自动通知
  }
}

// 测试
const store = new Subject('Store');
const componentA = new Observer('ComponentA');
const componentB = new Observer('ComponentB');

store.subscribe(componentA);
store.subscribe(componentB);

store.setState('loading'); // ComponentA 和 ComponentB 都收到通知
store.setState('success');

store.unsubscribe(componentB);
store.setState('error');   // 只有 ComponentA 收到通知
```

**发布订阅 vs 观察者模式对比**：

| 维度 | 观察者模式 | 发布订阅模式 |
|------|-----------|-------------|
| 耦合度 | 观察者和被观察者直接依赖 | 通过事件中心解耦，互不知晓 |
| 事件中心 | 无 | 有（EventEmitter / EventBus） |
| 通信方式 | 被观察者直接调用观察者的 update | 发布者 emit，订阅者 on |
| 跨模块通信 | 较难 | 容易（适合跨模块、跨组件通信） |
| 典型应用 | Vue 响应式（Dep/Watcher）、MobX | Node.js EventEmitter、Vue $on/$emit、Redux |

---

### 知识点：性能优化综合

#### 首屏优化

**指标**：FCP（First Contentful Paint 首次内容绘制）、LCP（Largest Contentful Paint 最大内容绘制）、TTI（Time to Interactive 可交互时间）

**优化手段**：

```
1. 减少资源体积
   ├── 代码压缩（Terser / UglifyJS）
   ├── Tree Shaking（删除死代码）
   ├── 图片压缩（WebP/AVIF 替代 JPG/PNG）
   └── Gzip/Brotli 压缩传输

2. 减少请求数/请求时间
   ├── HTTP/2（多路复用，消除队头阻塞）
   ├── CDN（静态资源分发，缩短物理距离）
   ├── 合理缓存策略（强缓存 + 协商缓存）
   └── DNS 预解析（<link rel="dns-prefetch">）

3. 关键渲染路径优化
   ├── CSS 放 <head>（避免 FOUC）
   ├── JS 放 <body> 底部 或 async/defer
   ├── 内联关键 CSS（Critical CSS）
   └── 减少阻塞渲染的资源

4. 代码分割（Code Splitting）
   ├── 路由懒加载（按需加载页面）
   ├── 动态 import（按需加载组件）
   └── Vendor chunk 分离（第三方库单独缓存）
```

#### 懒加载 vs 预加载

```html
<!-- 图片懒加载：使用 loading="lazy" 属性（原生支持） -->
<img src="placeholder.jpg" data-src="real-image.jpg" loading="lazy" alt="">

<!-- Intersection Observer API 实现懒加载 -->
<script>
const images = document.querySelectorAll('img[data-src]');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img); // 加载后取消观察
    }
  });
}, { threshold: 0.1 });

images.forEach(img => observer.observe(img));
</script>

<!-- 预加载：提前加载关键资源 -->
<link rel="preload" href="critical.css" as="style">
<link rel="preload" href="hero.jpg" as="image">
<link rel="prefetch" href="next-page.js"> <!-- 低优先级，空闲时预取下一页 -->
<link rel="preconnect" href="https://api.example.com"> <!-- 预建连接 -->
```

**懒加载 vs 预加载**：

| | 懒加载 | 预加载 |
|-|-------|-------|
| 目的 | 推迟加载，节省首屏带宽 | 提前加载，减少后续等待 |
| 时机 | 需要时才加载（进入视口） | 提前加载（空闲时或立即） |
| 适用 | 图片、非关键 JS、长列表 | 首屏关键资源、下一页资源 |
| 指令 | `loading="lazy"` / 动态 import | `<link rel="preload/prefetch">` |

#### SSR（服务端渲染）

```
CSR（客户端渲染）流程：
请求 → 返回空 HTML → 下载 JS → 执行 JS → 请求 API → 渲染页面
  首屏白屏时间长，SEO 不友好

SSR（服务端渲染）流程：
请求 → 服务端拼接 HTML（含数据） → 返回完整 HTML → 浏览器渲染 → Hydration
  首屏速度快，SEO 友好，但服务端压力大，TTFB 可能更长

SSG（静态生成）：
构建时生成静态 HTML，直接 CDN 分发，最快但不适合动态内容

ISR（增量静态再生，Next.js）：
静态页面 + 定时/按需重新生成，兼顾速度和动态性
```

**Next.js SSR 示例**：

```jsx
// pages/products.js
export async function getServerSideProps(context) {
  const res = await fetch('https://api.example.com/products');
  const products = await res.json();
  return {
    props: { products }, // 注入到组件 props
  };
}

export default function Products({ products }) {
  return (
    <ul>
      {products.map(p => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}
```

#### Service Worker

```js
// sw.js — 拦截网络请求实现离线缓存
const CACHE_NAME = 'v1';
const STATIC_ASSETS = ['/', '/index.html', '/main.css', '/app.js'];

// 安装：预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting(); // 立即激活，不等待旧 SW 退出
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // 立即控制所有页面
});

// 拦截请求：Cache First 策略（先走缓存，缓存没有再走网络）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached; // 命中缓存
      return fetch(event.request).then(response => {
        // 动态缓存新请求
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
      });
    })
  );
});
```

**注册 Service Worker**：

```js
// main.js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW registered:', reg.scope);
    }).catch(err => {
      console.error('SW registration failed:', err);
    });
  });
}
```

**Service Worker 缓存策略**：

| 策略 | 描述 | 适用场景 |
|------|------|---------|
| Cache First | 优先缓存，没有才请求网络 | 静态资源（JS/CSS/图片） |
| Network First | 优先网络，失败才用缓存 | API 请求（需要最新数据） |
| Stale While Revalidate | 立即返回缓存，同时后台更新缓存 | 频繁更新但可接受短暂旧数据 |
| Cache Only | 只用缓存 | 离线应用 |
| Network Only | 只走网络 | 实时数据（不缓存） |

**常见追问**：

Q: Service Worker 和普通 Web Worker 的区别？

A: Web Worker 是为了分担主线程 CPU 密集型任务（没有网络拦截能力，不持久化）；Service Worker 是一种特殊的 Web Worker，独立于页面运行，可以拦截网络请求、管理缓存、支持离线、实现推送通知，即使页面关闭也可以在后台运行（由浏览器管理生命周期）。

Q: 首屏优化的关键指标和目标值？

A: Core Web Vitals 三项核心指标：LCP（Largest Contentful Paint）< 2.5s（良好）、FID/INP（交互延迟）< 100ms、CLS（布局偏移）< 0.1。实践中常用 Lighthouse 或 Web Vitals 库监控。

---

## Week 2 总结（Day 8-14）

| Day | 核心主题 | 算法题数 | 场景题 | 知识点 |
|-----|----------|----------|--------|--------|
| Day 8  | DP 基础（背包） | 4 题 | 手写 flat | 跨域解决方案 |
| Day 9  | DP 进阶（子序列） | 4 题 | Promise 三兄弟 | TCP 握手挥手 |
| Day 10 | 回溯基础 | 4 题 | async/await | HTTPS & TLS |
| Day 11 | 回溯去重 | 4 题 | 虚拟 DOM diff | Webpack 构建流程 |
| Day 12 | 滑动窗口 | 4 题 | 手写 LRU | React Fiber 架构 |
| Day 13 | 链表进阶 | 4 题 | 手写 reduce/map | Vue 响应式原理 |
| Day 14 | 复习查漏 | 2 题+模板 | 发布订阅/观察者 | 性能优化综合 |

**Week 2 核心要点汇总**：

**滑动窗口**：
- 扩展 right → 更新 window → 判断收缩条件 → 收缩 left → 更新 window（顺序不能乱）
- 最小窗口在收缩前记录；最大窗口在 right 处记录
- 单调队列（[239]）：队头存最大值，队尾维护单调性

**链表**：
- 哑节点（dummy）简化头节点边界
- 快慢指针找中点：`fast = head.next` 时 slow 停在左半段末尾
- 翻转时记录 groupHead + nextGroupHead，翻转后重连

**缓存**：
- LRU = Map + 双向链表，哑头尾节点
- LFU = keyMap + freqMap（Map of Map）+ minFreq 变量
- 关键：put 新节点时 minFreq 重置为 1

**设计模式**：
- 观察者：Subject 直接持有 Observer 引用（紧耦合）
- 发布订阅：通过 EventEmitter 解耦（松耦合）
- Vue 2 响应式 = 观察者模式（Dep = Subject，Watcher = Observer）
