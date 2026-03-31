# WebSocket 深入理解

> 整合两个豆包文件中 WebSocket 的所有内容，面试必备

---

## 面试高频考点

- WebSocket 与 HTTP 的核心区别是什么？
- WebSocket 握手流程是怎样的？（HTTP升级？）
- WebSocket 与 SSE、长轮询有什么区别？
- 为什么 WebSocket 选择 TCP 而非 UDP？
- 什么是 Nagle 算法？WebSocket 实时性如何保证？
- WebSocket 的典型使用场景？

---

## 一、核心特性

- **全双工**：客户端和服务端可以同时双向发送数据，无需等待对方
- **持久化连接**：一次握手，长期保持连接，无需每次请求重建
- **轻量帧头**：帧头只有 2~10 字节，比 HTTP 头部小得多
- **基于 HTTP 升级**：通过 HTTP 101 握手后切换协议，之后不再遵循 HTTP 请求-响应规则
- **基于 TCP**（非 UDP）：核心场景需要可靠传输，乱序/丢包不可接受

---

## 二、与 HTTP 核心对比

| 特性 | HTTP | WebSocket |
|------|------|-----------|
| 通信模式 | 半双工（请求-响应） | 全双工（双向实时） |
| 连接状态 | 无状态（每次独立） | 有状态（持久连接） |
| 服务端主动推送 | ❌ 无法主动推送 | ✅ 可主动推送 |
| 连接开销 | 每次请求建立/断开 | 仅一次握手 |
| 头部开销 | 较大（每次请求带完整头） | 极小（帧头2~10字节） |
| 适用场景 | 一次性请求响应 | 持续双向实时通信 |

---

## 三、握手流程

WebSocket 借助 HTTP 完成握手，之后切换协议：

```
1. 客户端发送 HTTP GET 请求：
   GET /ws HTTP/1.1
   Host: example.com
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
   Sec-WebSocket-Version: 13

2. 服务端响应 101：
   HTTP/1.1 101 Switching Protocols
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

3. 协议切换完成，开始全双工通信（不再是 HTTP）
```

> 🔑 关键：`101 Switching Protocols` 是 WebSocket 握手的标志响应码

---

## 四、典型使用场景

| 场景 | 说明 |
|------|------|
| **即时通信** | 在线聊天、直播弹幕、在线客服 |
| **实时数据推送** | 股票行情、设备监控、赛事比分 |
| **在线协作** | 腾讯文档、Figma（协同文档/设计） |
| **实时游戏** | 网页对战游戏（需可靠传输用TCP） |
| **直播辅助** | 礼物推送、在线人数（视频流本身用HLS/FLV） |

> 📝 注意：直播画面用 FLV/HLS 或 WebRTC，互动（弹幕/礼物）才用 WebSocket
> 在线协作传输的是极小操作指令（几十字节），不是全量文档

---

## 五、与 SSE / 轮询的对比

| 方案 | 通信模式 | 实时性 | 连接 | 适用场景 |
|------|---------|--------|------|---------|
| **WebSocket** | 全双工 | 极高 | 持久 | 双向实时交互（聊天、游戏） |
| **SSE** | 单向（服务端推） | 较高 | 持久（HTTP） | 仅服务端推送（行情/监控/AI流式输出） |
| **长轮询** | 半双工 | 中等 | 每次重建 | 老旧系统兼容 |
| **普通轮询** | 半双工 | 低 | 每次重建 | 低实时性简单场景 |

**选型建议**：
- 双向通信 → WebSocket
- 只需服务端推 → SSE（更轻量，自动重连）
- 兼容性要求高 → 长轮询降级

---

## 六、TCP_NODELAY：禁用 Nagle 算法

### 什么是 Nagle 算法？
TCP 默认开启 Nagle 算法：将小数据包攒成大包再发送（等待 200ms 或凑满 MSS），减少网络拥塞。

**问题**：对 WebSocket 实时场景，200ms 延迟积压是不可接受的。

### 解决方案：TCP_NODELAY

```js
// Node.js（ws 库）禁用 Nagle 算法，立即发送每个帧
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    ws._socket.setNoDelay(true); // 关闭 Nagle，立即发包
    console.log('Client connected, Nagle disabled');

    ws.on('message', (message) => {
        ws.send(`Echo: ${message}`);
    });
});
```

> 🔑 `setNoDelay(true)` = 设置 `TCP_NODELAY = 1`，禁用 Nagle 算法

**注意**：TCP 还有拥塞控制（收缩发送窗口），高并发时仍可能延迟，TCP_NODELAY 只解决 Nagle 问题。

---

## 七、基础用法代码

### 浏览器客户端

```js
const ws = new WebSocket('wss://example.com/ws');

ws.onopen = () => {
    console.log('连接已建立');
    ws.send(JSON.stringify({ type: 'join', room: '123' }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('收到消息：', data);
};

ws.onerror = (error) => {
    console.error('WebSocket 错误：', error);
};

ws.onclose = (event) => {
    console.log('连接关闭，code:', event.code, 'reason:', event.reason);
    // 可在此实现自动重连逻辑
};

// 主动关闭
ws.close(1000, '正常关闭');

// 检查连接状态
// ws.readyState: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
```

### Node.js 服务端（ws 库）

```js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
    ws._socket.setNoDelay(true); // 禁用 Nagle

    ws.on('message', (message) => {
        console.log('收到：', message.toString());
        // 广播给所有客户端
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });

    ws.on('close', () => console.log('客户端断开'));
    ws.on('error', (err) => console.error('错误：', err));
});
```

---

## 面试要点总结

- WebSocket 基于 TCP（非UDP），因为核心场景需要**可靠传输**
- 握手是 HTTP 升级，之后不走 HTTP，响应码 **101**
- 比 HTTP 优势：服务端主动推送 + 极小头部开销 + 全双工
- 实时性优化：`TCP_NODELAY` 禁用 Nagle 算法
- 选型：双向 → WebSocket；只推送 → SSE；兼容 → 长轮询
