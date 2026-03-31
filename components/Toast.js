import { useEffect, useState } from 'react'

// 全局 Toast 状态管理
let listeners = []
let toastId = 0

export const showToast = (message, type = 'error') => {
  const id = ++toastId
  listeners.forEach(listener => listener({ id, message, type, show: true }))
  // 3秒后自动消失
  setTimeout(() => {
    listeners.forEach(listener => listener({ id, message, type, show: false }))
  }, 3000)
}

export const ToastContainer = () => {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const listener = (toast) => {
      if (toast.show) {
        setToasts(prev => [...prev, toast])
      } else {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }
    }
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  }, [])

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in
            ${toast.type === 'error' ? 'bg-red-600 text-white' : ''}
            ${toast.type === 'success' ? 'bg-green-600 text-white' : ''}
            ${toast.type === 'info' ? 'bg-blue-600 text-white' : ''}
          `}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}

export default ToastContainer
