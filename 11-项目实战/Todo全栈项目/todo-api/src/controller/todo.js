/**
 * controller/todo.js — Todo 控制器
 *
 * 所有接口都需要登录（已在路由层挂载 authMiddleware）
 * ctx.user.id 是当前登录用户的 ID
 */

const todoService = require('../service/todo')

const todoController = {
  /**
   * GET /api/todos — 获取当前用户的所有 Todo
   */
  async list(ctx) {
    const todos = await todoService.findAllByUser(ctx.user.id)
    ctx.body = { code: 0, message: 'ok', data: todos }
  },

  /**
   * POST /api/todos — 新增 Todo
   * body: { title }
   */
  async create(ctx) {
    const { title } = ctx.request.body
    if (!title || !title.trim()) {
      const err = new Error('标题不能为空')
      err.status = 400
      throw err
    }

    const todo = await todoService.create(title.trim(), ctx.user.id)
    ctx.body = { code: 0, message: '创建成功', data: todo }
  },

  /**
   * PUT /api/todos/:id — 更新 Todo（标题 or 完成状态）
   * body: { title?, done? }
   *
   * 使用 PUT 而不是 PATCH：
   * 严格来说 PATCH 更语义化（部分更新），但实际开发中两者都常见
   * 这里用 PUT 是为了简化，客户端传什么字段就更新什么字段
   */
  async update(ctx) {
    const { id } = ctx.params
    const { title, done } = ctx.request.body

    if (title === undefined && done === undefined) {
      const err = new Error('至少提供 title 或 done 字段')
      err.status = 400
      throw err
    }

    const [affectedCount] = await todoService.update(id, ctx.user.id, { title, done })

    // affectedCount 为 0 说明：Todo 不存在 or 不属于当前用户
    if (affectedCount === 0) {
      const err = new Error('Todo 不存在或无权限操作')
      err.status = 404
      throw err
    }

    ctx.body = { code: 0, message: '更新成功', data: null }
  },

  /**
   * DELETE /api/todos/:id — 删除 Todo
   */
  async remove(ctx) {
    const { id } = ctx.params
    const affectedCount = await todoService.remove(id, ctx.user.id)

    if (affectedCount === 0) {
      const err = new Error('Todo 不存在或无权限操作')
      err.status = 404
      throw err
    }

    ctx.body = { code: 0, message: '删除成功', data: null }
  }
}

module.exports = todoController
