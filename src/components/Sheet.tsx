import { View, Text } from '@tarojs/components'
import { WORDS, Word, shortMan } from '../data/words'
import { speak } from '../lib/speech'
import { useLearning, removeStuck } from '../lib/store'
import './Sheet.scss'

/** 发音按钮 */
export function SoundButton({
  text,
  cls = ''
}: {
  text: string
  size?: number
  cls?: string
}) {
  return (
    <View className={`sound-btn tap ${cls}`} onClick={() => speak(text)}>
      <Text className='sound-icon'>🔊</Text>
    </View>
  )
}

/** 单词行（可选删除按钮） */
export function WordRow({
  w,
  onRemove,
  showExample = false
}: {
  w: Word
  onRemove?: (id: string) => void
  showExample?: boolean
}) {
  return (
    <View className='word-row'>
      <View className='word-badge'>
        <Text className='word-badge-text'>{w.yue}</Text>
      </View>
      <View className='flex-1'>
        <Text className='word-jyut'>{w.jyut}</Text>
        <View>
          <Text className='word-man ellipsis'>{shortMan(w.man)}</Text>
        </View>
        {showExample && (
          <View>
            <Text className='word-example ellipsis'>{w.example}</Text>
          </View>
        )}
      </View>
      <SoundButton text={w.yue} cls='sound-36' />
      {onRemove && (
        <View className='word-remove tap' onClick={() => onRemove(w.id)}>
          <Text>🗑</Text>
        </View>
      )}
    </View>
  )
}

/** 生词本内容（含空状态） */
export function StuckList() {
  const s = useLearning()
  const words = WORDS.filter((w) => s.stuck.includes(w.id))
  return (
    <>
      {words.length === 0 ? (
        <View className='empty-col'>
          <View className='empty-icon'>
            <Text>🔖</Text>
          </View>
          <Text className='t-muted t-sm'>生词本是空的</Text>
          <Text className='t-muted t-xs empty-hint'>
            复习选错、卡片跟读「再背一次」的词会收进来
          </Text>
        </View>
      ) : (
        <View className='flex-col gap-2'>
          <Text className='t-muted t-xs'>共 {words.length} 个生词 · 点垃圾桶移出</Text>
          {words.map((w) => (
            <WordRow key={w.id} w={w} onRemove={removeStuck} />
          ))}
        </View>
      )}
    </>
  )
}
