import { useContext } from 'react'
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

const Message = ({ message }) => {
  const { user } = useContext(UserContext)
  const isOwnMessage = user?.id === message.user_id

  return (
    <div className={`py-2 flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`flex items-start gap-2 sm:gap-3 max-w-[85%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
        <div className={`${isOwnMessage ? 'text-right' : 'text-left'} min-w-0`}>
          <div className="flex items-center gap-2 mb-0.5">
            <p className={`font-semibold text-sm ${isOwnMessage ? 'text-brand-400' : 'text-primary-400'}`}>
              {message?.author?.username}
            </p>
            <p className="text-slate-500 text-xs">
              {formatTime(message.inserted_at)}
            </p>
          </div>
          <div
            className={`px-3 sm:px-4 py-2 rounded-2xl inline-block text-sm sm:text-base break-words max-w-full shadow-sm ${
              isOwnMessage
                ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-br-md'
                : 'bg-slate-700 text-slate-100 rounded-bl-md'
            }`}
          >
            {message.message}
          </div>
        </div>
        <div className={`shrink-0 pt-1 ${isOwnMessage || ['admin', 'moderator'].includes(user?.appRole) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          {(isOwnMessage || ['admin', 'moderator'].includes(user?.appRole)) && (
            <button
              onClick={() => deleteMessage(message.id)}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
              title="删除消息"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Message
