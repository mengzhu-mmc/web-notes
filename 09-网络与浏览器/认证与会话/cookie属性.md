## 面试高频考点

1. Cookie 的 HttpOnly 属性有什么作用？为什么能防止 XSS？
2. SameSite 属性的三个值有什么区别？如何防止 CSRF？
3. Secure 属性的作用是什么？
4. 如何实现跨子域共享 Cookie（单点登录场景）？
5. Cookie 的 Domain 和 Path 属性如何控制访问范围？

---

### cookie属性

<img src="./cookie属性.jpg" width=600 align=left />



#### Domain

>  一般在实现单点登录的时候会经常用到这个属性，通过在父级域设置Cookie，然后在各个子级域拿到存在父级域中的Cookie值。

domain表示的是cookie所在的域，默认为请求的地址，如网址为www.study.com/study，那么domain默认为www.study.com。而跨域访问，如域A为`t1.study.com`，域B为`t2.study.com`，那么在域A生产一个令域A和域B都能访问的cookie就要将该cookie的domain设置为`.study.com`


#### Secure属性 `安全相关`

标记为 Secure 的 Cookie 只应通过被HTTPS协议加密过的请求发送给服务端。使用 HTTPS 安全协议，可以保护 Cookie 在浏览器和 Web 服务器间的传输过程中不被窃取和篡改。

#### HTTPOnly `安全相关`

设置 HTTPOnly 属性可以防止客户端脚本通过 document.cookie 等方式访问 Cookie，有助于避免 XSS 攻击。

#### SameSite `安全相关`

> 1. **Strict** 仅允许一方请求携带 Cookie，即浏览器将只发送相同站点请求的 Cookie，即当前网页 URL 与请求目标 URL 完全一致。
> 2. **Lax** 大部分情况也不允许跨站传递Cookie，但是对于较为安全的场景：超链接跳转，get类型的Form表单，是允许的。这个模式是大部分浏览器的SameSite的默认取值
> 3. **None** 无论是否跨站都会发送 Cookie

确保携带Cookie发起请求的网站和请求目标的服务是同站。

作用：SameSite 属性可以让 Cookie 在跨站请求时不会被发送，从而可以阻止跨站请求伪造攻击（CSRF）。

---

## 代码示例

### 服务端设置安全 Cookie（Node.js / Express）

```javascript
// 登录成功后设置安全 Cookie
res.cookie('sessionId', sessionId, {
  httpOnly: true,       // 禁止 JS 读取，防 XSS
  secure: true,         // 仅 HTTPS 传输
  sameSite: 'Strict',   // 禁止跨站携带，防 CSRF
  domain: '.study.com', // 允许所有子域访问（单点登录场景）
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7天过期
});
```

### 前端读取 Cookie（非 HttpOnly）

```javascript
// 读取指定 Cookie 的工具函数
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// 设置 Cookie（JS 设置的 cookie 不能带 httpOnly）
document.cookie = `theme=dark; path=/; max-age=${7 * 24 * 3600}`;

// 删除 Cookie（将过期时间设为过去）
document.cookie = 'theme=; path=/; max-age=0';
```

