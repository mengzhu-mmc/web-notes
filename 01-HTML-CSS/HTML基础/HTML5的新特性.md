# HTML5新特性

### 1. 语义化标签

+ **<header>**
+ **<nav>**
+ **<article>**
+ **<main>**
+ **<aside>**
+ **<foot>**
+ **<section>**
+ **<mark>**  ( 定义带有记号的文本 )

### 2. 增强型表单

+ **<color>**
+ **<date>**
+ **<email>**
+ **<number>**
+ **<tel>**

### 3. Canvas

`<canvas>` 元素用于图形的绘制。通过脚本（通常是JS）来完成。

### 4. HTML5 拖放

拖放是一种常见的特性，即抓取对象以后拖到另一个位置。在 HTML5 中，拖放是标准的一部分，任何元素都能够拖放。

HTML5 原生拖拽的核心要点：

- 拖拽源加 `draggable="true"`，开启拖拽功能
- 放置目标的 `dragenter`/`dragover` 必须阻止默认行为，否则 `drop` 不触发
- 通过 `dragstart` 的 `setData` 传递数据，`drop` 的 `getData` 获取数据

### 5. HTML Audio(音频)、Video(视频)

1. HTML5 规定了在网页上嵌入音频元素的标准，即使用 <audio> 元素。

```html
<audio controls>
    <sourcesrc="horse.ogg"type="audio/ogg">
    <sourcesrc="horse.mp3"type="audio/mpeg">
    您的浏览器不支持 audio 元素。
</audio>
```

2. HTML5 规定了在网页上嵌入音频元素的标准，即使用 <audio> 元素。

```html
<video width="320"height="240"controls>
<sourcesrc="movie.mp4"type="video/mp4">
<sourcesrc="movie.ogg"type="video/ogg">
您的浏览器不支持Video标签。
</video>
```

### 6. **HTML5 Web 存储（Web Storage）**

1. `localStorage`
   
    + 特点：长时间保存用户数据，能维持在多个会话范围内。
    
2.  `sessionStorage`
    
    + 浏览器当前窗口有效（如果浏览器当前窗口关闭，`sessionStorage`中的所有数据都会被清空)
    
    ​           在之前，这些都是由 cookie 完成的。但是 cookie 不适合大量数据的存储，因为它们由每个对服务器的请求来传递，这使得 cookie 速度很慢而且效率也不高。
    
    
    ​		在 HTML5 中，数据不是由每个服务器请求传递的，而是只有在请求时使用数据。它使在不影响网站性能的情况下存储大量数据成为可能。对于不同的网站，数据存储于不同的区域，并且一个网站只能访问其自身的数据。
    
    ```
    localStorage.setItem('key', 'val') // 存储数据
    localStorage.getItem('key') // 取数据
    localStorage.removeItem('key')   // 删除数据
    localStorage.clear() // 删除所有数据
    localStorage.key(index)  // 获取某个索引数据的
    sessionStorage.setItem('key', 'val') // 存储数据
    sessionStorage.getItem('key') // 取数据
    sessionStorage.removeItem('key')   // 删除数据
    ```
    
    **注意：`localStorage`和`sessionStorage`存储的数据都是字符串类型的数据，取出来的数据也是字符串类型，因此如果存储的对象不是字符串，则要转换成字符串数据类型**

### 7.离线存储

​		HTML5 引入了应用程序缓存，这意味着 web 应用可进行缓存，并可在没有因特网连接时进行访问。

应用程序缓存为应用带来三个优势： 

- 离线浏览 - 用户可在应用离线时使用它们
- 速度 - 已缓存资源加载得更快
- 减少服务器负载 - 浏览器将只从服务器下载更新过或更改过的资源。

所有主流浏览器均支持应用程序缓存，除了 Internet Explorer。

```
<!DOCTYPE html>
<html manifest="/example/html5/demo_html.appcache">
<body>
<script type="text/javascript" src="/example/html5/demo_time.js">
</script>
<p id="timePara"><button onclick="getDateTime()">获得日期和事件</button></p>
<p><img src="/i/w3school_banner.gif" /></p>
<p>请打开<a href="/example/html5/html5_html_manifest.html" target="_blank">这个页面</a>，然后脱机浏览，重新加载页面。页面中的脚本和图像依然可用。</p>
</body>
</html>
```

#### Manifest 文件

manifest 文件是简单的文本文件，它告知浏览器被缓存的内容（以及不缓存的内容）。

manifest 文件可分为三个部分：

- *CACHE MANIFEST* - 在此标题下列出的文件将在首次下载后进行缓存
- *NETWORK* - 在此标题下列出的文件需要与服务器的连接，且不会被缓存
- *FALLBACK* - 在此标题下列出的文件规定当页面无法访问时的回退页面（比如 404 页面）

### 8.地理定位

​        地理定位这个特性，故名思意，就是获取用户位置信息的。通过`getCurrentPosition()`获取一系列定位信息，`getCurrentPosition()`有两个回调函数参数，获取地理位置成功的回调和失败的回调。

```
navigator.geolocation.getCurrentPosition(successPos)
function successPos (pos){
	console.log('用户定位数据获取成功')
	//console.log(arguments);
	console.log('定位时间：',pos.timestamp)
	console.log('经度：',pos.coords.longitude)
	console.log('纬度：',pos.coords.latitude)
	console.log('海拔：',pos.coords.altitude)
	console.log('速度：',pos.coords.speed)
}
```

### 9.WebSocket

​		`WebSocket `是 HTML5 开始提供的一种在单个 TCP 连接上进行全双工通讯的协议。

​		`WebSocket` 使得客户端和服务器之间的数据交换变得更加简单，允许服务端主动向客户端推送数据。在 `WebSocket API 中`，浏览器和服务器只需要完成一次握手，两者之间就直接可以创建持久性的连接，并进行双向数据传输。

​		在` WebSocket API `中，浏览器和服务器只需要做一个握手的动作，然后，浏览器和服务器之间就形成了一条快速通道。两者之间就直接可以数据互相传送。

**`WebSocket` 属性**

- `Socket.readyState` 只读属性,表示连接状态：0 - 表示连接尚未建立，1 - 表示连接已建立，可以进行通信，2 - 表示连接正在进行关闭，3 - 表示连接已经关闭或者连接不能打开。
- `Socket.bufferedAmount` 只读属性,已被 send() 放入正在队列中等待传输，但是还没有发出的 UTF-8 文本字节数。

**`WebSocket `事件**

- `Socket.onopen` 连接建立时触发
- `Socket.onmessage` 客户端接收服务端数据时触发
- `Socket.onerror` 通信发生错误时触发
- `Socket.onclose` 连接关闭时触发

```
 function WebSocketTest()
     {
        if ("WebSocket" in window)
        {
           alert("您的浏览器支持 WebSocket!");
           
           // 打开一个 web socket
           var ws = new WebSocket("ws://localhost:9998/echo");
            
           ws.onopen = function()
           {
              // Web Socket 已连接上，使用 send() 方法发送数据
              ws.send("发送数据");
              alert("数据发送中...");
           };
            
           ws.onmessage = function (evt) 
           { 
              var received_msg = evt.data;
              alert("数据已接收...");
           };
            
           ws.onclose = function()
           { 
              // 关闭 websocket
              alert("连接已关闭..."); 
           };
        }
        
        else
        {
           // 浏览器不支持 WebSocket
           alert("您的浏览器不支持 WebSocket!");
        }
     }
     
    WebSocketTest()
```

**注意：由于Worker属于外部文件，因此它不能获取`javascript`这些对象：` window `对象，`document` 对象，`parent` 对象**。

---

## 现代 HTML API 补充（面试加分 + 日常实用）

### `<dialog>` 元素 — 原生模态框

无需第三方库，浏览器原生支持模态对话框（Chrome 37+，主流浏览器全支持）。

```html
<dialog id="myDialog">
  <h2>确认删除</h2>
  <p>此操作不可撤销，确定要删除吗？</p>
  <button id="confirmBtn">确认</button>
  <button id="cancelBtn">取消</button>
</dialog>

<button id="openBtn">打开对话框</button>
```

```js
const dialog = document.getElementById('myDialog')

// 打开：show() 非模态（不阻断背景交互）
dialog.show()

// 打开：showModal() 模态（背景不可点击，ESC 键可关闭）
document.getElementById('openBtn').onclick = () => dialog.showModal()

// 关闭
document.getElementById('cancelBtn').onclick = () => dialog.close()
document.getElementById('confirmBtn').onclick = () => {
  dialog.close('confirmed') // 可传返回值
  deleteItem()
}

// 监听关闭事件
dialog.addEventListener('close', () => {
  console.log('返回值:', dialog.returnValue) // 'confirmed' 或 ''
})

// 点击背景关闭
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close()
})
```

```css
/* CSS 样式 */
dialog::backdrop {
  background: rgba(0, 0, 0, 0.5); /* 半透明遮罩 */
  backdrop-filter: blur(2px);
}
dialog[open] {
  border-radius: 8px;
  padding: 24px;
}
```

> 📌 **扩展阅读**：`closedBy` 属性（控制 dialog 如何被关闭：`any` / `closerequest` / `none`）详见 [CSS新特性/dialog-closedby.md](../CSS新特性/dialog-closedby.md)

### `popover` Attribute — HTML Popover API

无需 JS 即可实现弹出层/气泡框（Chrome 114+）。

```html
<!-- 触发按钮 + popovertarget 指向弹出层 id -->
<button popovertarget="my-popover">打开 Popover</button>

<div id="my-popover" popover>
  <p>这是一个 Popover 内容</p>
  <button popovertarget="my-popover" popovertargetaction="hide">关闭</button>
</div>
```

```js
// 也可以用 JS 控制
const popover = document.getElementById('my-popover')
popover.showPopover()  // 显示
popover.hidePopover()  // 隐藏
popover.togglePopover() // 切换

// popover 和 dialog 的区别：
// - popover 默认点击外部会关闭（light dismiss）
// - popover 不阻断背景交互
// - dialog 是模态，必须主动关闭
```

### `<details>` + `<summary>` — 原生折叠

不用 JS 实现手风琴/折叠展开效果：

```html
<details>
  <summary>点击展开详情</summary>
  <p>这里是折叠的内容，可以包含任意 HTML</p>
  <ul>
    <li>列表项 1</li>
    <li>列表项 2</li>
  </ul>
</details>

<!-- 默认展开 -->
<details open>
  <summary>默认展开的内容</summary>
  <p>这个默认是展开状态</p>
</details>
```

```js
// JS 监听折叠/展开
const details = document.querySelector('details')
details.addEventListener('toggle', () => {
  console.log(details.open ? '展开了' : '折叠了')
})
```

### View Transitions API — 页面切换动画

实现流畅的页面/状态切换动画（Chrome 111+）。

```js
// 基本用法：用 startViewTransition 包裹 DOM 更新
document.startViewTransition(() => {
  // 更新 DOM（如路由切换、内容更新）
  document.getElementById('content').innerHTML = newContent
})

// 自定义过渡动画（CSS）
// ::view-transition-old(root) — 旧页面
// ::view-transition-new(root) — 新页面
```

```css
/* 自定义淡入淡出 */
@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slide-out {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(-100%); opacity: 0; }
}

::view-transition-old(root) {
  animation: 300ms ease slide-out;
}

::view-transition-new(root) {
  animation: 300ms ease slide-in;
}

/* 对指定元素单独设置过渡（需要 view-transition-name）*/
.hero-image {
  view-transition-name: hero; /* 跨页面共享元素动画 */
}
```

```js
// React Router / SPA 中使用
async function navigate(newUrl) {
  if (!document.startViewTransition) {
    // 降级处理
    updatePage(newUrl)
    return
  }
  await document.startViewTransition(() => updatePage(newUrl)).ready
}
```

### `inert` 属性 — 无障碍重要属性

让元素及其所有子元素变为不可交互状态（不可点击、不可 Tab 聚焦、不被屏幕阅读器读取）。

```html
<!-- 当 dialog 打开时，背景内容应该 inert -->
<main id="mainContent">
  <!-- 主要内容 -->
</main>

<dialog id="modal">
  <!-- 对话框内容 -->
</dialog>
```

```js
const modal = document.getElementById('modal')
const main = document.getElementById('mainContent')

// 打开 modal 时，背景内容设为 inert
modal.showModal()
main.inert = true  // 背景不可交互，屏幕阅读器会忽略

// 关闭 modal 时，恢复交互
modal.close()
main.inert = false
```

```html
<!-- 骨架屏加载时禁止交互 -->
<section inert aria-busy="true">
  <!-- 内容加载中... -->
</section>

<!-- 分步表单中隐藏非当前步骤 -->
<div id="step2" inert hidden>
  <!-- 第二步内容，当前步骤不在这里 -->
</div>
```

**为什么比 `pointer-events: none` 更好**：`pointer-events: none` 只禁止鼠标事件，不禁止键盘 Tab 导航；`inert` 同时禁止鼠标、键盘和屏幕阅读器，是无障碍访问（a11y）的最佳实践。

### 10.[Web Workers](4.Web Workers.html)

web worker 是运行在后台的 JavaScript，独立于其他脚本，不会影响页面的性能。您可以继续做任何愿意做的事情：点击、选取内容等等，而此时 web worker 在后台运行。 关于web worker的应用大概分为三个部分：

- 一. 创建 web worker 文件，worker文件是一个单独的`js`文件，写好逻辑后，通过`postMessage()`方法吧数据发送出去
- 二. 调用页面创建worker对象，`var w = new Worker("worker文件路径")`.然后通过实例对象调用`onmessage`事件进行监听，并获取worker文件里返回的数据
- 三.终止web worker，当我们的web worker创建后会持续的监听它，需要中止的时候则使用实例上的方法`w.terminate()`。





















