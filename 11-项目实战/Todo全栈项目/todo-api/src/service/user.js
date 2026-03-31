/**
 * service/user.js — 用户业务逻辑层
 *
 * 职责：封装所有与 User 表相关的数据库操作。
 * Controller 层不直接调用 Sequelize，统一经过 Service。
 *
 * 为什么用 Service 层？
 * - 复用：多个 controller 可能调用同一段数据库逻辑
 * - 解耦：换数据库/ORM 时只改 service，controller 不动
 * - 测试：可以 mock service 层单独测 controller
 */

const bcrypt = require('bcryptjs')
const { User } = require('../models')

const userService = {
  /**
   * 根据用户名查找用户
   * 注意：不使用 user.password（Model 的 get() 访问器会返回 undefined）
   * 这里用 User.findOne + raw: false 返回 Sequelize 实例，
   * 然后通过 dataValues 拿到原始值（包含 password hash）用于比对
   */
  async findByUsername(username) {
    return User.findOne({
      where: { username }
    })
  },

  /**
   * 创建用户
   * @param {string} username
   * @param {string} password - 明文密码，这里进行 bcrypt 加密
   * bcrypt.hash(password, 10) — 第二个参数是 salt rounds（越大越安全但越慢，10 是推荐值）
   */
  async create(username, password) {
    const hash = await bcrypt.hash(password, 10)
    return User.create({ username, password: hash })
  },

  /**
   * 验证密码
   * @param {string} inputPassword - 用户输入的明文密码
   * @param {string} hashedPassword - 数据库中的 hash 值
   * bcrypt.compare 内部会提取 salt 重新计算，比对是否一致
   */
  async verifyPassword(inputPassword, hashedPassword) {
    return bcrypt.compare(inputPassword, hashedPassword)
  },

  /**
   * 更新头像 URL
   */
  async updateAvatar(userId, avatarUrl) {
    return User.update({ avatar: avatarUrl }, { where: { id: userId } })
  },

  /**
   * 根据 ID 查找用户（用于接口返回用户信息，不含密码）
   */
  async findById(id) {
    return User.findByPk(id, {
      attributes: ['id', 'username', 'avatar', 'createdAt']
    })
  }
}

module.exports = userService
