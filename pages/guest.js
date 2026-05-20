import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { fetchGuestChannel } from '~/lib/Store'

const GuestPage = () => {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const enterGuestRoom = async () => {
      const { data, error } = await fetchGuestChannel()
      if (!mounted) return

      if (data?.id) {
        router.replace(`/channels/${data.id}`)
        return
      }

      console.error('进入游客房间失败:', error)
      setError('游客房间尚未初始化')
    }

    enterGuestRoom()

    return () => {
      mounted = false
    }
  }, [router])

  return (
    <div className="w-full h-screen flex justify-center items-center p-4 bg-gray-300">
      <div className="w-full sm:w-1/2 xl:w-1/3">
        <div className="border-teal p-8 border-t-12 bg-white mb-6 rounded-lg shadow-lg text-center">
          <h1 className="text-3xl font-bold mb-4 text-gray-800">PPChat</h1>
          <p className="text-gray-600 mb-6">
            {error || '正在进入游客房间...'}
          </p>
          {error && (
            <Link
              href="/"
              className="inline-block bg-indigo-700 hover:bg-indigo-600 text-white py-3 px-4 rounded transition duration-150"
            >
              返回首页
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default GuestPage
