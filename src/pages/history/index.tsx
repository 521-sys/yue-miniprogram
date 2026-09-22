import { View, Text } from '@tarojs/components'
import { useLearning } from '../../lib/store'
import '../../components/ProfileSheets.scss'
import './index.scss'

/* ============================ 学习记录（独立页面） ============================ */

const WEEK_CN = ['一', '二', '三', '四', '五', '六', '日']

function buildWeek(activity: Record<string, number>) {
  const week: { label: string; value: number; isToday: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    week.push({
      label: WEEK_CN[(d.getDay() + 6) % 7],
      value: activity[key] || 0,
      isToday: i === 0
    })
  }
  return week
}

export default function HistoryPage() {
  const s = useLearning()
  const totalActions = Object.values(s.activity).reduce((a, b) => a + b, 0)
  const week = buildWeek(s.activity)
  const maxVal = Math.max(...week.map((w) => w.value), 1)

  const stats = [
    { label: '已记词', value: s.learned.length, color: '#2B5CE6' },
    { label: '已背词', value: s.reviewed.length, color: '#22c55e' },
    { label: '连续天数', value: s.streak, color: '#F5A623' },
    { label: '累计学习', value: totalActions, color: '#a855f7' }
  ]

  return (
    <View className='pg-page'>
      <View className='ps-stat-grid'>
        {stats.map((x) => (
          <View key={x.label} className='ps-stat-box'>
            <Text className='ps-stat-num' style={{ color: x.color }}>{x.value}</Text>
            <View><Text className='t-xs ps-stat-label'>{x.label}</Text></View>
          </View>
        ))}
      </View>
      <View className='card-sm'>
        <Text className='ps-chart-title'>近 7 天学习次数</Text>
        <View className='ps-bars'>
          {week.map((w, i) => (
            <View key={i} className='ps-bar-col'>
              <Text className='ps-bar-val'>{w.value || ''}</Text>
              <View
                className='ps-bar'
                style={{
                  height: `${Math.max(4, (w.value / maxVal) * 56)}px`,
                  background:
                    w.value > 0
                      ? w.isToday
                        ? 'linear-gradient(180deg, #F5A623, #e8950f)'
                        : 'linear-gradient(180deg, #2B5CE6, #4a7cf7)'
                      : '#e5e7eb'
                }}
              />
              <Text className={`t-xs ${w.isToday ? 't-accent t-bold' : 't-muted'}`}>{w.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
