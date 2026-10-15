import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, {useDidShow, useDidHide} from '@tarojs/taro'
import type { Dialogue } from '../../data/dialogues'
import { getPublishedScene } from '../../lib/scene-api'
import { CUSTOM_DIALOGUES_KEY, readCustomDialogueEntries, toggleDialogueFavorite } from '../../lib/dialogue-data'
import { speak, speakAiReply, stopSpeak, playSceneAudio } from '../../lib/speech'
import '../dialogue/index.scss'
import './index.scss'

/** 场景对话详情（独立页面，由场景列表 navigateTo 进入） */
export default function DlgDetailPage() {
  const router = Taro.useRouter()
  const id = router.params?.id || ''
  const customEntries = readCustomDialogueEntries(Taro.getStorageSync(CUSTOM_DIALOGUES_KEY))
  const localId=id.startsWith('local:')?id.slice(6):id
  const customEntry = id.startsWith('official:')?undefined:customEntries.find((entry) => entry.dialogue.id === localId)
  const [official,setOfficial]=useState<Dialogue>()
  const [loading,setLoading]=useState(id.startsWith('official:'))
  const [error,setError]=useState('')
  const dialogue=id.startsWith('official:')?official:customEntry?.dialogue
  async function refresh(){if(!id.startsWith('official:'))return;setLoading(true);setOfficial(undefined);setError('');try{setOfficial(await getPublishedScene(Number(id.slice(9))))}catch(e){setError(e instanceof Error?e.message:'场景读取失败')}finally{setLoading(false)}}
  useDidShow(()=>{void refresh()})
  useDidHide(()=>stopSpeak())

  useEffect(() => {
    if (dialogue) Taro.setNavigationBarTitle({ title: `${dialogue.emoji} ${dialogue.title}` })
    return () => stopSpeak()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id,dialogue?.title])

  if (!dialogue) {
    return (
      <View className='pg-page'>
        <View className='empty-col'>
          <View className='empty-icon'><Text>🤷</Text></View>
          <Text className='t-muted t-sm'>{loading?'正在加载场景…':error||'没找到这个对话场景'}</Text>
          {!!error&&<View onClick={()=>void refresh()}><Text>重试</Text></View>}
          <View className='btn-plain qs-done-btn tap' onClick={() => Taro.navigateBack()}><Text>返回列表</Text></View>
        </View>
      </View>
    )
  }

  return (
    <View className='dlg-page'>
      <View className='dlg-detail-header'>
        <View className='flex-1'>
          <Text className='dlg-detail-title'>{dialogue.emoji} {dialogue.title}</Text>
          <View>
            <Text className='dlg-detail-sub'>
              {dialogue.place} · {dialogue.lines.length} 句 · 点喇叭听发音
            </Text>
          </View>
          {!!customEntry && (
            <View className='dlg-favorite-btn tap' onClick={() => {
              const next = toggleDialogueFavorite(Taro.getStorageSync(CUSTOM_DIALOGUES_KEY), localId, Date.now())
              Taro.setStorageSync(CUSTOM_DIALOGUES_KEY, JSON.stringify(next))
              Taro.showToast({ title: customEntry.favorite ? '已取消收藏，2小时后自动清理' : '已收藏，永久保存', icon: 'none' })
              Taro.redirectTo({ url: `/pages/dlgdetail/index?id=${encodeURIComponent(id)}` })
            }}>
              <Text>{customEntry.favorite ? '★ 已收藏' : '☆ 收藏（保存更久）'}</Text>
            </View>
          )}
        </View>
      </View>

      <View className='dlg-bubble-col'>
        {dialogue.lines.map((line, i) => {
          const isA = line.speaker === 'A'
          const roleName = isA ? dialogue.roles[0] : dialogue.roles[1]
          return (
            <View key={i} className={`dlg-line-wrap ${isA ? 'dlg-left' : 'dlg-right'}`}>
              <Text className='dlg-role'>{roleName}</Text>
              <View className={`dlg-line-inner ${isA ? '' : 'dlg-line-inner-r'}`}>
                <View className={`dlg-bubble ${isA ? 'dlg-bot' : 'dlg-user'}`}>
                  <Text className={`dlg-yue ${isA ? '' : 'dlg-yue-white'}`}>{line.yue}</Text>
                  {!!line.jyutping&&<View><Text className={`dlg-man ${isA?'':'dlg-man-white'}`}>{line.jyutping}</Text></View>}
                  <View>
                    <Text className={`dlg-man ${isA ? '' : 'dlg-man-white'}`}>{line.man}</Text>
                  </View>
                </View>
                <View className='sound-btn dlg-line-sound tap' onClick={() => {
                  if(line.audioUrl){playSceneAudio(line.audioUrl);return}
                  if (!speak(line.yue)) void speakAiReply(line.yue)
                }}>
                  <Text className='sound-icon'>🔊</Text>
                </View>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}
