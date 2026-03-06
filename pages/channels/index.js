import Layout from '~/components/Layout'
import { useStore } from '~/lib/Store'

const ChannelsPage = () => {
  const { channels, unreadChannels } = useStore({ channelId: null })

  return (
    <Layout channels={channels} activeChannelId={null} unreadChannels={unreadChannels}>
      <div className="relative flex flex-col h-full items-center justify-center bg-gray-800 text-gray-400">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">欢迎来到 PPChat</h2>
          <p>请从左侧列表选择一个频道开始聊天</p>
        </div>
      </div>
    </Layout>
  )
}

export default ChannelsPage
