import { useState } from 'react'
import { supabase } from 'lib/Store'
import Link from 'next/link'

const Signup = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    
    try {
      const { error, data: { user, session } } = await supabase.auth.signUp({ 
        email: username, 
        password 
      })
      
      if (error) {
        setError('注册失败: ' + error.message)
      } else if (user && user.identities && user.identities.length === 0) {
        // 邮箱已注册但 identities 为空
        setError('该邮箱已被注册，请直接登录')
      } else if (!user) {
        setMessage('注册成功！请查收验证邮件后登录')
      } else {
        setMessage('注册成功！请查收验证邮件后登录')
      }
    } catch (err) {
      setError('注册失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-screen flex justify-center items-center p-4 bg-gray-300">
      <div className="w-full sm:w-1/2 xl:w-1/3">
        <div className="border-teal p-8 border-t-12 bg-white mb-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">注册</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {message}
            </div>
          )}
          
          <form onSubmit={handleSignup}>
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
                placeholder="请输入密码（至少6位）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-700 hover:bg-indigo-600 text-white py-2 px-4 rounded w-full transition duration-150 disabled:opacity-50"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>
          
          <div className="text-center mt-4">
            <span className="text-gray-600">已有账号？</span>
            <Link href="/login" className="text-indigo-700 hover:underline ml-1">
              立即登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signup
