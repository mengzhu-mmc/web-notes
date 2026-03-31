# HTTP/2 vs HTTP/3 深度对比

> 关键词：多路复用、QUIC、0-RTT、HPACK/QPACK、队头阻塞

---

## 一、版本演进一览

| 版本 | 年份 | 底层协议 | 核心改进 |
|------|------|---------|---------|
| HTTP/1.0 | 1996 | TCP | 短连接，每次请求新建连接 |
| HTTP/1.1 | 1997 | TCP | Keep-Alive 持久连接、管道化（有缺陷） |
| HTTP/2 | 2015 | TCP + TLS | 多路复用、头部压缩、服务器推送、二进制帧 |
| HTTP/3 | 2022（RFC 9114） | QUIC（UDP） | 无队头阻塞、0-RTT、连接迁移 |

---

## 二、HTTP/2 核心特性

### 1. 二进制分帧层（Binary Framing Layer）

HTTP/2 将数据拆分为**帧（Frame）**，帧是最小传输单位。每个帧有类型（HEADERS、DATA、SETTINGS 等）和流 ID。

```
HTTP/2 帧结构：
┌─────────────────────────────┐
│  Length (24bit)             │  帧负载长度
│  Type (8bit)                │  帧类型
│  Flags (8bit)               │  标志位
│  Stream Identifier (31bit)  │  流 ID
│  Frame Payload              │  负载数据
└─────────────────────────────┘
```

### 2. 多路复用（Multiplexing）

- **HTTP/1.1 问题**：一个 TCP 连接同一时刻只能处理一个请求（管道化依然有队头阻塞）
- **HTTP/2 方案**：一个 TCP 连接可并行传输多个**流（Stream）**，流之间互不干扰

```
HTTP/1.1（每个请求串行）：
连接1: [req1 -----] [req2 -----] [req3 -----]

HTTP/2（单连接并行流）：
连接:  [Stream1 --] [Stream3 --]
       [Stream2 -------]
       [Stream4 --]
```

> ⚠️ HTTP/2 的多路复用解决了**应用层**的队头阻塞，但 TCP 层的队头阻塞依然存在（丢包时所有流都阻塞）。

### 3. 头部压缩（HPACK）

- **HPACK** 是 HTTP/2 的头部压缩算法（RFC 7541）
- 两端维护相同的**静态表**（61 个常用头部）和**动态表**（运行时扩充）
- 首次请求发完整头部并存入动态表，后续请求只发索引值

```
首次请求：
  :method: GET
  :path: /api/users
  content-type: application/json
  → 完整发送，存入动态表

第二次请求（相同头部）：
  → 只发索引：[62] [63] [64]（节省 80%+ 带宽）
```

### 4. 服务器推送（Server Push）

服务器可以主动推送客户端"将要请求"的资源：

```javascript
// Node.js HTTP/2 Server Push 示例
server.on('stream', (stream, headers) => {
  if (headers[':path'] === '/') {
    // 主动推送 CSS 文件，不等客户端请求
    stream.pushStream({ ':path': '/style.css' }, (err, pushStream) => {
      pushStream.respondWithFile('./style.css');
    });
    stream.respondWithFile('./index.html');
  }
});
```

> ⚠️ Server Push 实际使用率较低，Chrome 106+ 已移除对它的支持。

---

## 三、HTTP/3 核心特性

### 1. 基于 QUIC（Quick UDP Internet Connections）

QUIC 是 Google 设计、IETF 标准化的传输层协议，运行在 **UDP** 之上，但在应用层自己实现了可靠传输。

```
HTTP/1.1 & HTTP/2 协议栈：
┌─────────────────┐
│    HTTP/1.1 or HTTP/2    │
├─────────────────┤
│       TLS 1.2/1.3        │
├─────────────────┤
│          TCP             │
├─────────────────┤
│          IP              │
└─────────────────┘

HTTP/3 协议栈：
┌─────────────────┐
│      HTTP/3     │
├─────────────────┤
│      QUIC       │  ← 包含加密（集成 TLS 1.3）
├─────────────────┤
│      UDP        │
├─────────────────┤
│       IP        │
└─────────────────┘
```

### 2. 彻底解决队头阻塞（HOL Blocking）

| 阶段 | HTTP/2（TCP） | HTTP/3（QUIC） |
|------|--------------|---------------|
| TCP 层丢包 | **全部流阻塞**，等待重传 | 独立流，只阻塞该流 |
| 应用层 | 多路复用，无阻塞 | 多路复用，无阻塞 |

```
HTTP/2 丢包场景（TCP 队头阻塞）：
Stream1: ✅✅✅✅✅
Stream2: ✅✅❌❌❌  ← 丢包！TCP 要求重传
Stream3: ✅✅❌❌❌  ← 被迫等待，与 Stream2 无关

HTTP/3 丢包场景：
Stream1: ✅✅✅✅✅
Stream2: ✅✅❌→重传  ← 只有 Stream2 等
Stream3: ✅✅✅✅✅  ← 不受影响！
```

### 3. 0-RTT 连接建立

**RTT（Round-Trip Time）** = 一次网络往返时间

```
TCP + TLS 1.2 建立连接（3-RTT）：
  Client → Server: SYN                    (1/2 RTT)
  Server → Client: SYN-ACK               (1/2 RTT)
  Client → Server: ACK + ClientHello      (1/2 RTT)  ← TLS 握手开始
  Server → Client: ServerHello + Cert    (1/2 RTT)
  Client → Server: Finished              (1/2 RTT)
  → 总计 ~3 RTT 后才能发送数据

QUIC 首次连接（1-RTT）：
  Client → Server: Initial（含 TLS ClientHello）
  Server → Client: Initial + Handshake（含 TLS ServerHello + Cert）
  Client → Server: Handshake + 第一个 HTTP 请求
  → 1-RTT 后开始传输数据

QUIC 恢复连接（0-RTT）：
  Client → Server: Initial + 第一个 HTTP 请求（复用之前的会话票据）
  Server → Client: 直接响应数据
  → 0-RTT，第一个包就能携带业务数据！
```

> ⚠️ 0-RTT 存在**重放攻击**风险，只适用于幂等请求（GET），POST 等写操作需谨慎。

### 4. 连接迁移（Connection Migration）

TCP 用「源 IP + 源端口 + 目标 IP + 目标端口」四元组标识连接，切换网络（WiFi → 4G）时四元组变了，连接断开。

QUIC 使用**连接 ID（Connection ID）** 标识连接，与网络地址无关：

```
场景：用户从 WiFi 切换到 4G

HTTP/2（TCP）：
  TCP 连接 = (192.168.1.2:443, 1.2.3.4:443)
  切换到 4G → IP 变为 10.0.0.5 → 四元组变化 → 连接断开 → 需要重新握手

HTTP/3（QUIC）：
  连接 ID = a3f2b8c1...（不依赖 IP/端口）
  切换到 4G → IP 变化 → 发送 PATH_CHALLENGE 验证新路径 → 连接无缝迁移
```

### 5. 头部压缩（QPACK）

- HTTP/3 使用 **QPACK**（而非 HPACK）
- HPACK 的动态表在流之间共享，存在阻塞风险；QPACK 通过专门的编解码器流解决这个问题

---

## 四、HTTP/2 vs HTTP/3 全面对比表

| 对比维度 | HTTP/2 | HTTP/3 |
|---------|--------|--------|
| **传输层** | TCP | QUIC（UDP） |
| **加密** | TLS（独立） | TLS 1.3（集成到 QUIC） |
| **多路复用** | ✅ 支持（TCP 层仍有 HOL） | ✅ 支持（彻底解决 HOL） |
| **连接建立** | TCP 1-RTT + TLS 1-RTT = 2-RTT | 首次 1-RTT，复用 0-RTT |
| **头部压缩** | HPACK | QPACK |
| **连接迁移** | ❌ 不支持（IP 变化断连） | ✅ 支持（Connection ID） |
| **队头阻塞** | 应用层解决，TCP 层依然存在 | 彻底解决 |
| **服务器推送** | ✅ 支持（实际弃用） | ✅ 支持（实际弃用） |
| **浏览器支持** | 全部现代浏览器 | Chrome/Firefox/Safari 全支持 |
| **CDN 支持** | Cloudflare/Akamai/AWS 等 | Cloudflare/Akamai/AWS 等 |
| **弱网/移动端** | 一般 | 优秀 |
| **UDP 防火墙** | 不受影响 | 部分企业防火墙拦截 UDP 端口 |

---

## 五、代码实践

### Node.js 启用 HTTP/2

```javascript
const http2 = require('http2');
const fs = require('fs');

const server = http2.createSecureServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt'),
});

server.on('stream', (stream, headers) => {
  const path = headers[':path'];
  console.log(`Request: ${headers[':method']} ${path}`);
  
  stream.respond({
    ':status': 200,
    'content-type': 'application/json',
  });
  stream.end(JSON.stringify({ message: 'Hello HTTP/2!' }));
});

server.listen(443);
```

### Nginx 开启 HTTP/2 & HTTP/3（QUIC）

```nginx
server {
    listen 443 ssl;
    listen 443 quic reuseport;  # HTTP/3 (QUIC)
    http2 on;                   # HTTP/2
    
    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # 告知客户端支持 HTTP/3
    add_header Alt-Svc 'h3=":443"; ma=86400';
    
    location / {
        root /var/www/html;
    }
}
```

### 前端检测当前使用的 HTTP 版本

```javascript
// 使用 Performance API 检测
const [entry] = performance.getEntriesByType('navigation');
console.log(entry.nextHopProtocol);
// 输出：'h2' (HTTP/2) 或 'h3' (HTTP/3) 或 'http/1.1'

// 检测资源加载使用的协议
performance.getEntriesByType('resource').forEach(res => {
  console.log(res.name, res.nextHopProtocol);
});
```

---

## 六、面试高频考点 🎯

### Q1：HTTP/2 解决了什么问题？还存在什么问题？

**解决了：**
- HTTP/1.1 的串行请求问题（多路复用）
- 头部冗余（HPACK 压缩）
- 资源加载效率低（二进制帧、优先级）

**还存在：**
- TCP 层队头阻塞（一个包丢失，所有流等待）
- TCP 三次握手 + TLS 握手延迟（至少 2-RTT）
- 服务器推送实际难以精确控制（已被主流浏览器弃用）

### Q2：HTTP/3 为什么用 UDP 而不是 TCP？

TCP 是内核协议，改动需要更新整个操作系统，周期极长。QUIC 运行在用户态 UDP 之上，可以快速迭代。QUIC 在 UDP 上自己实现了：
- 可靠传输（确认机制、重传）
- 拥塞控制
- 流量控制
- 加密（集成 TLS 1.3）
- 多路复用（独立流）

### Q3：什么是队头阻塞（HOL Blocking）？HTTP/2 和 HTTP/3 如何分别处理？

**定义**：请求队列中前面的请求阻塞导致后续请求无法处理。

- **HTTP/1.1**：应用层队头阻塞（同一 TCP 连接只能串行请求）
- **HTTP/2**：解决了应用层 HOL，但 TCP 层仍存在（丢包时整个连接卡顿）
- **HTTP/3（QUIC）**：每个流有独立的传输状态，丢包只影响该流，彻底解决

### Q4：HTTP/3 的 0-RTT 有什么安全风险？

**重放攻击（Replay Attack）**：0-RTT 数据没有服务端随机数参与加密，攻击者可以拦截并重放该数据包，导致服务端重复处理相同请求。

**缓解措施**：
- 0-RTT 只用于幂等操作（GET、HEAD）
- 服务端设置 `max_early_data` 限制
- 服务端对 0-RTT 请求增加防重放标记

### Q5：HTTP/2 的 HPACK 和 HTTP/3 的 QPACK 有什么区别？

| | HPACK | QPACK |
|---|---|---|
| 标准 | RFC 7541 | RFC 9204 |
| 动态表范围 | 所有流共享 | 每个流独立，通过专用流同步 |
| 阻塞风险 | 存在（动态表未同步时阻塞） | 无（编解码流独立处理） |
| 配合协议 | HTTP/2 (TCP) | HTTP/3 (QUIC) |

### Q6：如何判断网站是否支持 HTTP/3？

```bash
# 使用 curl 测试
curl -I --http3 https://example.com

# 查看响应头 Alt-Svc
Alt-Svc: h3=":443"; ma=86400
# h3 表示支持 HTTP/3，在 443 端口，缓存 86400 秒（1天）
```

---

## 七、总结

```
HTTP 版本演进的核心驱动力：减少延迟、提高并发、应对弱网

HTTP/1.1 → HTTP/2：应用层优化（多路复用 + 头部压缩 + 二进制帧）
HTTP/2 → HTTP/3：传输层优化（QUIC 替代 TCP，彻底解决 HOL + 0-RTT + 连接迁移）
```

> 实际选型建议：CDN 层尽量开启 HTTP/3（Cloudflare/Nginx），对移动端用户体验提升明显；内部服务间通信 HTTP/2 已足够。

---

## 相关笔记

- [[HTTPS握手过程]]
- [[CDN原理与应用]]
- [[WebTransport-API-下一代Web双向通信]]
