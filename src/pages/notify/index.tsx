import { View, Text } from '@tarojs/components'
import '../../components/HomeSheets.scss'
import './index.scss'

/* ============================ 通知（独立页面） ============================ */

const NOTICES = [
  { icon: '📖', color: '#2B5CE6', title: '今日学习提醒', body: '还有 3 个词没记完，快去完成今日计划吧', time: '10:00' },
  { icon: '🏆', color: '#22c55e', title: '连续打卡 7 天', body: '你已连续学习 7 天，解锁「坚持」成就！', time: '昨天' },
  { icon: '✨', color: '#F5A623', title: '跟读训练上线', body: '听标准音 · 录音对比 · AI 评分，开口练粤语发音', time: '3 天前' },
  { icon: '📈', color: '#a855f7', title: '周报', body: '本周累计学习 42 次，比上周提升 20%', time: '上周' }
]

export default function NotifyPage() {
  return (
    <View className='pg-page'>
      <View className='flex-col gap-2'>
        {NOTICES.map((n) => (
          <View key={n.title} className='hs-notice'>
            <View className='hs-notice-icon' style={{ backgroundColor: n.color + '22' }}>
              <Text>{n.icon}</Text>
            </View>
            <View className='flex-1'>
              <View className='flex items-center justify-between'>
                <Text className='hs-notice-title'>{n.title}</Text>
                <Text className='t-xs hs-notice-time'>{n.time}</Text>
              </View>
              <View><Text className='hs-notice-body'>{n.body}</Text></View>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
