import { View, Text } from '@tarojs/components'
import { useLearning } from '../../lib/store'
import { ACHIEVEMENTS } from '../../components/ProfileSheets'
import '../../components/ProfileSheets.scss'
import './index.scss'

/* ============================ 我的成就（独立页面） ============================ */

export default function AchievePage() {
  const s = useLearning()
  const unlocked = ACHIEVEMENTS.filter((a) => a.test(s)).length
  return (
    <View className='pg-page'>
      <Text className='t-muted t-xs ps-count-line'>已解锁 {unlocked} / {ACHIEVEMENTS.length}</Text>
      <View className='ps-achieve-grid'>
        {ACHIEVEMENTS.map((a) => {
          const done = a.test(s)
          return (
            <View key={a.label} className={`ps-achieve ${done ? 'ps-achieve-on' : ''}`}>
              <View className={`ps-achieve-icon ${done ? '' : 'ps-achieve-lock'}`}>
                <Text>{a.icon}</Text>
              </View>
              <View className='flex-1'>
                <Text className={`ps-achieve-label ${done ? 't-text' : 't-muted'}`}>{a.label}</Text>
                <View><Text className='ps-achieve-desc'>{a.desc}</Text></View>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}
