## 面试高频考点

1. JWT 的结构是什么？三部分分别是什么？
2. JWT 和 Session 的核心区别是什么？各自适合什么场景？
3. JWT 如何实现无状态认证？服务端如何验证 JWT 的合法性？
4. JWT 的安全问题有哪些？如何防止 token 被盗用？
5. JWT 的 access token 和 refresh token 分别是什么？为什么要分开？

---

[JSON Web Token 入门教程](https://www.ruanyifeng.com/blog/2018/07/json_web_token-tutorial.html)

JSON Web Token（缩写 JWT）是目前最流行的跨域认证解决方案。

### JWT 结构

JWT 由三部分组成，用 `.` 分隔：`Header.Payload.Signature`

- **Header**：算法类型（如 HS256）和 token 类型（JWT）
- **Payload**：声明（claims），包含用户信息和过期时间等
- **Signature**：用密钥对前两部分签名，防止篡改

### JWT 和 Session Cookies 的不同

JWT 和 Session Cookies 都提供安全的用户身份验证，但是它们有以下几点不同

#### 密码签名

JWT 具有加密签名，而 Session Cookies 则没有。

#### JSON 是无状态的

JWT 是`无状态`的，因为声明被存储在`客户端`，而不是服务端内存中。

身份验证可以在`本地`进行，而不是在请求必须通过服务器数据库或类似位置中进行。 这意味着可以对用户进行多次身份验证，而无需与站点或应用程序的数据库进行通信，也无需在此过程中消耗大量资源。

#### 可扩展性

Session Cookies 是存储在服务器内存中，这就意味着如果网站或者应用很大的情况下会耗费大量的资源。由于 JWT 是无状态的，在许多情况下，它们可以节省服务器资源。因此 JWT 要比 Session Cookies 具有更强的`可扩展性`。

#### JWT 支持跨域认证

Session Cookies 只能用在`单个节点的域`或者它的`子域`中有效。如果它们尝试通过第三个节点访问，就会被禁止。如果你希望自己的网站和其他站点建立安全连接时，这是一个问题。

使用 JWT 可以解决这个问题，使用 JWT 能够通过`多个节点`进行用户认证，也就是我们常说的`跨域认证`。

---

## 代码示例

### 服务端生成和验证 JWT（Node.js / jsonwebtoken）

```javascript
const jwt = require('jsonwebtoken');
const SECRET = 'your-secret-key'; // 生产环境应从环境变量读取

// 登录时生成 token
function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    SECRET,
    { expiresIn: '15m' }  // access token 短有效期
  );
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    SECRET,
    { expiresIn: '7d' }   // refresh token 长有效期
  );
  return { accessToken, refreshToken };
}

// 验证 token 中间件
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;
    next();
  } catch (err) {
    // TokenExpiredError / JsonWebTokenError
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

### 前端存储和携带 JWT

```javascript
// 登录后存储 token
function login(username, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  const { accessToken, refreshToken } = await res.json();

  // access token 存内存或 sessionStorage（安全，但页面刷新丢失）
  sessionStorage.setItem('accessToken', accessToken);
  // refresh token 存 httpOnly cookie（防 XSS）
  // 由服务端 Set-Cookie 设置
}

// 每次请求携带 token
axios.interceptors.request.use(config => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

作者：程序员cxuan
链接：https://juejin.cn/post/6844904115080790023
来源：稀土掘金
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。
