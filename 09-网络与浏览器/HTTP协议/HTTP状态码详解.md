# HTTP 状态码详解

## 状态码分类

1xx（信息性）：请求已接收，继续处理。2xx（成功）：请求已成功被服务器接收、理解并接受。3xx（重定向）：需要后续操作才能完成请求。4xx（客户端错误）：请求有语法错误或无法实现。5xx（服务器错误）：服务器未能实现合法的请求。

## 常见状态码

### 2xx 成功

`200 OK` 请求成功，最常见的成功响应。`201 Created` 创建成功（POST/PUT 创建资源后返回）。`204 No Content` 请求成功但无返回内容（DELETE 操作常用）。`206 Partial Content` 部分内容（断点续传、视频流）。

### 3xx 重定向

`301 Moved Permanently` 永久重定向（SEO 会转移权重）。`302 Found` 临时重定向（常用于临时跳转）。`304 Not Modified` 资源未修改，使用缓存（前端性能优化重点）。`307 Temporary Redirect` 临时重定向（保持请求方法不变）。`308 Permanent Redirect` 永久重定向（保持请求方法不变）。

### 4xx 客户端错误

`400 Bad Request` 请求参数错误或格式不正确。`401 Unauthorized` 未认证，需要登录。`403 Forbidden` 已认证但无权限访问。`404 Not Found` 请求的资源不存在。`405 Method Not Allowed` HTTP 方法不被允许。`408 Request Timeout` 请求超时。`409 Conflict` 请求冲突（如并发更新冲突）。`413 Payload Too Large` 请求体过大。`429 Too Many Requests` 请求过于频繁，被限流。

### 5xx 服务器错误

`500 Internal Server Error` 服务器内部错误。`502 Bad Gateway` 网关错误（反向代理/负载均衡问题）。`503 Service Unavailable` 服务不可用（维护或过载）。`504 Gateway Timeout` 网关超时。

## 易混淆状态码

`401` vs `403`：401 是未登录，403 是已登录但无权限。`502` vs `504`：502 是网关收到无效响应，504 是网关等待超时。`301` vs `302`：301 永久重定向（搜索引擎更新索引），302 临时重定向（搜索引擎保留原 URL）。

## 前端处理建议

```javascript
axios.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    switch(status) {
      case 401: router.push('/login'); break;
      case 403: message.error('无访问权限'); break;
      case 404: message.error('请求的资源不存在'); break;
      case 429: message.warning('操作过于频繁，请稍后再试'); break;
      case 500: case 502: case 503:
        message.error('服务器异常，请稍后重试'); break;
    }
    return Promise.reject(error);
  }
);
```

## 请求未到达服务端的情况

如果请求还未发送到服务端，不会收到任何状态码，而是出现网络错误、超时错误、DNS 解析失败或连接被拒绝。只要收到了状态码，说明请求已经到达服务端并被处理。
