# 双 Token 无感刷新

## 面试高频考点

- 双 Token 机制的工作原理？
- Access Token 为什么不能被服务端"即时撤销"？
- 如果 Refresh Token 被截获怎么办？
- 客户端指纹绑定有哪些方案？

---

## 一、双 Token 机制

**Access Token（短效）：** 有效期通常 5~15 分钟，用于访问业务接口。本质是一张"离线门票"（JWT），服务端不查库，仅通过计算验签。

**Refresh Token（长效）：** 有效期通常 7~30 天，用于换取新的 Access Token。存储在服务端，可以被即时废止。

## 二、为什么不能即时撤销 Access Token？

Access Token（JWT）一旦签发，就像"泼出去的水"。它存储在客户端，服务器数据库里并没有存这条记录，只存了签发它的私钥。

当废除 Refresh Token 时，Access Token 在剩余有效期内依然可以使用。这个延迟窗口为 0 < T ≤ Access Token 有效期。

### 如果必须"即时撤销"？

**方案 A：JWT 黑名单（Redis）** — 将 Token 的 `jti` 存入 Redis，每次请求都查一下。代价是牺牲了无状态 JWT "不查库"的性能优势。

**方案 B：版本号机制** — 在用户表和 JWT Payload 中增加 `token_version` 字段，修改密码时 +1，验证时对比版本号。

**方案 C：关键接口强制查验** — 普通接口只验签名，关键接口（支付、改密）强制去数据库检查用户状态。

## 三、Refresh Token 被截获的防御

### 1. Refresh Token 轮换机制（核心）

每次刷新时，服务端同时返回新的 Access Token 和新的 Refresh Token，旧的 Refresh Token 立即失效。

如果有人试图使用已失效的 Token，服务端触发**熔断保护**：废止该用户所有 Refresh Token，强制重新登录。

### 2. 环境指纹绑定

在签发 Refresh Token 时记录客户端特征，刷新时比对：IP 地址、User-Agent、设备指纹等。

### 3. 存储层面防御

**严禁存放在 LocalStorage：** 极易受 XSS 攻击，一行 `localStorage.getItem('refreshToken')` 就能偷走。

**必须使用 HttpOnly Cookie：**

- `HttpOnly`：JavaScript 无法读取，防御 XSS
- `Secure`：仅通过 HTTPS 传输
- `SameSite`：防止 CSRF 攻击

## 四、客户端指纹获取方式

| 方式 | 字段/来源 | 优缺点 |
| --- | --- | --- |
| User-Agent | HTTP 请求头 | 最基础，容易伪造 |
| IP 地址 | `X-Forwarded-For` / `Remote_Addr` | 误杀率高（WiFi/4G 切换） |
| Client Hints | `Sec-CH-UA` 等 | 现代标准，结构化数据 |
| Canvas 指纹 | 前端 JS 采集 + 自定义 Header | 最安全，推荐方案 |
| Accept-Language | HTTP 请求头 | 辅助判断 |

推荐方案：使用 Canvas 指纹技术生成唯一 ID，通过自定义 Header（如 `X-Device-Id`）传输，强制 HTTPS。
