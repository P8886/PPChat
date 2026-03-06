import Link from 'next/link'
import Head from 'next/head'
import { useContext, useState, useEffect } from 'react'
import UserContext from '~/lib/UserContext'
import { addChannel, deleteChannel, updateUsername, checkUsernameAvailable } from '~/lib/Store'
import TrashIcon from '~/components/TrashIcon'

export default function Layout(props) {
  const { signOut, user, refreshUser } = useContext(UserContext)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showNewChannelModal, setShowNewChannelModal] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [channelPassword, setChannelPassword] = useState('')
  // 用户名编辑状态
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)

  // 同步用户名到输入框
  useEffect(() => {
    if (user?.username) {
      setUsernameInput(user.username)
    }
  }, [user?.username])

  const slugify = (text) => {
    return text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-') // 将空格替换为 -
      .replace(/[^\w-]+/g, '') // 移除所有非单词字符
      .replace(/--+/g, '-') // 将多个 - 替捦为单个 -
      .replace(/^-+/, '') // 移除开头的 -
      .replace(/-+$/, '') // 移除结尾的 -
  }

  const newChannel = async () => {
    setShowNewChannelModal(true)
    setNewChannelName('')
    setIsPrivate(false)
    setChannelPassword('')
  }

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return
    if (isPrivate && !channelPassword.trim()) {
      alert('私密频道需要设置密码')
      return
    }
    await addChannel(slugify(newChannelName), user.id, isPrivate, isPrivate ? channelPassword : null)
    setShowNewChannelModal(false)
  }

  // 用户名编辑
  const handleUsernameChange = (e) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '')
    setUsernameInput(value)
    setUsernameError('')
  }

  const handleSaveUsername = async () => {
    if (!usernameInput.trim() || usernameInput.length < 2) {
      setUsernameError('用户名至少2个字符')
      return
    }
    
    if (usernameInput === user?.username) {
      setEditingUsername(false)
      return
    }

    setUsernameSaving(true)
    
    // 检查用户名是否可用
    const available = await checkUsernameAvailable(usernameInput)
    if (!available) {
      setUsernameError('用户名已被使用')
      setUsernameSaving(false)
      return
    }

    const { error } = await updateUsername(user.id, usernameInput)
    if (error) {
      setUsernameError('保存失败')
    } else {
      // 刷新用户信息
      await refreshUser()
      setEditingUsername(false)
    }
    setUsernameSaving(false)
  }

  const unreadCount = props.unreadChannels?.size || 0

  return (
    <main className="main flex w-screen overflow-hidden" style={{ height: '100dvh' }}>
      <Head>
        <title>{unreadCount > 0 ? `🔴 (${unreadCount}) ` : ''}PPChat</title>
      </Head>
      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <nav
        className={`fixed md:relative z-30 bg-gray-900 text-gray-100 overflow-y-auto transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ width: 260, maxWidth: '80vw', minWidth: 200, height: '100dvh' }}
      >
        <div className="p-2">
          {/* 移动端关闭按钮 */}
          <div className="md:hidden flex justify-end p-2">
            <button 
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>
          <div className="p-2">
            <button
              className="bg-blue-900 hover:bg-blue-800 text-white py-2 px-4 rounded w-full transition duration-150"
              onClick={() => newChannel()}
            >
              新建频道
            </button>
          </div>
          <hr className="m-2" />
          <div className="p-2 flex flex-col space-y-2">
            {/* 用户名显示/编辑 */}
            {editingUsername ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={handleUsernameChange}
                  placeholder="输入用户名"
                  className="w-full p-1.5 rounded bg-gray-700 text-white text-sm border border-gray-600"
                  minLength={2}
                  maxLength={20}
                  autoFocus
                />
                {usernameError && (
                  <p className="text-red-400 text-xs">{usernameError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveUsername}
                    disabled={usernameSaving}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white py-1 px-2 rounded text-sm transition disabled:opacity-50"
                  >
                    {usernameSaving ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingUsername(false)
                      setUsernameInput(user?.username || '')
                      setUsernameError('')
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-1 px-2 rounded text-sm transition"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-800 p-1 rounded"
                onClick={() => setEditingUsername(true)}
                title="点击编辑用户名"
              >
                <div>
                  <div className="font-medium text-sm">
                    {user?.username || <span className="text-gray-400">设置用户名</span>}
                  </div>
                  <h6 className="text-xs text-gray-400 break-all">{user?.email}</h6>
                </div>
                <span className="text-gray-400 text-sm">✏️</span>
              </div>
            )}
            <button
              className="bg-blue-900 hover:bg-blue-800 text-white py-2 px-4 rounded w-full transition duration-150"
              onClick={() => signOut()}
            >
              退出登录
            </button>
          </div>
          <hr className="m-2" />
          <h4 className="font-bold">频道列表</h4>
          <ul className="channel-list">
            {props.channels.map((x) => (
              <SidebarItem
                channel={x}
                key={x.id}
                isActiveChannel={x.id === props.activeChannelId}
                isUnread={props.unreadChannels?.has(x.id)}
                user={user}
                onSelect={() => setSidebarOpen(false)}
              />
            ))}
          </ul>
        </div>
      </nav>

      {/* 消息区域 */}
      <div className="flex-1 bg-gray-800 flex flex-col overflow-hidden min-h-0">
        {/* 移动端头部 */}
        <header className="md:hidden bg-gray-900 text-white p-3 flex items-center shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          <button 
            onClick={() => setSidebarOpen(true)}
            className="text-2xl mr-4"
          >
            ☰
          </button>
          <span className="font-bold">PPChat</span>
        </header>
        <div className="flex-1 overflow-hidden min-h-0">{props.children}</div>
      </div>

      {/* 新建频道模态框 */}
      {showNewChannelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-sm mx-4">
            <h2 className="text-xl font-bold text-white mb-4">新建频道</h2>
            
            <div className="mb-4">
              <label className="text-gray-300 text-sm mb-1 block">频道名称</label>
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="输入频道名称"
                className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
              />
            </div>

            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                id="isPrivate"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="isPrivate" className="text-gray-300">设为私密频道</label>
            </div>

            {isPrivate && (
              <div className="mb-4">
                <label className="text-gray-300 text-sm mb-1 block">频道密码</label>
                <input
                  type="password"
                  value={channelPassword}
                  onChange={(e) => setChannelPassword(e.target.value)}
                  placeholder="输入访问密码"
                  className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCreateChannel}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded transition"
              >
                创建
              </button>
              <button
                onClick={() => setShowNewChannelModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

const SidebarItem = ({ channel, isActiveChannel, isUnread, user, onSelect }) => (
  <>
    <li className="flex items-center justify-between">
      <Link 
        href={`/channels/${channel.id}`}
        className={isActiveChannel ? 'font-bold' : ''}
        onClick={onSelect}
      >
        {channel.is_private && <span className="mr-1">🔒</span>}
        {channel.slug}
        {isUnread && <span className="ml-2 text-red-500 text-xs">●</span>}
      </Link>
      {channel.id !== 1 && (channel.created_by === user?.id || user?.appRole === 'admin') && (
        <button onClick={() => deleteChannel(channel.id)}>
          <TrashIcon />
        </button>
      )}
    </li>
  </>
)
