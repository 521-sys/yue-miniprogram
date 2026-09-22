import { View, Text } from '@tarojs/components'
import { useLearning } from '../../lib/store'
import '../../components/ProfileSheets.scss'
import './index.scss'

/* ============================ 打卡日历（独立页面） ============================ */

const WEEK_CN = ['一', '二', '三', '四', '五', '六', '日']

export default function CheckinPage() {
  const s = useLearning()
  const DAYS = 35
  const cells: { key: string; day: number; count: number; isToday: boolean }[] = []
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    cells.push({ key, day: d.getDate(), count: s.activity[key] || 0, isToday: i === 0 })
  }
  const checkedCount = cells.filter((c) => c.count > 0).length

  return (
    <View className='pg-page'>
      <View className='flex gap-2 ps-checkin-top'>
        <View className='ps-checkin-stat'>
          <Text className='ps-checkin-streak'>🔥 {s.streak}</Text>
          <View><Text className='t-xs ps-stat-label'>连续天数</Text></View>
        </View>
        <View className='ps-checkin-stat'>
          <Text className='ps-checkin-days'>{checkedCount}</Text>
          <View><Text className='t-xs ps-stat-label'>近 35 天打卡</Text></View>
        </View>
      </View>

      <View className='card-sm'>
        <View className='ps-cal-week'>
          {WEEK_CN.map((d) => (
            <Text key={d} className='ps-cal-weekday'>{d}</Text>
          ))}
        </View>
        <View className='ps-cal-grid'>
          {cells.map((c) => (
            <View
              key={c.key}
              className='ps-cal-cell'
              style={{
                background:
                  c.count > 0
                    ? c.isToday
                      ? 'linear-gradient(135deg, #F5A623, #e8950f)'
                      : 'linear-gradient(135deg, #2B5CE6, #4a7cf7)'
                    : '#eef1f7',
                color: c.count > 0 ? '#fff' : '#b8c0d0',
                boxShadow: c.isToday ? '0 0 0 2px #2B5CE6' : 'none'
              }}
            >
              <Text>{c.day}</Text>
            </View>
          ))}
        </View>
        <View className='ps-legend'>
          <View className='ps-legend-item'>
            <View className='ps-legend-box' style={{ background: '#eef1f7' }} />
            <Text className='t-xs t-muted'>未学习</Text>
          </View>
          <View className='ps-legend-item'>
            <View className='ps-legend-box' style={{ background: '#2B5CE6' }} />
            <Text className='t-xs t-muted'>已打卡</Text>
          </View>
          <View className='ps-legend-item'>
            <View className='ps-legend-box' style={{ background: '#F5A623' }} />
            <Text className='t-xs t-muted'>今天</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
