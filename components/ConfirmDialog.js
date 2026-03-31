import { useEffect, useState } from 'react'

// 全局状态管理
let listeners = []

export const showConfirm = (options) => {
  const { title = '确认', message, onConfirm, onCancel } = options
  listeners.forEach(listener => listener({
    show: true,
    title,
    message,
    onConfirm,
    onCancel
  }))
}

export const hideConfirm = () => {
  listeners.forEach(listener => listener({ show: false }))
}

export const ConfirmDialogContainer = () => {
  const [dialog, setDialog] = useState({ show: false, title: '', message: '', onConfirm: null, onCancel: null })

  useEffect(() => {
    const listener = (data) => {
      if (data.show) {
        setDialog(data)
      } else {
        setDialog(prev => ({ ...prev, show: false }))
      }
    }
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  }, [])

  const handleConfirm = () => {
    dialog.onConfirm?.()
    hideConfirm()
  }

  const handleCancel = () => {
    dialog.onCancel?.()
    hideConfirm()
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel()
    }
  }

  if (!dialog.show) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9998]"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm mx-4 animate-fade-in">
        <h3 className="text-lg font-bold text-white mb-2">{dialog.title}</h3>
        <p className="text-gray-300 mb-6">{dialog.message}</p>
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 px-4 rounded transition"
          >
            确定
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded transition"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialogContainer
