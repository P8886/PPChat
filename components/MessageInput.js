import { useState } from 'react'

const MessageInput = ({ onSubmit }) => {
  const [messageText, setMessageText] = useState('')

  const submitOnEnter = (event) => {
    if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    if (messageText.trim()) {
      onSubmit(messageText)
      setMessageText('')
    }
  }

  return (
    <div className="flex gap-3 items-center">
      <input
        className="flex-1 bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
        type="text"
        placeholder="发送消息..."
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        onKeyDown={(e) => submitOnEnter(e)}
      />
      <button
        onClick={handleSubmit}
        disabled={!messageText.trim()}
        className="bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white px-5 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-lg"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  )
}

export default MessageInput
