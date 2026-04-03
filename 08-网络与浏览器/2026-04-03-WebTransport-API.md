# WebTransport API — 下一代实时通信

> 来源：[张鑫旭博客](https://www.zhangxinxu.com/wordpress/2026/03/webtransport-api/) | 日期：2026-03-17

## 核心内容

WebTransport 是基于 **HTTP/3（QUIC 协议）** 的新一代 Web 实时通信 API。相比 WebSocket，它解决了 TCP 队头阻塞问题，同时支持可靠传输和不可靠数据报两种模式，适合游戏、直播等对延迟敏感的场景。

## 关键知识点

### WebTransport vs WebSocket 对比

| 对比维度 | WebSocket | WebTransport |
|---------|-----------|-------------|
| 底层协议 | TCP（via HTTP/1.1） | QUIC（via HTTP/3） |
| 队头阻塞 | 有（TCP 层） | 无（QUIC 多流独立） |
| 数据可靠性 | 仅可靠传输 | 可靠流 + 不可靠数据报 |
| 连接建立 | HTTP Upgrade 握手 | 0-RTT 快速建立 |
| 多路复用 | 单连接单流 | 单连接多流 |
| 浏览器支持 | 全浏览器 | 现代浏览器全支持 |

### 两种传输模式

1. **可靠流（Streams）**：类似 TCP，保证有序、无丢失，适合文件传输、指令同步
2. **不可靠数据报（Datagrams）**：类似 UDP，可丢失，适合游戏位置同步、音视频实时帧

### 核心 API

```javascript
// 建立连接
const transport = new WebTransport('https://example.com:443/transport');
await transport.ready;

// 发送不可靠数据报
const writer = transport.datagrams.writable.getWriter();
await writer.write(new Uint8Array([1, 2, 3]));

// 创建可靠双向流
const stream = await transport.createBidirectionalStream();
const writer = stream.writable.getWriter();
await writer.write(new TextEncoder().encode('Hello'));

// 监听服务器推送的单向流
const reader = transport.incomingUnidirectionalStreams.getReader();
const { value: stream } = await reader.read();
```

### 为什么 QUIC 解决了队头阻塞？

- HTTP/1.1（WebSocket 底层）：单 TCP 连接，一个数据包丢失，后续所有数据都要等待重传
- HTTP/2：复用一个 TCP 连接，TCP 层仍存在队头阻塞
- HTTP/3（QUIC）：在 UDP 上实现多个独立流，某流丢包不影响其他流

## 代码示例

```javascript
// 完整连接示例
async function connectWebTransport(url) {
  const transport = new WebTransport(url);
  
  transport.closed.then(() => {
    console.log('连接已关闭');
  }).catch(err => {
    console.error('连接异常关闭:', err);
  });
  
  await transport.ready;
  console.log('WebTransport 连接就绪');
  
  return transport;
}
```

## 面试相关

- WebSocket 的 TCP 队头阻塞问题是什么？（面试高频）
- QUIC 协议为什么能解决多路复用的队头阻塞？
- 什么场景下选 WebTransport？什么场景下选 WebSocket？
- 不可靠数据报的使用场景（游戏、直播）vs 可靠流（文件、指令）

## 相关笔记

- [[08-网络与浏览器/WebSocket原理]]
- [[08-网络与浏览器/HTTP3-QUIC协议]]
