# WebTransport API：下一代 Web 双向通信技术

> 来源：[张鑫旭博客 2026-03-17](https://www.zhangxinxu.com/wordpress/2026/03/webtransport-api/)  
> 入库日期：2026-03-19

## 一、为什么需要 WebTransport？

WebSocket 的痛点：
- **队头阻塞**：一个包丢失，后续所有包等待重传
- **单一流传输**：只能一种传输方式，无法兼顾延迟和可靠性
- **网络切换断连**：Wi-Fi ↔ 4G 切换会断开连接

**WebTransport** 基于 HTTP/3 + QUIC 协议，专为高并发、低延迟场景而生。

---

## 二、WebSocket vs WebTransport 对比

| 对比维度 | WebSocket | WebTransport |
|---------|-----------|--------------|
| 协议基础 | HTTP/1.1 Upgrade + TCP | HTTP/3 + QUIC（基于 UDP）|
| 连接建立 | TCP 三次握手，延迟较高 | QUIC 0-RTT/1-RTT，最快 100ms |
| 传输模式 | 单一可靠流 | 可靠流 + 不可靠数据报，多路复用 |
| 队头阻塞 | 存在 | 无，各流互相独立 |
| 网络切换 | 断开重连 | 支持连接迁移（Wi-Fi ↔ 4G 不中断）|
| 适用场景 | 普通聊天、消息推送 | 实时游戏、直播推流、高频数据传输 |

> 💡 不是说 WebSocket 不行，是场景不同，选择不同。简单聊天用 WebSocket 足够。

---

## 三、三个核心特性

### 1. 双重传输模式
- **可靠流（Stream）**：有序、不丢包、不重复，适合聊天消息、协作编辑等重要数据
- **不可靠数据报（Datagram）**：无序、可丢包，但延迟极低，适合游戏位置更新、直播视频帧

### 2. 多路复用
一个连接内可并行多个独立流，互不阻塞。  
例：直播平台的视频流、音频流、弹幕流各走各的流，互不干扰。

### 3. 连接迁移
QUIC 用"连接 ID"（非 IP 地址）标识连接，网络切换后连接无缝迁移，不中断数据。

---

## 四、核心 API 用法

### 建立连接

```js
async function createWebTransport() {
  const url = 'https://example.com:4433/transport'; // 必须 HTTPS

  const transport = new WebTransport(url, {
    serverCertificateHashes: [
      { algorithm: 'sha-256', value: new Uint8Array([/* 证书指纹 */]) }
    ]
  });

  await transport.ready; // 等待连接就绪
  console.log('连接成功');

  transport.closed
    .then(() => console.log('连接已关闭'))
    .catch(err => console.error('异常关闭：', err));

  return transport;
}
```

### 可靠流（双向 Stream）

```js
async function useBidirectionalStream(transport) {
  const stream = await transport.createBidirectionalStream();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // 发送
  const writer = stream.writable.getWriter();
  await writer.write(encoder.encode('Hello WebTransport!'));
  await writer.close();

  // 接收
  const reader = stream.readable.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    console.log('收到：', decoder.decode(value));
  }
}
```

### 不可靠数据报（Datagram）

```js
async function useDatagram(transport) {
  const writer = transport.datagrams.writable.getWriter();
  const encoder = new TextEncoder();

  // 高频发送，如游戏玩家位置（30 FPS）
  setInterval(async () => {
    const pos = { x: Math.random() * 100, y: Math.random() * 100 };
    await writer.write(encoder.encode(JSON.stringify(pos)));
  }, 33);

  // 接收
  const reader = transport.datagrams.readable.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    console.log('位置：', JSON.parse(decoder.decode(value)));
  }
}
```

> ⚠️ 数据报不保证到达，不要用于重要数据（如支付）

---

## 五、适用场景总结

✅ **推荐用 WebTransport：**
- 实时游戏（低延迟 + 允许丢包）
- 直播推流/拉流（视频帧 + 弹幕分流）
- 实时协作工具（多人编辑，低延迟可靠）
- 移动端需要网络切换不中断的场景

❌ **无需 WebTransport：**
- 简单聊天/消息推送 → WebSocket 足够

---

## 六、兼容性

- Chrome 97+、Firefox 114+、Safari 26.4+ 均已支持
- 必须在 **HTTPS** 环境下使用（本地 localhost 可用）
- 投入正式生产还需 1-2 年缓冲（Safari 支持较晚）

---

## 关键词

`WebTransport` `WebSocket` `QUIC` `HTTP/3` `实时通信` `低延迟` `多路复用` `数据报` `流传输`
