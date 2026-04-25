# CSS/HTML 新特性：interestfor + dialog closedBy

> 来源：[张鑫旭博客](https://www.zhangxinxu.com/wordpress/2026/03/) | 日期：2026-03-04 ~ 03-09

## 核心内容

两个重要的 HTML/CSS 新特性：
1. `interestfor` 属性：纯 HTML+CSS 实现悬停触发 Popover
2. `dialog.closedBy`：原生弹窗支持点击蒙层关闭

---

## 1. interestfor — 纯 CSS Hover 交互

### 是什么？

`interestfor` 是 HTML 属性，声明某元素"对另一个 popover 元素感兴趣"。当用户悬停（hover）或聚焦该元素时，浏览器自动显示目标 popover。

### 代码示例

```html
<!-- 以前：需要 JS 监听 mouseenter/mouseleave -->
<button onmouseenter="showTip()" onmouseleave="hideTip()">悬停我</button>
<div id="tip" style="display:none">提示内容</div>

<!-- 现在：纯 HTML！-->
<button interestfor="my-tip">悬停我</button>
<div id="my-tip" popover>提示内容</div>
```

### 样式控制

```css
/* 默认隐藏 */
[popover] { display: none; }

/* popover 显示时的样式 */
[popover]:popover-open {
  display: block;
  background: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
}
```

### 面试考点

- Popover API 完整体系：`popover` 属性、`popovertarget`（点击触发）、`interestfor`（悬停触发）
- 与传统 JS 实现 tooltip 的区别（声明式 vs 命令式）
- 浏览器支持情况：2026 年现代浏览器全支持

---

## 2. dialog closedBy — 原生弹窗关闭策略

### 是什么？

`closedby` 属性控制 `<dialog>` 元素的关闭行为，无需额外 JS。

### 属性值

| 值 | 行为 |
|----|------|
| `any` | 点击 backdrop 蒙层 或 按 Esc 都能关闭 |
| `closerequest` | 默认值，只有按 Esc（或调用 `.close()`）才关闭 |
| `none` | 禁止自动关闭，必须通过代码显式关闭 |

### 代码示例

```html
<!-- 点击蒙层关闭（最常见需求）-->
<dialog id="modal" closedby="any">
  <h2>标题</h2>
  <p>内容</p>
  <button onclick="this.closest('dialog').close()">关闭</button>
</dialog>

<button onclick="document.getElementById('modal').showModal()">打开</button>
```

```css
/* 蒙层样式 */
dialog::backdrop {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}
```

### dialog 完整 API 复习

```javascript
const dialog = document.getElementById('modal');

// 打开为模态框（有 ::backdrop 蒙层，阻止背后交互）
dialog.showModal();

// 打开为非模态（无蒙层，背后可交互）
dialog.show();

// 关闭，可传返回值
dialog.close('submitted');

// 获取关闭时传入的值
dialog.addEventListener('close', () => {
  console.log(dialog.returnValue); // 'submitted'
});
```

## 面试相关

- `dialog.showModal()` vs `dialog.show()` 的区别
- `closedby` 的三个值及使用场景
- `::backdrop` 伪元素的作用和样式控制
- dialog 的 `close` 事件和 `returnValue` 属性
- 为什么推荐用原生 dialog 替代自定义弹窗组件？（无障碍、键盘导航、焦点陷阱）

## 相关笔记

- [[01-HTML-CSS/Popover-API]]
- [[01-HTML-CSS/CSS-新特性-2026]]
