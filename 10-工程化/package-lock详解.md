# package-lock.json 深入解析

> 面试高频考点：锁文件的作用、与 package.json 的关系、npm/yarn/pnpm 锁文件对比。

## 面试高频考点

1. **package-lock.json 的作用是什么？**
2. **package.json 和 package-lock.json 有什么区别？**
3. **为什么要把 package-lock.json 提交到 Git？**
4. **npm install 和 npm ci 有什么区别？**
5. **yarn.lock、pnpm-lock.yaml 和 package-lock.json 有什么不同？**

---

## 一、为什么需要锁文件？

### 语义化版本（SemVer）的模糊性

`package.json` 中的版本号通常使用范围符号：

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "lodash": "~4.17.0",
    "axios": "1.6.0"
  }
}
```

| 符号 | 含义 | 示例 |
|------|------|------|
| `^` | 允许次版本和补丁版本升级 | `^18.0.0` 可安装 `18.2.1` |
| `~` | 只允许补丁版本升级 | `~4.17.0` 可安装 `4.17.21` |
| 无符号 | 精确版本 | `1.6.0` 只安装 `1.6.0` |

**问题**：同一个 `package.json`，今天 `npm install` 安装的是 `react@18.2.0`，一个月后可能安装的是 `react@18.3.1`。这会导致"在我电脑上能跑"的经典问题。

---

## 二、package-lock.json 的核心作用

### 2.1 锁定精确版本

`package-lock.json` 记录了每个依赖（包括间接依赖）的**精确版本号**、**下载地址**和**完整性哈希**：

```json
{
  "name": "my-project",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "node_modules/react": {
      "version": "18.2.0",
      "resolved": "https://registry.npmjs.org/react/-/react-18.2.0.tgz",
      "integrity": "sha512-/3IjMdb2L9QbBdWiW5e3P2/npwMBaU9mHCSCUzNln0ZCYbcfTsGbTJrU/kGemdH2IWmB2ioZ+zkxtmq6g09fA==",
      "dependencies": {
        "loose-envify": "^1.1.0"
      }
    }
  }
}
```

**三个关键字段**：
- `version`：精确版本号，不是范围
- `resolved`：包的下载 URL，确保来源一致
- `integrity`：SHA-512 哈希值，防止包被篡改（供应链安全）

### 2.2 保证依赖树一致性

有了 `package-lock.json`，无论何时何地执行 `npm install`，都会安装完全相同的依赖树，包括所有间接依赖的版本。

### 2.3 加速安装

锁文件中已记录了完整的依赖解析结果，npm 无需重新计算版本范围和依赖树，直接按锁文件安装，速度更快。

---

## 三、npm install vs npm ci

| 命令 | 适用场景 | 行为 |
|------|---------|------|
| `npm install` | 本地开发 | 读取 `package.json`，更新 `package-lock.json` |
| `npm ci` | CI/CD 环境 | 严格按 `package-lock.json` 安装，不修改锁文件 |

**`npm ci` 的特点**：
- 如果 `package-lock.json` 不存在，直接报错
- 如果 `package.json` 与 `package-lock.json` 版本不一致，报错
- 安装前自动删除 `node_modules`，保证干净环境
- 速度比 `npm install` 快（跳过版本解析）

```bash
# CI/CD 推荐用法
npm ci

# 本地开发
npm install
```

---

## 四、package.json vs package-lock.json

| 对比项 | package.json | package-lock.json |
|--------|-------------|-------------------|
| 作用 | 声明依赖范围和项目元信息 | 锁定精确依赖树 |
| 版本格式 | 范围（`^1.0.0`、`~2.0.0`） | 精确版本（`1.2.3`） |
| 手动编辑 | ✅ 经常手动修改 | ❌ 由 npm 自动维护 |
| 提交 Git | ✅ 必须提交 | ✅ 应该提交（库项目可选） |
| 包含间接依赖 | ❌ 只有直接依赖 | ✅ 包含所有依赖 |

**关于是否提交 Git**：
- **应用项目**：必须提交 `package-lock.json`，保证团队和 CI 环境一致
- **npm 库**：通常不提交（因为库的使用者会有自己的锁文件），但 GitHub 建议提交

---

## 五、三大包管理器锁文件对比

| 包管理器 | 锁文件 | 特点 |
|---------|--------|------|
| npm | `package-lock.json` | npm v5+ 自动生成，lockfileVersion 3（npm v7+） |
| yarn | `yarn.lock` | 格式更简洁，yarn v1 和 v2+ 格式不同 |
| pnpm | `pnpm-lock.yaml` | YAML 格式，结合硬链接存储，节省磁盘空间 |

**注意**：不要在同一项目中混用多个包管理器，会导致锁文件冲突。可以在 `package.json` 中用 `packageManager` 字段指定：

```json
{
  "packageManager": "pnpm@8.15.0"
}
```

---

## 六、常见问题与最佳实践

### 锁文件冲突怎么处理？

多人协作时，`package-lock.json` 经常产生 Git 冲突。推荐做法：

```bash
# 方案一：接受某一方的锁文件，重新安装
git checkout --theirs package-lock.json
npm install

# 方案二：删除锁文件重新生成（会更新所有依赖到最新兼容版本）
rm package-lock.json
npm install
```

### 为什么 node_modules 不提交 Git？

`node_modules` 体积庞大（动辄几百 MB），且可以通过 `package-lock.json` 完全还原。应在 `.gitignore` 中排除：

```
node_modules/
```

### 如何更新某个依赖到最新版？

```bash
# 更新单个包（同时更新 package.json 和 package-lock.json）
npm update lodash

# 强制安装最新版（忽略 package.json 中的版本范围）
npm install lodash@latest

# 检查哪些包有更新
npx npm-check-updates
```

---

## 七、面试答题模板

**Q：package-lock.json 的作用？**

`package-lock.json` 是 npm 自动生成的锁文件，核心作用是**锁定依赖的精确版本**。`package.json` 中的版本号通常是范围（如 `^18.0.0`），不同时间安装可能得到不同版本。`package-lock.json` 记录了每个依赖（包括间接依赖）的精确版本、下载地址和完整性哈希，确保团队成员和 CI 环境安装完全一致的依赖树，避免"在我电脑上能跑"的问题。

**Q：npm install 和 npm ci 的区别？**

`npm install` 读取 `package.json` 安装依赖，可能更新 `package-lock.json`；`npm ci` 严格按 `package-lock.json` 安装，不修改锁文件，安装前会清空 `node_modules`，适合 CI/CD 环境，速度更快且保证环境纯净。
