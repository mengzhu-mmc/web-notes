# 减少 DOM 数量及大量 DOM 时的优化

## 一、减少DOM数量的方法

1. 可以使用伪元素实现的内容尽量不使用DOM实现
2. 使用 CSS 实现的效果（分隔线、图标、装饰性内容）不要用额外 DOM 节点
3. 列表/表格中，通过 `display: none` 隐藏的元素仍然存在 DOM 中占用内存，高频隐藏/显示场景考虑用 `v-if`（Vue）或条件渲染而非 `v-show`

---

## 二、大量DOM时的优化

### 1. 缓存DOM对象

不管在什么场景下，操作 DOM 一般首先会去访问 DOM，尤其是像循环遍历这种事件复杂度可能会比较高的操作。那么可以在循环之前就将主节点、不必循环的 DOM 节点先获取到，在循环里直接引用，而不必每次重新查询。

```js
let root = document.querySelector('.list');
let childList = root.children;
for (let i = 0; i < childList.length; i++) {
  // 直接引用缓存的 DOM，不重复查询
}
```

### 2. DocumentFragment — 批量操作 DOM

`document.createDocumentFragment()` 创建一个**虚拟文档片段节点**，它不是真实 DOM 树的一部分。向 Fragment 中添加/修改节点不会触发重排重绘；最后一次性将 Fragment 插入 DOM，只触发一次重排。

```javascript
// ❌ 低效：每次 appendChild 都触发一次重排
for (let i = 0; i < 1000; i++) {
  const li = document.createElement('li');
  li.textContent = `Item ${i}`;
  document.querySelector('ul').appendChild(li); // 触发 1000 次重排
}

// ✅ 高效：先批量操作 Fragment，最后一次性插入
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  const li = document.createElement('li');
  li.textContent = `Item ${i}`;
  fragment.appendChild(li); // 不触发重排
}
document.querySelector('ul').appendChild(fragment); // 只触发 1 次重排
```

**`innerHTML` 批量设置也是同类思路**：
```js
// 比循环 appendChild 性能更好（字符串拼接后一次赋值）
const items = data.map(d => `<li>${d.name}</li>`).join('');
document.querySelector('ul').innerHTML = items;
```

### 3. 虚拟 DOM（Virtual DOM）

JS 模拟 DOM 树的技术（React/Vue 核心机制）：
- Virtual DOM 是纯 JS 对象（Plain Object），操作成本极低
- DOM 变化时，先对 Virtual DOM 进行操作
- 通过 **DOM Diff 算法**比对新旧 Virtual DOM，计算出最小变更集
- 最终**批量**修改真实 DOM，避免频繁重排重绘

---

## 三、虚拟列表（Virtual List）—— 万行数据的终极解法

### 原理

渲染长列表时，只渲染**可视区域内的 DOM 节点**，其余节点不插入 DOM，通过滚动偏移量动态替换渲染内容。

```
┌─────────────────────────────┐  ← 容器（固定高度 + overflow: scroll）
│  [占位：撑开总高度]            │
│  ┌───────────────────────┐  │
│  │   Item 105（可视区）   │  │  ← 只有这几个 DOM 节点
│  │   Item 106（可视区）   │  │
│  │   Item 107（可视区）   │  │
│  └───────────────────────┘  │
│  [占位：剩余空间]              │
└─────────────────────────────┘
```

### 手写简单虚拟列表

```html
<div class="virtual-list-container" id="container">
  <div class="virtual-list-phantom" id="phantom"></div>  <!-- 撑开高度 -->
  <div class="virtual-list-content" id="content"></div>  <!-- 实际渲染区 -->
</div>
```

```css
.virtual-list-container {
  height: 500px;
  overflow-y: scroll;
  position: relative;
}
.virtual-list-phantom {
  position: absolute;
  top: 0; left: 0; right: 0;
  /* 总高度由 JS 设置 */
}
.virtual-list-content {
  position: absolute;
  top: 0; left: 0; right: 0;
  /* translateY 由 JS 设置 */
}
```

```js
const ITEM_HEIGHT = 50; // 每项固定高度
const BUFFER = 3;       // 上下各多渲染 3 条（防闪烁）

const container = document.getElementById('container');
const phantom  = document.getElementById('phantom');
const content  = document.getElementById('content');

const data = Array.from({ length: 10000 }, (_, i) => ({ id: i, text: `Item ${i}` }));

// 撑开滚动高度
phantom.style.height = data.length * ITEM_HEIGHT + 'px';

function render(scrollTop) {
  const containerHeight = container.clientHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
  const endIndex = Math.min(data.length, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER);

  const offset = startIndex * ITEM_HEIGHT;
  content.style.transform = `translateY(${offset}px)`;

  content.innerHTML = data
    .slice(startIndex, endIndex)
    .map(item => `<div style="height:${ITEM_HEIGHT}px">${item.text}</div>`)
    .join('');
}

render(0);
container.addEventListener('scroll', () => render(container.scrollTop));
```

**生产环境推荐库**：
- React：`react-window`、`react-virtual`（TanStack Virtual）
- Vue：`vue-virtual-scroller`
- 原生：`@tanstack/virtual-core`

---

## 四、requestAnimationFrame 节流 DOM 操作

对于高频触发的事件（scroll、resize、mousemove），使用 `requestAnimationFrame`（rAF）节流，将 DOM 操作对齐到浏览器每帧绘制时机，避免一帧内多次重排。

```js
// ❌ 不好：scroll 每秒可能触发 100+ 次
window.addEventListener('scroll', () => {
  updateDOMBasedOnScroll(); // 可能一帧触发多次，浪费算力
});

// ✅ 好：rAF 节流，每帧最多执行一次
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateDOMBasedOnScroll();
      ticking = false;
    });
    ticking = true;
  }
});
```

```js
// 封装 rAF 节流函数
function rafThrottle(fn) {
  let rafId = null;
  return function (...args) {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      fn.apply(this, args);
      rafId = null;
    });
  };
}

const onScroll = rafThrottle(() => {
  updateDOMBasedOnScroll();
});
window.addEventListener('scroll', onScroll);
```

**与 setTimeout 节流的区别**：
- `setTimeout(fn, 16)` 不精确，可能在帧间隔中间执行（导致视觉卡顿）
- `rAF` 保证在浏览器**下一帧绘制前**执行，天然对齐渲染时机，更流畅

---

## 五、其他优化技巧

- **离线操作 DOM**：先 `removeChild` 从 DOM 树中移除，批量操作后再 `appendChild` 回来
- **读写分离**：先批量读取（`offsetWidth` 等），再批量写入（避免强制同步布局）
- **使用 CSS 类切换**代替逐条修改 `style` 属性（减少多次 Reflow）
- **Intersection Observer**：替代 scroll 事件做懒加载，性能更好
- **避免布局抖动（Layout Thrashing）**：不要在循环中交替读写 DOM

```js
// ❌ 布局抖动：读-写-读-写
for (let el of elements) {
  const width = el.offsetWidth; // 强制同步布局（读）
  el.style.width = width * 2 + 'px'; // 写，使布局失效
}

// ✅ 先批量读，再批量写
const widths = elements.map(el => el.offsetWidth); // 批量读
elements.forEach((el, i) => {
  el.style.width = widths[i] * 2 + 'px'; // 批量写
});
```

---

## 相关笔记

- [前端性能优化全景](./前端性能优化全景.md)
- [页面渲染流程与优化](../浏览器原理/渲染/页面渲染流程与优化.md)
- [浏览器回流和重绘](../浏览器原理/渲染/浏览器回流和重绘.html)

​           









































