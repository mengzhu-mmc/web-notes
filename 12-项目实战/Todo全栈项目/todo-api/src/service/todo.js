/**
 * service/todo.js — Todo 业务逻辑层
 *
 * 所有操作都带 userId 过滤，确保用户只能操作自己的数据。
 * 这是多租户数据隔离的最简实现方式。
 */

const { Todo } = require('../models')

const todoService = {
  /**
   * 获取用户的所有 Todo
   * order: [['createdAt', 'DESC']] 按创建时间倒序
   */
  async findAllByUser(userId) {
    return Todo.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    })
  },

  /**
   * 创建 Todo
   */
  async create(title, userId) {
    return Todo.create({ title, userId })
  },

  /**
   * 更新 Todo（标题或完成状态）
   *
   * 关键：where 条件同时包含 id 和 userId
   * 防止用户 A 修改用户 B 的 Todo（越权操作）
   *
   * @returns [affectedCount] — 受影响行数，为 0 说明不存在或无权限
   */
  async update(id, userId, fields) {
    // fields 只允许包含 title 和 done，防止意外更新其他字段
    const allowed = {}
    if (fields.title !== undefined) allowed.title = fields.title
    if (fields.done !== undefined) allowed.done = fields.done

    return Todo.update(allowed, { where: { id, userId } })
  },

  /**
   * 删除 Todo
   * 同样双重 where 防越权
   */
  async remove(id, userId) {
    return Todo.destroy({ where: { id, userId } })
  },

  /**
   * 根据 ID 查找单条（含权限校验）
   */
  async findOne(id, userId) {
    return Todo.findOne({ where: { id, userId } })
  }
}

module.exports = todoService
