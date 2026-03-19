import { useState } from 'react'
import { supabase } from 'lib/Store'
import Link from 'next/link'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`
      })

      if (error) {
        setError('发送密码重置邮件失败: ' + error.message)
      } else {
        setMessage('密码重置邮件已发送到您的邮箱，请查收并按照邮件中的说明重置密码。')
        setEmail('')
      }
    } catch (err) {
      setError('发送邮件失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-screen flex justify-center items-center p-4 bg-gray-300">
      <div className="w-full sm:w-1/2 xl:w-1/3">
        <div className="border-teal p-8 border-t-12 bg-white mb-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">忘记密码</h2>
          
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
            请输入您的注册邮箱，我们将向您发送重置密码的邮件
          </p>
          
          <form onSubmit={handleForgotPassword}>
            <div className="mb-6">
              <label className="font-bold text-grey-darker block mb-2">邮箱地址</label>
              <input
                type="email"
                className="block appearance-none w-full bg-white border border-grey-light hover:border-grey px-2 py-2 rounded shadow"
                placeholder="请输入注册邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-700 hover:bg-indigo-600 text-white py-2 px-4 rounded w-full transition duration-150 disabled:opacity-50"
            >
              {loading ? '发送中...' : '发送重置邮件'}
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

export default ForgotPassword