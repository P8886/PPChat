import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const ACCESSIBLE_PRIVATE_KEY = 'ppchat_accessible_private'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)

/**
 * 播放消息提示音（嘀嘀嘀）
 */
const playMessageSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    
    const playBeep = (startTime, frequency, duration) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = frequency
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.15, startTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
      
      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
    }
    
    const now = audioContext.currentTime
    // 三声"嘀嘀嘀"，频率 880Hz
    playBeep(now, 880, 0.08)
    playBeep(now + 0.12, 880, 0.08)
    playBeep(now + 0.24, 880, 0.08)
  } catch (error) {
    console.log('播放提示音失败:', error)
  }
}

/**
 * @param {number} channelId 当前选中的频道ID
 * @param {string} currentUserId 当前用户ID（用于判断是否播放提示音）
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
  const currentUserIdRef = useRef(props?.currentUserId)
  const hiddenTimeRef = useRef(null)
  const [connectionHealth, setConnectionHealth] = useState({ healthy: true, needRefresh: false })

  // 更新 channelIdRef
  useEffect(() => {
    channelIdRef.current = props?.channelId
  }, [props?.channelId])

  // 更新 currentUserIdRef
  useEffect(() => {
    currentUserIdRef.current = props?.currentUserId
  }, [props?.currentUserId])

  // 检查浏览器是否真正在前台（页面可见 + 窗口有焦点）
  const isBrowserInForeground = () => {
    return !document.hidden && document.hasFocus()
  }

  // 检测连接健康状态
  const checkConnectionHealth = async () => {
    try {
      // 尝试发送一个简单的心跳查询
      const { error } = await supabase.from('channels').select('id', { count: 'exact', head: true })
      if (error) {
        console.log('连接检测失败:', error)
        setConnectionHealth({ healthy: false, needRefresh: true })
        return false
      }
      setConnectionHealth({ healthy: true, needRefresh: false })
      return true
    } catch (e) {
      console.log('连接检测异常:', e)
      setConnectionHealth({ healthy: false, needRefresh: true })
      return false
    }
  }

  // 更新页面可见性状态
  const updatePageVisibility = () => {
    const wasHidden = pageVisibleRef.current === false
    const isVisible = isBrowserInForeground()
    pageVisibleRef.current = isVisible

    // 页面进入后台时记录时间
    if (!isVisible && !hiddenTimeRef.current) {
      hiddenTimeRef.current = Date.now()
    }

    // 浏览器回到前台时
    if (wasHidden && isVisible) {
      // 清除当前频道的未读状态
      if (channelIdRef.current) {
        setUnreadChannels((prev) => {
          const next = new Set(prev)
          next.delete(Number(channelIdRef.current))
          return next
        })
      }

      // 检查隐藏时间是否超过5分钟
      if (hiddenTimeRef.current) {
        const hiddenDuration = Date.now() - hiddenTimeRef.current
        hiddenTimeRef.current = null

        // 如果隐藏超过5分钟，检测连接健康
        if (hiddenDuration > 5 * 60 * 1000) {
          console.log('页面长时间隐藏，检测连接状态...')
          checkConnectionHealth()
        }
      }
    }
  }

  // 加载初始数据并设置监听器
  useEffect(() => {
    // 获取频道列表
    fetchChannels(setChannels)
    
    // 初始化页面可见性状态
    pageVisibleRef.current = isBrowserInForeground()
    
    // 监听页面可见性变化
    const handleVisibilityChange = () => {
      updatePageVisibility()
    }
    
    // 监听窗口焦点变化（补充 visibilitychange）
    const handleFocus = () => {
      updatePageVisibility()
    }
    
    const handleBlur = () => {
      pageVisibleRef.current = false
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    
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
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
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

  // 检查频道是否可访问（公开频道或已验证的私密频道）
  const isChannelAccessible = (channelId) => {
    const channel = channels.find(c => c.id === channelId)
    if (!channel) return false
    if (!channel.is_private) return true
    // 私密频道：检查用户是否有访问权限
    const accessibleStr = typeof window !== 'undefined' ? localStorage.getItem(ACCESSIBLE_PRIVATE_KEY) || '[]' : '[]'
    const accessible = JSON.parse(accessibleStr)
    return accessible.includes(Number(channelId))
  }

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
        // 页面不可见时，播放提示音（排除自己的消息，且只针对可访问频道）
        if (newMessage.user_id !== currentUserIdRef.current && isChannelAccessible(newMessage.channel_id)) {
          playMessageSound()
        }
      }
    } else if (newMessage) {
      setUnreadChannels((prev) => {
        const next = new Set(prev)
        next.add(newMessage.channel_id)
        return next
      })
      // 其他频道有新消息时播放提示音（排除自己的消息，且只针对可访问频道）
      if (newMessage.user_id !== currentUserIdRef.current && isChannelAccessible(newMessage.channel_id)) {
        playMessageSound()
      }
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
    if (newChannel) setChannels([newChannel, ...channels])
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
    channels: channels !== null ? channels : [],
    users,
    unreadChannels,
    clearChannelUnread,
    connectionHealth,
  }
}

/**
 * 获取所有频道
 * @param {function} setState 可选，传入钩子或回调函数来设置状态
 */
export const fetchChannels = async (setState) => {
  try {
    let { data } = await supabase.from('channels').select('*').order('inserted_at', { ascending: false })
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
 * @param {number} file_hash_id 文件哈希ID（可选，仅用于图片消息）
 */
export const addMessage = async (message, channel_id, user_id, message_type = 'text', file_hash_id = null) => {
  try {
    const messageData = { message, channel_id, user_id, message_type }
    
    // 如果是图片消息且提供了文件哈希ID，则关联它
    if (message_type === 'image' && file_hash_id) {
      messageData.file_hash_id = file_hash_id
    }
    
    const { data } = await supabase
      .from('messages')
      .insert([messageData])
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
 * 从数据库删除消息（支持文件引用计数管理）
 * @param {number} message_id 消息ID
 */
export const deleteMessage = async (message_id) => {
  try {
    // 首先获取消息详情，检查是否为图片消息且有关联的文件哈希
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('id, message, message_type, file_hash_id')
      .eq('id', message_id)
      .single()
    
    if (fetchError) {
      console.error('Error fetching message for deletion:', fetchError)
      return null
    }
    
    // 删除消息记录
    const { data: deleteResult, error: deleteError } = await supabase
      .from('messages')
      .delete()
      .match({ id: message_id })
    
    if (deleteError) {
      console.error('Error deleting message:', deleteError)
      return null
    }
    
    // 如果是图片消息且有关联的文件哈希ID，则减少引用计数
    if (message.message_type === 'image' && message.file_hash_id) {
      try {
        // 减少文件引用计数
        const { data: updatedHash, error: updateError } = await updateFileReferenceCount(message.file_hash_id, -1)
        
        if (updateError) {
          console.error('Error updating file reference count:', updateError)
        } else if (updatedHash && updatedHash.reference_count === 0) {
          // 如果引用计数为0，则尝试删除OSS中的文件
          await tryDeleteOSSFile(message.file_hash_id)
        }
      } catch (refError) {
        console.error('Error handling file reference on message deletion:', refError)
      }
    }
    
    return deleteResult
  } catch (error) {
    console.log('error', error)
    return null
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
 * 计算文件的哈希值
 * @param {File} file 文件对象
 * @returns {Promise<string>} 文件的哈希值
 */
export const computeFileHash = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        resolve(hashHex)
      } catch (error) {
        console.error('Error computing hash:', error)
        reject(error)
      }
    }
    
    reader.onerror = (error) => {
      reject(error)
    }
    
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 检查文件是否已存在（基于哈希值）
 * @param {string} hash 文件哈希值
 * @returns {Promise<{exists: boolean, data: object|null}>}
 */
export const checkFileExists = async (hash) => {
  try {
    const { data, error } = await supabase
      .from('file_hashes')
      .select('*, file_path')
      .eq('hash_value', hash)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return { exists: false, data: null }
      }
      console.error('Error checking file exists:', error)
      return { exists: false, data: null }
    }
    
    return { exists: true, data }
  } catch (error) {
    console.error('Error in checkFileExists:', error)
    return { exists: false, data: null }
  }
}

/**
 * 更新文件引用计数
 * @param {number} fileHashId 文件哈希ID
 * @param {number} increment 增量（正数为增加，负数为减少）
 * @returns {Promise<{data: object|null, error: any}>}
 */
export const updateFileReferenceCount = async (fileHashId, increment) => {
  try {
    const { data, error } = await supabase
      .from('file_hashes')
      .select('reference_count')
      .eq('id', fileHashId)
      .single()
    
    if (error) {
      console.error('Error getting reference count:', error)
      return { data: null, error }
    }
    
    const newCount = Math.max(0, data.reference_count + increment)
    
    const { data: updatedData, error: updateError } = await supabase
      .from('file_hashes')
      .update({ reference_count: newCount })
      .eq('id', fileHashId)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating reference count:', updateError)
      return { data: null, error: updateError }
    }
    
    return { data: updatedData, error: null }
  } catch (error) {
    console.error('Error in updateFileReferenceCount:', error)
    return { data: null, error }
  }
}

/**
 * 添加新的文件哈希记录
 * @param {string} hash 文件哈希值
 * @param {string} filePath 文件路径
 * @param {number} fileSize 文件大小
 * @param {string} fileType 文件类型
 * @returns {Promise<{data: object|null, error: any}>}
 */
export const addFileHash = async (hash, filePath, fileSize, fileType) => {
  try {
    const { data, error } = await supabase
      .from('file_hashes')
      .insert([{ hash_value: hash, file_path: filePath, file_size: fileSize, file_type: fileType }])
      .select()
      .single()
    
    if (error) {
      console.error('Error adding file hash:', error)
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (error) {
    console.error('Error in addFileHash:', error)
    return { data: null, error }
  }
}

/**
 * 尝试删除OSS中的文件（如果引用计数为0）
 * @param {number} fileHashId 文件哈希ID
 * @returns {Promise<{error: any}>}
 */
export const tryDeleteOSSFile = async (fileHashId) => {
  try {
    // 获取文件哈希信息
    const { data: fileHash, error: hashError } = await supabase
      .from('file_hashes')
      .select('file_path, reference_count')
      .eq('id', fileHashId)
      .single()
    
    if (hashError) {
      console.error('Error getting file hash info:', hashError)
      return { error: hashError }
    }
    
    // 只有当引用计数为0时才删除文件
    if (fileHash.reference_count === 0) {
      // 从 Supabase Storage 删除文件
      const { error: storageError } = await supabase
        .storage
        .from('chat-images')
        .remove([fileHash.file_path])
      
      if (storageError) {
        console.error('Error deleting file from storage:', storageError)
        return { error: storageError }
      }
      
      // 从数据库删除文件哈希记录
      const { error: deleteError } = await supabase
        .from('file_hashes')
        .delete()
        .eq('id', fileHashId)
      
      if (deleteError) {
        console.error('Error deleting file hash record:', deleteError)
        return { error: deleteError }
      }
    }
    
    return { error: null }
  } catch (error) {
    console.error('Error in tryDeleteOSSFile:', error)
    return { error }
  }
}

/**
 * 上传图片到 Storage（支持去重功能）
 * @param {File} file 图片文件
 * @param {string} userId 用户ID
 * @returns {Promise<{url: string, error: string, isDuplicate: boolean}|{url: null, error: *, isDuplicate: boolean}>}
 */
export const uploadImage = async (file, userId) => {
  try {
    // 计算文件哈希值
    const fileHash = await computeFileHash(file)
    
    // 检查文件是否已存在
    const { exists, data: existingFile } = await checkFileExists(fileHash)
    
    if (exists) {
      // 文件已存在，增加引用计数
      await updateFileReferenceCount(existingFile.id, 1)
      
      // 返回已存在的文件URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(existingFile.file_path)
      
      return { 
        url: publicUrl, 
        error: null,
        isDuplicate: true,
        fileHashId: existingFile.id
      }
    }
    
    // 文件不存在，生成新文件名并上传
    const ext = file.name.split('.').pop()
    const fileName = `chat/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    
    const { error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) return { url: null, error, isDuplicate: false }
    
    // 获取公开URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName)
    
    // 添加文件哈希记录
    const { data: fileHashData, error: hashError } = await addFileHash(
      fileHash,
      fileName,
      file.size,
      file.type
    )
    
    if (hashError) {
      console.error('Warning: Could not save file hash:', hashError)
      // 即使哈希保存失败，仍返回文件URL，但标记为非重复
      return { url: publicUrl, error: null, isDuplicate: false }
    }
    
    return { 
      url: publicUrl, 
      error: null, 
      isDuplicate: false,
      fileHashId: fileHashData.id
    }
  } catch (error) {
    console.log('upload error', error)
    return { url: null, error, isDuplicate: false }
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


