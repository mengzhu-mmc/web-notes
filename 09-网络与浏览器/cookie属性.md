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

