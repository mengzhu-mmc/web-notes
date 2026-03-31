/**
 * router/todo.js — Todo 相关路由
 *
 * 所有 Todo 接口都需要登录，统一挂载 authMiddleware
 *
 * GET    /api/todos      — 获取列表
 * POST   /api/todos      — 新增
 * PUT    /api/todos/:id  — 更新
 * DELETE /api/todos/:id  — 删除
 */

const Router = require('koa-router')
const todoController = require('../controller/todo')
const authMiddleware = require('../middleware/auth')

const router = new Router()

// 用 router.use() 统一给 /todos 前缀的路由加鉴权
// 等价于每个路由单独写 authMiddleware，但更简洁
router.use('/todos', authMiddleware)

router.get('/todos', todoController.list)
router.post('/todos', todoController.create)
router.put('/todos/:id', todoController.update)
router.delete('/todos/:id', todoController.remove)

module.exports = router
