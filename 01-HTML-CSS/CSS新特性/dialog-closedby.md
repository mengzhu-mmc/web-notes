# HTML `<dialog>` closedBy 属性 — 点击蒙层关闭弹框

> 整合于 2026-03-31，来源：4篇重复笔记合并

## 核心功能

`closedBy` 是 `<dialog>` 元素的新属性，让原生弹层支持**点击蒙层（backdrop）关闭**，无需额外 JavaScript。

```html
<dialog closedby="any">点击蒙层我会自动关闭哦~</dialog>
```

执行 `dialog.showModal()` 后，点击蒙层弹框即可自动关闭。

---

## 属性值说明

| 值 | 描述 | 支持的关闭方式 |
|---|---|---|
| `any` | 全部允许 | 点击蒙层 + Esc + `close()` + 表单提交 |
| `closerequest` | 需要关闭请求 | Esc + `close()`；**不支持**点击蒙层关闭 |
| `none` | 禁止自动关闭 | 仅 `close()` 或表单提交；Esc 和点击蒙层均无效 |

### 默认行为（未设置 closedBy 时）

| 打开方式 | 等同于 |
|---|---|
| `showModal()` | `closedby="closerequest"`（Esc 可关闭） |
| `show()` | `closedby="none"` |

---

## 基本用法示例

```html
<!-- 允许点击蒙层和 Esc 关闭（最常用） -->
<dialog closedby="any">
  <p>点击外部蒙层或按 Esc 即可关闭</p>
  <button onclick="this.closest('dialog').close()">关闭</button>
</dialog>

<!-- 仅允许 Esc 关闭，防止误触 -->
<dialog closedby="closerequest">
  <p>只能按 Esc 或点击关闭按钮</p>
  <button onclick="this.closest('dialog').close()">关闭</button>
</dialog>

<!-- 完全禁止默认关闭，强制用户做出选择 -->
<dialog closedby="none">
  <p>必须通过按钮手动关闭</p>
  <button onclick="this.closest('dialog').close()">确认</button>
  <button onclick="this.closest('dialog').close()">取消</button>
</dialog>
```

```js
// 打开弹框
document.querySelector('dialog').showModal();
```

---

## 之前的 Hack 写法对比

**之前的痛点：**
`showModal()` 会显示 `::backdrop` 蒙层，但点击蒙层不会关闭弹框。开发者必须手动监听 click 事件，判断点击位置，再调用 `close()`。

```js
// ❌ 以前的 hack 写法（繁琐且脆弱）
dialog.addEventListener('click', (e) => {
  const rect = dialog.getBoundingClientRect();
  if (
    e.clientX < rect.left || e.clientX > rect.right ||
    e.clientY < rect.top  || e.clientY > rect.bottom
  ) {
    dialog.close();
  }
});
```

```html
<!-- ✅ 现在：一个属性搞定，零 JS -->
<dialog closedby="any">...</dialog>
```

---

## JS API

```js
const dialog = document.querySelector('dialog');

// 读取当前值（注意：JS 属性名用驼峰 closedBy，HTML 属性名小写 closedby）
console.log(dialog.closedBy); // "any" | "closerequest" | "none"

// 动态设置
dialog.closedBy = 'none';

// 配套事件：toggle（dialog 开/关时触发，类似 popover 的 toggle 事件）
dialog.addEventListener('toggle', (e) => {
  console.log(e.newState); // "open" | "closed"
});
```

---

## 兼容性

| 浏览器 | 支持情况 |
|---|---|
| Chrome 134+ | ✅ |
| Edge 134+ | ✅ |
| Firefox | ✅ |
| Safari | ❌ 暂不支持 |

**渐进增强策略**：不支持的浏览器会忽略 `closedby` 属性，fallback 到默认行为（Esc 可关闭），不会报错。

**Polyfill**：[dialog-closedby-polyfill](https://github.com/tak-dcxi/dialog-closedby-polyfill)

```js
import { apply, isSupported } from "dialog-closedby-polyfill";
if (!isSupported()) apply();
```

---

## 实际应用场景

| 场景 | 推荐值 | 理由 |
|---|---|---|
| 通知/提示弹窗 | `closedby="any"` | 轻量级，点击外部即可消除 |
| 表单弹窗 | `closedby="closerequest"` | 防止误点蒙层丢失表单数据 |
| 确认/风险操作弹窗 | `closedby="none"` | 强制用户做出明确选择 |
| 加载中遮罩 | `closedby="none"` | 不允许用户关闭 |

---

## 面试价值

- ✅ **体现对 HTML 原生能力增强的持续关注**（Chrome 134，2025年3月新特性）
- ✅ **展示"能用原生就不用库"的工程思维**，减少 JS 样板代码
- ✅ **知道 hack 写法的历史背景**，能说清楚为什么这个属性有价值
- ✅ **关联知识**：`<dialog>` API、`::backdrop` 伪元素、Popover API、`interestfor` 属性、无障碍性（a11y）

**可能被追问的点：**
1. `closedby="any"` 时，点击蒙层触发的是 `close` 事件还是 `toggle` 事件？→ `close` + `toggle` 都触发
2. `show()` 和 `showModal()` 的区别？→ `showModal()` 有蒙层且阻断页面交互，`show()` 无蒙层
3. 如何给蒙层加样式？→ `dialog::backdrop { background: rgba(0,0,0,0.5); }`

---

#HTML #dialog #closedBy #原生API #面试
