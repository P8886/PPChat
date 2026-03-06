import { useState, useRef } from 'react'

const MessageInput = ({ onSubmit, onFocus, onImageUpload }) => {
  const [messageText, setMessageText] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)

  const submitOnEnter = (event) => {
    // 监听回车键
    if (event.keyCode === 13) {
      onSubmit(messageText)
      setMessageText('')
    }
  }

  const handleSubmit = () => {
    if (messageText.trim()) {
      onSubmit(messageText)
      setMessageText('')
    }
  }

  const handleFocus = () => {
    onFocus?.()
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  // 处理图片上传
  const processImageFile = async (file) => {
    if (!file) return
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      return false
    }
    
    // 检查文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB')
      return false
    }
    
    setUploading(true)
    try {
      await onImageUpload?.(file)
      return true
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    await processImageFile(file)
    // 清空 input 以便重复选择同一文件
    e.target.value = ''
  }

  // 处理粘贴事件
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          await processImageFile(file)
        }
        return
      }
    }
  }

  return (
    <div className="flex gap-2 items-center">
      {/* 图片按钮 */}
      <button
        type="button"
        onClick={handleImageClick}
        disabled={uploading}
        className="text-gray-400 hover:text-gray-600 p-2 transition disabled:opacity-50"
        title="发送图片 (支持 Ctrl+V 粘贴)"
      >
        {uploading ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </button>
      
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <input
        ref={inputRef}
        className="shadow appearance-none border rounded flex-1 py-2 sm:py-3 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-base"
        type="text"
        placeholder="发送消息... (Ctrl+V 粘贴图片)"
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        onKeyDown={(e) => submitOnEnter(e)}
        onFocus={handleFocus}
        onPaste={handlePaste}
      />
      <button
        onClick={handleSubmit}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition duration-150 md:hidden"
      >
        发送
      </button>
    </div>
  )
}

export default MessageInput
