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

  const { id: channelId } = router.query
  const { messages, channels } = useStore({ channelId })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      block: 'start',
      behavior: 'smooth',
    })
  }, [messages])

  useEffect(() => {
    if (!channels.some((channel) => channel.id === Number(channelId))) {
      router.push('/channels/1')
    }
  }, [channels, channelId])

  const currentChannel = channels.find(c => c.id === Number(channelId))

  return (
    <Layout channels={channels} activeChannelId={channelId}>
      <div className="relative flex flex-col h-full">
        <div className="Messages flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          <div className="p-3 sm:p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 py-20">
                <svg className="w-16 h-16 mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg font-medium text-slate-400">欢迎来到 #{currentChannel?.slug || 'general'}</p>
                <p className="text-sm text-slate-500 mt-1">开始发送消息吧！</p>
              </div>
            ) : (
              messages.map((x) => (
                <Message key={x.id} message={x} />
              ))
            )}
            <div ref={messagesEndRef} style={{ height: 0 }} />
          </div>
        </div>
        <div 
          className="p-3 sm:p-4 shrink-0 bg-slate-800/50 border-t border-slate-700/50" 
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <MessageInput onSubmit={async (text) => addMessage(text, channelId, user.id)} />
        </div>
      </div>
    </Layout>
  )
}

export default ChannelsPage
