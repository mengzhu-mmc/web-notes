# HTML/CSS 一页速记

> 来源：[牛客网-面试题-HTML-CSS.md](../牛客网-面试题-HTML-CSS.md) | ~15 题浓缩

---

## HTML

- **语义化标签**：`header/nav/main/article/section/aside/footer` → 利于 SEO + 无障碍
- **DOCTYPE**：`<!DOCTYPE html>` 触发标准模式（非怪异模式）
- **meta viewport**：`<meta name="viewport" content="width=device-width, initial-scale=1">` 移动端适配基础
- **defer vs async**：
  - `defer`：按顺序执行，DOMContentLoaded 前
  - `async`：加载完立即执行，不保证顺序

## CSS 基础

- **盒模型**：`content-box`（默认，width 不含 padding/border）vs `border-box`（width 含 padding/border，推荐全局 `* { box-sizing: border-box }`）
- **BFC**（块级格式化上下文）：
  - **触发**：`overflow: hidden/auto`、`float`、`position: absolute/fixed`、`display: flow-root`
  - **作用**：清除浮动、防止 margin 折叠、阻止元素被浮动覆盖
- **CSS 优先级**：`!important` > 内联 > ID > 类/属性/伪类 > 元素/伪元素 > 通配符

## 选择器

- **优先级权重**：内联(1000) > ID(100) > 类(10) > 元素(1)
- **伪类**：`:hover`、`:focus`、`:nth-child(n)`、`:not()`
- **伪元素**：`::before`、`::after`（需 `content: ""`）

## Flexbox

| 属性 | 作用 |
|---|---|
| `justify-content` | 主轴对齐（flex-start/center/space-between/space-around） |
| `align-items` | 交叉轴对齐 |
| `flex-direction` | 主轴方向（row/column） |
| `flex-wrap` | 是否换行 |
| `flex: 1` | `flex-grow: 1; flex-shrink: 1; flex-basis: 0%` |

## Grid

- `grid-template-columns: repeat(3, 1fr)` → 3 列等宽
- `gap` → 行列间距
- `grid-area` → 命名区域定位

## 动画

- **transition**：状态变化过渡（`transition: all 0.3s ease`）
- **animation**：关键帧动画（`@keyframes` + `animation` 属性）
- **性能优化**：优先用 `transform` + `opacity`（GPU 加速，不触发回流）

## 响应式

- **媒体查询**：`@media (max-width: 768px) { ... }`
- **rem/vw**：移动端适配方案
- **clamp()**：`font-size: clamp(1rem, 2vw, 2rem)` 流体字号
