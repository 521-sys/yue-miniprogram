import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { markLearned, markStuck } from '../../lib/store'
import { WORDS, Word, shuffle } from '../../data/words'
import '../../components/HomeSheets.scss'
import './index.scss'

/* ============================ 自我检测（独立页面） ============================ */

const QUIZ_N = 5

function makeYueOptions(word: Word): string[] {
  const correct = word.yue
  const distractors = shuffle(WORDS.filter((w) => w.id !== word.id && w.yue !== correct))
    .slice(0, 3)
    .map((w) => w.yue)
  return shuffle([correct, ...distractors])
}

export default function QuizPage() {
  const [queue, setQueue] = useState<Word[]>(() => shuffle(WORDS).slice(0, QUIZ_N))
  const [idx, setIdx] = useState(0)
  const [options, setOptions] = useState<string[]>(() => makeYueOptions(shuffle(WORDS)[0]))
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)

  const word = queue[idx]
  const done = idx >= queue.length

  function start() {
    const q = shuffle(WORDS).slice(0, QUIZ_N)
    setQueue(q)
    setIdx(0)
    setPicked(null)
    setCorrect(0)
    setOptions(makeYueOptions(q[0]))
  }

  function answer(i: number) {
    if (picked !== null || !word) return
    setPicked(i)
    const ok = options[i] === word.yue
    if (ok) {
      markLearned(word.id)
      setCorrect((c) => c + 1)
    } else {
      markStuck(word.id)
    }
    setTimeout(() => {
      const ni = idx + 1
      setIdx(ni)
      setPicked(null)
      if (ni < queue.length) setOptions(makeYueOptions(queue[ni]))
    }, ok ? 900 : 1400)
  }

  return (
    <View className='pg-page'>
      {done ? (
        <View className='qs-done-col'>
          <View className='qs-done-circle'><Text>✓</Text></View>
          <View className='text-center'>
            <Text className='qs-done-title'>检测完成</Text>
            <View><Text className='t-muted t-sm'>答对 {correct} / {queue.length} 题</Text></View>
          </View>
          <View className='flex gap-3 w-full'>
            <View className='btn-gradient qs-done-btn tap' onClick={start}><Text>↻ 再测一次</Text></View>
            <View className='btn-plain qs-done-btn tap' onClick={() => Taro.navigateBack()}><Text>返回</Text></View>
          </View>
        </View>
      ) : (
        <View className='qs-col'>
          <View className='flex items-center justify-between'>
            <Text className='t-muted t-xs'>第 {idx + 1} / {queue.length} 题 · 选释义对应的粤语词</Text>
            <Text className='t-primary t-xs t-bold'>已对 {correct}</Text>
          </View>
          <View className='qs-progress-track'>
            <View className='qs-progress-fill' style={{ width: `${((idx + 1) / queue.length) * 100}%` }} />
          </View>
          <View className='qs-question-card'>
            <Text className='t-muted t-xs'>「{word.man}」是哪个粤语词？</Text>
            <View className='qs-options'>
              {options.map((opt, i) => {
                const isCorrect = opt === word.yue
                const isPicked = picked === i
                let cls = 'qs-option'
                if (picked !== null) {
                  if (isCorrect) cls += ' qs-option-right'
                  else if (isPicked) cls += ' qs-option-wrong'
                  else cls += ' qs-option-dim'
                }
                return (
                  <View key={i} className={`${cls} tap`} onClick={() => answer(i)}>
                    <Text>{opt}</Text>
                    {picked !== null && isCorrect && <Text className='qs-option-mark'>✓</Text>}
                  </View>
                )
              })}
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
