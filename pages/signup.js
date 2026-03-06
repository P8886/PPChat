import { useState } from 'react'
import { supabase } from 'lib/Store'
import Link from 'next/link'

const Signup = () => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameError, setUsernameError] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // 检查用户名是否可用
  const checkUsername = async (value) => {
    if (!value || value.length < 2) {
      setUsernameError('')
      return
    }
    
    setCheckingUsername(true)
    try {
      const { data } = await supabase
        .from('users')
        .select('username')
        .ilike('username', value)
        .limit(1)
      
      if (data && data.length > 0) {
        setUsernameError('用户名已被使用')
      } else {
        setUsernameError('')
      }
    } catch (err) {
      console.error('检查用户名失败', err)
    } finally {
      setCheckingUsername(false)
    }
  }

  const handleUsernameChange = (e) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '')
    setUsername(value)
    // 防抖检查
    clearTimeout(window.usernameCheckTimeout)
    window.usernameCheckTimeout = setTimeout(() => checkUsername(value), 300)
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    
    if (usernameError) {
      return
    }
    
    if (username.length < 2) {
      setError('用户名至少需要2个字符')
      return
    }
    
    setLoading(true)
    setError('')
    setMessage('')
    
    try {
      // 1. 注册auth用户
      const { error: signUpError, data: { user } } = await supabase.auth.signUp({ 
        email, 
        password 
      })
      
      if (signUpError) {
        setError('注册失败: ' + signUpError.message)
        setLoading(false)
        return
      }
      
      if (user && user.identities && user.identities.length === 0) {
        setError('该邮箱已被注册，请直接登录')
        setLoading(false)
        return
      }
      
      // 2. 更新public.users表的username
      if (user) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ username })
          .eq('id', user.id)
        
        if (updateError) {
          console.error('设置用户名失败', updateError)
          setError('注册成功但设置用户名失败，请联系管理员')
        } else {
          setMessage('注册成功！请查收验证邮件后登录')
        }
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
              <label className="font-bold text-grey-darker block mb-2">用户名</label>
              <div className="relative">
                <input
                  type="text"
                  className={`block appearance-none w-full bg-white border px-2 py-2 rounded shadow ${
                    usernameError ? 'border-red-500' : 'border-grey-light hover:border-grey'
                  }`}
                  placeholder="请输入用户名（字母、数字、下划线）"
                  value={username}
                  onChange={handleUsernameChange}
                  required
                  minLength={2}
                  maxLength={20}
                />
                {checkingUsername && (
                  <span className="absolute right-2 top-2 text-gray-400 text-sm">检查中...</span>
                )}
              </div>
              {usernameError && (
                <p className="text-red-500 text-sm mt-1">{usernameError}</p>
              )}
              <p className="text-gray-400 text-xs mt-1">2-20个字符，支持字母、数字、下划线</p>
            </div>
            
            <div className="mb-4">
              <label className="font-bold text-grey-darker block mb-2">邮箱</label>
              <input
                type="email"
                className="block appearance-none w-full bg-white border border-grey-light hover:border-grey px-2 py-2 rounded shadow"
                placeholder="请输入邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              disabled={loading || usernameError}
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
