# Web 平台 3 月新特性总览（Chrome 146 / Firefox 149 / Safari 26.4）

> 来源：[web.dev](https://web.dev/blog/web-platform-03-2026) | 日期：2026-03-27

## 核心内容

3 月份三大浏览器集中落地一批重要新特性，涵盖 CSS 动画、容器查询、布局、JS 迭代器等。

---

## 关键知识点

### 1. CSS Scroll-Triggered Animations（Chrome 146）
- 告别 `IntersectionObserver`，用纯 CSS 声明式实现「滚动触发动画」
- 关键属性：`animation-trigger`、`timeline-trigger`、`trigger-scope`
- 与 scroll-driven animations（进度驱动）不同，这是「触发点」驱动：到达指定滚动位置后执行时间动画
- 动画在 worker 线程运行，性能优秀

```css
/* 定义触发器 */
timeline-trigger:
  --t
  view()
  entry 100% exit 0%
;
trigger-scope: --t;

/* 绑定动画 */
animation: slide-in 0.35s ease-in-out both;
animation-trigger: --t play-forwards play-backwards;
```

### 2. Optional Container Query Conditions（Firefox 149 + Safari 26.4）
- `@container` 支持纯「名称匹配」，无需写尺寸/样式条件
- 更灵活的容器上下文样式控制

```css
/* 仅按名称匹配容器，不写条件 */
@container card { ... }
```

### 3. trigger-scope 属性（Chrome 146）
- 类似 `anchor-scope`，限制触发器名称的可见范围
- 多个同名触发器时，避免全局污染

### 4. Popover hint value（Firefox 149）
- `popover="hint"` 不会关闭已有的 `auto` popover
- 为 tooltip 类场景提供更精细的控制

### 5. Grid Lanes / Masonry Layout（Safari 26.4）
- `display: grid-lanes` 开启 masonry 布局！
- CSS 原生瀑布流终于来了 🎉

### 6. Math functions in sizes attribute（Safari 26.4）
- `<img sizes="min(800px, 100vw)">` 支持 `min()` / `max()` / `clamp()`
- 响应式图片加载更灵活

### 7. JavaScript Iterator.concat()（Chrome 146 + Safari 26.4）
- `Iterator.concat(...items)` 拼接多个迭代器，已成 Baseline Newly Available
- 链式处理数据流更简洁

```js
const combined = Iterator.concat([1, 2], [3, 4]);
// → 1, 2, 3, 4
```

### 8. CloseWatcher API（Firefox 149）
- 让自定义组件支持 Esc（Windows）/ Back（Android）等设备原生关闭手势
- 与 `<dialog>` 和 `popover` 行为一致

---

## Chrome 147 Beta 预告（即将到来）

- `contrast-color()`：自动返回黑/白以保证最佳对比度
- `border-shape`：自定义边框形状
- Element-scoped view transitions

---

## 面试相关

- **CSS 容器查询**：除了尺寸条件，还可以只用名称匹配
- **Scroll-Triggered vs Scroll-Driven 区别**：前者是触发点触发时间动画，后者是进度驱动动画
- **Masonry 布局**：CSS 原生支持到来，`display: grid-lanes`
- **Iterator.concat()**：新的内置迭代器方法，Baseline 已可用

## 相关笔记

- [[notes/css/scroll-driven-animations]]
- [[notes/browser/web-platform-02-2026]]
