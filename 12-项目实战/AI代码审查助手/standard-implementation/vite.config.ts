import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite 构建配置，开发时将 /api 代理到本地 serverless 函数服务
 */
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
