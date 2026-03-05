import Link from 'next/link'

const Home = () => {
  return (
    <div className="w-full h-screen flex justify-center items-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="w-full sm:w-1/2 xl:w-1/3 relative z-10">
        <div className="bg-white/10 backdrop-blur-lg p-8 border border-white/20 rounded-2xl shadow-2xl text-center animate-slide-up">
          <div className="w-20 h-20 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-3 text-white">PPChat</h1>
          <p className="text-slate-300 mb-8 text-lg">欢迎来到皮皮聊</p>

          <div className="flex flex-col gap-4">
            <Link
              href="/login"
              className="bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
            >
              登录
            </Link>
            <Link
              href="/signup"
              className="border-2 border-white/30 text-white py-3 px-4 rounded-xl transition-all duration-200 hover:bg-white/10 hover:border-white/50 font-medium backdrop-blur-sm"
            >
              注册新账号
            </Link>
          </div>
        </div>
        
        <p className="text-center text-slate-500 mt-6 text-sm">
          皮皮聊 - 轻松畅聊
        </p>
      </div>
    </div>
  )
}

export default Home