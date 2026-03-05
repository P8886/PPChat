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
    <div className={`py-1 flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className="flex items-center space-x-2">
        <div className="text-gray-100 w-4">
          {(isOwnMessage || ['admin', 'moderator'].includes(user?.appRole)) && (
            <button onClick={() => deleteMessage(message.id)}>
              <TrashIcon />
            </button>
          )}
        </div>
        <div className={isOwnMessage ? 'text-right' : 'text-left'}>
          <p className={`font-bold ${isOwnMessage ? 'text-green-400' : 'text-blue-400'}`}>
            {message?.author?.username}
          </p>
          <p className="text-gray-400 text-xs">
            {formatTime(message.inserted_at)}
          </p>
          <p className="text-white bg-gray-700 px-3 py-1 rounded-lg inline-block">
            {message.message}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Message
