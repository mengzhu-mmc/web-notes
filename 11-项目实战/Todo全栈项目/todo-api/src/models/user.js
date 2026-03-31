/**
 * models/user.js — User 模型
 *
 * 对应数据库 users 表（Sequelize 默认复数化表名）。
 * 字段：id, username, password, avatar, createdAt, updatedAt
 *
 * 注意：password 字段设置了 get() 访问器，
 * 防止序列化时把密码泄露到接口响应里。
 */

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,          // 用户名唯一约束
      comment: '用户名'
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'bcrypt 加密后的密码',
      // get() 访问器：通过 user.password 取值时返回 undefined
      // 防止 JSON 序列化时把 hash 密码暴露在接口响应里
      get() {
        return undefined
      }
    },
    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      comment: '头像 URL'
    }
  }, {
    tableName: 'users',      // 显式指定表名，避免 Sequelize 自动复数化出错
    timestamps: true,        // 自动维护 createdAt / updatedAt 字段
    comment: '用户表'
  })

  return User
}
