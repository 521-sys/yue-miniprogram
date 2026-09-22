import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function HomePage() {
  const go = (url: string) => Taro.navigateTo({ url })
  return (
    <View className='simple-home'>
      <View className='simple-brand'><View className='simple-logo'><Text>粤</Text></View><Text className='simple-brand-name'>粤语开口练</Text></View>
      <View className='simple-main'>
        <Text className='simple-eyebrow'>✨ AI 语音陪练</Text>
        <Text className='simple-title'>开口讲，慢慢学。</Text>
        <Text className='simple-subtitle'>用粤语或普通话打一句，智谱 AI 会陪你接着聊</Text>
        <View className='simple-voice tap' onClick={() => go('/pages/ai/index')}><Text className='simple-mic'>🎙</Text><Text className='simple-voice-label'>开始对话</Text></View>
        <Text className='simple-hint'>点击麦克风，开始练习</Text>
      </View>
    </View>
  )
}
