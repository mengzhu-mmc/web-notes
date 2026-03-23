# CSS lh 单位

> 来源：[阮一峰科技爱好者周刊 #389](http://www.ruanyifeng.com/blog/2026/03/weekly-issue-389.html) → [原文 WebKit Blog](https://webkit.org/blog/16831/line-height-units/) | 日期：2026-03-19

## 核心内容

CSS 新增了 `lh` 单位，表示当前元素的**行高（line-height）**。类似地，还有 `rlh` 单位，表示根元素（`:root`）的行高。

## 关键知识点

- `lh` = 当前元素的 `line-height` 计算值
- `rlh` = 根元素的 `line-height` 计算值（类似 `rem` vs `em` 的关系）
- 常用场景：设置 icon 高度与文字行高一致、段落间距与行高成比例
- 已进入 Baseline（各大浏览器支持）

## 代码示例

```css
/* 图标高度跟随行高 */
.icon {
  height: 1lh;
  width: 1lh;
  vertical-align: middle;
}

/* 段落间距 = 2 倍行高 */
p + p {
  margin-top: 2lh;
}

/* 基于根元素行高排版 */
.card {
  padding: 1rlh 2rlh;
}
```

## 面试相关

- CSS 有哪些相对单位？`em`、`rem`、`vh`、`vw`、`lh`、`rlh`、`ch`、`ex` 等
- `lh` 和 `em` 的区别？`em` 是字体大小，`lh` 是行高，两者数值不同

## 相关笔记

- [[CSS 相对单位汇总]]
