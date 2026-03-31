# Week 3 完整题解 — 3周算法冲刺计划

> 时间范围：2026-03-21 ~ 03-27  
> 每日 3h，JS 实现，附场景题 + 知识点面试标准答案

---

## Day 15 — 单调栈复习 + Hard 补题

### [32] 最长有效括号 🔴 Hard

**题目描述**：给你一个只包含 `(` 和 `)` 的字符串，找出最长有效（格式正确且连续）括号子串的长度。

**自测用例**：
- 输入: `"(()"` → 输出: `2`
- 输入: `")()())"` → 输出: `4`
- 输入: `""` → 输出: `0`

🔗 https://leetcode.cn/problems/longest-valid-parentheses/

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

**题目描述**：给定 n 个非负整数，用来表示柱状图中各柱的高度，每个柱的宽度为 1，求能勾勒出来的矩形的最大面积。

**自测用例**：
- 输入: `heights = [2,1,5,6,2,3]` → 输出: `10`
- 输入: `heights = [2,4]` → 输出: `4`
- 输入: `heights = [1]` → 输出: `1`

🔗 https://leetcode.cn/problems/largest-rectangle-in-histogram/

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

### 场景题：设计一个前端错误监控 SDK

> 面试考察维度：系统设计能力、对浏览器 API 的熟悉度、工程化思维

#### 核心功能拆解

一个完整的前端错误监控 SDK 需要覆盖以下几类错误：

| 错误类型 | 捕获方式 |
|---------|---------|
| JS 运行时错误 | `window.onerror` / `window.addEventListener('error')` |
| Promise 未捕获异常 | `window.addEventListener('unhandledrejection')` |
| 资源加载失败 | `window.addEventListener('error', e => e.target instanceof HTMLElement)` |
| React/Vue 组件错误 | ErrorBoundary / `app.config.errorHandler` |
| 接口请求错误 | 拦截 `XMLHttpRequest` / `fetch` |
| 白屏检测 | `MutationObserver` / 定时检查关键节点 |

#### 完整实现

```js
class ErrorMonitorSDK {
  constructor(options = {}) {
    this.options = {
      dsn: '',           // 上报地址
      appId: '',         // 应用 ID
      userId: '',        // 用户 ID
      maxQueueSize: 10,  // 批量上报队列大小
      sampleRate: 1,     // 采样率 0-1
      ...options
    };
    this.queue = [];     // 待上报队列
    this.init();
  }

  init() {
    this._listenJSError();
    this._listenPromiseError();
    this._listenResourceError();
    this._interceptXHR();
    this._interceptFetch();
    // 页面卸载前上报剩余队列
    window.addEventListener('beforeunload', () => this._flush());
  }

  // 1. 监听 JS 运行时错误
  _listenJSError() {
    window.addEventListener('error', (e) => {
      // 区分 JS 错误和资源加载错误
      if (e.target instanceof HTMLElement) return; // 资源错误由 _listenResourceError 处理
      this._capture({
        type: 'js_error',
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack || '',
      });
    }, true); // 捕获阶段（资源错误不冒泡，必须捕获阶段）
  }

  // 2. 监听 Promise 未捕获异常
  _listenPromiseError() {
    window.addEventListener('unhandledrejection', (e) => {
      const reason = e.reason;
      this._capture({
        type: 'promise_error',
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : '',
      });
    });
  }

  // 3. 监听资源加载失败（图片、脚本、样式等）
  _listenResourceError() {
    window.addEventListener('error', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      this._capture({
        type: 'resource_error',
        tagName: target.tagName,
        src: target.src || target.href || '',
        outerHTML: target.outerHTML.slice(0, 200),
      });
    }, true);
  }

  // 4. 拦截 XMLHttpRequest
  _interceptXHR() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const capture = this._capture.bind(this);

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._monitor = { method, url, startTime: Date.now() };
      return originalOpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function(body) {
      this.addEventListener('loadend', () => {
        if (this.status >= 400 || this.status === 0) {
          capture({
            type: 'xhr_error',
            method: this._monitor?.method,
            url: this._monitor?.url,
            status: this.status,
            duration: Date.now() - (this._monitor?.startTime || 0),
          });
        }
      });
      return originalSend.apply(this, [body]);
    };
  }

  // 5. 拦截 fetch
  _interceptFetch() {
    const originalFetch = window.fetch;
    const capture = this._capture.bind(this);

    window.fetch = function(input, init = {}) {
      const url = typeof input === 'string' ? input : input.url;
      const method = init.method || 'GET';
      const startTime = Date.now();

      return originalFetch.apply(this, [input, init])
        .then((response) => {
          if (!response.ok) {
            capture({
              type: 'fetch_error',
              method,
              url,
              status: response.status,
              duration: Date.now() - startTime,
            });
          }
          return response;
        })
        .catch((err) => {
          capture({
            type: 'fetch_error',
            method,
            url,
            status: 0,
            message: err.message,
            duration: Date.now() - startTime,
          });
          throw err; // 不吞掉错误，继续向上抛
        });
    };
  }

  // 核心：采集错误信息
  _capture(errorInfo) {
    // 采样率过滤
    if (Math.random() > this.options.sampleRate) return;

    const data = {
      ...errorInfo,
      timestamp: Date.now(),
      url: location.href,
      userAgent: navigator.userAgent,
      appId: this.options.appId,
      userId: this.options.userId,
      // 设备信息
      screen: `${screen.width}x${screen.height}`,
    };

    this.queue.push(data);

    // 达到批量大小则上报
    if (this.queue.length >= this.options.maxQueueSize) {
      this._flush();
    }
  }

  // 上报（优先用 sendBeacon，降级用 fetch）
  _flush() {
    if (!this.queue.length || !this.options.dsn) return;

    const payload = JSON.stringify({ errors: [...this.queue] });
    this.queue = [];

    // sendBeacon：即使页面关闭也能上报，不阻塞页面卸载
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(this.options.dsn, blob);
    } else {
      // 降级方案
      fetch(this.options.dsn, {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true, // 页面卸载时仍能发送
      }).catch(() => {}); // 上报失败不影响主业务
    }
  }

  // 手动上报（业务代码主动调用）
  report(errorInfo) {
    this._capture({ type: 'manual', ...errorInfo });
  }
}

// 使用示例
const monitor = new ErrorMonitorSDK({
  dsn: 'https://error-collect.example.com/report',
  appId: 'my-app',
  userId: 'user-123',
  sampleRate: 0.8, // 80% 采样
});

// 手动上报业务异常
try {
  // some risky operation
} catch (e) {
  monitor.report({ message: e.message, stack: e.stack, extra: { page: 'checkout' } });
}
```

#### 进阶设计要点

**1. 错误去重**：同一错误频繁上报浪费资源
```js
// 用 Map 记录最近上报的错误指纹，1 分钟内相同错误只报一次
const errorCache = new Map();
_isDuplicate(errorInfo) {
  const key = `${errorInfo.type}_${errorInfo.message}_${errorInfo.filename}`;
  const now = Date.now();
  if (errorCache.has(key) && now - errorCache.get(key) < 60000) return true;
  errorCache.set(key, now);
  return false;
}
```

**2. Source Map 还原**：生产代码压缩后堆栈无意义，服务端用 `source-map` 包还原行列号到源码位置。

**3. 面包屑（Breadcrumbs）**：记录错误发生前的用户操作轨迹（点击、路由跳转、XHR 请求），帮助复现问题。

**4. 白屏检测**：
```js
// 检查关键节点是否存在，连续检测 3 次都为空则上报白屏
const checkWhiteScreen = () => {
  const rootEl = document.getElementById('app');
  return !rootEl || rootEl.children.length === 0;
};
```

#### 面试常见追问

**Q: `window.onerror` 和 `addEventListener('error')` 有什么区别？**

A: `window.onerror` 只能捕获 JS 运行时错误，且同一时间只能绑定一个处理函数（后绑定覆盖前绑定）。`addEventListener('error', fn, true)` 使用捕获阶段，既能捕获 JS 错误，也能捕获资源加载错误（img/script/link），还支持多个监听器共存，推荐使用。

**Q: 为什么上报要用 `sendBeacon` 而不是 `fetch`？**

A: 页面卸载时（`beforeunload`/`unload`），浏览器会中断异步请求，导致 `fetch/XHR` 上报丢失。`sendBeacon` 是浏览器提供的专门用于「页面关闭时可靠上报」的 API，会在后台异步发送，不阻塞页面关闭，也不会因页面卸载而中断。`fetch` 加 `keepalive: true` 是降级方案。

**Q: 如何避免 SDK 影响页面性能？**

A: ① 使用批量上报而非逐条发送；② 使用 `requestIdleCallback` 或 `setTimeout` 异步处理；③ 采样率控制上报量；④ 错误去重减少重复上报；⑤ 上报接口失败静默处理，不抛错影响主业务。

**Q: 跨域脚本的错误为何只显示 `Script error.`？**

A: 浏览器出于安全考虑，跨域脚本的错误信息会被屏蔽。解决方案：① `<script>` 标签加 `crossorigin="anonymous"`；② 服务端响应头加 `Access-Control-Allow-Origin: *`。两者缺一不可。

---

## Day 16 — 链表复习

### [206] 反转链表 — Easy

**题目描述**：给你单链表的头节点 `head`，请你反转链表，并返回反转后的链表头节点。

**自测用例**：
- 输入: `1→2→3→4→5` → 输出: `5→4→3→2→1`
- 输入: `1→2` → 输出: `2→1`
- 输入: `[]` → 输出: `[]`

🔗 https://leetcode.cn/problems/reverse-linked-list/

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

**题目描述**：给你单链表的头指针 `head` 和两个整数 `left` 和 `right`，其中 `left <= right`，请你反转从位置 `left` 到位置 `right` 的链表节点，返回反转后的链表。

**自测用例**：
- 输入: `head = 1→2→3→4→5, left = 2, right = 4` → 输出: `1→4→3→2→5`
- 输入: `head = 5, left = 1, right = 1` → 输出: `5`
- 输入: `head = 1→2→3, left = 1, right = 3` → 输出: `3→2→1`

🔗 https://leetcode.cn/problems/reverse-linked-list-ii/

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

**题目描述**：给你链表的头节点 `head`，每 `k` 个节点一组进行翻转，返回修改后的链表。若节点总数不是 `k` 的整数倍，最后剩余的节点保持原有顺序。

**自测用例**：
- 输入: `head = 1→2→3→4→5, k = 2` → 输出: `2→1→4→3→5`
- 输入: `head = 1→2→3→4→5, k = 3` → 输出: `3→2→1→4→5`
- 输入: `head = 1→2, k = 3` → 输出: `1→2`（不足 k 个保持原序）

🔗 https://leetcode.cn/problems/reverse-nodes-in-k-group/

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

**题目描述**：给你链表的头结点 `head`，请你将其按升序排列并返回排序后的链表。要求时间复杂度 O(n log n)、空间复杂度 O(1)（常数级）。

**自测用例**：
- 输入: `4→2→1→3` → 输出: `1→2→3→4`
- 输入: `-1→5→3→4→0` → 输出: `-1→0→3→4→5`
- 输入: `[]` → 输出: `[]`

🔗 https://leetcode.cn/problems/sort-list/

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

**题目描述**：设计并实现一个满足 LRU（最近最少使用）缓存约束的数据结构。实现 `LRUCache` 类，支持 `get(key)` 和 `put(key, value)` 操作，均要求 O(1) 时间复杂度。当缓存达到容量上限时，在插入新数据前删除最久未使用的数据。

**自测用例**：
- 操作: `LRUCache(2)` → `put(1,1)` → `put(2,2)` → `get(1)` → `put(3,3)` → `get(2)` → 输出: `1, -1`（2被淘汰）
- 操作: `LRUCache(1)` → `put(1,1)` → `put(2,2)` → `get(1)` → 输出: `-1`
- 操作: `LRUCache(2)` → `put(1,1)` → `get(1)` → 输出: `1`

🔗 https://leetcode.cn/problems/lru-cache/

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

**题目描述**：给你二叉树的根节点 `root`，返回其节点值的层序遍历结果（即逐层从左到右访问所有节点），结果为二维数组，每层节点为一个子数组。

**自测用例**：
- 输入: `root = [3,9,20,null,null,15,7]` → 输出: `[[3],[9,20],[15,7]]`
- 输入: `root = [1]` → 输出: `[[1]]`
- 输入: `root = []` → 输出: `[]`

🔗 https://leetcode.cn/problems/binary-tree-level-order-traversal/

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

**题目描述**：给定一棵二叉树，找到该树中两个指定节点 `p` 和 `q` 的最近公共祖先（LCA）。LCA 定义为：在树中同时拥有 `p` 和 `q` 为后代的最深节点（节点可以是自身的后代）。

**自测用例**：
- 输入: `root = [3,5,1,6,2,0,8], p = 5, q = 1` → 输出: `3`
- 输入: `root = [3,5,1,6,2,0,8], p = 5, q = 4` → 输出: `5`（5 是 4 的祖先）
- 输入: `root = [1,2], p = 1, q = 2` → 输出: `1`

🔗 https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree/

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

**题目描述**：给你一棵二叉树的根节点 `root`，返回其最大路径和。路径是指从树中任意节点出发，沿父子节点连接到达任意节点的序列（每个节点最多出现一次），路径和为路径上各节点值之和。

**自测用例**：
- 输入: `root = [1,2,3]` → 输出: `6`（路径: 2→1→3）
- 输入: `root = [-10,9,20,null,null,15,7]` → 输出: `42`（路径: 15→20→7）
- 输入: `root = [-3]` → 输出: `-3`

🔗 https://leetcode.cn/problems/binary-tree-maximum-path-sum/

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

**题目描述**：给你一个由 `'1'`（陆地）和 `'0'`（水）组成的二维网格，请你计算网格中岛屿的数量。岛屿由水平或垂直方向相邻的陆地连接而成，并且四周都被水包围。

**自测用例**：
- 输入: `grid = [["1","1","1"],["0","1","0"],["1","1","1"]]` → 输出: `1`
- 输入: `grid = [["1","1","0"],["1","1","0"],["0","0","1"]]` → 输出: `2`
- 输入: `grid = [["1","0","1"],["0","0","0"],["1","0","1"]]` → 输出: `4`

🔗 https://leetcode.cn/problems/number-of-islands/

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

**题目描述**：你这个学期必须选修 `numCourses` 门课程，有些课程有先修要求，用 `prerequisites[i] = [a, b]` 表示选修 `a` 前必须先完成 `b`。判断你是否可以完成所有课程（即有向图中是否存在环）。

**自测用例**：
- 输入: `numCourses = 2, prerequisites = [[1,0]]` → 输出: `true`
- 输入: `numCourses = 2, prerequisites = [[1,0],[0,1]]` → 输出: `false`（存在环）
- 输入: `numCourses = 3, prerequisites = [[1,0],[2,1]]` → 输出: `true`

🔗 https://leetcode.cn/problems/course-schedule/

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

**题目描述**：给你一个整数数组 `coins`（代表不同面额的硬币）和一个整数 `amount`（总金额），计算凑成总金额所需的最少硬币数量。如果无法凑成，返回 `-1`。每种硬币可以无限次使用。

**自测用例**：
- 输入: `coins = [1,2,5], amount = 11` → 输出: `3`（5+5+1）
- 输入: `coins = [2], amount = 3` → 输出: `-1`
- 输入: `coins = [1], amount = 0` → 输出: `0`

🔗 https://leetcode.cn/problems/coin-change/

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

**题目描述**：给你一个整数数组 `nums`，找到其中最长严格递增子序列的长度。子序列是从数组中删除部分元素（也可不删除）而不改变剩余元素顺序得到的序列。

**自测用例**：
- 输入: `nums = [10,9,2,5,3,7,101,18]` → 输出: `4`（[2,3,7,101]）
- 输入: `nums = [0,1,0,3,2,3]` → 输出: `4`
- 输入: `nums = [7,7,7,7,7]` → 输出: `1`

🔗 https://leetcode.cn/problems/longest-increasing-subsequence/

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

**题目描述**：给定两个字符串 `text1` 和 `text2`，返回这两个字符串的最长公共子序列（LCS）的长度。公共子序列是指同时出现在两个字符串中的子序列（可以不连续），若不存在则返回 0。

**自测用例**：
- 输入: `text1 = "abcde", text2 = "ace"` → 输出: `3`（"ace"）
- 输入: `text1 = "abc", text2 = "abc"` → 输出: `3`
- 输入: `text1 = "abc", text2 = "def"` → 输出: `0`

🔗 https://leetcode.cn/problems/longest-common-subsequence/

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

**题目描述**：给你一个整数数组 `coins` 表示不同面额的硬币，以及一个整数 `amount` 表示总金额。计算可以凑成总金额的硬币组合数（每种硬币可无限次使用，不计顺序）。

**自测用例**：
- 输入: `amount = 5, coins = [1,2,5]` → 输出: `4`（5; 2+2+1; 2+1+1+1; 1+1+1+1+1）
- 输入: `amount = 3, coins = [2]` → 输出: `0`
- 输入: `amount = 0, coins = [1,2,3]` → 输出: `1`（空组合）

🔗 https://leetcode.cn/problems/coin-change-ii/

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

**题目描述**：给你一个整数数组 `nums`，判断是否存在三元组 `[nums[i], nums[j], nums[k]]`（三个下标互不相同）使得三数之和为 0，返回所有不重复的满足条件的三元组。

**自测用例**：
- 输入: `nums = [-1,0,1,2,-1,-4]` → 输出: `[[-1,-1,2],[-1,0,1]]`
- 输入: `nums = [0,1,1]` → 输出: `[]`
- 输入: `nums = [0,0,0]` → 输出: `[[0,0,0]]`

🔗 https://leetcode.cn/problems/3sum/

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

**题目描述**：给你一个整数数组 `nums`，找出其下一个字典序更大的排列，并原地修改数组。如果不存在更大的排列（已是最大），则将数组重排为最小的排列（升序）。

**自测用例**：
- 输入: `nums = [1,2,3]` → 输出: `[1,3,2]`
- 输入: `nums = [3,2,1]` → 输出: `[1,2,3]`（已最大，重置为最小）
- 输入: `nums = [1,1,5]` → 输出: `[1,5,1]`

🔗 https://leetcode.cn/problems/next-permutation/

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

**题目描述**：给定整数数组 `nums` 和整数 `k`，返回数组中第 `k` 个最大的元素（排序后第 k 大，非第 k 个不同的元素）。要求时间复杂度优于 O(n log n)。

**自测用例**：
- 输入: `nums = [3,2,1,5,6,4], k = 2` → 输出: `5`
- 输入: `nums = [3,2,3,1,2,4,5,5,6], k = 4` → 输出: `4`
- 输入: `nums = [1], k = 1` → 输出: `1`

🔗 https://leetcode.cn/problems/kth-largest-element-in-an-array/

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

**题目描述**：给你一个字符串 `s` 和一个字符串列表 `wordDict` 作为字典，如果 `s` 可以由字典中的单词（可重复使用）拼接而成，返回 `true`，否则返回 `false`。

**自测用例**：
- 输入: `s = "leetcode", wordDict = ["leet","code"]` → 输出: `true`
- 输入: `s = "applepenapple", wordDict = ["apple","pen"]` → 输出: `true`（重复使用）
- 输入: `s = "catsandog", wordDict = ["cats","dog","sand","and","cat"]` → 输出: `false`

🔗 https://leetcode.cn/problems/word-break/

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

**题目描述**：给定 n 个非负整数表示每个宽度为 1 的柱子的高度图，计算按此排列的柱子，下雨之后能接多少雨水。

**自测用例**：
- 输入: `height = [0,1,0,2,1,0,1,3,2,1,2,1]` → 输出: `6`
- 输入: `height = [4,2,0,3,2,5]` → 输出: `9`
- 输入: `height = [3,0,3]` → 输出: `3`

🔗 https://leetcode.cn/problems/trapping-rain-water/

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

**题目描述**：给你一个链表数组，每个链表都已经按升序排列，请你将所有链表合并到一个升序链表中，返回合并后的链表。

**自测用例**：
- 输入: `lists = [[1,4,5],[1,3,4],[2,6]]` → 输出: `1→1→2→3→4→4→5→6`
- 输入: `lists = []` → 输出: `[]`
- 输入: `lists = [[]]` → 输出: `[]`

🔗 https://leetcode.cn/problems/merge-k-sorted-lists/

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

### 手写 apply

```js
Function.prototype.myApply = function(context, args = []) {
  context = context ?? globalThis;
  const sym = Symbol();
  context[sym] = this;
  const result = context[sym](...args);
  delete context[sym];
  return result;
};
```

### 手写 bind

```js
Function.prototype.myBind = function(context, ...outerArgs) {
  const fn = this;
  return function(...innerArgs) {
    // 处理 new 调用：new BoundFn() 时 this 指向新实例，忽略绑定的 context
    if (new.target) {
      return new fn(...outerArgs, ...innerArgs);
    }
    return fn.apply(context, [...outerArgs, ...innerArgs]);
  };
};
```

**关键点**：
- `bind` 返回一个新函数，支持柯里化传参（外层参数 + 内层参数合并）
- 用 `new.target` 检测是否被 `new` 调用，`new` 时忽略绑定的 `this`，指向新实例
- `call/apply` 直接执行，`bind` 返回函数不执行

---

> 3 周冲刺结束 🎉 保持手感，每周刷 3~5 题！
