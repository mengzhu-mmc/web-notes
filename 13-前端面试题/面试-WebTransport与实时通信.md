# 面试 · WebTransport 与实时通信专题

> 整理自 W12-W14 前端周报 | 覆盖：WebTransport 背景、API、场景、面试追问链

---

## 一、技术背景 — 为什么需要 WebTransport

### WebSocket 的历史局限

WebSocket 诞生于 2011 年（RFC 6455），基于 HTTP/1.1 Upgrade 机制，建立在 TCP 之上。十几年过去，Web 应用对实时性的要求早已超出它的设计边界：

| 痛点 | 说明 |
|------|------|
| **队头阻塞（HOL Blocking）** | TCP 层一个数据包丢失，所有后续包必须等待重传。即使上层业务只丢了 1 个不重要的心跳包，整条消息链都卡住 |
| **单一流传输** | WebSocket 建立后只有一条可靠有序流，无法同时兼顾"重要消息可靠传输"和"高频数据允许丢包" |
| **网络切换断连** | 手机从 Wi-Fi 切到 4G，IP 地址变了 → TCP 连接必须断开重连 → 实时游戏、音乐播放等场景直接中断 |
| **建立延迟** | HTTP/1.1 Upgrade 需要完整的三次握手，高频建连场景延迟累加 |

### QUIC 协议带来的改变

WebTransport 底层是 HTTP/3，HTTP/3 的传输层是 **QUIC**（基于 UDP）。

UDP 本身不可靠，但 QUIC 在用户空间实现了可靠性：
- **0-RTT / 1-RTT 建连**：首次建连 1-RTT（类似 TCP+TLS 1.3），重连时可 0-RTT（0 往返，直接发数据）
- **多路复用（Multiplexing）**：不同数据流独立传输，互不阻塞，解决 TCP HOL Blocking
- **连接迁移（Connection Migration）**：用连接 ID（而非 IP）标识连接，网络切换后连接无缝迁移

### WebTransport 解决的核心问题

一句话总结：**在一条 HTTP/3 连接上，同时支持"可靠有序流"和"不可靠数据报"，且多路复用 + 连接迁移。**

---

## 二、核心概念对比

| | WebSocket | WebTransport |
|---|---|---|
| **协议层** | HTTP/1.1 + TCP | HTTP/3 + QUIC（UDP）|
| **建连延迟** | 1-RTT + TLS 握手（~100-300ms）| 1-RTT 或 0-RTT（~50-100ms）|
| **队头阻塞** | 有（TCP 层）| 无（QUIC 多流独立）|
| **网络切换** | 断开重连 | 无缝迁移 |
| **传输模式** | 单一可靠流 | 可靠流 + 不可靠数据报 |
| **应用场景** | 普通聊天、消息推送 | 实时游戏、直播、高频数据传输 |

---

## 三、核心 API 用法

### 建立连接

```javascript
const transport = new WebTransport('https://example.com:4433/transport');

await transport.ready; // 等待连接就绪

transport.closed.then(() => console.log('连接关闭'));
transport.errors.then(err => console.error('异常：', err));
```

> ⚠️ 必须 HTTPS 环境，localhost 除外。

### 可靠流（Stream）— 双向通信

```javascript
// 创建双向流
const stream = await transport.createBidirectionalStream();
const writer = stream.writable.getWriter();
const reader = stream.readable.getReader();

// 发送
await writer.write(new TextEncoder().encode('hello'));

// 接收
const { value } = await reader.read();
console.log(new TextDecoder().decode(value));

await writer.close();
```

适用场景：聊天消息、协作编辑、文件传输——任何不能丢的数据。

### 不可靠数据报（Datagram）— 高频低延迟

```javascript
const writer = transport.datagrams.writable.getWriter();

setInterval(async () => {
  const pos = { x: Math.random() * 100, y: Math.random() * 100 };
  await writer.write(new TextEncoder().encode(JSON.stringify(pos)));
}, 33); // 30 FPS 游戏位置更新
```

适用场景：游戏玩家坐标、直播视频帧、实时监控数据——允许丢包，但要求极低延迟。

### 浏览器支持（2026 年）

- Chrome 97+ ✅
- Firefox 114+ ✅
- Safari 26.4+ ✅
- Edge 97+ ✅

> Safari 支持较晚，生产环境全面铺开还需观察。但 Chrome 和 Firefox 已经覆盖主流桌面用户。

---

## 四、面试追问链

### Q1：WebSocket 和 WebTransport 的区别？什么时候选哪个？

**参考答案框架：**
1. 协议层对比（TCP vs QUIC）
2. 核心差异点：队头阻塞、传输模式、网络切换
3. 选型建议

**可能的追问：**

> **追问 1.1**：QUIC 是基于 UDP 的，UDP 不可靠，WebTransport 怎么保证可靠性？
> → QUIC 在用户空间实现了自己的可靠性机制（丢包检测、重传、流量控制），本质上是"在 UDP 之上实现了一个比 TCP 更优雅的可靠传输协议"。

> **追问 1.2**：数据报（Datagram）和 Stream 的区别是什么？分别用在哪些场景？
> → Stream 可靠有序，用于聊天记录、文件分片；Datagram 不可靠但极低延迟，用于游戏坐标、直播帧。

> **追问 1.3**：你在实际项目中用过 WebTransport 吗？为什么选它而不是 WebSocket？
> → 考察实战经验。没实际用过的可以诚实说"没有"，但要能说明白在什么场景下会选择 WebTransport（实时游戏、多人协作编辑器）。

---

### Q2：什么是队头阻塞？WebSocket 的队头阻塞和 TCP 的队头阻塞有什么区别？

**参考答案：**
- **TCP 队头阻塞**：一个 IP 包丢了，后续所有包卡住等待重传
- **HTTP/1.1 队头阻塞**：多个请求复用同一个 TCP 连接，一个请求响应慢会阻塞后续请求（线头阻塞）
- **WebSocket 队头阻塞**：复用同一个 TCP 连接，一条消息丢失会阻塞后续消息（这是 TCP 队头阻塞在 WebSocket 上的体现）
- **QUIC / WebTransport**：不同 Stream 互相独立，一个 Stream 丢包只影响该 Stream，其他 Stream 继续传输

**可能的追问：**

> **追问 2.1**：HTTP/2 也解决了队头阻塞，为什么还需要 QUIC/WebTransport？
> → HTTP/2 在 TCP 层仍然受队头阻塞影响。QUIC 在传输层彻底解决，且支持连接迁移和 0-RTT 重连。

> **追问 2.2**：WebTransport 的多路复用和 HTTP/2 的多路复用有什么区别？
> → HTTP/2 的 Stream 是逻辑流，底层还是 TCP；QUIC 的 Stream 是独立的传输层通道，各自独立拥塞控制。

---

### Q3：连接迁移是什么？为什么重要？

**参考答案：**
连接迁移 = 用"连接 ID"而非"IP 地址 + 端口"来标识一条连接。当设备网络环境变化（Wi-Fi ↔ 4G）时，IP 地址变了，但连接 ID 不变，连接可以无缝保持。

典型场景：移动端用户在地铁里通话/游戏，网络频繁切换，不能接受断连重连。

---

### Q4：WebTransport 能完全替代 WebSocket 吗？

**参考答案：**
不能，原因：
1. **浏览器支持差异**：Safari 支持较晚，生产环境要考虑兼容
2. **服务端基础设施**：WebSocket 有大量成熟方案（Socket.io、ws 库、云服务 SDK）；WebTransport 需要 HTTP/3 服务端，部署成本更高
3. **场景差异**：简单聊天、消息推送 WebSocket 完全够用；WebTransport 的优势在超低延迟 + 高频数据 + 移动端网络切换

**一句话结论**：WebSocket 仍然是通用实时通信的首选；WebTransport 在特定高性能场景（游戏、实时协作、直播）有显著优势。

---

## 五、相关笔记

- [[08-网络与浏览器/WebTransport-API-下一代Web双向通信]] — API 详解
- [[08-网络与浏览器/WebSocket深入理解]] — WebSocket 原理
- [[08-网络与浏览器/2026-04-03-WebTransport-API]] — 早期学习记录

## 六、下期预告执行记录

- ✅ W12 预告"WebTransport 将成为 W14 重点" → W13-W14 连续出现，验证正确
- ✅ W14 预告"关注 Anchor Positioning 和 dialog closedBy" → W15-W16 均已全面落地，验证正确
- ⏳ W15 预告"React Compiler 生产环境表现" → 尚待观察
- ⏳ W16 预告"CSS Masonry 脱离实验标志" → 尚待观察（Safari 已支持，Chrome 仍在 flag）
