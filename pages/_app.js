import '~/styles/style.scss'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import UserContext from 'lib/UserContext'
import { supabase } from 'lib/Store'
import { jwtDecode } from 'jwt-decode'
import Head from 'next/head'

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
    let mounted = true

    async function saveSession(
      /** @type {Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']} */
      session
    ) {
      if (!mounted) return
      
      setSession(session)
      const currentUser = session?.user
      
      if (session && currentUser) {
        const jwt = jwtDecode(session.access_token)
        currentUser.appRole = jwt.user_role
        // 获取用户名
        const profile = await fetchUserProfile(currentUser.id)
        if (profile && mounted) {
          currentUser.username = profile.username
        }
        if (mounted) {
          setUser(currentUser)
          setUserLoaded(true)
          
          // 如果在登录页或注册页，登录后跳转到频道列表页
          if (router.pathname === '/' || router.pathname === '/login' || router.pathname === '/signup') {
            router.push('/channels')
          }
        }
      } else {
        // 无session时清空用户状态
        setUser(null)
        setUserLoaded(false)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => saveSession(session))

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserLoaded(false)
          setSession(null)
          router.push('/')
        } else if (session) {
          saveSession(session)
        }
      }
    )

    return () => {
      mounted = false
      authListener.unsubscribe()
    }
  }, [router])

  // 手动刷新用户信息
  const refreshUser = useCallback(async () => {
    if (!user?.id) return
    const profile = await fetchUserProfile(user.id)
    if (profile) {
      setUser(prev => ({ ...prev, username: profile.username }))
    }
  }, [user?.id])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setUserLoaded(false)
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
