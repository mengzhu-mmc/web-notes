# Todo 全栈项目

> Koa2 + Sequelize + MySQL 后端 API + React Native (Expo) 移动端

练习目的：巩固 Node.js 三层架构设计、Sequelize ORM 使用、JWT 鉴权流程，入门 React Native 核心概念。

---

## 项目结构

```
Todo全栈项目/
├── todo-api/              # Koa2 后端
│   ├── src/
│   │   ├── app.js         # 入口文件，组装 Koa 实例
│   │   ├── config/
│   │   │   └── db.js      # 数据库连接配置
│   │   ├── models/
│   │   │   ├── index.js   # Sequelize 初始化 + 模型关联
│   │   │   ├── user.js    # User 模型
│   │   │   └── todo.js    # Todo 模型
│   │   ├── middleware/
│   │   │   ├── auth.js    # JWT 鉴权中间件
│   │   │   └── error.js   # 全局错误处理
│   │   ├── router/
│   │   │   ├── index.js   # 路由汇总
│   │   │   ├── user.js    # 用户路由
│   │   │   └── todo.js    # Todo 路由
│   │   ├── controller/
│   │   │   ├── user.js    # 用户控制器
│   │   │   └── todo.js    # Todo 控制器
│   │   └── service/
│   │       ├── user.js    # 用户数据库操作
│   │       └── todo.js    # Todo 数据库操作
│   ├── .env.example
│   └── package.json
│
└── todo-app/              # React Native 前端（Expo）
    ├── App.js             # 根组件
    └── src/
        ├── api/
        │   └── index.js   # Axios 封装 + 拦截器
        ├── context/
        │   └── AuthContext.js  # 全局登录状态（Context + useReducer）
        ├── navigation/
        │   └── index.js   # Stack Navigator 配置
        ├── screens/
        │   ├── LoginScreen.js
        │   ├── RegisterScreen.js
        │   └── TodoScreen.js
        └── components/
            └── TodoItem.js
```

---

## 后端启动

### 1. 准备数据库

```sql
CREATE DATABASE todo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 配置环境变量

```bash
cd todo-api
cp .env.example .env
# 编辑 .env，填入 MySQL 密码和 JWT 密钥
```

`.env` 示例：
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=你的MySQL密码
DB_NAME=todo_db
JWT_SECRET=随便写一个长字符串
JWT_EXPIRES_IN=7d
PORT=3000
APP_HOST=http://localhost
```

### 3. 安装依赖并启动

```bash
npm install
npm run dev
```

启动成功后会输出：
```
✅ 数据库连接成功，表结构已同步
🚀 服务启动成功：http://localhost:3000
```

> Sequelize 会自动根据 Model 定义创建 `users` 和 `todos` 表，无需手动建表。

---

## 接口文档

### 用户相关

| 方法 | 路径 | 说明 | 是否需要 Token |
|------|------|------|--------------|
| POST | /api/register | 注册 | ❌ |
| POST | /api/login | 登录 | ❌ |
| GET  | /api/userinfo | 获取当前用户信息 | ✅ |
| POST | /api/upload/avatar | 上传头像 | ✅ |

**注册/登录 body：**
```json
{ "username": "maomengchao", "password": "123456" }
```

**登录响应：**
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGci...",
    "user": { "id": 1, "username": "maomengchao", "avatar": null }
  }
}
```

### Todo 相关（均需 Token）

请求头：`Authorization: Bearer <token>`

| 方法 | 路径 | 说明 | Body |
|------|------|------|------|
| GET    | /api/todos | 获取我的 Todo 列表 | — |
| POST   | /api/todos | 新增 Todo | `{ "title": "买牛奶" }` |
| PUT    | /api/todos/:id | 更新（标题/完成状态）| `{ "done": true }` |
| DELETE | /api/todos/:id | 删除 | — |

**统一响应格式：**
```json
{ "code": 0, "message": "ok", "data": [...] }
```

---

## 前端启动

### 1. 安装 Expo CLI 和 Expo Go

```bash
npm install -g expo-cli
# 手机安装 Expo Go App（App Store / 各大应用市场）
```

### 2. 安装依赖

```bash
cd todo-app
npm install
```

### 3. 修改 API 地址

编辑 `src/api/index.js`，把 `BASE_URL` 改为你的本机 IP：

```js
// ⚠️ 手机测试时不能用 localhost
const BASE_URL = 'http://192.168.你的IP:3000/api'
```

查看本机 IP：
- Mac/Linux：`ifconfig | grep "inet " | grep -v 127.0.0.1`
- Windows：`ipconfig`

### 4. 启动

```bash
npx expo start
```

用手机 Expo Go 扫描二维码即可看到 App。

---

## 架构设计说明

### 后端三层架构

```
请求进入
  ↓
Router（路由层）
  定义 URL 路径，挂载中间件链
  ↓
Middleware（中间件层）
  横切关注点：鉴权校验、错误处理
  ↓
Controller（控制层）
  取参数，调 Service，写响应
  不写业务逻辑，不直接碰数据库
  ↓
Service（数据访问层）
  封装所有 Sequelize 操作
  Controller 只知道"我要什么数据"，不关心 SQL 怎么写
  ↓
Model（数据模型层）
  Sequelize 定义字段类型、关联关系
  对应数据库表结构
```

### JWT 鉴权流程

```
客户端登录 → 后端验密码 → 签发 JWT（含 id, username）
     ↓
客户端存储 token（AsyncStorage）
     ↓
后续请求携带 Authorization: Bearer <token>
     ↓
auth 中间件 jwt.verify() → 解码 payload → ctx.user = payload
     ↓
Controller 直接用 ctx.user.id 查数据
```

### 数据隔离

Todo 的所有增删改查都带 `userId` 过滤：
```js
// 用户 A 永远看不到用户 B 的 Todo
Todo.findAll({ where: { userId: ctx.user.id } })
Todo.update(fields, { where: { id, userId: ctx.user.id } })
```

### 前端状态管理

```
AsyncStorage（持久化）
     ↑↓
AuthContext（内存状态）
     ↓
Navigation（根据 token 自动切换路由栈）
  token 存在 → AppStack（TodoScreen）
  token 不存在 → AuthStack（Login/Register）
```

---

## 核心知识点速记

### Sequelize 常用操作

```js
// 查询
Model.findAll({ where: { userId }, order: [['createdAt', 'DESC']] })
Model.findOne({ where: { username } })
Model.findByPk(id)

// 创建
Model.create({ title, userId })

// 更新（返回 [affectedCount]）
Model.update(fields, { where: { id, userId } })

// 删除（返回 affectedCount）
Model.destroy({ where: { id, userId } })

// 关联查询（include）
Model.findAll({ include: [{ model: User, as: 'user' }] })
```

### React Native vs React Web

| | React Web | React Native |
|---|---|---|
| 基础容器 | `div` | `View` |
| 文字 | `span` / `p` | `Text` |
| 输入框 | `input` | `TextInput` |
| 按钮 | `button` | `TouchableOpacity` / `Pressable` |
| 列表 | `ul` + `map` | `FlatList`（虚拟化，性能好）|
| 弹窗 | 自定义 | `Modal` |
| 样式 | CSS / className | `StyleSheet.create`（JS 对象）|
| 布局 | 默认块级 | 默认 Flexbox，`flexDirection: 'column'` |
| 阴影 | `box-shadow` | iOS: `shadow*`，Android: `elevation` |
| 导航 | React Router | React Navigation |
| 本地存储 | localStorage | AsyncStorage（异步！）|

### RN 踩坑备忘

1. **Android 不能用 localhost** — 用真实 IP（`192.168.x.x`）
2. **Android HTTP 请求被拦截** — 在 `app.json` 中配置 `android.usesCleartextTraffic: true`（开发环境）
3. **键盘遮挡** — 用 `KeyboardAvoidingView`，iOS 用 `'padding'`，Android 用 `'height'`
4. **下拉刷新** — FlatList 的 `refreshing` + `onRefresh` 属性
5. **列表性能** — 用 `FlatList` 而不是 `ScrollView` + `map`，`keyExtractor` 不要用 index
