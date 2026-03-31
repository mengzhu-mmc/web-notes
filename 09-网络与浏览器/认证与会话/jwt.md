# JWT（JSON Web Token）详解

## 面试高频考点

1. JWT 的结构是什么？三部分分别是什么？
2. JWT 和 Session 的核心区别是什么？各自适合什么场景？
3. JWT 如何实现无状态认证？服务端如何验证 JWT 的合法性？
4. JWT 的安全问题有哪些？如何防止 token 被盗用？
5. JWT 的 access token 和 refresh token 分别是什么？为什么要分开？

---

## JWT 是什么

JSON Web Token（JWT）是一种开放标准（RFC 7519），定义了一种**紧凑且自包含**的方式，用于在各方之间以 JSON 对象安全传输信息。常用于**无状态身份认证**和**跨域认证**场景。

参考：[阮一峰 JWT 入门教程](https://www.ruanyifeng.com/blog/2018/07/json_web_token-tutorial.html)

---

## JWT 结构

JWT 由三部分组成，用 `.` 分隔：

```
Header.Payload.Signature
```

### Header（头部）

```json
{
  "alg": "HS256",   // 签名算法（HS256 / RS256 等）
  "typ": "JWT"      // token 类型
}
```

### Payload（载荷）

包含声明（Claims）——关于实体（用户）和其他数据的陈述：

```json
{
  "sub": "1234567",        // subject，通常是用户 ID
  "name": "张三",
  "role": "admin",
  "iat": 1700000000,       // issued at，签发时间（Unix 时间戳）
  "exp": 1700003600        // expiration，过期时间
}
```

> ⚠️ Payload 只是 Base64URL 编码，**不是加密**，任何人都可以解码读取。**不要在 Payload 中存储密码等敏感信息！**

### Signature（签名）

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

签名用于验证 token 没有被篡改。只有持有 `secret` 的服务端才能验证签名是否有效。

---

## JWT 认证流程

```
1. 用户登录（POST /login，发送用户名+密码）
2. 服务端验证成功 → 生成 JWT → 返回给客户端
3. 客户端存储 JWT（localStorage / sessionStorage / httpOnly Cookie）
4. 后续请求在 Header 中携带 JWT：
   Authorization: Bearer <token>
5. 服务端接收请求 → 验证签名 → 解析 Payload → 识别用户
```

---

## JWT vs Session 对比

| 维度 | JWT | Session |
|------|-----|---------|
| **存储位置** | 客户端 | 服务端（Redis/内存/DB）|
| **有无状态** | 无状态 ✅ | 有状态 |
| **可扩展性** | 好（无需共享存储） | 差（分布式需共享 Redis）|
| **跨域支持** | 好（放 Header）| 受限（依赖 Cookie SameSite）|
| **主动失效** | 难（需黑名单，破坏无状态）| 容易（删除服务端 session）|
| **安全性** | 中（payload 可解码，签名防篡改）| 较高（数据在服务端）|
| **适合场景** | 前后端分离 / 微服务 / 移动端 | 传统服务端渲染 / 单体服务 |

---

## JWT 安全问题与防护

### 1. 算法漏洞：alg=none 攻击
早期 JWT 库允许客户端指定 `"alg": "none"` 跳过签名验证。

**防护**：服务端强制指定算法，不接受 `none`。

### 2. 密钥强度不足
HS256 密钥如果太弱，可被暴力破解。

**防护**：密钥长度 ≥ 256 bit，从环境变量读取，不要硬编码。

### 3. Token 被盗用（XSS）
如果 token 存在 localStorage，XSS 攻击可直接读走。

**防护**：
- access token 存内存（`sessionStorage` 或 JS 变量）
- refresh token 存 `httpOnly Cookie`，JS 无法读取

### 4. 无法主动吊销 JWT
JWT 是无状态的，过期前无法直接作废（如踢人下线）。

**解决方案**：
- **黑名单**：将需要吊销的 `jti`（JWT ID）存入 Redis，验证时检查
- **短有效期**：access token 设 15min，配合 refresh token 自动续期
- **版本号**：用户表加 `tokenVersion` 字段，JWT 携带版本号，修改密码时版本+1

---

## 代码示例

### 服务端生成和验证 JWT（Node.js）

```javascript
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET; // 从环境变量读取，勿硬编码

// 登录时生成双 token
function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    SECRET,
    { expiresIn: '15m' }  // access token：短有效期
  );
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    SECRET,
    { expiresIn: '7d' }   // refresh token：长有效期
  );
  return { accessToken, refreshToken };
}

// 验证 token 中间件
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.type !== 'access') throw new Error('Wrong token type');
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
async function login(username, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include', // 允许服务端设置 httpOnly Cookie（存 refresh token）
  });
  const { accessToken } = await res.json();
  // access token 存 sessionStorage（关闭页面自动清除）
  sessionStorage.setItem('accessToken', accessToken);
}

// 每次请求自动携带 token（axios 拦截器）
axios.interceptors.request.use(config => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## 相关笔记

- [Token 认证机制（Token 整体概念与 Access/Refresh Token 设计）](./token.md)
- [双 Token 无感刷新（JWT 的工程落地实践）](./双Token无感刷新.md)
