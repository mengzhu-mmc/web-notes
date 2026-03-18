# WebTransport API：下一代 Web 双向通信技术

> 来源：[张鑫旭博客](https://www.zhangxinxu.com/wordpress/2026/03/webtransport-api/)
> 发布日期：2026-03-17
> 收录日期：2026-03-18

---

## 一、为什么有 WebTransport？

WebSocket 虽然解决了大部分实时通信问题，但存在局限：
- **队头阻塞**：一个包丢失，后续所有包都要等重传
- **单一流传输**：所有数据在一条流里
- **网络切换断连**：Wi-Fi 切 4G 就断

**WebTransport** 基于 **HTTP/3 + QUIC**（UDP），专门解决高并发、低延迟场景。

---

## 二、WebSocket vs WebTransport 对比

| 对比维度 | WebSocket | WebTransport |
|---|---|---|
| 协议基础 | HTTP/1.1 Upgrade，底层 TCP | HTTP/3，底层 QUIC（UDP） |
| 连接建立 | TCP 三次握手，延迟较高 | QUIC 0-RTT/1-RTT，最快 100ms |
| 传输模式 | 单一可靠流 | 可靠流 + 不可靠数据报，多路复用 |
| 队头阻塞 | 存在 | 无，各流互不影响 |
| 网络切换 | 断开重连 | 支持连接迁移（基于连接ID，非IP） |
| 适用场景 | 普通聊天、消息推送 | 实时游戏、直播推流、高频数据传输 |

> ⚠️ WebSocket 没有被淘汰，场景不同选择不同：简单聊天用 WebSocket，高并发低延迟用 WebTransport。

---

## 三、三大核心特性

### 1. 双重传输模式

- **可靠流（Stream）**：保证有序、不丢失 → 适合聊天消息、协作编辑
- **不可靠数据报（Datagram）**：延迟极低但不保证到达 → 适合游戏位置更新、直播帧

### 2. 多路复用

一个连接可以同时创建多个独立流，互不影响。
例如直播平台：视频流、音频流、弹幕流分开传，某路丢包不影响其他。

### 3. 连接迁移

用"连接 ID"标识连接（而非 IP），Wi-Fi 切 4G 无缝迁移，数据不中断。

---

## 四、核心 API 用法

### 建立连接

```js
async function createWebTransport() {
  const url = 'https://example.com:4433/transport'; // 必须 HTTPS
  const transport = new WebTransport(url);
  await transport.ready; // 等待就绪
  transport.closed.then(() => console.log('连接关闭'));
  return transport;
}
```

### 使用可靠流（双向流）

```js
async function useBidirectionalStream(transport) {
  const stream = await transport.createBidirectionalStream();
  
  // 发送
  const writer = stream.writable.getWriter();
  await writer.write(new TextEncoder().encode('Hello WebTransport!'));
  await writer.close();
  
  // 接收
  const reader = stream.readable.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    console.log('收到：', decoder.decode(value));
  }
}
```

### 使用不可靠数据报（高频数据）

```js
async function useDatagram(transport) {
  const writer = transport.datagrams.writable.getWriter();
  const encoder = new TextEncoder();
  
  // 30fps 发送位置数据
  setInterval(async () => {
    const pos = { x: Math.random() * 100, y: Math.random() * 100 };
    await writer.write(encoder.encode(JSON.stringify(pos)));
  }, 33);
  
  // 接收
  const reader = transport.datagrams.readable.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    console.log('位置：', JSON.parse(new TextDecoder().decode(value)));
  }
}
```

> ⚠️ 不可靠数据报不要传重要数据（如支付信息）！

---

## 五、适用场景总结

✅ 强烈推荐用 WebTransport 的场景：
- **实时游戏**：低延迟、高频、允许少量丢失
- **直播推流/拉流**：帧数据用 Datagram，信令用 Stream
- **实时协作**（如多人在线文档）：低延迟可靠传输

❌ 继续用 WebSocket 的场景：
- 简单聊天功能
- 普通消息推送

---

## 六、浏览器支持

所有现代浏览器均已支持（Chrome、Firefox、Safari 等）。

---

*Tags: WebTransport, WebSocket, HTTP/3, QUIC, 实时通信, 网络协议*
