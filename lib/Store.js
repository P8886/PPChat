import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)

/**
 * @param {number} channelId 当前选中的频道ID
 */
export const useStore = (props) => {
  const [channels, setChannels] = useState([])
  const [messages, setMessages] = useState([])
  const [users] = useState(new Map())
  const [unreadChannels, setUnreadChannels] = useState(new Set())
  const [newMessage, handleNewMessage] = useState(null)
  const [newChannel, handleNewChannel] = useState(null)
  const [newOrUpdatedUser, handleNewOrUpdatedUser] = useState(null)
  const [deletedChannel, handleDeletedChannel] = useState(null)
  const [deletedMessage, handleDeletedMessage] = useState(null)
  const pageVisibleRef = useRef(true)
  const channelIdRef = useRef(props?.channelId)

  // 更新 channelIdRef
  useEffect(() => {
    channelIdRef.current = props?.channelId
  }, [props?.channelId])

  // 加载初始数据并设置监听器
  useEffect(() => {
    // 获取频道列表
    fetchChannels(setChannels)
    
    // 监听页面可见性变化 - 切回标签页时清除当前频道未读
    const handleVisibilityChange = () => {
      const wasHidden = pageVisibleRef.current === false
      pageVisibleRef.current = !document.hidden
      // 页面从隐藏变为可见时，清除当前频道的未读状态
      if (wasHidden && !document.hidden && channelIdRef.current) {
        setUnreadChannels((prev) => {
          const next = new Set(prev)
          next.delete(Number(channelIdRef.current))
          return next
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // 监听新增和删除的消息
    const messageListener = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) =>
        handleNewMessage(payload.new)
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) =>
        handleDeletedMessage(payload.old)
      )
      .subscribe()
    // 监听用户变化
    const userListener = supabase
      .channel('public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) =>
        handleNewOrUpdatedUser(payload.new)
      )
      .subscribe()
    // 监听新增和删除的频道
    const channelListener = supabase
      .channel('public:channels')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'channels' }, (payload) =>
        handleNewChannel(payload.new)
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'channels' }, (payload) =>
        handleDeletedChannel(payload.old)
      )
      .subscribe()
    // 组件卸载时清理
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      supabase.removeChannel(supabase.channel(messageListener))
      supabase.removeChannel(supabase.channel(userListener))
      supabase.removeChannel(supabase.channel(channelListener))
    }
  }, [])

  // 路由变化时更新
  useEffect(() => {
    if (props?.channelId > 0) {
      setUnreadChannels((prev) => {
        const next = new Set(prev)
        next.delete(Number(props?.channelId))
        return next
      })
      fetchMessages(props?.channelId, (messages) => {
        messages.forEach((x) => users.set(x.user_id, x.author))
        setMessages(messages)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props?.channelId])

  // 从 Postgres 收到新消息
  useEffect(() => {
    if (newMessage && newMessage.channel_id === Number(props?.channelId)) {
      const handleAsync = async () => {
        let authorId = newMessage.user_id
        if (!users.get(authorId)) await fetchUser(authorId, (user) => handleNewOrUpdatedUser(user))
        setMessages(messages.concat(newMessage))
      }
      handleAsync()
      // 页面不可见时，即使是当前频道也标记为未读
      if (!pageVisibleRef.current) {
        setUnreadChannels((prev) => {
          const next = new Set(prev)
          next.add(newMessage.channel_id)
          return next
        })
      }
    } else if (newMessage) {
      setUnreadChannels((prev) => {
        const next = new Set(prev)
        next.add(newMessage.channel_id)
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newMessage])

  // 从 Postgres 收到已删除的消息
  useEffect(() => {
    if (deletedMessage) setMessages(messages.filter((message) => message.id !== deletedMessage.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletedMessage])

  // 从 Postgres 收到新频道
  useEffect(() => {
    if (newChannel) setChannels(channels.concat(newChannel))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newChannel])

  // 从 Postgres 收到已删除的频道
  useEffect(() => {
    if (deletedChannel) setChannels(channels.filter((channel) => channel.id !== deletedChannel.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletedChannel])

  // 从 Postgres 收到新增或更新的用户
  useEffect(() => {
    if (newOrUpdatedUser) users.set(newOrUpdatedUser.id, newOrUpdatedUser)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newOrUpdatedUser])

  // 清除指定频道的未读状态
  const clearChannelUnread = (channelId) => {
    setUnreadChannels((prev) => {
      const next = new Set(prev)
      next.delete(Number(channelId))
      return next
    })
  }

  return {
    // 导出计算后的值，将作者信息映射到每条消息
    messages: messages.map((x) => ({ ...x, author: users.get(x.user_id) })),
    channels: channels !== null ? channels.sort((a, b) => a.slug.localeCompare(b.slug)) : [],
    users,
    unreadChannels,
    clearChannelUnread,
  }
}

/**
 * 获取所有频道
 * @param {function} setState 可选，传入钩子或回调函数来设置状态
 */
export const fetchChannels = async (setState) => {
  try {
    let { data } = await supabase.from('channels').select('*')
    if (setState) setState(data)
    return data
  } catch (error) {
    console.log('error', error)
  }
}

/**
 * 获取单个用户
 * @param {number} userId 用户ID
 * @param {function} setState 可选，传入钩子或回调函数来设置状态
 */
export const fetchUser = async (userId, setState) => {
  try {
    let { data } = await supabase.from('users').select(`*`).eq('id', userId)
    let user = data[0]
    if (setState) setState(user)
    return user
  } catch (error) {
    console.log('error', error)
  }
}

/**
 * 获取所有消息及其作者
 * @param {number} channelId 频道ID
 * @param {function} setState 可选，传入钩子或回调函数来设置状态
 */
export const fetchMessages = async (channelId, setState) => {
  try {
    let { data } = await supabase
      .from('messages')
      .select(`*, author:user_id(*)`)
      .eq('channel_id', channelId)
      .order('inserted_at', { ascending: true })
    if (setState) setState(data)
    return data
  } catch (error) {
    console.log('error', error)
  }
}

/**
 * 新增频道到数据库
 * @param {string} slug 频道名称
 * @param {number} user_id 频道创建者ID
 * @param {boolean} is_private 是否私密频道
 * @param {string} password 私密频道密码
 */
export const addChannel = async (slug, user_id, is_private = false, password = null) => {
  try {
    let { data } = await supabase
      .from('channels')
      .insert([{ slug, created_by: user_id, is_private, password }])
      .select()
    return data
  } catch (error) {
    console.log('error', error)
  }
}

/**
 * 新增消息到数据库
 * @param {string} message 消息内容
 * @param {number} channel_id 频道ID
 * @param {number} user_id 作者ID
 * @param {string} message_type 消息类型 'text' | 'image'
 */
export const addMessage = async (message, channel_id, user_id, message_type = 'text') => {
  try {
    let { data } = await supabase
      .from('messages')
      .insert([{ message, channel_id, user_id, message_type }])
      .select()
    return data
  } catch (error) {
    console.log('error', error)
  }
}

/**
 * 从数据库删除频道
 * @param {number} channel_id 频道ID
 */
export const deleteChannel = async (channel_id) => {
  try {
    let { data } = await supabase.from('channels').delete().match({ id: channel_id })
    return data
  } catch (error) {
    console.log('error', error)
  }
}

/**
 * 从数据库删除消息
 * @param {number} message_id 消息ID
 */
export const deleteMessage = async (message_id) => {
  try {
    let { data } = await supabase.from('messages').delete().match({ id: message_id })
    return data
  } catch (error) {
    console.log('error', error)
  }
}

/**
 * 更新用户名
 * @param {string} userId 用户ID
 * @param {string} username 新用户名
 */
export const updateUsername = async (userId, username) => {
  try {
    let { data, error } = await supabase
      .from('users')
      .update({ username })
      .eq('id', userId)
      .select()
    if (error) return { error }
    return { data }
  } catch (error) {
    console.log('error', error)
    return { error }
  }
}

/**
 * 检查用户名是否可用
 * @param {string} username 用户名
 */
export const checkUsernameAvailable = async (username) => {
  try {
    let { data } = await supabase
      .from('users')
      .select('username')
      .ilike('username', username)
      .limit(1)
    return !data || data.length === 0
  } catch (error) {
    console.log('error', error)
    return false
  }
}

/**
 * 上传图片到 Storage
 * @param {File} file 图片文件
 * @param {string} userId 用户ID
 * @returns {Promise<{url: string, error: string}|{url: null, error: *}>}
 */
export const uploadImage = async (file, userId) => {
  try {
    // 生成唯一文件名
    const ext = file.name.split('.').pop()
    const fileName = `chat/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    
    const { error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) return { url: null, error }
    
    // 获取公开URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName)
    
    return { url: publicUrl, error: null }
  } catch (error) {
    console.log('upload error', error)
    return { url: null, error }
  }
}

// ============================================
// 文件管理相关函数
// ============================================

/**
 * 检查用户是否为管理员
 * @param {string} userId 用户ID
 */
export const checkIsAdmin = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()  // 使用 maybeSingle 避免空结果报错
    
    if (error) {
      console.log('checkIsAdmin error:', error.message)
      return false
    }
    return !!data
  } catch (e) {
    console.log('checkIsAdmin catch:', e)
    return false
  }
}

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// ============================================
// Storage 文件管理函数（管理聊天图片）
// ============================================

/**
 * 列出 chat-images bucket 中的用户文件夹
 * @returns {Promise<{data: Array, error: any}>}
 */
export const listStorageFolders = async () => {
  try {
    const { data, error } = await supabase.storage
      .from('chat-images')
      .list('', {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      })
    
    if (error) return { data: null, error }
    const folders = data?.filter(item => !item.name.includes('.')) || []
    return { data: folders, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * 列出指定用户文件夹中的文件
 * @param {string} userId 用户ID
 * @returns {Promise<{data: Array, error: any}>}
 */
export const listStorageFiles = async (userId) => {
  try {
    const { data, error } = await supabase.storage
      .from('chat-images')
      .list(userId, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      })
    
    if (error) return { data: null, error }
    // 过滤出文件（有扩展名的）
    const files = data?.filter(item => item.name.includes('.')) || []
    return { data: files, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * 列出所有 Storage 文件（扁平列表）
 * @returns {Promise<{data: Array, error: any}>}
 */
export const listAllStorageFiles = async () => {
  try {
    // 先获取所有顶层文件夹
    const { data: topFolders, error: foldersError } = await listStorageFolders()
    
    if (foldersError) return { data: null, error: foldersError }
    
    const allFiles = []
    
    // 遍历顶层文件夹
    for (const topFolder of topFolders || []) {
      // 列出顶层文件夹下的子文件夹（用户ID文件夹）
      const { data: userFolders, error: userFoldersError } = await supabase.storage
        .from('chat-images')
        .list(topFolder.name, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' }
        })
      
      if (userFoldersError || !userFolders) continue
      
      // 过滤出用户文件夹（没有扩展名的）
      const userFolderList = userFolders.filter(item => !item.name.includes('.'))
      
      // 遍历每个用户文件夹获取文件
      for (const userFolder of userFolderList) {
        const folderPath = `${topFolder.name}/${userFolder.name}`
        
        const { data: files, error: filesError } = await supabase.storage
          .from('chat-images')
          .list(folderPath, {
            limit: 1000,
            sortBy: { column: 'created_at', order: 'desc' }
          })
        
        if (filesError || !files) continue
        
        // 过滤出文件（有扩展名的）
        const fileList = files.filter(item => item.name.includes('.'))
        
        for (const file of fileList) {
          const fullPath = `${folderPath}/${file.name}`
          allFiles.push({
            ...file,
            userId: userFolder.name,
            fullPath: fullPath,
            publicUrl: supabase.storage.from('chat-images').getPublicUrl(fullPath).data.publicUrl
          })
        }
      }
    }
    
    // 按创建时间倒序排列
    allFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    
    return { data: allFiles, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * 删除 Storage 文件
 * @param {string} fullPath 完整路径 (userId/filename)
 * @returns {Promise<{error: any}>}
 */
export const deleteStorageFile = async (fullPath) => {
  try {
    const { error } = await supabase.storage
      .from('chat-images')
      .remove([fullPath])
    
    if (error) return { error }
    
    // 同时删除数据库中对应的图片消息
    const publicUrl = supabase.storage.from('chat-images').getPublicUrl(fullPath).data.publicUrl
    await supabase
      .from('messages')
      .delete()
      .eq('message', publicUrl)
    
    return { error: null }
  } catch (error) {
    return { error }
  }
}

/**
 * 批量删除 Storage 文件
 * @param {string[]} fullPaths 完整路径数组
 * @returns {Promise<{error: any, deletedCount: number}>}
 */
export const deleteStorageFiles = async (fullPaths) => {
  try {
    const { error } = await supabase.storage
      .from('chat-images')
      .remove(fullPaths)
    
    if (error) return { error, deletedCount: 0 }
    
    // 同时删除数据库中对应的图片消息
    for (const path of fullPaths) {
      const publicUrl = supabase.storage.from('chat-images').getPublicUrl(path).data.publicUrl
      await supabase
        .from('messages')
        .delete()
        .eq('message', publicUrl)
    }
    
    return { error: null, deletedCount: fullPaths.length }
  } catch (error) {
    return { error, deletedCount: 0 }
  }
}

/**
 * 获取 Storage 使用统计
 * @returns {Promise<{data: {totalSize: number, fileCount: number, userStats: Array}, error: any}>}
 */
export const getStorageStats = async () => {
  try {
    const { data: allFiles, error } = await listAllStorageFiles()
    if (error) return { data: null, error }
    
    const userStats = new Map()
    let totalSize = 0
    
    for (const file of allFiles || []) {
      const size = file.metadata?.size || 0
      totalSize += size
      
      if (!userStats.has(file.userId)) {
        userStats.set(file.userId, { userId: file.userId, fileCount: 0, totalSize: 0 })
      }
      const stat = userStats.get(file.userId)
      stat.fileCount++
      stat.totalSize += size
    }
    
    return {
      data: {
        totalSize,
        fileCount: allFiles?.length || 0,
        userStats: Array.from(userStats.values()).sort((a, b) => b.totalSize - a.totalSize)
      },
      error: null
    }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * 获取用户信息（批量）
 * @param {string[]} userIds 用户ID数组
 * @returns {Promise<{data: Map, error: any}>}
 */
export const fetchUsers = async (userIds) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username')
      .in('id', userIds)
    
    if (error) return { data: null, error }
    
    const userMap = new Map()
    for (const user of data || []) {
      userMap.set(user.id, user)
    }
    
    return { data: userMap, error: null }
  } catch (error) {
    return { data: null, error }
  }
}


