## IntersectionObserve

 `IntersectionObserver` API，可以自动"观察"元素是否可见，Chrome 51+ 已经支持。由于可见（visible）的本质是，目标元素与视口产生一个交叉区，所以这个 API 叫做"交叉观察器"

 ### 一、API

 ```javascript
 let io = new IntersectionObserver(callback, options)
 ````
 上面代码中，`IntersectionObserver`是浏览器原生提供的构造函数，接受两个参数：`callback`是可见性变化时的回调函数，`options`是配置对象（该参数可选）。

构造函数的返回值是一个观察器实例。实例的observe方法可以指定观察哪个 `DOM` 节点。

```javascript
// 开始观察
io.observe(document.getElementById('demo'));

// 停止观察
io.unobserve(element);

// 关闭观察器
io.disconnect()

// 更新：
// 返回所有观察目标的IntersectionObserverEntry对象数组,, 每个对象的目标元素都包含每次相交的信息,
io.takeRecords()

```

### 二、callback参数

目标元素的可见性变化时，就会调用观察器的回调函数`callback`。

`callback`一般会触发两次。一次是目标元素刚刚进入视口（开始可见），另一次是完全离开视口（开始不可见）。

```javascript
let io = new IntersectionObserver((entries, observer) => {
    console.log(entries);
  }
);
```
上面代码中，回调函数采用的是箭头函数的写法。`callback`函数的第一个参数（`entries`）是一个数组，每个成员都是一个`IntersectionObserverEntry`对象。举例来说，如果同时有两个被观察的对象的可见性发生变化，`entries`数组就会有两个成员。`callback`函数的第二个参数是observer,是被调用的`IntersectionObserver`实例

### 三、IntersectionObserverEntry 对象

`IntersectionObserverEntry`对象提供目标元素的信息，一共六个属性。
```javascript
{
  time: 3893.92,
  rootBounds: ClientRect {
    bottom: 920,
    height: 1024,
    left: 0,
    right: 1024,
    top: 0,
    width: 920
  },
  boundingClientRect: ClientRect {
     // ...
  },
  intersectionRect: ClientRect {
    // ...
  },
  intersectionRatio: 0.54,
  target: element
}
```
每个属性的含义如下：
* `time`：可见性发生变化的时间，是一个高精度时间戳，单位为毫秒
* `target`：被观察的目标元素，是一个 DOM 节点对象
* `rootBounds`：根元素的矩形区域的信息，`getBoundingClientRect()`方法的返回值，如果没有根元素（即直接相对于视口滚动），则返回null
* `boundingClientRect`：目标元素的矩形区域的信息
* `intersectionRect`：目标元素与视口（或根元素）的交叉区域的信息
* `intersectionRatio`：目标元素的可见比例，即`intersectionRect`占`boundingClientRect`的比例，完全可见时为1，完全不可见时小于等于0

<font color="orange" size="5">更新</font>

* <font color="orange"> isIntersecting 返回一个布尔值，下列两种操作均会触发 `callback`: 1.如果目标元素出现在 `root` 可视区，返回 `true` 2.如果从 `root` 可视区消失，返回 `false` </font>
  
<img src="https://www.ruanyifeng.com/blogimg/asset/2016/bg2016110202.png">
上图中，灰色的水平方框代表视口，深红色的区域代表四个被观察的目标元素。它们各自的 intersectionRatio 图中都已经注明。

### 四、options

`options` 是一个对象，用来配置参数，也可以不填。共有三个属性，具体如下:
<!-- Markdown 制作表格使用 | 来分隔不同的单元格，使用 - 来分隔表头和其他行。 -->
| 属性       | 说明                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| root       | 指定根(root)元素，用于检查目标的可见性。必须是目标元素的父级元素。如果未指定或者为null，则默认为浏览器视窗。                                                                                                                                                                                                                                                                                                                                                                                                   |
| rootMargin | 根(root)元素的外边距。类似于 CSS 中的 margin 属性，比如 "10px 20px 30px 40px" (top, right, bottom, left)。如果有指定 root 参数，则 rootMargin 也可以使用百分比来取值。该属性值是用作 root 元素和 target 发生交集时候的计算交集的区域范围，使用该属性可以控制 root 元素每一边的收缩或者扩张。默认值为0。                                                                                                                                                                                                        |
| threshold  | 可以是单一的 number 也可以是 number 数组，target 元素和 root 元素相交程度达到该值的时候 IntersectionObserver 注册的回调函数将会被执行。如果你只是想要探测当 target 元素的在 root 元素中的可见性超过50%的时候，你可以指定该属性值为0.5。如果你想要 target 元素在 root 元素的可见程度每多25%就执行一次回调，那么你可以指定一个数组 [0, 0.25, 0.5, 0.75, 1]。默认值是0 (意味着只要有一个 target 像素出现在 root 元素中，回调函数将会被执行)。该值为1.0含义是当 target 完全出现在 root 元素中时候 回调才会被执行。 |
