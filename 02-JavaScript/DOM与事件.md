# DOM 操作与事件机制

> 面试常考 + 日常开发必备

## DOM 元素操作

### 获取元素

```js
// 推荐：CSS 选择器方式（现代开发主流）
document.querySelector('#app')          // 返回第一个匹配元素
document.querySelectorAll('.item')      // 返回 NodeList

// 传统方式
document.getElementById('app')
document.getElementsByClassName('item') // 返回 HTMLCollection（实时更新）
document.getElementsByTagName('div')
```

`querySelectorAll` 返回的是静态 NodeList（快照），`getElementsByClassName` 返回的是动态 HTMLCollection（DOM 变化会实时反映）。面试中经常考这个区别。

### 节点关系遍历

```js
// 元素节点遍历（跳过文本节点，实际开发常用）
el.parentElement          // 父元素
el.children               // 子元素集合
el.firstElementChild      // 第一个子元素
el.lastElementChild       // 最后一个子元素
el.nextElementSibling     // 下一个兄弟元素
el.previousElementSibling // 上一个兄弟元素
```

### 创建与修改

```js
// 创建
const div = document.createElement('div')
const text = document.createTextNode('hello')
const fragment = document.createDocumentFragment() // 文档片段，批量操作减少重排

// 插入
parent.appendChild(child)
parent.insertBefore(newNode, referenceNode)
parent.append(node1, node2, 'text')  // 可插入多个节点和文本
parent.prepend(node)                 // 插入到最前面

// 删除与替换
parent.removeChild(child)
parent.replaceChild(newChild, oldChild)
el.remove()  // 直接删除自身
```

---

## 事件机制（面试重点）

### 事件流：捕获 → 目标 → 冒泡

W3C 标准规定事件流分三个阶段：捕获阶段（从 window 向下到目标元素）、目标阶段、冒泡阶段（从目标元素向上到 window）。

```js
// 第三个参数 true 表示在捕获阶段触发，默认 false 在冒泡阶段触发
el.addEventListener('click', handler, false)

// 也可以传 options 对象
el.addEventListener('click', handler, {
  capture: false,  // 是否捕获阶段
  once: true,      // 是否只触发一次
  passive: true,   // 表示不会调用 preventDefault，用于优化滚动性能
})
```

### 事件委托（面试高频）

利用事件冒泡，将子元素的事件处理函数绑定在父元素上，通过 `e.target` 判断实际触发的元素：

```js
document.getElementById('list').addEventListener('click', (e) => {
  if (e.target.tagName === 'LI') {
    console.log('点击了:', e.target.textContent)
  }
})
```

优势：减少事件监听器数量、动态添加的子元素自动拥有事件处理能力。

### 阻止冒泡与默认行为

```js
e.stopPropagation()   // 阻止事件继续冒泡
e.preventDefault()    // 阻止默认行为（如链接跳转、表单提交）
e.stopImmediatePropagation() // 阻止冒泡 + 阻止同元素上的其他监听器
```

---

## script 标签的 defer 和 async

这是面试中关于页面加载优化的常考知识点：

**普通 `<script>`**：解析到 script 标签时暂停 HTML 解析，下载并执行脚本，完成后继续解析。多个脚本按顺序执行。

**`<script defer>`**：HTML 解析过程中并行下载脚本，不阻塞解析。等 HTML 解析完成后，按照标签出现顺序依次执行，执行完毕后触发 `DOMContentLoaded` 事件。

**`<script async>`**：HTML 解析过程中并行下载脚本，下载完成后立即执行（会暂停 HTML 解析）。多个 async 脚本的执行顺序不确定，谁先下载完谁先执行。

```
普通:    HTML解析 ──停── [下载] [执行] ── HTML解析继续
defer:   HTML解析 ─────────────────────── [执行] → DOMContentLoaded
              └── [下载（并行）] ──┘
async:   HTML解析 ────停── [执行] ── HTML解析继续
              └── [下载] ──┘
```

实际应用：页面核心逻辑用 `defer`（保证顺序），统计/广告等独立脚本用 `async`。

---

## IntersectionObserver（实用 API）

用于检测元素是否进入视口，常用于懒加载、无限滚动、曝光埋点等场景：

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // 元素进入视口
      console.log('可见:', entry.target)
      observer.unobserve(entry.target) // 只需触发一次时取消观察
    }
  })
}, {
  root: null,        // 视口作为根元素（默认）
  rootMargin: '0px', // 根元素的外边距，可提前触发
  threshold: 0       // 交叉比例达到多少时触发（0 = 刚出现就触发）
})

// 图片懒加载示例
document.querySelectorAll('img[data-src]').forEach(img => {
  observer.observe(img)
})
```

`entry` 对象的关键属性：`isIntersecting`（是否可见）、`intersectionRatio`（可见比例 0~1）、`target`（被观察的元素）。
