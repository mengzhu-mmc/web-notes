/**
 * middleware/auth.js — JWT 鉴权中间件
 *
 * 使用方式：在需要登录的路由上挂载此中间件
 *   router.get('/todos', authMiddleware, todoController.list)
 *
 * 流程：
 * 1. 从请求头 Authorization 中提取 token（格式：Bearer <token>）
 * 2. 用 jwt.verify 验证 token 有效性
 * 3. 将解码后的 payload（含 id, username）挂载到 ctx.user
 * 4. 调用 next() 继续执行后续中间件/控制器
 *
 * 失败时抛出 401 错误，由全局错误中间件统一处理
 */

const jwt = require('jsonwebtoken')

const authMiddleware = async (ctx, next) => {
  // 1. 获取 Authorization header
  const authHeader = ctx.headers['authorization']
  if (!authHeader) {
    const err = new Error('请先登录')
    err.status = 401
    throw err
  }

  // 2. 提取 token（去掉 "Bearer " 前缀）
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    const err = new Error('Token 格式错误')
    err.status = 401
    throw err
  }

  // 3. 验证 token
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    // payload 结构：{ id, username, iat, exp }
    ctx.user = payload  // 挂载到 ctx，后续中间件/controller 直接用 ctx.user.id
  } catch (e) {
    const err = new Error(
      e.name === 'TokenExpiredError' ? 'Token 已过期，请重新登录' : 'Token 无效'
    )
    err.status = 401
    throw err
  }

  await next()
}

module.exports = authMiddleware
