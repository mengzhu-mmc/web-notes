# Chrome 自动画中画（Browser-Initiated Auto PiP）

> 来源：[Chrome for Developers Blog](https://developer.chrome.com/blog/automatic-picture-in-picture-initiated-by-the-browser?hl=en) | 日期：2026-03-18

## 核心内容

Chrome 142+ 新增浏览器发起的自动画中画（Auto PiP）功能：当用户在播放视频时切换到其他标签页，Chrome 会自动将视频移入一个始终置顶的画中画窗口，确保媒体内容持续可见。

与之前需要开发者手动注册 `enterpictureinpicture` 媒体会话处理器的方案不同，这个新特性**不需要开发者做任何适配**，浏览器会自动处理——当然，前提是满足一系列严格条件。

## 关键知识点

### 触发条件（需全部满足）
- 顶层 frame URL 通过 Safe Browsing 检查
- 媒体在顶层 frame 中播放
- 媒体在最近 2 秒内有音频输出
- 媒体拥有音频焦点且正在播放
- 只存在一个「正常」的播放器（未静音、非 MediaStream）
- 媒体元素有视频轨道
- 站点未在使用摄像头/麦克风
- 用户的 Media Engagement Index 超过阈值
- 当前没有其他 PiP 窗口打开

### 开发者控制与退出
```javascript
// 注册自己的处理器，可以覆盖默认行为
navigator.mediaSession.setActionHandler("enterpictureinpicture", (details) => {
  if (details.reason === "contentoccluded") {
    // 浏览器建议进入 PiP
    // 可以自定义处理，或什么都不做（阻止自动 PiP）
  }
});
```

### 最佳实践：保持进度条同步
```javascript
const video = document.querySelector('video');

function updatePositionState() {
  if ('setPositionState' in navigator.mediaSession) {
    navigator.mediaSession.setPositionState({
      duration: video.duration,
      playbackRate: video.playbackRate,
      position: video.currentTime,
    });
  }
}

video.addEventListener("loadedmetadata", updatePositionState);
video.addEventListener("seeked", updatePositionState);
```

### 完整控制支持
```javascript
// 支持 seekto / previoustrack / nexttrack，让 PiP 窗口操控更完整
navigator.mediaSession.setActionHandler("seekto", (details) => {
  if (details.fastSeek && "fastSeek" in video) {
    video.fastSeek(details.seekTime);
    return;
  }
  video.currentTime = details.seekTime;
});
```

## 启用方式（实验性）

```
chrome://flags/#browser-initiated-automatic-picture-in-picture
```
需要 Chrome 142+，桌面端。

## 面试相关

- **Picture-in-Picture API** 分为两种：标准视频 PiP 和 Document PiP（任意 HTML 内容）
- **Media Session API** 用于自定义媒体控件，可以响应系统媒体键、锁屏界面、PiP 窗口按钮
- **Media Engagement Index** 是 Chrome 内部指标，衡量用户对某站点的媒体使用频率，影响自动播放权限等

## 相关笔记

- [[浏览器媒体API]]
- [[Picture-in-Picture API]]
