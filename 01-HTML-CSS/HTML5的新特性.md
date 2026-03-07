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

### 4. [HTML5 拖放](1.HTML5拖拽.html)

 		拖放是一种常见的特性，即抓取对象以后拖到另一个位置。在 HTML5 中，拖放是标准的一部分，任何元素都能够拖放。

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

### 10.[Web Workers](4.Web Workers.html)

web worker 是运行在后台的 JavaScript，独立于其他脚本，不会影响页面的性能。您可以继续做任何愿意做的事情：点击、选取内容等等，而此时 web worker 在后台运行。 关于web worker的应用大概分为三个部分：

- 一. 创建 web worker 文件，worker文件是一个单独的`js`文件，写好逻辑后，通过`postMessage()`方法吧数据发送出去
- 二. 调用页面创建worker对象，`var w = new Worker("worker文件路径")`.然后通过实例对象调用`onmessage`事件进行监听，并获取worker文件里返回的数据
- 三.终止web worker，当我们的web worker创建后会持续的监听它，需要中止的时候则使用实例上的方法`w.terminate()`。





















