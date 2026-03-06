import { useState } from 'react'

const MessageInput = ({ onSubmit, onFocus }) => {
  const [messageText, setMessageText] = useState('')

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

  return (
    <div className="flex gap-2">
      <input
        className="shadow appearance-none border rounded flex-1 py-2 sm:py-3 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-base"
        type="text"
        placeholder="发送消息..."
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        onKeyDown={(e) => submitOnEnter(e)}
        onFocus={handleFocus}
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
