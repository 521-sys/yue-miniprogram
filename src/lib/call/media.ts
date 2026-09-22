import type Taro from '@tarojs/taro'
import type { CallMedia, MediaTask, Recording } from './session'

interface RecorderCallbacks {
  start(): void
  stop: Taro.RecorderManager.OnStopCallback
  error(): void
  interrupt(): void
}
// WeChat exposes no recorder off* APIs. Register once, route only to the owner.
const recorders = new WeakMap<Taro.RecorderManager, { current?: RecorderCallbacks }>()
function recorderBridge(rm: Taro.RecorderManager) {
  let bridge = recorders.get(rm)
  if (bridge) return bridge
  bridge = {}
  recorders.set(rm, bridge)
  const owner = bridge
  rm.onStart(() => owner.current?.start())
  rm.onStop((result) => {
    const current = owner.current
    owner.current = undefined
    current?.stop(result)
  })
  rm.onError(() => {
    const current = owner.current
    owner.current = undefined
    current?.error()
  })
  rm.onInterruptionBegin(() => owner.current?.interrupt())
  return owner
}

/** Local-only adapter: deliberately has no request/upload/AI capability. */
export function createCallMedia(platform: typeof Taro): CallMedia {
  const remove = (path: string) => {
    if (!path) return
    try { platform.getFileSystemManager().unlinkSync(path) } catch { /* already cleaned by WeChat */ }
  }
  return {
    async authorize() {
      try { await platform.authorize({ scope: 'scope.record' }) }
      catch { throw new Error('麦克风权限未开启，请在右上角菜单的设置中允许录音，再重试。') }
    },
    remove,
    record(onStarted): MediaTask<Recording> {
      const rm = platform.getRecorderManager()
      const bridge = recorderBridge(rm)
      if (bridge.current) throw new Error('上一段录音仍在停止，请稍后再试。')
      let started = false
      let stopRequested = false
      let settled = false
      let interruption: Error | undefined
      let resolve!: (clip: Recording) => void
      let reject!: (error: Error) => void
      let stopTimer: ReturnType<typeof setTimeout> | undefined
      const done = new Promise<Recording>((yes, no) => { resolve = yes; reject = no })
      const cleanup = () => {
        clearTimeout(startTimer)
        clearTimeout(endTimer)
        if (stopTimer) clearTimeout(stopTimer)
      }
      const fail = (error: Error) => {
        if (settled) return
        settled = true
        cleanup()
        reject(error)
      }
      const stop = () => {
        if (settled || stopRequested) return
        stopRequested = true
        stopTimer = setTimeout(() => {
          try { rm.stop() } catch { /* stop best effort on device failure */ }
          fail(new Error('录音停止超时，请退出页面后重试。'))
        }, 5000)
        if (started) rm.stop()
      }
      const onStart = () => {
        started = true
        clearTimeout(startTimer)
        if (stopRequested || settled) rm.stop()
        else onStarted()
      }
      const onStop: Taro.RecorderManager.OnStopCallback = (result) => {
        if (settled) { remove(result.tempFilePath); return }
        settled = true
        cleanup()
        if (interruption) { remove(result.tempFilePath); reject(interruption) }
        else resolve({ path: result.tempFilePath, durationMs: result.duration })
      }
      const onError = () => fail(new Error('录音失败，请检查麦克风权限，并关闭其他占用麦克风的通话。'))
      const onInterrupt = () => {
        interruption = new Error('录音被系统通话中断，请挂断后重新开始。')
        stop()
      }
      const startTimer = setTimeout(() => {
        try { rm.stop() } catch { /* device failure */ }
        fail(new Error('麦克风启动超时，请在微信真机上重试。'))
      }, 8000)
      const endTimer = setTimeout(stop, 16000)
      bridge.current = { start: onStart, stop: onStop, error: onError, interrupt: onInterrupt }
      try {
        rm.start({ duration: 15000, sampleRate: 16000, numberOfChannels: 1, encodeBitRate: 48000, format: 'mp3' })
      } catch { bridge.current = undefined; onError() }
      return { done, stop }
    },
    play(src): MediaTask<void> {
      const audio = platform.createInnerAudioContext()
      let settled = false
      let resolve!: () => void
      let reject!: (error: Error) => void
      const done = new Promise<void>((yes, no) => { resolve = yes; reject = no })
      const finish = (error?: Error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        try { audio.stop() } catch { /* already stopped */ }
        try { audio.destroy() } catch { /* already destroyed */ }
        if (error) reject(error)
        else resolve()
      }
      const timer = setTimeout(() => finish(new Error('音频播放超时，请检查设备声音设置后重试。')), 25000)
      audio.onEnded(() => finish())
      audio.onError(() => finish(new Error('音频播放失败，请重新进入页面；本地示例无需联网。')))
      try {
        audio.src = src
        audio.obeyMuteSwitch = false
        audio.play()
      } catch { finish(new Error('设备无法播放音频，请在微信真机上重试。')) }
      return { done, stop: () => finish() }
    }
  }
}
