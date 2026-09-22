import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { DIALOGUES, type Dialogue } from '../../data/dialogues'
import { CUSTOM_DIALOGUES_KEY, readCustomDialogueEntries } from '../../lib/dialogue-data'
import { stopSpeak } from '../../lib/speech'
import './index.scss'

/** 场景对话：场景列表 → 点卡片跳转详情页（pages/dlgdetail） */
export default function DialoguePage() {
  const [custom, setCustom] = useState<Dialogue[]>([])
  useEffect(() => {
    setCustom(readCustomDialogueEntries(Taro.getStorageSync(CUSTOM_DIALOGUES_KEY)).map((entry) => entry.dialogue))
    return () => stopSpeak()
  }, [])

  const dialogues = [...DIALOGUES, ...custom]
  const totalLines = dialogues.reduce((n, d) => n + d.lines.length, 0)

  return (
    <View className='dlg-page'>
      <View className='dlg-list-header'>
        <Text className='dlg-list-lead'>跟住场景学地道粤语</Text>
        <View><Text className='dlg-list-title'>场景对话</Text></View>
        <View className='dlg-list-tags'>
          <View className='dlg-list-tag'><Text>{dialogues.length} 个场景</Text></View>
          <View className='dlg-list-tag'><Text>{totalLines} 句真人发音</Text></View>
        </View>
      </View>

      <View className='btn-gradient dlg-generate-btn tap' onClick={() => Taro.navigateTo({ url: '/pages/dialogue-generate/index' })}>
        <Text>✨ AI 生成我的场景</Text>
      </View>

      <View className='dlg-card-col'>
        {dialogues.map((d) => (
          <View
            key={d.id}
            className='dlg-card tap'
            onClick={() => Taro.navigateTo({ url: `/pages/dlgdetail/index?id=${d.id}` })}
          >
            <View className='dlg-card-emoji'><Text>{d.emoji}</Text></View>
            <View className='flex-1'>
              <Text className='dlg-card-title'>{d.title}</Text>
              <View>
                <Text className='dlg-card-sub'>
                  {d.place} · {d.lines.length} 句 · {d.roles[0]} × {d.roles[1]}
                </Text>
              </View>
            </View>
            <Text className='dlg-card-arrow'>›</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
