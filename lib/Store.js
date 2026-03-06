import { useState, useEffect } from 'react'
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

  // 加载初始数据并设置监听器
  useEffect(() => {
    // 获取频道列表
    fetchChannels(setChannels)
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
        next.delete(Number(props.channelId))
        return next
      })
      fetchMessages(props.channelId, (messages) => {
        messages.forEach((x) => users.set(x.user_id, x.author))
        setMessages(messages)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.channelId])

  // 从 Postgres 收到新消息
  useEffect(() => {
    if (newMessage && newMessage.channel_id === Number(props.channelId)) {
      const handleAsync = async () => {
        let authorId = newMessage.user_id
        if (!users.get(authorId)) await fetchUser(authorId, (user) => handleNewOrUpdatedUser(user))
        setMessages(messages.concat(newMessage))
      }
      handleAsync()
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

  return {
    // 导出计算后的值，将作者信息映射到每条消息
    messages: messages.map((x) => ({ ...x, author: users.get(x.user_id) })),
    channels: channels !== null ? channels.sort((a, b) => a.slug.localeCompare(b.slug)) : [],
    users,
    unreadChannels,
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
 */
export const addMessage = async (message, channel_id, user_id) => {
  try {
    let { data } = await supabase
      .from('messages')
      .insert([{ message, channel_id, user_id }])
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
