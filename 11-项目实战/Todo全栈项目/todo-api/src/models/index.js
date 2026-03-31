/**
 * models/index.js — Sequelize 初始化 + 模型关联
 *
 * 职责：
 * 1. 创建 Sequelize 实例（连接数据库）
 * 2. 引入所有 Model
 * 3. 建立模型间关联关系（hasMany / belongsTo）
 * 4. 统一导出，供 service 层使用
 */

const { Sequelize } = require('sequelize')
const dbConfig = require('../config/db')

// 创建 Sequelize 实例
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    timezone: dbConfig.timezone,
    logging: dbConfig.logging,
    pool: dbConfig.pool
  }
)

// 引入模型（每个模型文件负责定义自己的字段和类型）
const User = require('./user')(sequelize)
const Todo = require('./todo')(sequelize)

// 建立关联关系
// User hasMany Todo：一个用户可以有多个 Todo
// foreignKey 指定外键字段名（todo 表中的 userId 列）
User.hasMany(Todo, { foreignKey: 'userId', as: 'todos' })

// Todo belongsTo User：每个 Todo 归属于一个用户
// 反向关联，查 Todo 时可以 include User 拿到作者信息
Todo.belongsTo(User, { foreignKey: 'userId', as: 'user' })

module.exports = { sequelize, User, Todo }
