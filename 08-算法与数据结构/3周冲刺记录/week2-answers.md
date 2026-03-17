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

