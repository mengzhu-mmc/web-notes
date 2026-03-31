/**
 * models/todo.js — Todo 模型
 *
 * 对应数据库 todos 表。
 * 字段：id, title, done, userId（外键）, createdAt, updatedAt
 */

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Todo = sequelize.define('Todo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Todo 标题'
    },
    done: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,   // 新建时默认未完成
      comment: '是否完成'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '所属用户 ID（外键）'
      // 外键约束由 models/index.js 中的 association 定义
    }
  }, {
    tableName: 'todos',
    timestamps: true,
    comment: 'Todo 表'
  })

  return Todo
}
