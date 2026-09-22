import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { WORDS, shuffle, catOf } from '../../data/words'
import { speak, stopSpeak } from '../../lib/speech'
import '../../components/AiSheets.scss'
import './index.scss'

/* ============================ 跟读训练（录音 + 回放，评分可降级） ============================ */

interface PracticeItem {
  yue: string
  jyut: string
  man: string
  src: string
}

function makePracticeList(): PracticeItem[] {
  return shuffle(
    WORDS.map((w) => ({ yue: w.yue, jyut: w.jyut, man: w.man, src: catOf(w.cat).name }))
  ).slice(0, 10)
}

let recorder: Taro.RecorderManager | null = null

export default function PracticePage() {
  const [started, setStarted] = useState(false)
  const [list, setList] = useState<PracticeItem[]>([])
  const [idx, setIdx] = useState(0)
  const [recording, setRecording] = useState(false)
  const [recPath, setRecPath] = useState<string | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [scores, setScores] = useState<number[]>([])

  const it = list[idx]
  const done = started && idx >= list.length

  // 离开页面停止朗读
  useEffect(() => () => stopSpeak(), [])

  function start() {
    const l = makePracticeList()
    setList(l)
    setIdx(0)
    setRecPath(null)
    setScore(null)
    setTranscript('')
    setListening(false)
    setScores([])
    setStarted(true)
    setTimeout(() => speak(l[0].yue, 1), 400)
  }

  /** 初始化录音管理器（单例，回调只绑一次） */
  function getRecorder(): Taro.RecorderManager {
    if (recorder) return recorder
    const rm = Taro.getRecorderManager()
    rm.onStop((res) => {
      setRecording(false)
      setRecPath(res.tempFilePath)
    })
    rm.onError(() => {
      setRecording(false)
      Taro.showToast({ title: '录音失败，请检查麦克风权限', icon: 'none' })
    })
    recorder = rm
    return rm
  }

  function toggleRec() {
    const rm = getRecorder()
    if (recording) {
      rm.stop()
      return
    }
    Taro.authorize({
      scope: 'scope.record',
      success() {
        setRecPath(null)
        rm.start({ duration: 60000, sampleRate: 16000, numberOfChannels: 1, format: 'mp3' })
        setRecording(true)
      },
      fail() {
        Taro.showModal({
          title: '需要麦克风权限',
          content: '跟读录音需要麦克风权限，请在设置中开启',
          confirmText: '去设置',
          success: (r) => {
            if (r.confirm) Taro.openSetting()
          }
        })
      }
    })
  }

  function playRec() {
    if (!recPath) {
      Taro.showToast({ title: '还没有录音，先点麦克风', icon: 'none' })
      return
    }
    const a = Taro.createInnerAudioContext()
    a.src = recPath
    a.play()
  }

  /**
   * AI 评分：小程序没有浏览器语音识别。
   * 这里保留评分算法与 UI；真机识别需接入「微信同声传译」插件或后端 ASR。
   * 当前版本给出明确提示，不伪造分数。
   */
  function grade() {
    Taro.showModal({
      title: 'AI 评分说明',
      content:
        '小程序端的发音识别需接入「微信同声传译」插件或后端语音识别接口。录音与标准音播放已可用，接入识别后即可自动打分。',
      showCancel: false,
      confirmText: '知道了'
    })
    // 预留：拿到识别文本 text 后，用 similarity(text, it.yue) 计算分数，
    // setTranscript(text) / setScore(sc) / setScores(arr => [...arr, sc])
    void listening
    void transcript
  }

  function next() {
    const ni = idx + 1
    setIdx(ni)
    setScore(null)
    setTranscript('')
    setRecPath(null)
    if (ni < list.length) setTimeout(() => speak(list[ni].yue, 1), 350)
  }

  if (!started) {
    return (
      <View className='prac-page'>
        <View className='prac-intro-col'>
          <View className='prac-intro-icon'>
            <Text>🎤</Text>
          </View>
          <Text className='prac-intro-title'>跟读训练模式</Text>
          <View className='card-sm prac-intro-card'>
            <Text className='prac-intro-line'>① 🔊 听标准发音（可切 🐢 慢速）</Text>
            <Text className='prac-intro-line'>② 🎤 点大按钮，跟住读一句</Text>
            <Text className='prac-intro-line'>③ ▶ 回放自己的录音对比</Text>
            <Text className='prac-intro-line'>④ 🎯 AI 听你讲，发音打分</Text>
          </View>
          <View className='btn-gradient w-full prac-start-btn tap' onClick={start}>
            <Text>🚀 开始练习（10 句）</Text>
          </View>
        </View>
      </View>
    )
  }

  if (done) {
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
    return (
      <View className='prac-page'>
        <View className='prac-done-col'>
          <View className='prac-done-circle'>
            <Text>✓</Text>
          </View>
          <Text className='prac-done-title'>本轮跟读完成！</Text>
          {avg !== null && (
            <>
              <Text className='prac-avg'>{avg}<Text className='prac-avg-unit'> 平均分</Text></Text>
            </>
          )}
          <Text className='t-muted t-sm'>
            {avg === null ? '完成跟读！下次试试 🎯 AI 评分' : avg >= 85 ? '犀利！发音好正' : avg >= 70 ? '好嘢！保持呢个节奏' : '多听多讲，好快上手！'}
          </Text>
          <View className='flex gap-3 w-full'>
            <View className='btn-gradient prac-done-btn tap' onClick={start}><Text>↻ 再练一轮</Text></View>
            <View className='btn-plain prac-done-btn tap' onClick={() => Taro.navigateBack()}><Text>返回</Text></View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='prac-page'>
      <View className='prac-col'>
        <View className='flex items-center justify-between'>
          <Text className='t-muted t-xs'>第 {idx + 1} / {list.length} 句 · {it.src}</Text>
        </View>

        <View className='prac-word-card'>
          <View className='tap' onClick={() => speak(it.yue)}>
            <Text className='prac-word-big'>{it.yue}</Text>
          </View>
          <Text className='prac-jyut'>{it.jyut}</Text>
          <Text className='t-muted t-xs'>{it.man}</Text>
          <View className='flex gap-2'>
            <View className='prac-rate-btn tap' onClick={() => speak(it.yue, 1)}><Text>🔊 标准音</Text></View>
            <View className='prac-rate-btn tap' onClick={() => speak(it.yue, 0.6)}><Text>🐢 慢速</Text></View>
            <View className='prac-rate-btn tap' onClick={() => speak(it.yue, 1.3)}><Text>🐇 快速</Text></View>
          </View>
        </View>

        <View className='prac-rec-card'>
          {recording && <Text className='prac-rec-tip'>● 录音中…读完再点一下停止</Text>}
          <View className={`prac-mic tap ${recording ? 'prac-mic-on' : ''}`} onClick={toggleRec}>
            <Text className='prac-mic-icon'>{recording ? '⏹' : '🎤'}</Text>
          </View>
          <View className='flex gap-2'>
            {!!recPath && (
              <View className='prac-play-btn tap' onClick={playRec}><Text>▶ 我的录音</Text></View>
            )}
            <View className='prac-rate-btn tap' onClick={grade}>
              <Text>✨ {listening ? '识别中…' : 'AI 评分'}</Text>
            </View>
          </View>
          {score !== null && (
            <View className='soft-block w-full text-center'>
              <Text className='prac-score'>{score}<Text className='t-sm t-muted'> 分</Text></Text>
              <View>
                <Text className='t-muted t-xs'>👂 AI 听到你讲：「{transcript || '(冇听到内容)'}」</Text>
              </View>
            </View>
          )}
        </View>

        <View className='btn-gradient w-full prac-next tap' onClick={next}><Text>下一句 ›</Text></View>
        <View className='btn-plain w-full prac-end tap' onClick={() => Taro.navigateBack()}><Text>结束练习</Text></View>
      </View>
    </View>
  )
}
