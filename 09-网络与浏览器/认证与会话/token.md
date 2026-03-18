## 面试高频考点

1. Access Token 和 Refresh Token 的区别和作用分别是什么？
2. Token 为什么要存在 localStorage/sessionStorage 而不是 Cookie？
3. Token 如何携带到请求中？放在 Header 的哪里？
4. Access Token 过期后如何无感刷新？
5. Token 被盗用了怎么办？如何吊销 Token？

---

### Access Token

1. 客户端使用用户名跟密码请求登录
2. 服务端收到请求，去验证用户名与密码
3. 验证成功后，服务端会签发一个 token
4. 客户端收到 token 以后，会把它存储起来，比如放在 cookie 里或者 localStorage 里
5. 客户端每次向服务端请求资源的时候需要带着服务端签发的 token
6. 服务端收到请求，然后去验证客户端请求里面带着的 token ，如果验证成功，就向客户端返回请求的数据

- **每一次请求都需要携带 token，需要把 token 放到 HTTP 的 Header 里**
- **基于 token 的用户认证是一种服务端无状态的认证方式，服务端不用存放 token 数据。用解析 token 的计算时间换取 session 的存储空间，从而减轻服务器的压力，减少频繁的查询数据库**
- **token 完全由应用管理，所以它可以避开同源策略**

### Refresh Token

access token 用来访问业务接口，由于有效期足够短，盗用风险小，也可以使请求方式更宽松灵活

refresh token 用来获取 access token，有效期可以长一些，通过独立服务和严格的请求方式增加安全性；由于不常验证，也可以如前面的 session 一样处理

---

## 代码示例

### Axios 拦截器实现 Token 无感刷新

```javascript
import axios from 'axios';

const request = axios.create({ baseURL: '/api' });

// 请求拦截：自动携带 access token
request.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let pendingQueue = []; // 等待 token 刷新的请求队列

// 响应拦截：401 时自动刷新 token，失败则跳转登录
request.interceptors.response.use(
  res => res,
  async err => {
    const { config, response } = err;
    if (response?.status !== 401 || config._retry) {
      return Promise.reject(err);
    }

    if (isRefreshing) {
      // 已在刷新中，将请求加入队列
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject, config });
      });
    }

    config._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const { data } = await axios.post('/api/auth/refresh', { refreshToken });
      localStorage.setItem('accessToken', data.accessToken);

      // 重放队列中的请求
      pendingQueue.forEach(({ resolve, config }) => {
        config.headers.Authorization = `Bearer ${data.accessToken}`;
        resolve(request(config));
      });
      pendingQueue = [];

      config.headers.Authorization = `Bearer ${data.accessToken}`;
      return request(config); // 重放当前请求
    } catch {
      pendingQueue.forEach(({ reject }) => reject(new Error('登录已过期')));
      pendingQueue = [];
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);
```

---

## 对比总结：Cookie vs Session vs Token vs JWT

| 维度 | Cookie | Session | Token（非JWT） | JWT |
|------|--------|---------|--------------|-----|
| **存储位置** | 客户端浏览器 | 服务端（Redis/内存） | 客户端 | 客户端 |
| **状态** | 有状态 | 有状态（服务端存储） | 可有状态/无状态 | 无状态 |
| **安全性** | 一般（可设 HttpOnly/Secure） | 较高（数据在服务端） | 较高 | 中（payload 可解码，勿存敏感信息） |
| **跨域支持** | 受限（SameSite） | 受限（依赖 Cookie） | 好（放 Header） | 好（放 Header） |
| **可扩展性** | - | 差（服务端需共享存储） | 好 | 好（无需服务端存储） |
| **主动失效** | 可（设过期/清除） | 可（删除服务端 session） | 可（服务端维护黑名单） | 难（需黑名单，违背无状态） |
| **典型场景** | 传统 Web 会话 | 传统服务端渲染 | OAuth2 / 第三方授权 | 前后端分离 / 微服务 / 移动端 |
| **大小限制** | 4KB | 无限制（服务端） | 无限制 | 较大（包含 payload） |

> **选型建议：**
> - 传统 Web + 单体服务 → Session + Cookie
> - 前后端分离 / 移动端 → JWT（access token + refresh token 双 token 方案）
> - 微服务 / 分布式 → JWT（无状态，无需共享存储）
> - 需要精确控制登录状态（如强制下线）→ Session 或 Token 黑名单
