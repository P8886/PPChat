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
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
  }

  const newChannel = async () => {
    const slug = prompt('请输入频道名称')
    if (slug) {
      addChannel(slugify(slug), user.id)
    }
  }

  return (
    <main className="main flex w-screen overflow-hidden" style={{ height: '100dvh' }}>
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <nav
        className={`fixed md:relative z-30 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 overflow-y-auto transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ width: 260, maxWidth: '80vw', minWidth: 200, height: '100dvh' }}
      >
        <div className="p-3">
          <div className="md:hidden flex justify-end p-2">
            <button 
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
          
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="font-bold text-lg">PPChat</span>
          </div>

          <button
            className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white py-2.5 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium mb-4"
            onClick={() => newChannel()}
          >
            + 新建频道
          </button>
          
          <hr className="border-slate-700 mb-4" />
          
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-800/50 rounded-lg">
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-sm">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              className="text-slate-400 hover:text-white py-2 px-3 rounded-lg hover:bg-white/5 transition-colors text-sm text-left flex items-center gap-2"
              onClick={() => signOut()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              退出登录
            </button>
          </div>
          
          <hr className="border-slate-700 mb-4" />
          
          <h4 className="font-semibold text-slate-400 text-xs uppercase tracking-wider mb-3 px-2">频道列表</h4>
          <ul className="channel-list space-y-1">
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

      <div className="flex-1 bg-slate-800 flex flex-col overflow-hidden min-h-0">
        <header className="md:hidden bg-gradient-to-r from-slate-900 to-slate-800 text-white p-3 flex items-center shrink-0 border-b border-slate-700" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          <button 
            onClick={() => setSidebarOpen(true)}
            className="text-xl mr-3 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
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
    <li className="flex items-center justify-between group">
      <Link 
        href={`/channels/${channel.id}`}
        className={`flex-1 py-2 px-3 rounded-lg transition-all duration-150 ${
          isActiveChannel 
            ? 'bg-brand-500/20 text-brand-400 font-medium' 
            : 'text-slate-300 hover:bg-white/5 hover:text-white'
        }`}
        onClick={onSelect}
      >
        <span className="flex items-center gap-2">
          <span className={`text-lg ${isActiveChannel ? 'text-brand-400' : 'text-slate-500'}`}>#</span>
          {channel.slug}
        </span>
      </Link>
      {channel.id !== 1 && (channel.created_by === user?.id || user?.appRole === 'admin') && (
        <button 
          onClick={() => deleteChannel(channel.id)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
        >
          <TrashIcon />
        </button>
      )}
    </li>
  </>
)
