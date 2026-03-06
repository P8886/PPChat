import { useContext, useState } from 'react'
import UserContext from '~/lib/UserContext'
import { deleteMessage } from '~/lib/Store'
import TrashIcon from '~/components/TrashIcon'

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 图片弹窗组件（支持滚轮缩放和拖拽）
const ImageModal = ({ src, onClose }) => {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // 滚轮缩放
  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 5))
  }

  // 拖拽开始
  const handleMouseDown = (e) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  // 拖拽移动
  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }

  // 拖拽结束
  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 重置缩放和位置
  const resetTransform = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
      onClick={onClose}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img 
        src={src} 
        alt="图片预览" 
        className="rounded-lg transition-transform duration-75"
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        draggable={false}
      />
      <button 
        className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
        onClick={onClose}
      >
        ✕
      </button>
      <button 
        className="absolute top-4 right-14 text-white text-sm bg-gray-700 px-2 py-1 rounded hover:bg-gray-600"
        onClick={(e) => { e.stopPropagation(); resetTransform(); }}
      >
        重置
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-gray-700 px-3 py-1 rounded">
        滚轮缩放 · 拖拽移动 · {(scale * 100).toFixed(0)}%
      </div>
    </div>
  )
}

const Message = ({ message }) => {
  const { user } = useContext(UserContext)
  const isOwnMessage = user?.id === message.user_id
  const [modalImage, setModalImage] = useState(null)
  
  // 判断消息类型
  const isImage = message.message_type === 'image'
  const imageUrl = isImage ? (message.message || '') : ''

  return (
    <div className={`py-1 flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-center space-x-1 sm:space-x-2 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <div className="text-gray-100 w-4 shrink-0">
          {(isOwnMessage || ['admin', 'moderator'].includes(user?.appRole)) && (
            <button onClick={() => deleteMessage(message.id)}>
              <TrashIcon />
            </button>
          )}
        </div>
        <div className={isOwnMessage ? 'text-right' : 'text-left'}>
          <p className={`font-bold text-sm sm:text-base ${isOwnMessage ? 'text-green-400' : 'text-blue-400'}`}>
            {message?.author?.username}
          </p>
          <p className="text-gray-400 text-xs">
            {formatTime(message.inserted_at)}
          </p>
          {isImage && imageUrl ? (
            <div className="bg-gray-700 rounded-lg p-1 max-w-[200px] sm:max-w-xs">
              <img
                src={imageUrl}
                alt="图片"
                className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition"
                style={{ maxHeight: '200px' }}
                onClick={() => setModalImage(imageUrl)}
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.parentElement.innerHTML = `<span class="text-red-400 text-sm">图片加载失败</span>`
                }}
              />
            </div>
          ) : (
            <p className="text-white bg-gray-700 px-2 sm:px-3 py-1 rounded-lg inline-block text-sm sm:text-base max-w-[200px] sm:max-w-xs break-words text-left">
              {message.message}
            </p>
          )}
        </div>
      </div>
      {modalImage && <ImageModal src={modalImage} onClose={() => setModalImage(null)} />}
    </div>
  )
}

export default Message
