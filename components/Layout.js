import Link from 'next/link'
import { useContext, useState } from 'react'
import UserContext from '~/lib/UserContext'
import { addChannel, deleteChannel } from '~/lib/Store'
import TrashIcon from '~/components/TrashIcon'

export default function Layout(props) {
  const { signOut, user } = useContext(UserContext)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const slugify = (text) => {
    return text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-') // 将空格替换为 -
      .replace(/[^\w-]+/g, '') // 移除所有非单词字符
      .replace(/--+/g, '-') // 将多个 - 替换为单个 -
      .replace(/^-+/, '') // 移除开头的 -
      .replace(/-+$/, '') // 移除结尾的 -
  }

  const newChannel = async () => {
    const slug = prompt('请输入频道名称')
    if (slug) {
      addChannel(slugify(slug), user.id)
    }
  }

  return (
    <main className="main flex w-screen overflow-hidden" style={{ height: '100dvh' }}>
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
            <h6 className="text-xs break-all">{user?.email}</h6>
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
    </main>
  )
}

const SidebarItem = ({ channel, isActiveChannel, user, onSelect }) => (
  <>
    <li className="flex items-center justify-between">
      <Link 
        href={`/channels/${channel.id}`}
        className={isActiveChannel ? 'font-bold' : ''}
        onClick={onSelect}
      >
        {channel.slug}
      </Link>
      {channel.id !== 1 && (channel.created_by === user?.id || user?.appRole === 'admin') && (
        <button onClick={() => deleteChannel(channel.id)}>
          <TrashIcon />
        </button>
      )}
    </li>
  </>
)
