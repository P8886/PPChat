import '~/styles/style.scss'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import UserContext from 'lib/UserContext'
import { supabase } from 'lib/Store'
import { jwtDecode } from 'jwt-decode'
import Head from 'next/head'

const LAST_CHANNEL_KEY = 'ppchat_last_channel'

export default function SupabaseSlackClone({ Component, pageProps }) {
  const [userLoaded, setUserLoaded] = useState(false)
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const router = useRouter()

  // 从public.users获取额外用户信息
  const fetchUserProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('username')
        .eq('id', userId)
        .single()
      return data
    } catch (error) {
      console.error('获取用户信息失败', error)
      return null
    }
  }

  useEffect(() => {
    async function saveSession(
      /** @type {Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']} */
      session
    ) {
      setSession(session)
      const currentUser = session?.user
      if (session && currentUser) {
        const jwt = jwtDecode(session.access_token)
        currentUser.appRole = jwt.user_role
        // 获取用户名
        const profile = await fetchUserProfile(currentUser.id)
        if (profile) {
          currentUser.username = profile.username
        }
      }
      setUser(currentUser ?? null)
      setUserLoaded(!!currentUser)
      if (currentUser) {
        // 恢复上次访问的房间，默认为1
        const lastChannel = localStorage.getItem(LAST_CHANNEL_KEY) || '1'
        router.push('/channels/[id]', `/channels/${lastChannel}`)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => saveSession(session))

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(session)
        saveSession(session)
      }
    )

    // 监听users表变化，更新用户名
    const userChannel = supabase
      .channel('public:users:user_profile')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'users' },
        (payload) => {
          if (user && payload.new.id === user.id) {
            setUser(prev => ({ ...prev, username: payload.new.username }))
          }
        }
      )
      .subscribe()

    return () => {
      authListener.unsubscribe()
      supabase.removeChannel(userChannel)
    }
  }, [])

  // 手动刷新用户信息
  const refreshUser = async () => {
    if (!user?.id) return
    const profile = await fetchUserProfile(user.id)
    if (profile) {
      setUser(prev => ({ ...prev, username: profile.username }))
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      router.push('/')
    }
  }

  return (
    <UserContext.Provider
      value={{
        userLoaded,
        user,
        signOut,
        refreshUser,
      }}
    >
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1a1a1a" />
      </Head>
      <Component {...pageProps} />
    </UserContext.Provider>
  )
}
