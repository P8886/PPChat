import Layout from '~/components/Layout'
import Message from '~/components/Message'
import MessageInput from '~/components/MessageInput'
import { useRouter } from 'next/router'
import { useStore, addMessage } from '~/lib/Store'
import { useContext, useEffect, useRef } from 'react'
import UserContext from '~/lib/UserContext'

const ChannelsPage = (props) => {
  const router = useRouter()
  const { user, authLoaded, signOut } = useContext(UserContext)
  const messagesEndRef = useRef(null)

  // 否则加载页面
  const { id: channelId } = router.query
  const { messages, channels } = useStore({ channelId })

  useEffect(() => {
    messagesEndRef.current.scrollIntoView({
      block: 'start',
      behavior: 'smooth',
    })
  }, [messages])

  // 当当前频道被删除时，重定向到公共频道
  useEffect(() => {
    if (!channels.some((channel) => channel.id === Number(channelId))) {
      router.push('/channels/1')
    }
  }, [channels, channelId])

  // 渲染频道和消息
  return (
    <Layout channels={channels} activeChannelId={channelId}>
      <div className="relative flex flex-col h-full">
        <div className="Messages flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          <div className="p-2">
            {messages.map((x) => (
              <Message key={x.id} message={x} />
            ))}
            <div ref={messagesEndRef} style={{ height: 0 }} />
          </div>
        </div>
        <div 
          className="p-2 shrink-0 bg-gray-800" 
          style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
        >
          <MessageInput onSubmit={async (text) => addMessage(text, channelId, user.id)} />
        </div>
      </div>
    </Layout>
  )
}

export default ChannelsPage
