import { useEffect, useMemo, useState } from 'react'
import { Button, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidHide } from '@tarojs/taro'
import { CallSession, Phase } from '../../lib/call/session'
import { createCallMedia } from '../../lib/call/media'
import { DEMO_SAMPLES } from '../../lib/call/demo'
import { stopSpeak } from '../../lib/speech'
import './index.scss'

const LABELS: Record<Phase, string> = {
  idle: '试试用粤语，开口说一句',
  requesting: '正在申请麦克风权限',
  starting: '正在开启麦克风',
  listening: '本地收音中',
  processing: '正在保存本轮录音',
  speaking: '正在播放预置粤语台词',
  muted: '麦克风已关闭',
  ended: '本次体验已结束',
  error: '体验暂时中断'
}
const clock = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`

export default function CallPage() {
  const session = useMemo(() => new CallSession(createCallMedia(Taro), DEMO_SAMPLES), [])
  const [state, setState] = useState(session.state)
  const [captions, setCaptions] = useState(false)
  useEffect(() => {
    const unsubscribe = session.subscribe(setState)
    const timer = setInterval(() => session.tick(), 1000)
    return () => {
      unsubscribe()
      clearInterval(timer)
      session.dispose()
    }
  }, [session])
  useDidHide(() => {
    if (session.state.phase !== 'idle') session.end('页面已离开或切到后台，通话已自动结束。')
  })

  const active = !['idle', 'ended', 'error'].includes(state.phase)
  const canMute = ['starting', 'listening', 'processing', 'speaking', 'muted'].includes(state.phase)
  const canReplay = state.phase === 'ended'
  const start = () => { setCaptions(false); stopSpeak(); void session.start() }

  return (
    <View className='call-page'>
      <View className='call-mode'><View className='call-mode-dot' /><Text>离线演示 · 未连接 AI</Text></View>

      <View className='call-stage'>
        <View className={`call-orbit ${state.phase === 'speaking' || state.phase === 'listening' ? 'call-orbit-active' : ''}`}>
          <View className='call-orbit-inner'><Text>粤</Text></View>
        </View>
        <Text className='call-title'>粤语搭子</Text>
        <Text className='call-intro'>茶餐厅 · 语音体验</Text>
        <Text className='call-status'>{LABELS[state.phase]}</Text>
        {(active || state.elapsed > 0) && <Text className='call-timer'>{clock(state.elapsed)}</Text>}
        <Text className='call-status-help'>
          {state.phase === 'listening' ? '本轮录音 15 秒后自动结束'
            : state.phase === 'speaking' ? '示例播完后自动开启麦克风'
              : state.phase === 'muted' ? '轻点麦克风，继续体验'
                : state.note || '预置粤语台词 · 本地录音 · 最长 3 分钟'}
        </Text>
      </View>

      {!!state.error && <View className='call-error'><Text>{state.error}</Text></View>}

      {state.messages.length > 0 && <View className='call-transcript'>
        <Button className='call-text-button' onClick={() => setCaptions(!captions)}>{captions ? '收起字幕' : '查看字幕'}</Button>
        {captions && (
          <ScrollView scrollY className='call-messages' scrollIntoView={state.messages.length ? `call-msg-${state.messages.length - 1}` : undefined} scrollWithAnimation>
            {state.messages.length === 0 && <Text className='call-empty'>开始后显示示例台词与录音记录。当前没有语音识别，不生成你的文字字幕。</Text>}
            {state.messages.map((message, index) => (
              <View id={`call-msg-${index}`} key={index} className={`call-message call-message-${message.kind}`}>
                <Text className='call-message-label'>{message.kind === 'sample' ? '预置台词 · 非 AI 回答' : '你的录音 · 仅本机'}</Text>
                <Text className='call-message-text'>{message.text}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>}

      <View className='call-controls'>
        {active ? (
          <View className='call-control-row'>
            <View className='call-control'>
              <Button ariaLabel={state.phase === 'muted' ? '开启麦克风' : '关闭麦克风'} className={`call-button call-mic ${state.phase === 'muted' ? 'call-mic-muted' : ''}`} disabled={!canMute} onClick={() => session.toggleMute()}>
                <View className='call-mic-icon'><View className='call-mic-capsule' /></View>
                {state.phase === 'muted' && <View className='call-mic-slash' />}
              </Button>
              <Text className='call-control-label'>{state.phase === 'muted' ? '麦克风已关' : '麦克风'}</Text>
            </View>
            <View className='call-control'>
              <Button ariaLabel='挂断' className='call-button call-hangup' onClick={() => session.end()}><View className='call-phone-icon' /></Button>
              <Text className='call-control-label'>挂断</Text>
            </View>
          </View>
        ) : (
          <View className='call-control'>
            <Button ariaLabel={state.phase === 'idle' ? '开始离线通话体验' : '重新开始体验'} className='call-button call-start' onClick={start}><View className='call-phone-icon' /></Button>
            <Text className='call-control-label'>{state.phase === 'idle' ? '开始体验' : '再聊一次'}</Text>
          </View>
        )}
      </View>

      {canReplay && state.recordings.length > 0 && (
        <View className='call-recordings'>
          <Text className='call-section-title'>听听自己的粤语</Text>
          <Text className='call-recording-help'>{canReplay ? '录音只在本页保留，退出或重新开始后删除。' : '关闭麦克风或挂断后，可回放本次录音。'}</Text>
          {state.recordings.map((clip, index) => (
            <Button key={clip.path} className='call-recording-button' disabled={!canReplay} onClick={() => void session.replay(clip.path)}>
              {state.replaying === clip.path ? '正在播放' : '▶ 回放'} · 第 {index + 1} 句 · {(clip.durationMs / 1000).toFixed(1)} 秒
            </Button>
          ))}
        </View>
      )}
      <View className='call-footnote'>
        <Text>仅本机录音 · 不上传 · 不调用付费服务</Text>
      </View>
    </View>
  )
}
