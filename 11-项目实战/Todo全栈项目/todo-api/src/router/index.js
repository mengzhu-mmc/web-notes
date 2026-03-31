/**
 * router/index.js — 路由汇总
 *
 * 统一挂载所有子路由，设置 /api 前缀。
 * 使用 koa-router 的 allowedMethods() 处理 OPTIONS 请求（CORS 预检）
 * 以及 405 Method Not Allowed 等响应。
 */

const Router = require('koa-router')
const userRouter = require('./user')
const todoRouter = require('./todo')

const router = new Router({ prefix: '/api' })

// 挂载子路由
router.use(userRouter.routes())
router.use(todoRouter.routes())

module.exports = router
