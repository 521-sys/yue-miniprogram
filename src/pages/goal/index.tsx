import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useLearning, setDailyGoal } from '../../lib/store'
import './index.scss'

const GOALS = [
  { value: 10, desc: '轻松起步', icon: '🌱' },
  { value: 20, desc: '稳扎稳打', icon: '✏️' },
  { value: 30, desc: '进阶推荐', icon: '🚀' },
  { value: 50, desc: '挑战自我', icon: '🔥' }
]

/** 每日目标（独立页面，替代原先的底部选择器） */
export default function GoalPage() {
  const s = useLearning()

  function pick(n: number) {
    setDailyGoal(n)
    Taro.showToast({ title: `每日 ${n} 词`, icon: 'success' })
    setTimeout(() => Taro.navigateBack(), 400)
  }

  return (
    <View className='pg-page'>
      <Text className='t-muted t-xs goal-tip'>选择一个每天想记住的词数目标</Text>
      <View className='flex-col gap-2'>
        {GOALS.map((g) => {
          const active = s.dailyGoal === g.value
          return (
            <View key={g.value} className={`goal-row tap ${active ? 'goal-row-on' : ''}`} onClick={() => pick(g.value)}>
              <Text className='goal-icon'>{g.icon}</Text>
              <View className='flex-1'>
                <Text className={`goal-num ${active ? 't-primary' : 't-text'}`}>每日 {g.value} 词</Text>
                <View><Text className='t-muted t-xs'>{g.desc}</Text></View>
              </View>
              {active && <Text className='goal-check'>✓ 当前目标</Text>}
            </View>
          )
        })}
      </View>
    </View>
  )
}
