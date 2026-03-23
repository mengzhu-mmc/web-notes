# Week 3 完整题解 — 3周算法冲刺计划

> 时间范围：2026-03-21 ~ 03-27  
> 每日 3h，JS 实现，附场景题 + 知识点面试标准答案

---

## Day 15 — 单调栈复习 + Hard 补题

### [32] 最长有效括号 🔴 Hard

**思路**：单调栈存索引，初始压入 -1 作为哨兵。遍历字符串：`(` 直接压栈；`)` 则弹栈，若栈空则把当前索引作为新哨兵压入，否则用 `i - stack[top]` 更新最大长度。

**代码**：

```js
var longestValidParentheses = function(s) {
  let max = 0;
  const stack = [-1]; // 哨兵

  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') {
      stack.push(i);
    } else {
      stack.pop();
      if (stack.length === 0) {
        stack.push(i); // 当前 ')' 作为新哨兵
      } else {
        max = Math.max(max, i - stack[stack.length - 1]);
      }
    }
  }

  return max;
};
```

**复杂度**：时间 O(n) | 空间 O(n)

---

### [84] 柱状图中最大的矩形 🔴 Hard

**思路**：单调递增栈，在首尾加哨兵 0。遍历时若当前高度小于栈顶，弹栈并计算以弹出柱为高度的最大矩形。宽度 = 当前索引 - 新栈顶 - 1。

**代码**：

```js
var largestRectangleArea = function(heights) {
  // 首尾加哨兵 0，简化边界处理
  heights = [0, ...heights, 0];
  const stack = [0]; // 存索引，单调递增栈
  let max = 0;

  for (let i = 1; i < heights.length; i++) {
    while (heights[i] < heights[stack[stack.length - 1]]) {
      const h = heights[stack.pop()];
      const w = i - stack[stack.length - 1] - 1;
      max = Math.max(max, h * w);
    }
    stack.push(i);
  }

  return max;
};
```

**复杂度**：时间 O(n) | 空间 O(n)

---

## Day 16 — 链表复习

### [206] 反转链表 — Easy

**思路**：迭代三指针，prev 初始为 null，每次将 curr.next 指向 prev，然后整体后移。

**代码**：

```js
var reverseList = function(head) {
  let prev = null;
  let curr = head;

  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }

  return prev;
};
```

**复杂度**：时间 O(n) | 空间 O(1)

---

### [92] 反转链表 II — Medium

**思路**：哑节点 + 头插法。先走到反转区间的前驱节点 pre，再用头插法把后续节点插到 pre 之后，迭代 right-left 次。

**代码**：

```js
var reverseBetween = function(head, left, right) {
  const dummy = new ListNode(0, head);
  let pre = dummy;

  // 走到第 left-1 个节点
  for (let i = 0; i < left - 1; i++) pre = pre.next;

  let cur = pre.next;
  // 头插法：把 cur.next 插到 pre 后面，重复 right-left 次
  for (let i = 0; i < right - left; i++) {
    const next = cur.next;
    cur.next = next.next;
    next.next = pre.next;
    pre.next = next;
  }

  return dummy.next;
};
```

**复杂度**：时间 O(n) | 空间 O(1)

---

### [25] K 个一组翻转链表 🔴 Hard

**思路**：迭代 + 子函数。每次先检查剩余节点 ≥ k，然后翻转当前组并拼接前后段。

**代码**：

```js
var reverseKGroup = function(head, k) {
  const dummy = new ListNode(0, head);
  let groupPrev = dummy;

  while (true) {
    // 找到第 k 个节点（kth）
    let kth = getKth(groupPrev, k);
    if (!kth) break;

    const groupNext = kth.next;
    // 翻转 groupPrev.next 到 kth
    let prev = groupNext;
    let curr = groupPrev.next;
    while (curr !== groupNext) {
      const next = curr.next;
      curr.next = prev;
      prev = curr;
      curr = next;
    }
    // 拼接
    const tmp = groupPrev.next;
    groupPrev.next = kth;
    groupPrev = tmp;
  }

  return dummy.next;
};

function getKth(node, k) {
  while (node && k > 0) {
    node = node.next;
    k--;
  }
  return node;
}
```

**复杂度**：时间 O(n) | 空间 O(1)

---

### [148] 排序链表 — Medium

**思路**：归并排序。快慢指针找中点，拆成两段分别递归排序，再合并两有序链表。

**代码**：

```js
var sortList = function(head) {
  if (!head || !head.next) return head;

  // 快慢指针找中点（slow 停在左半段末尾）
  let slow = head, fast = head.next;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  const mid = slow.next;
  slow.next = null; // 断开

  const left = sortList(head);
  const right = sortList(mid);
  return merge(left, right);
};

function merge(l1, l2) {
  const dummy = new ListNode(0);
  let cur = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) { cur.next = l1; l1 = l1.next; }
    else { cur.next = l2; l2 = l2.next; }
    cur = cur.next;
  }
  cur.next = l1 || l2;
  return dummy.next;
}
```

**复杂度**：时间 O(n log n) | 空间 O(log n)（递归栈）

---

### [146] LRU 缓存 — Medium

**思路**：HashMap + 双向链表。Map 存 key→node，双向链表维护访问顺序（头部最新）。get/put 都把目标节点移到头部，超容量时删尾部节点。

**代码**：

```js
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    // 哑头尾节点
    this.head = { key: 0, val: 0, prev: null, next: null };
    this.tail = { key: 0, val: 0, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this._remove(node);
    this._addToHead(node);
    return node.val;
  }

  put(key, value) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.val = value;
      this._remove(node);
      this._addToHead(node);
    } else {
      const node = { key, val: value, prev: null, next: null };
      this.map.set(key, node);
      this._addToHead(node);
      if (this.map.size > this.capacity) {
        const tail = this._removeTail();
        this.map.delete(tail.key);
      }
    }
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _addToHead(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  _removeTail() {
    const tail = this.tail.prev;
    this._remove(tail);
    return tail;
  }
}
```

**复杂度**：get/put 均 O(1)

---

## Day 17 — 树 + 图复习

### [102] 二叉树的层序遍历 — Medium

**思路**：BFS 队列，每轮循环开始时记录当前队列长度（即本层节点数），只处理这些节点。

**代码**：

```js
var levelOrder = function(root) {
  if (!root) return [];
  const res = [];
  const queue = [root];

  while (queue.length) {
    const size = queue.length;
    const level = [];
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    res.push(level);
  }

  return res;
};
```

**复杂度**：时间 O(n) | 空间 O(n)

---

### [236] 二叉树的最近公共祖先 — Medium

**思路**：后序递归。左右子树分别找 p 和 q，若某节点左右均返回非 null，则它就是 LCA；若只有一侧，返回那一侧。

**代码**：

```js
var lowestCommonAncestor = function(root, p, q) {
  if (!root || root === p || root === q) return root;

  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);

  if (left && right) return root; // 左右各找到一个，当前节点就是 LCA
  return left || right;           // 返回非 null 的那一侧
};
```

**复杂度**：时间 O(n) | 空间 O(h)

---

### [124] 二叉树中的最大路径和 🔴 Hard

**思路**：DFS 后序遍历。每个节点返回"单边最大贡献值"（可为负则取 0），在每个节点内用 `left + right + node.val` 更新全局最大值。

**代码**：

```js
var maxPathSum = function(root) {
  let max = -Infinity;

  function dfs(node) {
    if (!node) return 0;
    // 负贡献舍弃（取 0）
    const left = Math.max(dfs(node.left), 0);
    const right = Math.max(dfs(node.right), 0);
    // 以当前节点为最高点的路径和
    max = Math.max(max, node.val + left + right);
    // 返回单边最大贡献（只能选一侧）
    return node.val + Math.max(left, right);
  }

  dfs(root);
  return max;
};
```

**复杂度**：时间 O(n) | 空间 O(h)

---

### [200] 岛屿数量 — Medium

**思路**：遍历网格，遇到 '1' 则 count++，DFS 把整片岛屿标记为 '0'（原地沉岛）。

**代码**：

```js
var numIslands = function(grid) {
  const m = grid.length, n = grid[0].length;
  let count = 0;

  function dfs(i, j) {
    if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] !== '1') return;
    grid[i][j] = '0'; // 标记已访问
    dfs(i + 1, j); dfs(i - 1, j);
    dfs(i, j + 1); dfs(i, j - 1);
  }

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        count++;
        dfs(i, j);
      }
    }
  }

  return count;
};
```

**复杂度**：时间 O(m×n) | 空间 O(m×n)（递归栈）

---

### [207] 课程表 — Medium

**思路**：拓扑排序（Kahn's BFS）。建邻接表 + 入度数组，入度为 0 的节点入队，出队时减少邻居入度，若邻居入度变为 0 则入队。最终判断处理节点数是否等于总节点数。

**代码**：

```js
var canFinish = function(numCourses, prerequisites) {
  const inDegree = new Array(numCourses).fill(0);
  const graph = Array.from({ length: numCourses }, () => []);

  for (const [a, b] of prerequisites) {
    graph[b].push(a);
    inDegree[a]++;
  }

  const queue = [];
  for (let i = 0; i < numCourses; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  let count = 0;
  while (queue.length) {
    const node = queue.shift();
    count++;
    for (const next of graph[node]) {
      if (--inDegree[next] === 0) queue.push(next);
    }
  }

  return count === numCourses;
};
```

**复杂度**：时间 O(V+E) | 空间 O(V+E)

---

## Day 18 — DP 复习

### [322] 零钱兑换 — Medium

**思路**：完全背包最小值。`dp[i]` 表示凑成金额 `i` 的最少硬币数，转移：`dp[i] = min(dp[i], dp[i-coin] + 1)`。

**代码**：

```js
var coinChange = function(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (i >= coin && dp[i - coin] !== Infinity) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
};
```

**复杂度**：时间 O(amount × coins.length) | 空间 O(amount)

---

### [300] 最长递增子序列 — Medium

**思路**：`dp[i]` 表示以 `nums[i]` 结尾的 LIS 长度。O(n²) DP；或贪心 + 二分 tails 数组优化到 O(n log n)。

**代码**：

```js
// O(n²) DP
var lengthOfLIS = function(nums) {
  const n = nums.length;
  const dp = new Array(n).fill(1);

  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
  }

  return Math.max(...dp);
};

// O(n log n) 贪心 + 二分
var lengthOfLIS2 = function(nums) {
  const tails = []; // tails[i] 表示长度 i+1 的 LIS 末尾最小值

  for (const num of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < num) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = num;
  }

  return tails.length;
};
```

**复杂度**：DP O(n²) | 贪心+二分 O(n log n)

---

### [1143] 最长公共子序列 — Medium

**思路**：二维 DP。`dp[i][j]` 表示 `text1[0..i-1]` 与 `text2[0..j-1]` 的 LCS 长度。字符相等则 `+1`，否则取左/上最大值。

**代码**：

```js
var longestCommonSubsequence = function(text1, text2) {
  const m = text1.length, n = text2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

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
};
```

**复杂度**：时间 O(m×n) | 空间 O(m×n)

---

### [518] 零钱兑换 II — Medium

**思路**：完全背包组合数。外层遍历硬币（保证不重复选），内层顺序遍历金额。`dp[i] += dp[i - coin]`。

**代码**：

```js
var change = function(amount, coins) {
  const dp = new Array(amount + 1).fill(0);
  dp[0] = 1;

  for (const coin of coins) {
    for (let i = coin; i <= amount; i++) {
      dp[i] += dp[i - coin];
    }
  }

  return dp[amount];
};
```

**复杂度**：时间 O(amount × coins.length) | 空间 O(amount)

---

## Day 19 — 高频 Medium 补题

### [15] 三数之和 — Medium

**思路**：排序 + 双指针。固定 `i`，`l = i+1, r = n-1` 向内收缩。去重：`i` 与前一个相同则跳过；找到答案后 `l/r` 也要跳过重复。

**代码**：

```js
var threeSum = function(nums) {
  nums.sort((a, b) => a - b);
  const res = [];

  for (let i = 0; i < nums.length - 2; i++) {
    if (nums[i] > 0) break;
    if (i > 0 && nums[i] === nums[i - 1]) continue; // 去重

    let l = i + 1, r = nums.length - 1;
    while (l < r) {
      const sum = nums[i] + nums[l] + nums[r];
      if (sum === 0) {
        res.push([nums[i], nums[l], nums[r]]);
        while (l < r && nums[l] === nums[l + 1]) l++;
        while (l < r && nums[r] === nums[r - 1]) r--;
        l++; r--;
      } else if (sum < 0) {
        l++;
      } else {
        r--;
      }
    }
  }

  return res;
};
```

**复杂度**：时间 O(n²) | 空间 O(1)

---

### [31] 下一个排列 — Medium

**思路**：三步走。① 从右向左找第一个下降点 `i`（`nums[i] < nums[i+1]`）② 从右向左找第一个大于 `nums[i]` 的位置 `j`，交换 ③ 反转 `i+1` 到末尾。

**代码**：

```js
var nextPermutation = function(nums) {
  const n = nums.length;
  let i = n - 2;

  // 找下降点
  while (i >= 0 && nums[i] >= nums[i + 1]) i--;

  if (i >= 0) {
    // 找右侧第一个比 nums[i] 大的
    let j = n - 1;
    while (nums[j] <= nums[i]) j--;
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }

  // 反转 i+1 到末尾
  let l = i + 1, r = n - 1;
  while (l < r) {
    [nums[l], nums[r]] = [nums[r], nums[l]];
    l++; r--;
  }
};
```

**复杂度**：时间 O(n) | 空间 O(1)

---

### [215] 数组中的第 K 个最大元素 — Medium

**思路**：快速选择（Quickselect）。partition 后若 pivot 位置 = n-k 则返回，否则只递归一侧。平均 O(n)。

**代码**：

```js
var findKthLargest = function(nums, k) {
  const target = nums.length - k;

  function quickSelect(l, r) {
    const pivot = nums[r];
    let p = l;
    for (let i = l; i < r; i++) {
      if (nums[i] <= pivot) {
        [nums[i], nums[p]] = [nums[p], nums[i]];
        p++;
      }
    }
    [nums[p], nums[r]] = [nums[r], nums[p]];

    if (p === target) return nums[p];
    if (p < target) return quickSelect(p + 1, r);
    return quickSelect(l, p - 1);
  }

  return quickSelect(0, nums.length - 1);
};
```

**复杂度**：平均 O(n) | 最坏 O(n²) | 空间 O(log n)

---

### [139] 单词拆分 — Medium

**思路**：DP。`dp[i]` 表示 `s[0..i-1]` 是否可被 wordDict 中的单词拼出。枚举分割点 `j`：若 `dp[j]` 为 true 且 `s.slice(j, i)` 在 wordSet 中，则 `dp[i] = true`。

**代码**：

```js
var wordBreak = function(s, wordDict) {
  const wordSet = new Set(wordDict);
  const n = s.length;
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;

  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && wordSet.has(s.slice(j, i))) {
        dp[i] = true;
        break;
      }
    }
  }

  return dp[n];
};
```

**复杂度**：时间 O(n²) | 空间 O(n)

---

## Day 20 — Hard 压轴 + 模拟面试

### [42] 接雨水 🔴 Hard

**思路（双指针）**：维护 `maxL / maxR`，哪边较小就处理哪边（该侧积水量由其 max 决定，不受对侧影响）。当前积水 = `max - height[ptr]`。

**代码**：

```js
var trap = function(height) {
  let l = 0, r = height.length - 1;
  let maxL = 0, maxR = 0;
  let water = 0;

  while (l < r) {
    if (height[l] <= height[r]) {
      maxL = Math.max(maxL, height[l]);
      water += maxL - height[l];
      l++;
    } else {
      maxR = Math.max(maxR, height[r]);
      water += maxR - height[r];
      r--;
    }
  }

  return water;
};
```

**复杂度**：时间 O(n) | 空间 O(1)

---

### [23] 合并 K 个升序链表 🔴 Hard

**思路**：最小堆（优先队列模拟）。将所有链表头节点入堆，每次取出最小节点加入结果链，再将其 next（若存在）入堆。

**代码**：

```js
// JS 中用最小堆模拟（面试可用数组 + sort 简化，实际应用用堆）
var mergeKLists = function(lists) {
  // 分治归并（面试更推荐，思路清晰）
  if (!lists.length) return null;
  return mergeRange(lists, 0, lists.length - 1);
};

function mergeRange(lists, l, r) {
  if (l === r) return lists[l];
  const mid = (l + r) >> 1;
  const left = mergeRange(lists, l, mid);
  const right = mergeRange(lists, mid + 1, r);
  return mergeTwoLists(left, right);
}

function mergeTwoLists(l1, l2) {
  const dummy = new ListNode(0);
  let cur = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) { cur.next = l1; l1 = l1.next; }
    else { cur.next = l2; l2 = l2.next; }
    cur = cur.next;
  }
  cur.next = l1 || l2;
  return dummy.next;
}
```

**复杂度**：时间 O(N log k)，N 为所有节点总数 | 空间 O(log k)

---

### 手写题模板

#### 防抖 debounce

```js
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}
```

#### 节流 throttle（时间戳版）

```js
function throttle(fn, interval) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
```

#### 深拷贝 deepClone

```js
function deepClone(obj, map = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (map.has(obj)) return map.get(obj); // 处理循环引用

  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);

  const clone = Array.isArray(obj) ? [] : {};
  map.set(obj, clone);

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone(obj[key], map);
    }
  }
  return clone;
}
```

#### Promise.all

```js
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = [];
    let count = 0;
    if (!promises.length) return resolve(results);

    promises.forEach((p, i) => {
      Promise.resolve(p).then(val => {
        results[i] = val;
        if (++count === promises.length) resolve(results);
      }).catch(reject);
    });
  });
}
```

#### Promise.allSettled

```js
function promiseAllSettled(promises) {
  return Promise.all(promises.map(p =>
    Promise.resolve(p)
      .then(value => ({ status: 'fulfilled', value }))
      .catch(reason => ({ status: 'rejected', reason }))
  ));
}
```

---

## Day 21 — 收官

> Day 21 为复习日，无新题。  
> 参考 `day21-模拟面试3收官.md` 中的「面试必背」清单逐项检查。

### 手写 instanceof

```js
function myInstanceof(obj, Constructor) {
  let proto = Object.getPrototypeOf(obj);
  while (proto) {
    if (proto === Constructor.prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}
```

### 手写 new

```js
function myNew(Constructor, ...args) {
  const obj = Object.create(Constructor.prototype);
  const result = Constructor.apply(obj, args);
  return result instanceof Object ? result : obj;
}
```

### 手写 call

```js
Function.prototype.myCall = function(context, ...args) {
  context = context ?? globalThis;
  const sym = Symbol();
  context[sym] = this;
  const result = context[sym](...args);
  delete context[sym];
  return result;
};
```

---

> 3 周冲刺结束 🎉 保持手感，每周刷 3~5 题！
