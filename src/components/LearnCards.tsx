import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import { useLearning, markSeen, markLearned, markStuck } from '../lib/store'
import { WORDS, CATS, Word, shuffle } from '../data/words'
import { speak } from '../lib/speech'
import './LearnCards.scss'

const toneColors: Record<string, string> = {
  '1': '#2B5CE6',
  '2': '#22c55e',
  '3': '#F5A623',
  '4': '#a855f7',
  '5': '#ef4444',
  '6': '#64748b'
}

const TONE_NAMES: Record<string, string> = {
  '1': '阴平',
  '2': '阴上',
  '3': '阴去',
  '4': '阳平',
  '5': '阳上',
  '6': '阳去'
}

function buildQueue(stuck: string[], seen: string[], size: number): Word[] {
  const stuckWords = WORDS.filter((w) => stuck.includes(w.id))
  const fresh = shuffle(WORDS.filter((w) => !stuck.includes(w.id) && !(seen || []).includes(w.id)))
  return [...stuckWords, ...fresh].slice(0, size)
}

/** 记粤语 · 词汇卡片跟读学习流程 */
export default function LearnCards({ onExit }: { onExit: () => void }) {
  const s = useLearning()
  const [queue, setQueue] = useState<Word[]>(() => buildQueue(s.stuck, s.seen || [], s.dailyGoal))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<Record<string, 'know' | 'learn'>>({})

  const word = queue[index]

  useEffect(() => {
    if (queue.length) {
      const t = setTimeout(() => speak(queue[0].yue), 350)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const go = (dir: number) => {
    setFlipped(false)
    const ni = Math.max(0, Math.min(queue.length - 1, index + dir))
    setIndex(ni)
    speak(queue[ni].yue)
  }

  const mark = (result: 'know' | 'learn') => {
    if (!word) return
    setResults((r) => ({ ...r, [word.id]: result }))
    markSeen(word.id)
    if (result === 'know') markLearned(word.id)
    else markStuck(word.id)
    if (index < queue.length - 1) {
      setFlipped(false)
      setIndex(index + 1)
      setTimeout(() => speak(queue[index + 1].yue), 250)
    }
  }

  const replay = () => {
    setQueue(buildQueue(s.stuck, s.seen || [], s.dailyGoal))
    setIndex(0)
    setFlipped(false)
    setResults({})
    setTimeout(() => speak(queue[0]?.yue ?? ''), 300)
  }

  const done = word && results[word.id]
  const knowCount = Object.values(results).filter((r) => r === 'know').length
  const learnCount = Object.values(results).filter((r) => r === 'learn').length

  return (
    <View className='lc-page'>
      {/* Header */}
      <View className='lc-header'>
        <View className='lc-header-row'>
          <View className='tap' onClick={onExit}>
            <Text className='lc-exit'>✕ 退出</Text>
          </View>
          <View className='text-center'>
            <Text className='lc-sub'>记粤语</Text>
            <Text className='lc-title'>词汇卡片跟读</Text>
          </View>
          <View className='lc-count'>
            <Text>{index + 1} / {queue.length}</Text>
          </View>
        </View>
        <View className='progress-track'>
          <View
            className='progress-fill'
            style={{ width: `${queue.length ? ((index + 1) / queue.length) * 100 : 0}%` }}
          />
        </View>
      </View>

      {done || !word ? (
        /* 完成屏 */
        <View className='lc-done-col'>
          <View className='lc-done-circle'>
            <Text className='lc-done-check'>✓</Text>
          </View>
          <View className='text-center'>
            <Text className='lc-done-title'>完成本组学习！</Text>
            <View>
              <Text className='t-muted t-sm'>共学 {queue.length} 个粤语词汇</Text>
            </View>
          </View>
          <View className='flex gap-4'>
            <View className='lc-stat-card'>
              <Text className='lc-stat-num t-success'>{knowCount}</Text>
              <View><Text className='t-muted t-xs'>已掌握</Text></View>
            </View>
            <View className='lc-stat-card'>
              <Text className='lc-stat-num t-accent'>{learnCount}</Text>
              <View><Text className='t-muted t-xs'>待加强</Text></View>
            </View>
          </View>
          <View className='lc-done-actions'>
            <View className='btn-gradient lc-action-btn tap' onClick={replay}>
              <Text>↻ 再次练习</Text>
            </View>
            <View className='btn-plain lc-action-btn tap' onClick={onExit}>
              <Text>返回首页</Text>
            </View>
          </View>
        </View>
      ) : (
        <View className='lc-body'>
          {/* 卡片 */}
          <View className='lc-card tap' onClick={() => setFlipped((f) => !f)}>
            <View className='chip'>
              <Text>
                {CATS.find((c) => c.id === word.cat)?.icon} {CATS.find((c) => c.id === word.cat)?.name}
              </Text>
            </View>
            <View className='w-full text-center'>
              <Text className='lc-word-big'>{word.yue}</Text>
            </View>
            <View className='lc-tones'>
              {word.jyut.split(' ').map((syllable, i) => {
                const toneNum = syllable.slice(-1)
                const text = syllable.slice(0, -1)
                return (
                  <View key={i} className='lc-tone-col'>
                    <Text className='lc-tone-text'>{text}</Text>
                    <Text
                      className='lc-tone-badge'
                      style={{ backgroundColor: toneColors[toneNum] || '#2B5CE6' }}
                    >
                      {toneNum}声
                    </Text>
                  </View>
                )
              })}
            </View>
            <View
              className='lc-card-sound tap'
              onClick={(e) => {
                e.stopPropagation()
                speak(word.yue)
              }}
            >
              <Text className='lc-card-sound-icon'>🔊</Text>
            </View>

            {flipped ? (
              <View className='lc-flip'>
                <View className='text-center'>
                  <Text className='t-muted t-xs'>普通话释义</Text>
                  <View>
                    <Text className='lc-man-text'>{word.man}</Text>
                  </View>
                </View>
                <View className='soft-block'>
                  <Text className='lc-example-yue'>{word.example}</Text>
                  <View>
                    <Text className='t-muted t-xs'>{word.exampleMan}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text className='t-muted t-xs'>点击卡片查看释义</Text>
            )}
          </View>

          {/* 声调指南 */}
          <View className='card-sm'>
            <Text className='lc-tone-guide-title'>粤语九声六调</Text>
            <View className='lc-tone-grid'>
              {Object.keys(TONE_NAMES).map((num) => (
                <View key={num} className='lc-tone-name-item'>
                  <Text
                    className='lc-tone-name-badge'
                    style={{ backgroundColor: toneColors[num] }}
                  >
                    {num}
                  </Text>
                  <Text className='t-muted t-xs'>{TONE_NAMES[num]}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 认识 / 再背 */}
          <View className='lc-mark-row'>
            <View className='lc-btn-learn tap' onClick={() => mark('learn')}>
              <Text>✕ 再背一次</Text>
            </View>
            <View className='lc-btn-know tap' onClick={() => mark('know')}>
              <Text>✓ 认识</Text>
            </View>
          </View>

          {/* 导航 */}
          <View className='lc-nav'>
            <View
              className={`lc-nav-btn tap ${index === 0 ? 'lc-nav-disabled' : ''}`}
              onClick={() => go(-1)}
            >
              <Text className='lc-nav-arrow'>‹</Text>
            </View>
            <View className='lc-dots'>
              {queue.map((w, i) => (
                <View
                  key={w.id}
                  className={`lc-dot ${
                    i === index
                      ? 'lc-dot-on'
                      : results[w.id] === 'know'
                      ? 'lc-dot-know'
                      : results[w.id] === 'learn'
                      ? 'lc-dot-learn'
                      : ''
                  }`}
                  onClick={() => {
                    setIndex(i)
                    setFlipped(false)
                    speak(w.yue)
                  }}
                />
              ))}
            </View>
            <View
              className={`lc-nav-btn tap ${index === queue.length - 1 ? 'lc-nav-disabled' : ''}`}
              onClick={() => go(1)}
            >
              <Text className='lc-nav-arrow'>›</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
