HTTP 请求头和响应头是客户端与服务端通信的核心元数据，分别承载**请求的附加信息**和**响应的状态 / 资源描述信息**，遵循「键值对」格式，部分字段为通用型（请求 / 响应均可使用），部分为专属型。以下按**请求头、响应头、通用头**三类梳理**前端开发高频常见的 Header 字段**，并说明核心作用，同时标注前端开发中关注的**重点 / 高频使用场景**：

# 一、HTTP 请求头（Request Header）

由客户端（浏览器 / 前端请求库）发送给服务端，告知服务端**请求的来源、意图、支持的格式、认证信息**等，前端开发中常需手动配置（如 axios/fetch）。

| 字段名                 | 核心作用                                                                           | 前端关注重点                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Accept`            | 声明客户端**支持的响应数据格式**（MIME 类型），服务端按此返回对应格式                                        | 需匹配服务端支持的格式，如`application/json`（接口请求）、`text/html`（页面请求）、`image/*`（图片请求）                                                                                                          |
| `Accept-Encoding`   | 声明客户端**支持的压缩算法**，服务端按此压缩响应体，减少传输体积                                             | 前端无需手动配置（浏览器默认），常见值`gzip, deflate, br`（br 压缩率最高，主流服务端支持）                                                                                                                         |
| `Accept-Language`   | 声明客户端**偏好的语言**，服务端按此返回多语言内容                                                    | 国际化项目中可手动设置，如`zh-CN,zh;q=0.9,en;q=0.8`（q 为权重，0-1）                                                                                                                                |
| `Authorization`     | 携带**身份认证信息**，用于接口鉴权                                                            | 前端高频使用，如`Bearer token`（JWT 鉴权）、`Basic 编码串`（基础认证），登录后随请求携带                                                                                                                        |
| `Cache-Control`     | 声明客户端的**缓存策略**，告知服务端如何处理缓存                                                     | 前端可设置`no-cache`（强制验证缓存）、`no-store`（不缓存），避免接口返回旧数据                                                                                                                                |
| `Content-Type`      | 声明**请求体的 MIME 类型**，服务端按此解析请求数据                                                 | **前端核心必配字段**，接口请求高频值：<br><br>`application/json`（JSON 传参，POST/PUT）<br><br>`application/x-www-form-urlencoded`（表单普通提交）<br><br>`multipart/form-data`（文件上传）<br><br>`text/plain`（纯文本） |
| `Content-Length`    | 声明**请求体的字节大小**，服务端按此接收完整请求体                                                    | 浏览器 / 请求库自动计算，前端无需手动配置，仅在手动构造请求时需关注                                                                                                                                              |
| `Cookie`            | 携带客户端本地的**Cookie 键值对**，服务端通过此识别用户状态                                            | 前端无需手动配置（浏览器自动携带同域 Cookie），跨域请求需配置`withCredentials: true`才会携带                                                                                                                    |
| `Host`              | 声明请求的**目标服务器域名 + 端口**，HTTP/1.1 必传，用于服务端虚拟主机解析                                  | 浏览器自动生成，前端无需配置，如`www.baidu.com:80`                                                                                                                                               |
| `Origin`            | 声明请求的**源（协议 + 域名 + 端口）**，服务端用于**跨域 CORS 验证**                                   | 跨域请求核心字段，浏览器自动生成，服务端需配置`Access-Control-Allow-Origin`匹配此值                                                                                                                         |
| `Referer`           | 声明请求的**来源页面 URL**，服务端用于统计 / 防盗链 / 跨域验证                                         | 1. 防盗链：服务端判断 Referer 是否为白名单，非白名单拒绝返回资源（如图片）；2. 跨域时浏览器会携带（除直接输入 URL）；3. 可手动隐藏（隐私需求）                                                                                               |
| `User-Agent (UA)`   | 声明**客户端的设备 / 浏览器 / 系统信息**，服务端用于适配 / 统计 / 反爬                                    | 浏览器自动生成，如`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...`；反爬场景中前端可能需模拟 UA                                                                                 |
| `X-Requested-With`  | 声明请求是否为**AJAX 异步请求**，主流值`XMLHttpRequest`                                       | 服务端用于区分「普通页面请求」和「AJAX 请求」，前端框架 / 请求库自动携带，部分后端接口会校验此字段                                                                                                                            |
| `If-Modified-Since` | 缓存验证字段：携带**上次请求的资源最后修改时间**，服务端对比后，若资源未修改则返回 304（不返回体），否则返回 200 + 新资源           | 浏览器自动缓存并携带，前端可通过`Cache-Control`控制是否触发                                                                                                                                            |
| `If-None-Match`     | 缓存验证字段：携带**上次请求的资源 ETag 值**（唯一标识），优先级高于`If-Modified-Since`，服务端对比 ETag 判断资源是否修改 | 精准缓存验证，适用于动态资源（如接口数据），避免 304 误判                                                                                                                                                  |
| `Range`             | 声明**断点续传 / 分片请求的资源范围**，如请求文件的某一部分                                              | 前端文件上传 / 下载（如大文件分片、视频倍速播放）时配置，如`bytes=0-1023`（请求前 1024 字节）                                                                                                                       |

## 前端高频自定义请求头

部分业务场景中，前端会自定义请求头（如业务标识、版本号），格式通常以`X-`开头（非规范，但成行业惯例），如：

- `X-App-Version`：携带 APP / 前端项目版本，服务端做版本兼容；
- `X-Device-Type`：携带设备类型（pc/mobile/wechat），服务端做适配；
- `X-Trace-Id`：链路追踪 ID，用于前后端问题排查。

**注意**：跨域请求中，**自定义请求头**会触发浏览器**OPTIONS 预检请求**，服务端需配置`Access-Control-Allow-Headers`允许该字段，否则跨域失败。

# 二、HTTP 响应头（Response Header）

由服务端发送给客户端，告知客户端**响应的状态、资源属性、缓存规则、跨域权限**等，前端需解析部分字段实现业务逻辑（如获取 Cookie、解析 ETag）。

|字段名|核心作用|前端关注重点|
|---|---|---|
|`Access-Control-*`|CORS 跨域核心字段，服务端配置后允许跨域请求，为前端跨域的核心配置|前端跨域必关注，高频子字段：<br><br>1. `Access-Control-Allow-Origin`：允许的跨域源（`*`表示所有，生产不推荐；或具体源如`https://xxx.com`）<br><br>2. `Access-Control-Allow-Methods`：允许的 HTTP 方法（GET/POST/PUT/DELETE 等）<br><br>3. `Access-Control-Allow-Headers`：允许的请求头（含自定义头）<br><br>4. `Access-Control-Allow-Credentials`：是否允许跨域携带 Cookie（true/false，需与前端`withCredentials`配合）<br><br>5. `Access-Control-Max-Age`：OPTIONS 预检请求的缓存时间（秒），避免重复预检|
|`Cache-Control`|服务端声明**资源的缓存策略**，客户端按此缓存资源，是前端性能优化核心|**前端性能优化重点**，高频值：<br><br>`public`：所有缓存层均可缓存（如 CDN / 浏览器）<br><br>`private`：仅客户端浏览器缓存（如用户专属数据）<br><br>`max-age=xxx`：缓存有效时间（秒），如`max-age=3600`（1 小时）<br><br>`no-cache`：强制客户端先向服务端验证缓存（再使用）<br><br>`no-store`：不缓存任何资源（如敏感接口数据）|
|`Content-Type`|声明**响应体的 MIME 类型 + 字符编码**，客户端按此解析数据|前端核心关注，如`application/json;charset=utf-8`（JSON 接口）、`text/html;charset=utf-8`（页面）、`image/png`（图片）、`video/mp4`（视频）；若编码错误会导致中文乱码|
|`Content-Encoding`|声明服务端**使用的压缩算法**，客户端按此解压响应体|浏览器自动解压，前端无需处理，常见值`gzip/br/deflate`|
|`Content-Length`|声明**响应体的字节大小**，客户端按此接收完整响应体|浏览器自动处理，大文件下载时可结合此值计算下载进度|
|`Content-Disposition`|声明**响应资源的下载方式**，用于文件下载功能|前端文件下载核心字段，服务端配置`attachment;filename=xxx.pdf`（触发浏览器下载，文件名 xxx.pdf）；若为`inline`则在浏览器内打开（如图片 / PDF）|
|`Content-Range`|配合`Range`请求，声明**返回的资源分片范围**，用于断点续传 / 分片下载|大文件分片下载时，前端解析此值获取当前下载的范围和总大小，如`bytes 0-1023/10240`（已下载 0-1023 字节，总 10240 字节）|
|`Set-Cookie`|服务端向客户端**写入 / 修改 Cookie**，客户端将 Cookie 保存在本地|前端状态管理（如用户登录态）核心字段，属性可附带：<br><br>`max-age=xxx`：Cookie 有效期（秒）<br><br>`expires=xxx`：Cookie 过期时间（优先级低于 max-age）<br><br>`path=/`：Cookie 生效的路径<br><br>`domain=xxx.com`：Cookie 生效的域名<br><br>`HttpOnly`：禁止 JS 通过`document.cookie`读取（防 XSS 攻击，前端无法操作）<br><br>`Secure`：仅 HTTPS 协议下携带<br><br>`SameSite`：防 CSRF 攻击（Strict/Lax/None）|
|`ETag`|资源的**唯一标识**（由服务端生成，如文件哈希 / 数据指纹），用于缓存验证|前端缓存优化重点，浏览器会缓存 ETag，下次请求时通过`If-None-Match`携带，服务端对比后返回 304（节省带宽）|
|`Last-Modified`|声明**资源的最后修改时间**，用于缓存验证，优先级低于 ETag|浏览器缓存后，下次请求通过`If-Modified-Since`携带，服务端对比时间判断资源是否修改|
|`Location`|配合**重定向状态码**（301/302/307/308），声明重定向的目标 URL|浏览器自动跳转到该 URL，前端无需处理；若为接口重定向，可通过请求库配置是否跟随重定向|
|`Refresh`|声明**浏览器自动刷新 / 跳转的时间和 URL**，用于页面自动刷新 / 重定向|如`3;url=https://xxx.com`（3 秒后跳转到[xxx.com](https://xxx.com)），前端一般用 JS 实现，服务端配置较少|
|`Server`|声明**服务端的软件信息**，如 Nginx/Apache/Node.js|仅做信息统计，前端无需关注，部分服务端会隐藏此字段（安全需求）|
|`Transfer-Encoding`|声明**响应体的传输编码方式**，常见`chunked`（分块传输）|服务端返回动态生成的大响应体时使用（如流式接口），浏览器自动分块接收，前端可通过流式解析（如 Fetch 的 ReadableStream）|
|`WWW-Authenticate`|配合 401（未授权）状态码，声明**服务端要求的认证方式**|如`Basic realm="xxx"`（基础认证），前端接收到后需携带`Authorization`重新请求|

# 三、HTTP 通用头（General Header）

**请求头和响应头均可使用**，主要用于描述**请求 / 响应的通用元数据**，无业务指向性，前端关注较少但需了解。

|字段名|核心作用|适用场景|
|---|---|---|
|`Cache-Control`|缓存策略（前文已详细说明）|请求 / 响应均可用，响应端配置优先级更高|
|`Connection`|声明**TCP 连接的管理方式**，HTTP/1.1 默认`keep-alive`（长连接）|长连接可减少 TCP 握手次数，提升性能；`close`表示请求完成后关闭连接|
|`Date`|声明**请求 / 响应的发送时间**（GMT 格林威治时间）|服务端 / 浏览器自动生成，用于缓存验证、时间同步|
|`Pragma`|历史缓存字段，HTTP/1.0 的`no-cache`等效于 HTTP/1.1 的`Cache-Control: no-cache`|兼容老旧浏览器，响应头中配置`Pragma: no-cache`可强制不缓存|
|`Trailer`|声明**响应体尾部的附加头字段**，用于分块传输（`chunked`）|流式响应中，服务端在响应体尾部补充元数据（如校验和）|
|`Transfer-Encoding`|传输编码方式（前文已说明）|主要用于响应头，请求头极少使用|
|`Upgrade`|声明**协议升级请求**，如 HTTP 升级为 WebSocket/HTTPS|前端 WebSocket 握手时，浏览器会发送`Upgrade: websocket`+`Connection: Upgrade`，是 WebSocket 协议切换的核心字段|
|`Via`|声明**请求 / 响应经过的代理服务器**信息|代理 / CDN 场景中使用，用于链路追踪|

# 四、前端开发核心高频 Header 速记（重点中的重点）

### 1. 接口请求必配 / 必关注

- 请求头：`Content-Type`（传参格式）、`Authorization`（鉴权）、`Origin`（跨域）
- 响应头：`Content-Type`（解析格式）、`Access-Control-*`（跨域）、`Set-Cookie`（登录态）

### 2. 跨域开发核心（CORS）

服务端必须配置的 3 个响应头：

`Access-Control-Allow-Origin`、`Access-Control-Allow-Methods`、`Access-Control-Allow-Headers`（自定义头时）；

若需跨域带 Cookie，需配合：

前端`withCredentials: true` + 服务端`Access-Control-Allow-Credentials: true`（且`Allow-Origin`不能为`*`）。

### 3. 性能优化（缓存）

- 强缓存：`Cache-Control: max-age=xxx`（优先级）+ `Expires`（兼容）
- 协商缓存：`ETag`/`Last-Modified` + 前端`If-None-Match`/`If-Modified-Since`
- 资源压缩：`Accept-Encoding`（请求）+ `Content-Encoding`（响应）（gzip/br）

### 4. 文件下载 / 分片

- 下载：`Content-Disposition: attachment;filename=xxx`
- 分片 / 断点续传：`Range`（请求）+ `Content-Range`（响应）

### 5. 安全相关

- `HttpOnly`/`Secure`/`SameSite`（Set-Cookie 的属性，防 XSS/CSRF）
- `Referer`（防盗链）
- `Origin`（跨域验证）

# 五、补充说明

1. **字段大小写不敏感**：HTTP Header 字段名大小写不影响解析（如`content-type`和`Content-Type`等效），但行业惯例为**首字母大写，连字符后首字母大写**；
2. **值可带权重**：如`Accept-Language: zh-CN,zh;q=0.9`，`q`为权重（0-1，默认 1），服务端按权重优先返回；
3. **OPTIONS 预检请求**：跨域中，当请求为「非简单请求」（如 PUT/DELETE、自定义头、Content-Type 为 multipart/form-data），浏览器会先发送 OPTIONS 请求，验证服务端是否允许跨域，**预检请求无请求体**，服务端需正常响应（200/204）；
4. **WebSocket 握手的 Header**：WebSocket 基于 HTTP 握手，请求头会携带`Upgrade: websocket`、`Connection: Upgrade`、`Sec-WebSocket-Key`等，服务端响应头会返回`Sec-WebSocket-Accept`完成握手。