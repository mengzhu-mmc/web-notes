# Web 安全深入

## 面试高频考点

- XSS 攻击的原理和防御？
- CSRF 攻击的原理和防御？
- SQL 注入如何防御？
- HTTPS 为什么安全？
- Content Security Policy（CSP）是什么？

---

## 一、XSS（跨站脚本攻击）

### 原理

攻击者将恶意脚本注入到网页中，当其他用户访问时，脚本在其浏览器中执行。

### 三种类型

**1. 存储型 XSS（持久型，危害最大）**

```
攻击流程：
1. 攻击者在评论框输入：<script>document.cookie 发送给攻击者</script>
2. 服务端未过滤，存入数据库
3. 其他用户访问页面，服务端返回含恶意脚本的 HTML
4. 脚本在用户浏览器执行，窃取 Cookie
```

**2. 反射型 XSS（非持久型）**

```
攻击流程：
1. 攻击者构造恶意 URL：https://example.com/search?q=<script>...</script>
2. 诱导用户点击
3. 服务端将 q 参数直接拼入 HTML 返回
4. 脚本执行
```

**3. DOM 型 XSS**

```js
// 漏洞代码：直接将 URL 参数插入 DOM
const name = location.search.split('name=')[1];
document.getElementById('greeting').innerHTML = 'Hello, ' + name;
// 攻击：?name=<img src=x onerror=alert(1)>
```

### 防御措施

```js
// 1. 输入过滤（转义 HTML 特殊字符）
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// 2. 使用 textContent 而不是 innerHTML
element.textContent = userInput; // ✅ 安全
element.innerHTML = userInput;   // ❌ 危险

// 3. React 默认转义（JSX 中的 {} 会自动转义）
<div>{userInput}</div>  // ✅ 安全，自动转义
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // ❌ 危险

// 4. Cookie 设置 HttpOnly（JS 无法读取）
Set-Cookie: session=xxx; HttpOnly; Secure; SameSite=Strict

// 5. Content Security Policy（CSP）
// 服务端响应头
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-xxx'
// 或 HTML meta 标签
<meta http-equiv="Content-Security-Policy" content="default-src 'self'">
```

---

## 二、CSRF（跨站请求伪造）

### 原理

```
攻击流程：
1. 用户登录 bank.com，浏览器保存了 Cookie
2. 用户访问恶意网站 evil.com
3. evil.com 中有隐藏的表单或图片请求：
   <img src="https://bank.com/transfer?to=attacker&amount=1000" />
4. 浏览器自动携带 bank.com 的 Cookie 发送请求
5. 银行服务器认为是合法请求，执行转账
```

### 防御措施

```
1. CSRF Token（最常用）
   - 服务端生成随机 token，存在 Session 中
   - 每个表单/请求携带 token
   - 服务端验证 token 是否匹配
   - 攻击者无法获取 token（同源策略限制）

2. SameSite Cookie
   Set-Cookie: session=xxx; SameSite=Strict  // 完全禁止跨站携带
   Set-Cookie: session=xxx; SameSite=Lax     // 允许导航请求携带（推荐）
   Set-Cookie: session=xxx; SameSite=None; Secure // 允许跨站（需 HTTPS）

3. 验证 Referer/Origin 请求头
   - 检查请求来源是否是合法域名
   - 缺点：Referer 可以被伪造或禁用

4. 双重 Cookie 验证
   - 将 token 同时存在 Cookie 和请求参数中
   - 服务端比较两者是否一致
```

```js
// 前端：每个请求自动携带 CSRF Token
axios.interceptors.request.use(config => {
  const token = getCookie('csrf_token');
  if (token) {
    config.headers['X-CSRF-Token'] = token;
  }
  return config;
});
```

---

## 三、HTTPS 为什么安全

### HTTP vs HTTPS

```
HTTP：明文传输，存在三大风险
  1. 窃听：中间人可以看到传输内容
  2. 篡改：中间人可以修改传输内容
  3. 冒充：无法验证服务器身份

HTTPS = HTTP + TLS/SSL
  1. 加密：防止窃听
  2. 完整性校验：防止篡改
  3. 身份认证：通过证书验证服务器身份
```

### TLS 握手过程（简化版）

```
1. Client Hello：客户端发送支持的 TLS 版本、加密套件、随机数 C
2. Server Hello：服务端选择加密套件、发送证书、随机数 S
3. 客户端验证证书（CA 签名验证）
4. 客户端生成预主密钥（Pre-Master Secret），用服务端公钥加密发送
5. 双方用 C + S + Pre-Master Secret 生成会话密钥
6. 后续通信使用对称加密（AES 等）

为什么用非对称加密交换密钥，再用对称加密通信？
- 非对称加密（RSA）：安全但慢
- 对称加密（AES）：快但密钥传输不安全
- 结合使用：用非对称加密安全地交换对称密钥，再用对称加密高效通信
```

---

## 四、Content Security Policy（CSP）

```html
<!-- 只允许加载同源资源 -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'">

<!-- 允许同源 + 指定 CDN -->
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' https://cdn.example.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;

<!-- 使用 nonce 允许内联脚本 -->
Content-Security-Policy: script-src 'nonce-abc123'
<script nonce="abc123">/* 这个内联脚本被允许 */</script>
```

---

## 五、其他安全措施

### 点击劫持（Clickjacking）

```
攻击：将目标网站嵌入透明 iframe，诱导用户点击

防御：
1. X-Frame-Options 响应头
   X-Frame-Options: DENY          // 禁止任何 iframe 嵌入
   X-Frame-Options: SAMEORIGIN    // 只允许同源嵌入

2. CSP frame-ancestors
   Content-Security-Policy: frame-ancestors 'none'
```

### 敏感信息保护

```js
// 1. 不在 URL 中传递敏感信息（会被记录在日志/历史记录中）
// ❌ https://example.com/login?password=123456
// ✅ POST 请求体

// 2. 不在 localStorage 中存储 Token（XSS 可读取）
// ✅ HttpOnly Cookie（JS 无法读取）

// 3. 密码传输前哈希（但服务端也要再次哈希+加盐）
// 注意：前端哈希不能替代服务端哈希

// 4. 敏感操作二次验证（转账、修改密码等）
```

### 依赖安全

```bash
# 检查 npm 包漏洞
npm audit
npm audit fix

# 使用 Snyk 等工具持续监控
```

---

## 六、Trusted Types API — 防止 DOM XSS（现代浏览器）

Trusted Types 是一种浏览器原生防御机制，通过限制危险 DOM API 的输入来源，从根本上阻断 DOM 型 XSS。

```js
// 1. 创建 Trusted Types 策略
const policy = trustedTypes.createPolicy('my-policy', {
  createHTML: (input) => {
    // 在这里做净化处理（如使用 DOMPurify）
    return DOMPurify.sanitize(input)
  },
  createScript: (input) => {
    // 对脚本内容做校验
    if (!allowedScripts.includes(input)) {
      throw new Error('不允许的脚本内容')
    }
    return input
  },
  createScriptURL: (input) => {
    // 只允许白名单 URL
    const url = new URL(input)
    if (url.hostname !== 'trusted.example.com') {
      throw new Error('不允许的脚本来源')
    }
    return input
  }
})

// 2. 使用策略创建受信任的值
const safeHtml = policy.createHTML('<b>安全内容</b>')
element.innerHTML = safeHtml // ✅ 传入的是 TrustedHTML 对象，不是原始字符串

// 3. 直接传字符串会报错（需要开启 CSP 策略）
element.innerHTML = '<script>alert(1)</script>' // ❌ 抛出 TypeError

// 4. 通过 CSP 响应头启用 Trusted Types 强制模式
// Content-Security-Policy: require-trusted-types-for 'script'; trusted-types my-policy
```

**工作原理**：浏览器拦截 `innerHTML`、`document.write`、`eval` 等危险 API 的赋值，要求传入 `TrustedHTML`/`TrustedScript` 类型对象而非普通字符串，强制所有 DOM 写入都经过安全策略的校验。

---

## 七、Permissions-Policy 响应头

`Permissions-Policy`（原 `Feature-Policy`）控制当前页面及其内嵌 `<iframe>` 可以使用哪些浏览器功能，是安全加固的重要手段。

```
# 常用指令示例
Permissions-Policy:
  camera=(),                    # 禁止使用摄像头（空括号 = 完全禁止）
  microphone=(),                # 禁止使用麦克风
  geolocation=(),               # 禁止获取地理位置
  payment=(self),               # 只允许当前页面使用支付 API
  autoplay=(self "https://cdn.example.com"), # 允许当前源和指定源自动播放
  fullscreen=*,                 # 允许所有来源使用全屏
  interest-cohort=()            # 禁用 FLoC 用户追踪（隐私保护）
```

```html
<!-- 在 <iframe> 标签上控制子页面权限 -->
<iframe
  src="https://third-party.com/widget"
  allow="camera 'none'; microphone 'none'; payment 'self'"
></iframe>
```

**与 CSP 的区别**：

| 对比项 | CSP | Permissions-Policy |
| --- | --- | --- |
| 防御目标 | 资源加载来源控制（防 XSS/注入） | 浏览器能力访问控制（防功能滥用） |
| 控制粒度 | 资源类型（script/style/img...） | 浏览器 API（camera/mic/geo...） |
| 典型用途 | 防止脚本注入、限制资源来源 | 保护用户隐私、限制第三方 iframe |

---

## 相关笔记

- [前端安全（XSS / CSRF 基础概念与防御）](./前端安全.md)
