import Link from 'next/link'
import { useContext } from 'react'
import UserContext from '~/lib/UserContext'
import { addChannel, deleteChannel } from '~/lib/Store'
import TrashIcon from '~/components/TrashIcon'

export default function Layout(props) {
  const { signOut, user } = useContext(UserContext)

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
    <main className="main flex h-screen w-screen overflow-hidden">
      {/* 侧边栏 */}
      <nav
        className="w-64 bg-gray-900 text-gray-100 overflow-scroll "
        style={{ maxWidth: '20%', minWidth: 150, maxHeight: '100vh' }}
      >
        <div className="p-2 ">
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
            <h6 className="text-xs">{user?.email}</h6>
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
              />
            ))}
          </ul>
        </div>
      </nav>

      {/* 消息区域 */}
      <div className="flex-1 bg-gray-800 h-screen">{props.children}</div>
    </main>
  )
}

const SidebarItem = ({ channel, isActiveChannel, user }) => (
  <>
    <li className="flex items-center justify-between">
      <Link 
        href={`/channels/${channel.id}`}
        className={isActiveChannel ? 'font-bold' : ''}
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
