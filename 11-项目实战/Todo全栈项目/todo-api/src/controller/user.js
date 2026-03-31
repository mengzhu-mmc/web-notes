/**
 * controller/user.js — 用户控制器
 *
 * 职责：接收 ctx 参数，调用 service，写入 ctx.body。
 * 不写业务逻辑，不直接操作数据库。
 *
 * 统一响应格式：{ code: 0, message: 'ok', data: {...} }
 * 错误通过 throw 抛出，由 error middleware 统一处理
 */

const jwt = require('jsonwebtoken')
const path = require('path')
const userService = require('../service/user')

const userController = {
  /**
   * POST /api/register — 注册
   * body: { username, password }
   */
  async register(ctx) {
    const { username, password } = ctx.request.body

    // 参数校验
    if (!username || !password) {
      const err = new Error('用户名和密码不能为空')
      err.status = 400
      throw err
    }
    if (username.length < 2 || username.length > 20) {
      const err = new Error('用户名长度为 2-20 个字符')
      err.status = 400
      throw err
    }
    if (password.length < 6) {
      const err = new Error('密码不能少于 6 位')
      err.status = 400
      throw err
    }

    // 检查用户名是否已存在
    const existing = await userService.findByUsername(username)
    if (existing) {
      const err = new Error('用户名已存在')
      err.status = 409  // 409 Conflict
      throw err
    }

    // 创建用户
    const user = await userService.create(username, password)

    ctx.body = {
      code: 0,
      message: '注册成功',
      data: { id: user.id, username: user.username }
    }
  },

  /**
   * POST /api/login — 登录
   * body: { username, password }
   *
   * 返回 JWT token，过期时间由 .env JWT_EXPIRES_IN 控制
   */
  async login(ctx) {
    const { username, password } = ctx.request.body

    if (!username || !password) {
      const err = new Error('用户名和密码不能为空')
      err.status = 400
      throw err
    }

    // 查找用户（findByUsername 返回完整 Sequelize 实例）
    const user = await userService.findByUsername(username)
    if (!user) {
      const err = new Error('用户不存在')
      err.status = 400
      throw err
    }

    // 取原始 password hash 进行比对
    // 注意：user.password 由于 get() 访问器返回 undefined
    // 要从 user.dataValues.password 取到真实 hash
    const isMatch = await userService.verifyPassword(password, user.dataValues.password)
    if (!isMatch) {
      const err = new Error('密码错误')
      err.status = 400
      throw err
    }

    // 签发 JWT
    // payload 只存必要信息，不存敏感数据
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    ctx.body = {
      code: 0,
      message: '登录成功',
      data: {
        token,
        user: { id: user.id, username: user.username, avatar: user.avatar }
      }
    }
  },

  /**
   * GET /api/userinfo — 获取当前登录用户信息
   * 需要 authMiddleware，ctx.user 已由中间件注入
   */
  async userInfo(ctx) {
    const user = await userService.findById(ctx.user.id)
    if (!user) {
      const err = new Error('用户不存在')
      err.status = 404
      throw err
    }
    ctx.body = { code: 0, message: 'ok', data: user }
  },

  /**
   * POST /api/upload/avatar — 上传头像
   * 使用 koa-body 处理 multipart/form-data
   * 上传的文件信息在 ctx.request.files.avatar 中
   */
  async uploadAvatar(ctx) {
    const file = ctx.request.files?.avatar
    if (!file) {
      const err = new Error('请选择要上传的文件')
      err.status = 400
      throw err
    }

    // koa-body 将文件保存到 uploads/ 目录，这里构造可访问的 URL
    const filename = path.basename(file.filepath || file.path)
    const avatarUrl = `${process.env.APP_HOST}:${process.env.PORT}/avatars/${filename}`

    // 更新数据库
    await userService.updateAvatar(ctx.user.id, avatarUrl)

    ctx.body = {
      code: 0,
      message: '上传成功',
      data: { avatarUrl }
    }
  }
}

module.exports = userController
