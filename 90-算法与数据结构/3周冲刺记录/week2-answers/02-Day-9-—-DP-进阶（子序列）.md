## Day 9 — DP 进阶（子序列）

### [518] 零钱兑换 II ⭐ Medium

**题目描述**：给你一个整数数组 coins 表示不同面额的硬币，另给一个整数 amount 表示总金额。计算并返回可以凑成总金额的硬币组合数。每种面额的硬币数量无限，且两种不同的顺序视为同一种组合。

**自测用例**：

- 输入: amount = 5, coins = [1,2,5] → 输出: 4（5；2+2+1；2+1+1+1；1+1+1+1+1）
- 输入: amount = 3, coins = [2] → 输出: 0
- 输入: amount = 10, coins = [10] → 输出: 1

🔗 https://leetcode.cn/problems/coin-change-ii/

**思路**：完全背包求方案数（与 322 的区别：322 求最少硬币数，这里求组合数）。dp[i] 表示凑成金额 i 的组合数，初始 dp[0]=1。外层遍历硬币（物品），内层从小到大遍历金额（完全背包正序）。注意：外层硬币、内层金额的顺序保证每种组合不重复计数（避免 [1,2] 和 [2,1] 被计为两种）。

**代码**：

```js
/**
 * @param {number} amount
 * @param {number[]} coins
 * @return {number}
 */
var change = function (amount, coins) {
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

**题目描述**：给定两个字符串 text1 和 text2，返回这两个字符串的最长公共子序列的长度。子序列是指可以删去字符串中某些字符（也可以不删除）而不改变相对顺序，从而产生的新字符串。如果不存在公共子序列，返回 0。

**自测用例**：

- 输入: text1 = "abcde", text2 = "ace" → 输出: 3（"ace"）
- 输入: text1 = "abc", text2 = "abc" → 输出: 3
- 输入: text1 = "abc", text2 = "def" → 输出: 0

🔗 https://leetcode.cn/problems/longest-common-subsequence/

**思路**：经典二维 DP。dp[i][j] 表示 text1 前 i 个字符与 text2 前 j 个字符的最长公共子序列长度。如果 text1[i-1] === text2[j-1]，则 dp[i][j] = dp[i-1][j-1] + 1；否则取 dp[i-1][j] 和 dp[i][j-1] 的最大值。递推方向：从左到右，从上到下（每个 dp[i][j] 依赖左上、上方、左方三个位置）。

**代码**：

```js
/**
 * @param {string} text1
 * @param {string} text2
 * @return {number}
 */
var longestCommonSubsequence = function (text1, text2) {
  const m = text1.length,
    n = text2.length;
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

**题目描述**：给你两个单词 word1 和 word2，请返回将 word1 转换成 word2 所使用的最少操作数。你可以对一个单词进行三种操作：插入一个字符、删除一个字符、替换一个字符。

**自测用例**：

- 输入: word1 = "horse", word2 = "ros" → 输出: 3
- 输入: word1 = "intention", word2 = "execution" → 输出: 5
- 输入: word1 = "", word2 = "a" → 输出: 1

🔗 https://leetcode.cn/problems/edit-distance/

**思路**：dp[i][j] 表示将 word1 前 i 个字符转换为 word2 前 j 个字符所需的最少操作数（插入/删除/替换）。当两字符相同时不需要操作，dp[i][j] = dp[i-1][j-1]；否则取三种操作的最小值：替换（dp[i-1][j-1]+1）、删除word1字符（dp[i-1][j]+1）、插入word2字符（dp[i][j-1]+1）。递推方向：从左到右，从上到下，依赖左、上、左上三个状态。

**代码**：

```js
/**
 * @param {string} word1
 * @param {string} word2
 * @return {number}
 */
var minDistance = function (word1, word2) {
  const m = word1.length,
    n = word2.length;
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
          dp[i - 1][j] + 1, // 删除：删除 word1[i-1]
          dp[i][j - 1] + 1, // 插入：在 word1 中插入 word2[j-1]
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

**题目描述**：给你一个字符串 s 和一个字符规律 p，请你来实现一个支持 '.' 和 '_' 的正则表达式匹配。'.' 匹配任意单个字符，'_' 匹配零个或多个前面的那一个元素。要求整个输入字符串（不是部分）都要与字符规律相匹配。

**自测用例**：

- 输入: s = "aa", p = "a*" → 输出: true（'*' 匹配两个 'a'）
- 输入: s = "ab", p = "._" → 输出: true（"._" 匹配任意字符串）
- 输入: s = "aab", p = "c*a*b" → 输出: true（c*=0个c, a*=2个a）

🔗 https://leetcode.cn/problems/regular-expression-matching/

**思路**（思路为主）：dp[i][j] 表示 s 的前 i 个字符与 p 的前 j 个字符是否匹配。核心处理 `*` 通配符：`*` 匹配0次则忽略`x*`这两个字符（dp[i][j-2]），`*` 匹配1+次则需要 s[i-1] 与 p[j-2] 能匹配（dp[i-1][j]）。注意 `*` 不能独立出现，必须跟在字符或 `.` 后面。

**代码**：

```js
/**
 * @param {string} s
 * @param {string} p
 * @return {boolean}
 */
var isMatch = function (s, p) {
  const m = s.length,
    n = p.length;
  // dp[i][j] = s[0..i-1] 是否与 p[0..j-1] 匹配
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(false));
  dp[0][0] = true; // 空串匹配空模式

  // 初始化：空串匹配 "a*b*c*..." 形式的模式
  for (let j = 2; j <= n; j++) {
    if (p[j - 1] === "*") {
      dp[0][j] = dp[0][j - 2]; // x* 匹配 0 次
    }
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (p[j - 1] === "*") {
        // * 匹配 0 次：忽略 p[j-2] 和 p[j-1]（即 x*）
        dp[i][j] = dp[i][j - 2];
        // * 匹配 1+ 次：需要 s[i-1] 能和 p[j-2] 匹配
        if (p[j - 2] === "." || p[j - 2] === s[i - 1]) {
          dp[i][j] = dp[i][j] || dp[i - 1][j];
        }
      } else if (p[j - 1] === "." || p[j - 1] === s[i - 1]) {
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
Promise.myAllSettled = function (promises) {
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
          results[i] = { status: "fulfilled", value };
          if (++count === total) resolve(results);
        },
        (reason) => {
          results[i] = { status: "rejected", reason };
          if (++count === total) resolve(results);
        },
      );
    });
  });
};

/**
 * Promise.any - 返回第一个成功的 Promise，全部失败则 reject AggregateError
 */
Promise.myAny = function (promises) {
  return new Promise((resolve, reject) => {
    const errors = [];
    let rejectedCount = 0;
    const total = promises.length;

    if (total === 0) {
      reject(new AggregateError([], "All promises were rejected"));
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
            reject(new AggregateError(errors, "All promises were rejected"));
          }
        },
      );
    });
  });
};

/**
 * Promise.race - 返回第一个完成（无论成功失败）的 Promise 的结果
 */
Promise.myRace = function (promises) {
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
const p2 = new Promise((_, rej) => setTimeout(() => rej("error"), 200));
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
