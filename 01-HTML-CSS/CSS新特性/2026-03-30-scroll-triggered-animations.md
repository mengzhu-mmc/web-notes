# CSS Scroll-Triggered Animations（Chrome 146）

> 来源：[Chrome Developers Blog](https://developer.chrome.com/blog/scroll-triggered-animations) | 日期：2025-12-12（Chrome 146 正式落地 2026-03）

## 核心内容

Chrome 146 正式引入 CSS Scroll-Triggered Animations，告别 `IntersectionObserver` 的命令式写法，用纯 CSS 声明式实现「滚动到某位置时触发动画」。动画在 compositor/worker 线程执行，性能开销低。

---

## 与 Scroll-Driven Animations 的区别

| 特性 | Scroll-Driven | Scroll-Triggered |
|------|---------------|-----------------|
| 驱动方式 | 滚动进度（0→100%）| 滚动到某位置触发 |
| 动画类型 | 进度跟随型 | 时间动画（正常播放/倒播）|
| 停滚 | 动画暂停 | 动画继续播放 |
| 典型场景 | 进度条、视差 | 元素入场/出场动画 |

---

## 关键 CSS 属性

### `timeline-trigger` / `timeline-trigger-name` + `timeline-trigger-source`
定义一个命名触发器，绑定 scroll/view 时间线作为触发源。

```css
/* 简写 */
timeline-trigger:
  --my-trigger        /* 触发器名称 */
  view()              /* 触发源：view progress timeline */
  entry 100% exit 0% /* 激活范围 */
;
```

### `animation-trigger`
将触发器绑定到某个动画，并指定激活/失活时的 action。

```css
animation-trigger: --my-trigger play-forwards play-backwards;
/* 进入激活范围 → play-forwards，离开 → play-backwards */
```

### `trigger-scope`
限制触发器名称的可见范围（类似 `anchor-scope`），避免全局触发器名称冲突。

```css
trigger-scope: --my-trigger;
```

---

## 代码示例

```css
@keyframes slide-in {
  from { transform: translateY(-50%); opacity: 0; }
  to { transform: none; opacity: 1; }
}

.card {
  /* 定义触发器：元素进入 viewport 激活，离开停用 */
  timeline-trigger:
    --t
    view()
    contain 15% contain 85% / entry 100% exit 0%
  ;
  trigger-scope: --t;

  /* 绑定动画 */
  animation: slide-in 0.35s ease-in-out both;
  animation-trigger: --t play-forwards play-backwards;
}
```

**解读：**
1. `contain 15% contain 85%`：激活范围（元素中心进入视口 15%~85% 触发）
2. `entry 100% exit 0%`：活跃范围（完全进入到开始离开时保持活跃）
3. 进入激活范围 → `play-forwards`，离开活跃范围 → `play-backwards`

---

## 激活范围与活跃范围

可以分别指定：
```css
timeline-trigger:
  --t
  view()
  [激活范围] / [活跃范围]
;
```

- **激活范围**：触发器从 inactive → active 的判断条件
- **活跃范围**：触发器保持 active 的范围（可以比激活范围更宽）

---

## JavaScript API

```js
// 通过 Web Animations API 控制
const anim = element.getAnimations()[0];
anim.trigger; // AnimationTrigger 对象
```

---

## 面试相关

- **为什么比 IntersectionObserver 好？** 声明式、worker 线程执行、代码更简洁
- **与 scroll-driven 区别**：triggered 是时间动画+触发点；driven 是进度跟随
- **浏览器支持**：Chrome 146（2026年3月），Firefox/Safari 尚未支持

## 相关笔记

- [[notes/css/scroll-driven-animations]]
- [[notes/css/2026-03-30-web-platform-march-2026]]
