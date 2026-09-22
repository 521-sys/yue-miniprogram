import { useMemo, useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import { SoundButton } from '../../components/Sheet'
import { WORDS, shortMan } from '../../data/words'
import { translate, reverseLookup, hasKnown } from '../../data/dictionary'
import '../../components/HomeSheets.scss'
import './index.scss'

/* ============================ 粤语字典（独立页面） ============================ */

export default function DictPage() {
  const [q, setQ] = useState('')
  const kw = q.trim()
  const lower = kw.toLowerCase()

  const wordHits = useMemo(() => {
    if (!kw) return []
    return WORDS.filter(
      (w) =>
        w.yue.includes(kw) ||
        w.jyut.toLowerCase().includes(lower) ||
        w.man.includes(kw) ||
        shortMan(w.man).includes(kw) ||
        w.example.includes(kw) ||
        w.exampleMan.includes(kw)
    ).slice(0, 20)
  }, [kw, lower])

  const trans = useMemo(() => (kw ? translate(kw) : []), [kw])
  const transKnown = hasKnown(trans)
  const transYue = trans.map((s) => s.yue).join('')
  const transJyut = trans.map((s) => s.jyut).filter(Boolean).join(' ')
  const reverse = useMemo(() => (kw ? reverseLookup(kw) : []), [kw])
  const nothing = !transKnown && reverse.length === 0 && wordHits.length === 0

  return (
    <View className='pg-page'>
      <View className='hs-search-box'>
        <Text className='hs-search-icon'>🔍</Text>
        <Input
          className='hs-search-input'
          focus
          value={q}
          placeholder='输入普通话或粤语，如：吃饭 / 食 / 嘅 / 唔該'
          placeholderClass='ai-ph'
          onInput={(e) => setQ(e.detail.value)}
        />
        {!!q && (
          <View className='tap' onClick={() => setQ('')}><Text className='t-muted t-xs'>清除</Text></View>
        )}
      </View>

      {kw === '' ? (
        <View className='hs-empty-col'>
          <View className='empty-icon'><Text>🔍</Text></View>
          <Text className='t-muted t-sm t-bold'>像查字典一样，双向检索</Text>
          <View className='hs-tips'>
            <Text className='t-muted t-xs hs-tip-line'>· 普通话 → 粤语：输入「吃饭」得到「食飯」</Text>
            <Text className='t-muted t-xs hs-tip-line'>· 粤语 → 普通话：输入「嘅」得到「的」</Text>
            <Text className='t-muted t-xs hs-tip-line'>· 查词条：输入「唔該」看完整释义例句</Text>
          </View>
        </View>
      ) : nothing ? (
        <View className='hs-empty-col'>
          <Text className='t-muted t-sm'>没找到「{kw}」相关的解释</Text>
        </View>
      ) : (
        <View className='hs-result-col'>
          {transKnown && (
            <View>
              <Text className='hs-section-title'>✨ 普通话 → 粤语</Text>
              <View className='card-sm'>
                <View className='flex items-center justify-between gap-3'>
                  <View className='flex-1'>
                    <Text className='hs-trans-yue'>{transYue}</Text>
                    {!!transJyut && <View><Text className='t-primary t-xs t-mono'>{transJyut}</Text></View>}
                  </View>
                  <SoundButton text={transYue} cls='sound-48' />
                </View>
                <View className='hs-seg-list'>
                  {trans.map((s, i) => (
                    <View key={i} className='hs-seg-row'>
                      <Text className='t-muted t-xs hs-seg-man'>{s.man}</Text>
                      <Text className='t-muted t-xs'>→</Text>
                      <Text className={`t-bold ${s.known ? 't-text' : 'hs-seg-unknown'}`}>{s.yue}</Text>
                      {s.known && <Text className='t-primary t-xs t-mono'>{s.jyut}</Text>}
                      {s.known && <SoundButton text={s.yue} cls='sound-28' />}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {!transKnown && reverse.length > 0 && (
            <View>
              <Text className='hs-section-title'>📖 粤语 → 普通话</Text>
              <View className='flex-col gap-2'>
                {reverse.map((r, i) => (
                  <View key={i} className='word-row'>
                    <View className='hs-rev-badge'><Text>{r.yue}</Text></View>
                    <View className='flex-1'>
                      <Text className='t-sm' style={{ color: '#6b7280' }}>{r.man}</Text>
                      <Text className='t-primary t-xs t-mono' style={{ marginLeft: '8px' }}>{r.jyut}</Text>
                    </View>
                    <SoundButton text={r.yue} cls='sound-36' />
                  </View>
                ))}
              </View>
            </View>
          )}

          {wordHits.length > 0 && (
            <View>
              <Text className='hs-section-title'>📖 词典词条（{wordHits.length}）</Text>
              <View className='flex-col gap-2'>
                {wordHits.map((w) => (
                  <View key={w.id} className='hs-wordhit'>
                    <View className='flex items-center gap-3'>
                      <View className='word-badge'><Text className='word-badge-text'>{w.yue}</Text></View>
                      <View className='flex-1'>
                        <Text className='word-jyut'>{w.jyut}</Text>
                        <View><Text className='word-man'>{shortMan(w.man)}</Text></View>
                      </View>
                      <SoundButton text={w.yue} cls='sound-36' />
                    </View>
                    <View className='hs-example-box'>
                      <Text className='t-xs hs-example-text'>{w.example}</Text>
                      <SoundButton text={w.example} cls='sound-28' />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  )
}
