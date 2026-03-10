import { useState, useEffect } from 'react'
import { supabase } from 'lib/Store'
import { useRouter } from 'next/router'
import Link from 'next/link'

const UpdatePassword = () => {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isPasswordValid, setIsPasswordValid] = useState(true)
  const [isReady, setIsReady] = useState(false) // 添加状态来控制页面是否准备就绪

  // 检查密码强度
  const validatePassword = (password) => {
    // 密码至少8位，包含字母和数字
    return password.length >= 8 && /(?=.*[a-zA-Z])(?=.*\d)/.test(password)
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      setLoading(false)
      return
    }

    if (!validatePassword(newPassword)) {
      setError('密码长度至少8位，且包含字母和数字')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setError('更新密码失败: ' + error.message)
      } else {
        setMessage('密码更新成功！正在跳转到登录页面...')
        // 延迟跳转，让用户看到成功消息
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (err) {
      setError('更新密码失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 检查URL中是否有重置密码的令牌，验证用户是否通过邮件链接访问
  useEffect(() => {
    const checkResetPassword = async () => {
      // 检查URL参数中是否有重置密码的令牌
      const { data: { session }, error } = await supabase.auth.getSession()
      
      // 如果用户已登录，且URL中包含重置令牌，允许用户更改密码
      if (session) {
        setIsReady(true)
      } else {
        // 如果用户未登录，可能是因为令牌已过期或无效，重定向到登录页
        setMessage('请先登录以更新密码。您可能需要重新从邮件中访问此页面。')
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    }
    
    checkResetPassword()
  }, [router])

  // 如果还没准备好，可以显示加载状态
  if (!isReady && !message.includes('请先登录')) {
    return (
      <div className="w-full h-screen flex justify-center items-center p-4 bg-gray-300">
        <div className="w-full sm:w-1/2 xl:w-1/3">
          <div className="border-teal p-8 border-t-12 bg-white mb-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">更新密码</h2>
            <p className="text-center">页面加载中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen flex justify-center items-center p-4 bg-gray-300">
      <div className="w-full sm:w-1/2 xl:w-1/3">
        <div className="border-teal p-8 border-t-12 bg-white mb-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">更新密码</h2>
          
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

          <p className="text-gray-600 text-center mb-6">
            请输入新密码
          </p>
          
          <form onSubmit={handleUpdatePassword}>
            <div className="mb-4">
              <label className="font-bold text-grey-darker block mb-2">新密码</label>
              <input
                type="password"
                className={`block appearance-none w-full bg-white border ${
                  !isPasswordValid ? 'border-red-500' : 'border-grey-light hover:border-grey'
                } px-2 py-2 rounded shadow`}
                placeholder="请输入新密码（至少8位，包含字母和数字）"
                value={newPassword}
                onChange={(e) => {
                  const value = e.target.value
                  setNewPassword(value)
                  setIsPasswordValid(validatePassword(value) || value === '')
                }}
                required
              />
              {!isPasswordValid && (
                <p className="text-red-500 text-xs mt-1">
                  密码长度至少8位，且包含字母和数字
                </p>
              )}
            </div>
            
            <div className="mb-6">
              <label className="font-bold text-grey-darker block mb-2">确认新密码</label>
              <input
                type="password"
                className="block appearance-none w-full bg-white border border-grey-light hover:border-grey px-2 py-2 rounded shadow"
                placeholder="请再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-700 hover:bg-indigo-600 text-white py-2 px-4 rounded w-full transition duration-150 disabled:opacity-50"
            >
              {loading ? '更新中...' : '更新密码'}
            </button>
          </form>
          
          <div className="text-center mt-4">
            <Link href="/login" className="text-indigo-700 hover:underline">
              ← 返回登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UpdatePassword