/**
 * middleware/error.js — 全局错误处理中间件
 *
 * 两种错误捕获方式：
 * 1. try/catch 包裹 await next()，捕获中间件链中的同步/异步错误
 * 2. ctx.app.emit('error', err, ctx) 触发 app.on('error') 事件
 *
 * 统一响应格式：{ code, message, data: null }
 *
 * 错误类型约定：
 * - err.status 存在时使用它作为 HTTP 状态码
 * - err.code 存在时作为业务错误码
 * - 未知错误统一返回 500
 */

const errorMiddleware = async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    // 打印错误栈（生产环境可接入日志系统）
    console.error('[Error]', err.message)

    const status = err.status || err.statusCode || 500
    const code = err.code || status
    const message = err.message || '服务器内部错误'

    ctx.status = status
    ctx.body = {
      code,
      message,
      data: null
    }

    // 将错误传递给 app.on('error') 监听器（可选，用于日志上报）
    ctx.app.emit('error', err, ctx)
  }
}

module.exports = errorMiddleware
