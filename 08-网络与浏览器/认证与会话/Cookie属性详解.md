# Cookie 属性详解

## 面试高频考点

1. Cookie 的 HttpOnly 属性有什么作用？为什么能防止 XSS？
2. SameSite 属性的三个值有什么区别？如何防止 CSRF？
3. Secure 属性的作用是什么？
4. 如何实现跨子域共享 Cookie（单点登录场景）？
5. Cookie 的 Domain 和 Path 属性如何控制访问范围？

---

## Cookie 完整属性一览

| 属性 | 说明 | 示例 |
|------|------|------|
| `Name=Value` | Cookie 的键值对 | `token=abc123` |
| `Domain` | 哪些域名可以访问该 Cookie | `domain=.example.com` |
| `Path` | 哪些路径下的请求携带该 Cookie | `path=/api` |
| `Expires` | 绝对过期时间（GMT 格式） | `expires=Fri, 31 Dec 2099 23:59:59 GMT` |
| `Max-Age` | 相对过期时间（秒），优先级高于 Expires | `max-age=86400` |
| `HttpOnly` | 禁止 JS 通过 `document.cookie` 读取 | 无值，存在即生效 |
| `Secure` | 仅通过 HTTPS 传输 | 无值，存在即生效 |
| `SameSite` | 控制跨站请求是否携带 Cookie | `samesite=Strict` |

---

## 关键属性详解

### Domain —— 控制访问域名

`Domain` 指定哪些域名可以接收该 Cookie。

```
Set-Cookie: token=abc; Domain=.example.com
```

- 默认值：当前请求域（`www.example.com`），**不含子域**
- 设置为 `.example.com`（带前导点）→ 所有子域（`a.example.com`、`b.example.com`）均可访问
- **单点登录（SSO）场景**：在父域 `.example.com` 设置 Cookie，所有子系统共享登录态

> ⚠️ Cookie 的 `Domain` 不能跨越主域（不能让 `a.com` 的 Cookie 被 `b.com` 读取）

---

### Path —— 控制访问路径

```
Set-Cookie: token=abc; Path=/admin
```

只有匹配 `/admin` 路径及其子路径的请求才会携带该 Cookie。默认为 `/`（全站携带）。

---

### Expires / Max-Age —— 过期控制

```
# 会话 Cookie（不设置 Expires/Max-Age，关闭浏览器就清除）
Set-Cookie: temp=1

# 持久 Cookie（7天后过期）
Set-Cookie: token=abc; Max-Age=604800

# 手动删除 Cookie（将 Max-Age 设为 0 或负数）
Set-Cookie: token=; Max-Age=0
```

- `Max-Age > 0`：持久化到本地，到时间自动删除
- `Max-Age = 0`：立即删除
- 两者同时存在时，`Max-Age` 优先级高于 `Expires`

---

### HttpOnly —— 防 XSS

```
Set-Cookie: token=abc; HttpOnly
```

**效果**：JS 代码无法通过 `document.cookie` 读取该 Cookie，彻底防止 XSS 攻击盗取 Cookie。

```javascript
// 有 HttpOnly 的 Cookie，这行代码拿不到 token
console.log(document.cookie); // token 不会出现在这里
```

> ✅ 敏感 Cookie（sessionId、token）**必须设置** HttpOnly

---

### Secure —— 强制 HTTPS

```
Set-Cookie: token=abc; Secure
```

**效果**：该 Cookie 只会在 HTTPS 连接中被传输，HTTP 请求不携带，防止中间人攻击（MITM）截获。

> 本地开发（`localhost`）例外，Secure Cookie 在 localhost 也可以传输

---

### SameSite —— 防 CSRF

控制跨站请求（不同站点发出的请求）是否携带 Cookie。

| 值 | 说明 | 跨站 GET | 跨站 POST | 场景 |
|----|------|:---:|:---:|------|
| `Strict` | 完全禁止跨站携带 | ❌ | ❌ | 高安全需求（银行）|
| `Lax` | 允许顶层导航的 GET 跨站携带 | ✅（超链接跳转）| ❌ | 大多数网站（**浏览器默认值**）|
| `None` | 不限制，跨站都携带 | ✅ | ✅ | 需要跨站携带（第三方 widget、嵌入式登录），**必须同时设置 Secure** |

```
# 第三方嵌入场景（必须加 Secure）
Set-Cookie: token=abc; SameSite=None; Secure

# 大多数业务场景
Set-Cookie: token=abc; SameSite=Lax
```

> **CSRF 防护原理**：`SameSite=Strict/Lax` 时，从 `evil.com` 发往 `bank.com` 的请求不会携带 `bank.com` 的 Cookie，CSRF 攻击无法伪造身份。

---

## 代码示例

### 服务端设置安全 Cookie（Node.js / Express）

```javascript
// 登录成功后设置安全 Cookie
res.cookie('sessionId', sessionId, {
  httpOnly: true,            // 禁止 JS 读取，防 XSS
  secure: true,              // 仅 HTTPS 传输
  sameSite: 'Lax',           // 防 CSRF（大多数场景用 Lax）
  domain: '.example.com',    // 允许所有子域访问（SSO 场景）
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7天过期（毫秒）
  path: '/',
});
```

### 前端操作非 HttpOnly Cookie

```javascript
// 读取指定 Cookie
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// 设置 Cookie（JS 设置的不能加 httpOnly）
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

// 删除 Cookie
function deleteCookie(name) {
  document.cookie = `${name}=; max-age=0; path=/`;
}
```

---

## 最佳实践组合

```
# 最安全的 Cookie 配置（生产环境推荐）
Set-Cookie: sessionId=xxx;
  HttpOnly;          # 防 XSS
  Secure;            # 强制 HTTPS
  SameSite=Lax;      # 防 CSRF
  Domain=.example.com;
  Path=/;
  Max-Age=86400;
```

> **记忆口诀**：**H**ttp**O**nly 防偷，**S**ecure 防窃，**SameSite** 防跨站伪造 🔒
