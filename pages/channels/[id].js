import Layout from '~/components/Layout'
import Message from '~/components/Message'
import MessageInput from '~/components/MessageInput'
import { useRouter } from 'next/router'
import { useStore, addMessage } from '~/lib/Store'
import { useContext, useEffect, useRef, useState } from 'react'
import UserContext from '~/lib/UserContext'

const LAST_CHANNEL_KEY = 'ppchat_last_channel'
const ACCESSIBLE_PRIVATE_KEY = 'ppchat_accessible_private'

const ChannelsPage = (props) => {
  const router = useRouter()
  const { user, authLoaded, signOut } = useContext(UserContext)
  const messagesEndRef = useRef(null)
  const [needPassword, setNeedPassword] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // 否则加载页面
  const { id: channelId } = router.query
  const { messages, channels, unreadChannels, clearChannelUnread } = useStore({ channelId })

  // 保存当前房间到localStorage
  useEffect(() => {
    if (channelId) {
      localStorage.setItem(LAST_CHANNEL_KEY, channelId)
    }
  }, [channelId])

  // 检查是否需要密码验证（私密房间）
  useEffect(() => {
    if (channels.length > 0 && channelId) {
      const currentChannel = channels.find((c) => c.id === Number(channelId))
      if (currentChannel?.is_private) {
        // 检查是否已有访问权限
        const accessibleStr = localStorage.getItem(ACCESSIBLE_PRIVATE_KEY) || '[]'
        const accessible = JSON.parse(accessibleStr)
        if (!accessible.includes(Number(channelId))) {
          setNeedPassword(true)
        }
      } else {
        setNeedPassword(false)
      }
    }
  }, [channels, channelId])

  const handlePasswordSubmit = () => {
    const currentChannel = channels.find((c) => c.id === Number(channelId))
    if (currentChannel && currentChannel.password === passwordInput) {
      // 保存访问权限
      const accessibleStr = localStorage.getItem(ACCESSIBLE_PRIVATE_KEY) || '[]'
      const accessible = JSON.parse(accessibleStr)
      if (!accessible.includes(Number(channelId))) {
        accessible.push(Number(channelId))
        localStorage.setItem(ACCESSIBLE_PRIVATE_KEY, JSON.stringify(accessible))
      }
      setNeedPassword(false)
      setPasswordError('')
    } else {
      setPasswordError('密码错误')
    }
  }

  useEffect(() => {
    if (messagesEndRef.current && !needPassword) {
      messagesEndRef.current.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      })
    }
  }, [messages, needPassword])

  // 当当前频道被删除时，重定向到公共频道
  useEffect(() => {
    // 只有当频道列表已经加载（非空）且当前频道ID不在列表中时才跳转
    if (channels.length > 0 && channelId && !channels.some((channel) => channel.id === Number(channelId))) {
      router.push('/channels/1')
    }
  }, [channels, channelId])

  // 渲染频道和消息
  return (
    <Layout channels={channels} activeChannelId={channelId} unreadChannels={unreadChannels}>
      <div className="relative flex flex-col h-full">
        {needPassword ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="bg-gray-700 p-6 rounded-lg shadow-lg w-full max-w-sm">
              <h2 className="text-xl font-bold text-white mb-4">🔒 私密频道</h2>
              <p className="text-gray-300 mb-4">此频道需要密码才能访问</p>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="请输入密码"
                className="w-full p-2 rounded bg-gray-600 text-white border border-gray-500 mb-2"
              />
              {passwordError && <p className="text-red-400 text-sm mb-2">{passwordError}</p>}
              <button
                onClick={handlePasswordSubmit}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded transition"
              >
                进入频道
              </button>
            </div>
          </div>
        ) : (
          <>
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
              <MessageInput 
                onSubmit={async (text) => addMessage(text, channelId, user.id)} 
                onFocus={() => clearChannelUnread(channelId)}
              />
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

export default ChannelsPage
