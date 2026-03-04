import Link from 'next/link'

const Home = () => {
  return (
    <div className="w-full h-screen flex justify-center items-center p-4 bg-gray-300">
      <div className="w-full sm:w-1/2 xl:w-1/3">
        <div className="border-teal p-8 border-t-12 bg-white mb-6 rounded-lg shadow-lg text-center">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">PPChat</h1>
          <p className="text-gray-600 mb-8">欢迎来到皮皮聊</p>

          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="bg-indigo-700 hover:bg-indigo-600 text-white py-3 px-4 rounded transition duration-150"
            >
              登录
            </Link>
            <Link
              href="/signup"
              className="border border-indigo-700 text-indigo-700 py-3 px-4 rounded transition duration-150 hover:bg-indigo-700 hover:text-white"
            >
              注册新账号
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home