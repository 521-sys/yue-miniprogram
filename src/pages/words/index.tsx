import { View, Text } from '@tarojs/components'
import { SoundButton } from '../../components/Sheet'
import { WORDS, CATS, shortMan } from '../../data/words'
import '../../components/HomeSheets.scss'
import './index.scss'

/* ============================ 全部词汇（独立页面） ============================ */

export default function WordsPage() {
  return (
    <View className='pg-page'>
      <Text className='t-muted t-xs hs-count-line'>共 {WORDS.length} 个粤语词 · 点击喇叭发音</Text>
      <View className='hs-all-col'>
        {CATS.map((cat) => {
          const list = WORDS.filter((w) => w.cat === cat.id)
          if (!list.length) return null
          return (
            <View key={cat.id}>
              <Text className='hs-cat-title'>
                {cat.icon} {cat.name}
                <Text className='t-muted t-xs' style={{ marginLeft: '8px', fontWeight: 400 }}>{list.length} 词</Text>
              </Text>
              <View className='flex-col gap-2'>
                {list.map((w) => (
                  <View key={w.id} className='hs-all-row'>
                    <View className='hs-all-badge'><Text>{w.yue}</Text></View>
                    <View className='flex-1'>
                      <Text className='word-jyut'>{w.jyut}</Text>
                      <View><Text className='word-man ellipsis'>{shortMan(w.man)}</Text></View>
                    </View>
                    <SoundButton text={w.yue} cls='sound-32' />
                  </View>
                ))}
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}
