/**
 * router/user.js — 用户相关路由
 *
 * POST /api/register     — 注册（无需登录）
 * POST /api/login        — 登录（无需登录）
 * GET  /api/userinfo     — 获取用户信息（需登录）
 * POST /api/upload/avatar — 上传头像（需登录）
 */

const Router = require('koa-router')
const userController = require('../controller/user')
const authMiddleware = require('../middleware/auth')

const router = new Router()

router.post('/register', userController.register)
router.post('/login', userController.login)
router.get('/userinfo', authMiddleware, userController.userInfo)
router.post('/upload/avatar', authMiddleware, userController.uploadAvatar)

module.exports = router
