# CDN 原理与应用

## 什么是 CDN？

CDN（Content Delivery Network，内容分发网络）是一组分布在多个地理位置的服务器集群，通过将静态资源缓存到离用户最近的节点，加速内容的分发和访问。

**核心目标**：减少网络延迟，提升加载速度，降低源站压力。

---

## 工作原理

### 没有 CDN 时

```
用户（北京） ──────────────────→ 源站服务器（美国） 延迟 ~200ms
```

### 有 CDN 时

```
用户（北京） → CDN节点（北京/上海） → 命中缓存 → 直接返回  延迟 ~10ms
                                    ↓ 未命中
                              → 回源到源站 → 缓存到节点 → 返回给用户
```

### DNS 解析流程

1. 用户访问 `https://img.example.com/logo.png`
2. DNS 解析时，CDN 提供商的智能 DNS 介入，根据用户 IP 判断地理位置
3. 返回离用户最近的 CDN 节点 IP
4. 用户直接连接该节点，节点命中缓存直接返回，未命中则**回源**（向源站请求并缓存）

---

## CDN 加速的内容类型

| 类型 | 示例 | 说明 |
|------|------|------|
| 静态资源 | JS/CSS/图片/字体 | 最常用，缓存时间长 |
| 视频/音频 | MP4/HLS | 流媒体加速，边下边播 |
| 动态内容 | API 请求 | 动态 CDN，通过边缘计算处理 |
| 下载文件 | ZIP/APK | 大文件加速 |

---

## 前端使用 CDN 的常见场景

### 1. 第三方库走公共 CDN

```html
<!-- 使用公共 CDN 加载 React（利用浏览器缓存，其他网站已加载过则直接命中） -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
```

**优点**：命中率高（常用库用户大概率已缓存），减小自己项目的 bundle 体积  
**缺点**：依赖第三方稳定性，国内 unpkg 有时较慢

### 2. 项目静态资源上传 CDN

Webpack/Vite 构建后，将产物上传到 OSS + CDN：

```javascript
// webpack.config.js
output: {
  publicPath: 'https://cdn.example.com/assets/', // 所有资源引用路径走 CDN
  filename: '[name].[contenthash:8].js',          // hash 确保缓存更新
}
```

### 3. 图片 CDN + 图片处理

主流 CDN（七牛、阿里 OSS）支持 URL 参数实时处理图片：

```
// 原图
https://cdn.example.com/photo.jpg

// 缩略图（宽200，高自适应，质量80%）
https://cdn.example.com/photo.jpg?imageView2/2/w/200/q/80

// WebP 格式（更小体积）
https://cdn.example.com/photo.jpg?format/webp
```

---

## CDN 缓存策略

### Cache-Control 配置建议

```
# 带 hash 的静态资源（JS/CSS）：永久缓存
Cache-Control: max-age=31536000, immutable

# HTML 入口文件：不缓存（每次检查更新）
Cache-Control: no-cache

# 图片/字体：长期缓存
Cache-Control: max-age=2592000  # 30天
```

### 缓存失效

- **主动刷新**：修改文件后通过 CDN 控制台或 API 刷新指定 URL / 目录
- **文件名 Hash**：`app.a3f5b2c1.js` 内容变了就是新 URL，旧缓存自然失效（推荐方案）
- **版本号参数**：`?v=2.0`（不推荐，部分 CDN 不按参数缓存）

---

## 面试考点

### Q：CDN 如何找到最近节点？

基于 **GSLB（全局负载均衡）** + **智能 DNS**：
1. CDN 提供商在各地部署节点，并持续监测节点健康状态
2. 智能 DNS 根据用户 IP 的地理位置（IP 库）+ 网络运营商（电信/联通/移动）选择最优节点
3. 部分 CDN 还结合 Anycast 技术，同一 IP 路由到最近的数据中心

### Q：CDN 回源是什么？

当 CDN 节点没有缓存（首次访问或缓存过期），节点会向**源站**发起请求获取内容，这个过程叫**回源**。回源会增加延迟，所以要合理设置缓存时间，减少回源率。

### Q：CDN 和反向代理的区别？

| | CDN | 反向代理（如 Nginx） |
|-|-----|---------------------|
| 目的 | 就近分发，加速访问 | 转发请求，负载均衡 |
| 部署位置 | 全球分布式节点 | 数据中心内 |
| 主要场景 | 静态资源加速 | 动态请求分发 |
| 缓存 | ✅ 核心功能 | ✅ 可配置 |

### Q：前端如何利用 CDN 优化性能？

1. 静态资源部署到 CDN，publicPath 指向 CDN 域名
2. 文件名带 contenthash，长期缓存 + 精确失效
3. 图片使用 CDN 的图片处理能力（WebP、缩略图、懒加载）
4. 关键资源用 `<link rel="preconnect">` 预建立 CDN 连接
5. 第三方库走公共 CDN（配合 Webpack externals）
