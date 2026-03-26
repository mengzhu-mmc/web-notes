# Flex 弹性布局

## 核心概念

Flex 布局由**容器（container）**和**子项（item）**组成。轴分为主轴（main axis）和交叉轴（cross axis），默认主轴水平向右。

---

## 容器属性（父元素）

### `flex-direction` — 主轴方向

```css
flex-direction: row;            /* 默认：水平向右 */
flex-direction: row-reverse;    /* 水平向左 */
flex-direction: column;         /* 垂直向下 */
flex-direction: column-reverse; /* 垂直向上 */
```

### `flex-wrap` — 换行

```css
flex-wrap: nowrap;   /* 默认：不换行，子项会被压缩 */
flex-wrap: wrap;     /* 换行，第一行在上 */
flex-wrap: wrap-reverse; /* 换行，第一行在下 */
```

### `justify-content` — 主轴对齐

```css
justify-content: flex-start;    /* 默认：左对齐 */
justify-content: flex-end;      /* 右对齐 */
justify-content: center;        /* 居中 */
justify-content: space-between; /* 两端对齐，间距相等 */
justify-content: space-around;  /* 每项两侧间距相等（两端是中间间距的一半） */
justify-content: space-evenly;  /* 所有间距完全相等 */
```

### `align-items` — 交叉轴单行对齐

```css
align-items: stretch;    /* 默认：拉伸填满容器高度 */
align-items: flex-start; /* 交叉轴起点对齐 */
align-items: flex-end;   /* 交叉轴终点对齐 */
align-items: center;     /* 交叉轴居中 */
align-items: baseline;   /* 文字基线对齐 */
```

### `align-content` — 多行时的交叉轴对齐

> 只有 `flex-wrap: wrap` 且有多行时才生效

```css
align-content: flex-start;    /* 多行靠上 */
align-content: flex-end;      /* 多行靠下 */
align-content: center;        /* 多行居中 */
align-content: space-between;
align-content: space-around;
align-content: stretch;       /* 默认：拉伸填满 */
```

### `gap` — 子项间距（现代写法）

```css
gap: 16px;        /* 行列间距都是 16px */
gap: 16px 24px;   /* row-gap column-gap */
```

---

## 子项属性（子元素）

### `flex` — 综合简写（最重要！）

```css
/* flex: flex-grow  flex-shrink  flex-basis */
flex: 1;          /* 等价于 flex: 1 1 0%，常用于等分剩余空间 */
flex: auto;       /* 等价于 flex: 1 1 auto */
flex: none;       /* 等价于 flex: 0 0 auto，不伸缩 */
flex: 0 1 200px;  /* 不放大，可缩小，基准 200px */
```

| 值 | flex-grow | flex-shrink | flex-basis |
|----|-----------|-------------|------------|
| `flex: 1` | 1 | 1 | 0% |
| `flex: auto` | 1 | 1 | auto |
| `flex: none` | 0 | 0 | auto |

- **`flex-grow`**：剩余空间分配比例，`0` = 不放大
- **`flex-shrink`**：空间不足时缩小比例，`0` = 不缩小
- **`flex-basis`**：主轴方向的基准尺寸，`auto` = 取元素本身宽/高

### `align-self` — 单个子项的交叉轴对齐

覆盖父元素的 `align-items`：

```css
align-self: auto | flex-start | flex-end | center | baseline | stretch;
```

### `order` — 排列顺序

```css
order: 0;   /* 默认 */
order: -1;  /* 排在前面 */
order: 1;   /* 排在后面 */
```

---

## 常见面试题

### Q1：`flex: 1` 和 `flex: auto` 的区别？

- `flex: 1` → `flex: 1 1 0%`：基准是 0，所有子项从零开始等比分配空间
- `flex: auto` → `flex: 1 1 auto`：基准是元素内容宽度，在内容宽度基础上再分配剩余空间

**结果**：`flex: 1` 更容易实现"等宽"效果；`flex: auto` 会让内容多的子项占更多空间。

### Q2：`flex-shrink` 的计算方式？

当容器空间不足时，各子项按 `flex-shrink × flex-basis` 的比例缩小，而不是简单按 `flex-shrink` 比例。

### Q3：`flex-basis` 和 `width` 哪个优先级高？

`flex-basis` > `width`（在 Flex 容器内，`flex-basis` 会覆盖 `width`）。但 `min-width` / `max-width` 仍然有效。

### Q4：Flex 子项的 `margin: auto` 行为？

在 Flex 容器中，`margin: auto` 会吸收所有剩余空间，可以实现灵活的对齐效果：

```css
/* 导航栏右侧按钮推到最右边 */
.nav-right { margin-left: auto; }
```
