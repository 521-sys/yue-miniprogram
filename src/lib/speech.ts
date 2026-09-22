import Taro from '@tarojs/taro'
import { AUDIO_FILES } from '../data/audio-manifest'
import { AUDIO_BASE } from './config'
import { ttsCantoneseFile, getToken } from './api'
import { speechMode } from './speech-mode'

/* ==================== 语音服务（Taro 小程序版） ====================
 * 优先播放预生成的离线粤语真人发音（微软晓佳 zh-HK-HiuGaaiNeural），
 * 音频默认由后端 static/audio 托管（见 config.ts 的 AUDIO_BASE）；
 * AI 动态长文本在登录时回退到服务端粤语 TTS。
 * 小程序没有浏览器 Web Speech API，因此不做本地语音合成兜底。
 * ================================================================== */

let curAudio: Taro.InnerAudioContext | null = null
let lastTmpFile = ''

/** 文本 -> 可播放音频地址（命中离线词库则返回 URL，否则空串） */
function audioUrl(text: string): string {
  const file = AUDIO_FILES[text]
  return file ? `${AUDIO_BASE}/${file}` : ''
}

function destroyAudio() {
  if (curAudio) {
    try {
      curAudio.stop()
      curAudio.destroy()
    } catch {
      /* ignore */
    }
    curAudio = null
  }
}

function cleanupTmp() {
  if (lastTmpFile) {
    try {
      Taro.getFileSystemManager().unlinkSync(lastTmpFile)
    } catch {
      /* ignore */
    }
    lastTmpFile = ''
  }
}

/** 播放音频（远程 URL 或本地临时文件路径） */
function playSrc(src: string, rate: number) {
  destroyAudio()
  try {
    const a = Taro.createInnerAudioContext()
    a.src = src
    // playbackRate 需要基础库 >= 2.11.0，不支持时自动忽略异常
    try {
      a.playbackRate = rate
    } catch {
      /* ignore */
    }
    a.onError((err) => {
      console.warn('音频播放失败：', src, err)
      Taro.showToast({ title: '语音播放失败，请检查网络和合法域名', icon: 'none', duration: 2200 })
    })
    curAudio = a
    a.play()
  } catch (e) {
    console.warn('播放异常：', e)
  }
}

/** 是否有离线粤语音频 */
export function hasAudio(text: string): boolean {
  return !!AUDIO_FILES[text]
}

/** 朗读文本：命中离线音频则播放，返回是否命中 */
export function speak(text: string, rate = 1): boolean {
  const url = audioUrl(text)
  if (url) {
    playSrc(url, rate)
    return true
  }
  // 离线包未收录时交给调用方决定是否使用 AI TTS，避免先弹出误导性的登录提示。
  return false
}

/** AI 回复朗读：离线音频 → 服务端粤语 TTS（需登录） */
export async function speakAiReply(text: string, rate = 1): Promise<void> {
  const url = audioUrl(text)
  if (url) {
    playSrc(url, rate)
    return
  }
  if (speechMode(false, !!getToken()) === 'ai') {
    try {
      cleanupTmp()
      const filePath = await ttsCantoneseFile(text)
      lastTmpFile = filePath
      playSrc(filePath, rate)
      return
    } catch {
      Taro.showToast({ title: 'AI语音生成失败，请检查网络或后端', icon: 'none', duration: 2200 })
    }
  } else {
    Taro.showToast({ title: '这句暂无离线发音，请登录后使用 AI 语音', icon: 'none', duration: 1800 })
  }
}

/** 停止当前播放 */
export function stopSpeak() {
  destroyAudio()
  cleanupTmp()
}
