/**
 * app.js — Koa 应用入口
 *
 * 职责：
 * 1. 创建 Koa 实例
 * 2. 挂载全局中间件（跨域、body 解析、静态文件、错误处理）
 * 3. 注册路由
 * 4. 启动服务器 + 数据库连接
 */

require('dotenv').config() // 必须在最前面，确保 process.env 可用

const Koa = require('koa')
const cors = require('koa2-cors')
const koaBody = require('koa-body')
const koaStatic = require('koa-static')
const path = require('path')

const { sequelize } = require('./models')
const router = require('./router')
const errorMiddleware = require('./middleware/error')

const app = new Koa()

// ① 全局错误监听（捕获 ctx.app.emit('error') 触发的错误）
app.use(errorMiddleware)

// ② 跨域配置
// allowedOrigins 按需修改，生产环境应限制具体域名
app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}))

// ③ 解析请求体
// multipart: true 支持文件上传（multipart/form-data）
app.use(koaBody({
  multipart: true,
  formidable: {
    uploadDir: path.join(__dirname, '../uploads'), // 上传文件临时目录
    keepExtensions: true,                          // 保留文件扩展名
    maxFileSize: 5 * 1024 * 1024                   // 限制 5MB
  }
}))

// ④ 静态文件服务（头像等上传文件可直接通过 URL 访问）
app.use(koaStatic(path.join(__dirname, '../uploads')))

// ⑤ 注册路由
app.use(router.routes())
app.use(router.allowedMethods())

// ⑥ 启动服务器
const PORT = process.env.PORT || 3000
const start = async () => {
  try {
    // sequelize.sync() 会根据 Model 定义自动创建/同步数据库表
    // force: false 表示不会删除已有数据（只新增字段）
    // 生产环境推荐使用 migrations 代替 sync
    await sequelize.sync({ force: false })
    console.log('✅ 数据库连接成功，表结构已同步')

    app.listen(PORT, () => {
      console.log(`🚀 服务启动成功：http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('❌ 启动失败：', err.message)
    process.exit(1)
  }
}

start()
