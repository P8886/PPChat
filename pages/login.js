import { useState } from 'react'
import { supabase } from 'lib/Store'
import Link from 'next/link'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email: username, 
        password 
      })
      
      if (error) {
        setError('登录失败: ' + error.message)
      }
    } catch (err) {
      setError('登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-screen flex justify-center items-center p-4 bg-gray-300">
      <div className="w-full sm:w-1/2 xl:w-1/3">
        <div className="border-teal p-8 border-t-12 bg-white mb-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">登录</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="font-bold text-grey-darker block mb-2">邮箱</label>
              <input
                type="email"
                className="block appearance-none w-full bg-white border border-grey-light hover:border-grey px-2 py-2 rounded shadow"
                placeholder="请输入邮箱"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="mb-6">
              <label className="font-bold text-grey-darker block mb-2">密码</label>
              <input
                type="password"
                className="block appearance-none w-full bg-white border border-grey-light hover:border-grey px-2 py-2 rounded shadow"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-700 hover:bg-indigo-600 text-white py-2 px-4 rounded w-full transition duration-150 disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
          
          <div className="text-center mt-4">
            <span className="text-gray-600">还没有账号？</span>
            <Link href="/signup" className="text-indigo-700 hover:underline ml-1">
              立即注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
