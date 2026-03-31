import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

/** 应用入口，挂载 React 根组件到 #root 节点 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
