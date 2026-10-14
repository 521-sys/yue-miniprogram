import { useRef, useState } from 'react'
import { View, Text, Video, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { seekTimeFromClientX } from './seek-math'
import './index.scss'

export default function MoviePage() {
  const [recording, setRecording] = useState(false)
  const [recorded, setRecorded] = useState('')
  const [videoSrc, setVideoSrc] = useState('')
  const [importedVideo, setImportedVideo] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const draggingRef = useRef(false)
  const lastTouchEndRef = useRef(0)
  const trackRectRef = useRef<{ left: number; width: number } | null>(null)
  const pendingSeekRef = useRef<{ time: number; expiresAt: number } | null>(null)
  const manager = useRef(Taro.getRecorderManager())

  async function importVideo() {
    try {
      const result = await Taro.chooseMedia({
        count: 1,
        mediaType: ['video'],
        sourceType: ['album', 'camera'],
      })
      const selectedFile = result.tempFiles?.[0]
      const tempFilePath = selectedFile?.tempFilePath
      if (!tempFilePath) return
      setVideoSrc(tempFilePath)
      setImportedVideo(true)
      setCurrentTime(0)
      setDuration(Number(selectedFile?.duration) || 0)
      trackRectRef.current = null
      pendingSeekRef.current = null
    } catch {
      // 用户取消选择时保持当前视频不变。
    }
  }

  function record() {
    if (recording) { manager.current.stop(); return }
    manager.current.onStart(() => setRecording(true))
    manager.current.onStop((res) => { setRecording(false); setRecorded(res.tempFilePath) })
    manager.current.start({ duration: 60000, format: 'mp3' })
  }

  function measureTrack(callback: (left: number, width: number) => void) {
    const cached = trackRectRef.current
    if (cached) {
      callback(cached.left, cached.width)
      return
    }
    Taro.createSelectorQuery().select('#movie-seek-rail').boundingClientRect((rect: any) => {
      if (!rect || !rect.width) return
      trackRectRef.current = { left: rect.left, width: rect.width }
      callback(rect.left, rect.width)
    }).exec()
  }

  function positionFromTouch(clientX: number, commit: boolean) {
    measureTrack((left, width) => {
      const nextTime = seekTimeFromClientX(clientX, left, width, duration)
      if (nextTime === null || !videoSrc) return
      if (!commit && !draggingRef.current) return
      setCurrentTime(nextTime)
      if (commit) {
        pendingSeekRef.current = { time: nextTime, expiresAt: Date.now() + 1500 }
        Taro.createVideoContext('movie-video').seek(nextTime)
      }
    })
  }

  function touchStart(event: any) {
    const clientX = event.touches?.[0]?.clientX
    if (typeof clientX !== 'number') return
    draggingRef.current = true
    positionFromTouch(clientX, false)
  }

  function touchMove(event: any) {
    const clientX = event.touches?.[0]?.clientX
    if (draggingRef.current && typeof clientX === 'number') positionFromTouch(clientX, false)
  }

  function touchEnd(event: any) {
    const clientX = event.changedTouches?.[0]?.clientX
    draggingRef.current = false
    lastTouchEndRef.current = Date.now()
    if (typeof clientX === 'number') positionFromTouch(clientX, true)
  }

  function tapSeek(event: any) {
    if (Date.now() - lastTouchEndRef.current < 500) return
    const clientX = event.detail?.x
    if (typeof clientX === 'number') positionFromTouch(clientX, true)
  }

  function updateVideoTime(event: any) {
    const detail = event.detail || {}
    const reportedTime = Number(detail.currentTime) || 0
    const reportedDuration = Number(detail.duration) || 0
    if (reportedDuration > 0) setDuration(reportedDuration)
    if (draggingRef.current) return
    const pending = pendingSeekRef.current
    if (pending && Date.now() < pending.expiresAt && Math.abs(reportedTime - pending.time) > 1) return
    pendingSeekRef.current = null
    setCurrentTime(reportedTime)
  }

  function loadedVideoMetadata(event: any) {
    const reportedDuration = Number(event.detail?.duration)
    if (Number.isFinite(reportedDuration) && reportedDuration > 0) setDuration(reportedDuration)
  }

  function formatTime(seconds: number) {
    const safeSeconds = Math.floor(Math.max(0, seconds))
    return `${Math.floor(safeSeconds / 60).toString().padStart(2, '0')}:${(safeSeconds % 60).toString().padStart(2, '0')}`
  }

  return <View className='movie-page'>
    <Text className='movie-eyebrow'>导入片段 · 你来配音</Text>
    <Text className='movie-title'>电影模仿</Text>
    <Text className='movie-sub'>看画面猜情绪，用自己的声音完成台词。</Text>
    <View className='movie-video'>
      {videoSrc && <Video id='movie-video' src={videoSrc} initialTime={0} muted={!importedVideo} autoplay loop={false} controls showProgress enableProgressGesture onTimeUpdate={updateVideoTime} onLoadedMetaData={loadedVideoMetadata} className='movie-player' />}
      {!videoSrc && <View className='movie-empty'><Text>请先导入一个视频</Text></View>}
      {videoSrc && <View className='movie-muted'><Text>🎵 保留背景音</Text></View>}
    </View>
    <View className='movie-import-row'><Button className='movie-import' onClick={importVideo}>🎬 导入我的视频</Button><Text className='movie-import-hint'>{importedVideo ? '已导入，可直接开始配音' : '请选择已去掉台词、保留背景音的视频'}</Text></View>
    {videoSrc && <View className='movie-seek'>
      <View id='movie-seek-track' className='movie-seek-track' onTouchStart={touchStart} onTouchMove={touchMove} onTouchEnd={touchEnd} onTouchCancel={touchEnd} onClick={tapSeek}>
        <View id='movie-seek-rail' className='movie-seek-rail'>
          <View className='movie-seek-fill' style={{ width: `${duration > 0 ? Math.min(100, currentTime / duration * 100) : 0}%` }} />
          <View className='movie-seek-thumb' style={{ left: `${duration > 0 ? Math.min(100, currentTime / duration * 100) : 0}%` }} />
        </View>
      </View>
      <Text className='movie-seek-time'>{formatTime(currentTime)} / {formatTime(duration)}</Text>
    </View>}
    <Button className={`movie-record ${recording ? 'movie-recording' : ''}`} onClick={record}>{recording ? '停止配音' : '🎙 开始配音'}</Button>
    {recorded && <View className='movie-result'><Text className='movie-meta'>我的配音</Text><Button size='mini' onClick={() => Taro.playVoice({ filePath: recorded })}>▶ 回放录音</Button><Button size='mini' onClick={() => setRecorded('')}>重录</Button></View>}
    <Text className='movie-foot'>{importedVideo ? '背景音保留，专心听自己的配音' : '导入视频后即可开始配音'}</Text>
  </View>
}
