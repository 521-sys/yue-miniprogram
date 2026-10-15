import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { type Dialogue } from '../../data/dialogues'
import { listPublishedScenes } from '../../lib/scene-api'
import { CUSTOM_DIALOGUES_KEY, readCustomDialogueEntries } from '../../lib/dialogue-data'
import { stopSpeak } from '../../lib/speech'
import './index.scss'

/** 场景对话：场景列表 → 点卡片跳转详情页（pages/dlgdetail） */
export default function DialoguePage() {
  const [custom, setCustom] = useState<Dialogue[]>([])
  const [official,setOfficial]=useState<Dialogue[]>([])
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  async function refresh(){setLoading(true);setError('');setCustom(readCustomDialogueEntries(Taro.getStorageSync(CUSTOM_DIALOGUES_KEY)).map(e=>e.dialogue));try{setOfficial(await listPublishedScenes())}catch(e){setOfficial([]);setError(e instanceof Error?e.message:'场景读取失败')}finally{setLoading(false)}}
  useDidShow(()=>{void refresh()})
  useEffect(() => {
    setCustom(readCustomDialogueEntries(Taro.getStorageSync(CUSTOM_DIALOGUES_KEY)).map((entry) => entry.dialogue))
    return () => stopSpeak()
  }, [])

  const dialogues = [...official, ...custom.map(d=>({...d,id:'local:'+d.id}))]
  const totalLines = dialogues.reduce((n, d) => n + d.lines.length, 0)

  return (
    <View className='dlg-page'>
      <View className='dlg-list-header'>
        <Text className='dlg-list-lead'>跟住场景学地道粤语</Text>
        <View><Text className='dlg-list-title'>场景对话</Text></View>
        <View className='dlg-list-tags'>
          <View className='dlg-list-tag'><Text>{dialogues.length} 个场景</Text></View>
          <View className='dlg-list-tag'><Text>{totalLines} 句对话练习</Text></View>
        </View>
      </View>

      <View className='dlg-card-col'>
        {loading&&<Text>正在加载场景…</Text>}
        {!!error&&<View onClick={()=>void refresh()}><Text>{error} · 点击重试</Text></View>}
        {!loading&&!error&&!official.length&&<Text>暂无已发布的场景</Text>}
        {dialogues.map((d) => (
          <View
            key={d.id}
            className='dlg-card tap'
            onClick={() => Taro.navigateTo({ url: `/pages/dlgdetail/index?id=${encodeURIComponent(d.id)}` })}
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
