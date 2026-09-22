import { useRef, useState } from 'react'
import { View, Text, Video, Button, Slider } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function MoviePage() {
  const [recording, setRecording] = useState(false)
  const [recorded, setRecorded] = useState('')
  const [videoSrc, setVideoSrc] = useState('')
  const [importedVideo, setImportedVideo] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [seeking, setSeeking] = useState(false)
  const manager = useRef(Taro.getRecorderManager())

  async function importVideo() {
    try {
      const result = await Taro.chooseMedia({
        count: 1,
        mediaType: ['video'],
        sourceType: ['album', 'camera'],
      })
      const tempFilePath = result.tempFiles?.[0]?.tempFilePath
      if (!tempFilePath) return
      setVideoSrc(tempFilePath)
      setImportedVideo(true)
      setCurrentTime(0)
      setDuration(0)
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

  function seekVideo(event: any) {
    const nextTime = Number(event.detail.value)
    if (!videoSrc || !Number.isFinite(nextTime)) return
    Taro.createVideoContext('movie-video').seek(nextTime)
    setCurrentTime(nextTime)
    setSeeking(false)
  }

  function previewSeek(event: any) {
    const nextTime = Number(event.detail.value)
    if (!Number.isFinite(nextTime)) return
    setSeeking(true)
    setCurrentTime(nextTime)
  }

  function updateVideoTime(event: any) {
    const detail = event.detail || {}
    if (!seeking) setCurrentTime(Number(detail.currentTime) || 0)
    setDuration(Number(detail.duration) || 0)
  }

  return <View className='movie-page'>
    <Text className='movie-eyebrow'>导入片段 · 你来配音</Text>
    <Text className='movie-title'>电影模仿</Text>
    <Text className='movie-sub'>看画面猜情绪，用自己的声音完成台词。</Text>
    <View className='movie-video'>
      {videoSrc && <Video id='movie-video' src={videoSrc} initialTime={0} muted={!importedVideo} autoplay loop={false} controls showProgress enableProgressGesture onTimeUpdate={updateVideoTime} className='movie-player' />}
      {!videoSrc && <View className='movie-empty'><Text>请先导入一个视频</Text></View>}
      {videoSrc && <View className='movie-muted'><Text>🎵 保留背景音</Text></View>}
    </View>
    <View className='movie-import-row'><Button className='movie-import' onClick={importVideo}>🎬 导入我的视频</Button><Text className='movie-import-hint'>{importedVideo ? '已导入，可直接开始配音' : '请选择已去掉台词、保留背景音的视频'}</Text></View>
    {videoSrc && <View className='movie-seek'><Slider className='movie-slider' value={currentTime} min={0} max={Math.max(duration, 1)} step={0.1} showValue={false} onChanging={previewSeek} onChange={seekVideo} activeColor='#335eea' /><Text className='movie-seek-time'>{Math.floor(currentTime)}s / {Math.floor(duration)}s</Text></View>}
    <Button className={`movie-record ${recording ? 'movie-recording' : ''}`} onClick={record}>{recording ? '停止配音' : '🎙 开始配音'}</Button>
    {recorded && <View className='movie-result'><Text className='movie-meta'>我的配音</Text><Button size='mini' onClick={() => Taro.playVoice({ filePath: recorded })}>▶ 回放录音</Button><Button size='mini' onClick={() => setRecorded('')}>重录</Button></View>}
    <Text className='movie-foot'>{importedVideo ? '背景音保留，专心听自己的配音' : '导入视频后即可开始配音'}</Text>
  </View>
}
