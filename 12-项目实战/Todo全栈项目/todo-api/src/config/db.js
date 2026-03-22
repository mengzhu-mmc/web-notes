/**
 * config/db.js — 数据库连接配置
 *
 * 使用 Sequelize 连接 MySQL，读取 .env 中的配置项。
 * 这里只导出配置对象，Sequelize 实例在 models/index.js 中统一创建。
 */

module.exports = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'todo_db',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  dialect: 'mysql',          // 数据库类型，Sequelize 支持多种
  timezone: '+08:00',        // 时区，避免时间偏差
  logging: false,            // 关闭 SQL 日志（开发时可改为 console.log）
  pool: {
    max: 10,                 // 连接池最大连接数
    min: 0,
    acquire: 30000,          // 获取连接超时时间（ms）
    idle: 10000              // 连接空闲释放时间（ms）
  }
}
