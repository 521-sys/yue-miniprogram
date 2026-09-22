import { View, Text } from '@tarojs/components'
import { WordRow } from '../../components/Sheet'
import { useLearning } from '../../lib/store'
import { WORDS } from '../../data/words'
import '../../components/ProfileSheets.scss'
import './index.scss'

/* ============================ 已掌握词汇（独立页面） ============================ */

export default function MasteredPage() {
  const s = useLearning()
  const words = WORDS.filter((w) => s.learned.includes(w.id))
  return (
    <View className='pg-page'>
      {words.length === 0 ? (
        <View className='empty-col'>
          <View className='empty-icon'><Text>📖</Text></View>
          <Text className='t-muted t-sm'>还没有斩下的词</Text>
          <Text className='t-muted t-xs empty-hint'>去「记粤语」斩对第一个词吧</Text>
        </View>
      ) : (
        <View className='ps-col gap-2'>
          <Text className='t-muted t-xs'>
            共 {words.length} / {WORDS.length} 词 · 掌握率 {Math.round((words.length / WORDS.length) * 100)}%
          </Text>
          {words.map((w) => (
            <WordRow key={w.id} w={w} />
          ))}
        </View>
      )}
    </View>
  )
}
