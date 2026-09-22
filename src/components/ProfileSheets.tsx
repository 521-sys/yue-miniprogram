import { View, Text } from '@tarojs/components'
import { useLearning } from '../lib/store'
import { WORDS } from '../data/words'
import type { LearningState } from '../lib/store'
import './ProfileSheets.scss'

/* ============================ 成就定义 ============================ */

export const ACHIEVEMENTS: {
  icon: string
  label: string
  desc: string
  test: (s: LearningState) => boolean
}[] = [
  { icon: '🔥', label: '连续7天', desc: '连续学习 7 天', test: (s) => s.streak >= 7 },
  { icon: '📖', label: '学习50词', desc: '累计记住 50 个词', test: (s) => s.learned.length >= 50 },
  { icon: '🎯', label: '背词30个', desc: '累计背诵 30 个词', test: (s) => s.reviewed.length >= 30 },
  { icon: '🏆', label: '生词清零', desc: '清空生词本', test: (s) => s.stuck.length === 0 && s.learned.length > 0 },
  { icon: '👑', label: '连续30天', desc: '连续学习 30 天', test: (s) => s.streak >= 30 },
  { icon: '🎓', label: '学完全部', desc: `记住全部 ${WORDS.length} 个词`, test: (s) => s.learned.length >= WORDS.length },
  { icon: '💪', label: '背完全部', desc: `背完全部 ${WORDS.length} 个词`, test: (s) => s.reviewed.length >= WORDS.length },
  { icon: '⚡', label: '今日达标', desc: '完成今日学习目标', test: (s) => s.todayLearned >= s.dailyGoal }
]

/** 每日目标完成度小组件 */
export function GoalBadge() {
  const s = useLearning()
  const pct = Math.min(100, Math.round((s.todayLearned / s.dailyGoal) * 100))
  return (
    <View className='ps-goal'>
      <Text className='ps-goal-icon'>🎯</Text>
      <View className='flex-1'>
        <Text className='ps-goal-title'>今日目标 {s.dailyGoal} 词</Text>
        <View className='ps-goal-track'>
          <View className='ps-goal-fill' style={{ width: `${pct}%` }} />
        </View>
      </View>
      {pct >= 100 ? (
        <Text className='t-success t-bold'>✓</Text>
      ) : (
        <Text className='t-primary t-xs t-bold'>{s.todayLearned}/{s.dailyGoal}</Text>
      )}
    </View>
  )
}
