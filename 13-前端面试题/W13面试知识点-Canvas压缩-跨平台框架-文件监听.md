# 面试知识点摘录 · 2026-W13

> 来源：前端周报 2026-W13 | 整理于 2026-03-27

---

## 1. Canvas 数据压缩

**考点方向**：Canvas API 的创新应用 / 前端数据处理

### 原理

通过 `canvas` 将任意数据编码为图片格式进行传输或存储，利用图片压缩算法（JPEG/WebP）实现数据体积压缩。

```js
// 基本思路：将数据写入 ImageData → 导出为 Blob
function compressData(data) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  // 将数据编码到像素中...
  canvas.toBlob((blob) => {
    // blob 即为压缩后的"图片"
  }, 'image/webp', 0.8);
}
```

### 关键 API

| API | 说明 |
|-----|------|
| `canvas.getContext('2d')` | 获取 2D 渲染上下文 |
| `ctx.createImageData(w, h)` | 创建空白 ImageData |
| `ctx.putImageData(imageData, 0, 0)` | 将像素数据写入 canvas |
| `canvas.toBlob(cb, type, quality)` | 导出为 Blob（支持格式和质量） |
| `canvas.toDataURL(type, quality)` | 导出为 base64 Data URL |
| `createImageBitmap(blob)` | 将 Blob 解码回图像 |

### 使用场景

- 前端上传前的数据预压缩
- 将二进制数据以图片形式存入 localStorage（绕过存储格式限制）
- 游戏状态序列化存储

---

## 2. fs.watch vs Chokidar（Node.js 文件监听）

**考点方向**：Node.js 工程化 / 构建工具原理

### fs.watch 的缺陷

```js
// 原生 fs.watch 问题多
const fs = require('fs');
fs.watch('./src', { recursive: true }, (event, filename) => {
  // ❌ 在 macOS 上可能触发两次
  // ❌ rename 事件不可靠（不知道是新建还是删除）
  // ❌ 大目录性能差
  console.log(event, filename);
});
```

### Chokidar 优势

```js
const chokidar = require('chokidar');
const watcher = chokidar.watch('./src', {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 100 } // 防抖
});

watcher
  .on('add', path => console.log('新增:', path))
  .on('change', path => console.log('修改:', path))
  .on('unlink', path => console.log('删除:', path));
```

### 对比表

| 问题 | `fs.watch` | Chokidar |
|------|-----------|---------|
| 跨平台一致性 | ❌ 差 | ✅ 好 |
| 事件去重/防抖 | ❌ 无 | ✅ 内置 |
| 子目录递归 | ⚠️ 不稳定 | ✅ 稳定 |
| rename 事件 | ❌ 不可靠 | ✅ 可靠 |
| 大目录性能 | ❌ 差 | ✅ 优化 |

**在哪里用**：Vite HMR、webpack watch、nodemon 底层都依赖 Chokidar

---

## 3. 跨平台 UI 框架对比（Valdi 新增）

**考点方向**：跨平台开发原理 / React Native vs Flutter vs 新框架

### 主流方案对比

| 框架 | 语言/语法 | 渲染方式 | 性能 | 发布方 |
|------|---------|---------|------|--------|
| React Native | JS/JSX | JS Bridge → 原生组件 | 中 | Meta |
| Flutter | Dart | Skia Canvas 自绘 | 高 | Google |
| **Valdi** | **类 React JSX** | **编译 → 原生组件** | **高** | **Snapchat** |
| Capacitor/Ionic | JS/TS | WebView | 低-中 | Ionic |

### Valdi 的差异点

- **无 Bridge**：编译时直接生成原生代码，无运行时桥接开销
- **开发体验**：React 开发者几乎无学习曲线
- **支持平台**：iOS、Android、macOS（三端）
- 状态：2026 年 Snapchat 开源，社区尚小

---

## 4. 私有 NPM 镜像方案

**考点方向**：前端工程化 / 包管理

### 常见方案

| 方案 | 特点 | 适用场景 |
|------|------|---------|
| Verdaccio | Node.js，轻量，开箱即用 | 小团队 |
| Nexus Repository | 重量级，支持多语言 | 大企业 |
| **Npflared** | Cloudflare Worker 驱动，Serverless | 无服务器场景 |
| npm Orgs | 官方私有包（付费） | 有预算团队 |

### .npmrc 配置私有源

```ini
# 针对特定 scope 使用私有源
@mycompany:registry=https://npm.mycompany.com
//npm.mycompany.com/:_authToken=${NPM_TOKEN}

# 其他包仍用官方源
registry=https://registry.npmjs.org
```

---

## 5. 大模型局限性（AI 面试背景知识）

**考点方向**：AI 工具认知 / 技术视野

### 核心结论

- 大模型 = 统计规律匹配，不是真正的推理
- 对没有训练语料的任务，表现接近随机（3.8% 正确率）
- 对前端开发的启示：
  - 用 AI 写代码前，**需要自己先想清楚**
  - AI 擅长「清晰需求 → 代码」，不擅长「模糊需求 → 方案」
  - 理解原理的开发者 > 只会用 AI 生成代码的开发者

---

*参考来源：前端周报 2026-W13，阮一峰周刊第 390 期*
