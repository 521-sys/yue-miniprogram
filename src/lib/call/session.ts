/** Offline call state machine. No network or AI client is imported here. */
export interface Recording { path: string; durationMs: number }
export interface Sample { text: string; src: string }
export interface MediaTask<T> { done: Promise<T>; stop(): void }
export interface CallMedia {
  authorize(): Promise<void>
  record(onStart: () => void): MediaTask<Recording>
  play(src: string): MediaTask<void>
  remove(path: string): void
}
export type Phase = 'idle' | 'requesting' | 'starting' | 'listening' | 'processing' | 'speaking' | 'muted' | 'ended' | 'error'
export interface CallMessage { kind: 'sample' | 'recording'; text: string }
export interface CallState {
  phase: Phase
  messages: CallMessage[]
  recordings: Recording[]
  elapsed: number
  error: string
  note: string
  replaying: string
}

export class CallSession {
  state: CallState = { phase: 'idle', messages: [], recordings: [], elapsed: 0, error: '', note: '', replaying: '' }
  private listeners = new Set<(state: CallState) => void>()
  private revision = 0
  private disposed = false
  private recording?: MediaTask<Recording>
  private playback?: MediaTask<void>
  private draining: Promise<unknown> = Promise.resolve()
  private startedAt = 0
  private sampleIndex = 0

  constructor(private media: CallMedia, private samples: Sample[]) {}

  subscribe(listener: (state: CallState) => void) {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private update(patch: Partial<CallState>) {
    this.state = { ...this.state, ...patch }
    if (!this.disposed) this.listeners.forEach((listener) => listener(this.state))
  }

  private current(revision: number) { return !this.disposed && revision === this.revision }

  private cancel() {
    ++this.revision
    this.playback?.stop()
    this.playback = undefined
    if (this.recording) {
      const task = this.recording
      this.draining = task.done.catch(() => undefined)
      task.stop()
      this.recording = undefined
    }
    this.update({ replaying: '' })
  }

  async start() {
    if (this.disposed || !['idle', 'ended', 'error'].includes(this.state.phase)) return
    this.cancel()
    this.clearRecordings()
    const rev = this.revision
    this.sampleIndex = 0
    this.update({ phase: 'requesting', messages: [], error: '', note: '', elapsed: 0 })
    try {
      await this.draining
      if (!this.current(rev)) return
      await this.media.authorize()
      if (!this.current(rev)) return
      this.startedAt = Date.now()
      await this.speakSample(rev)
    } catch (error) { this.fail(error, rev) }
  }

  private async speakSample(rev: number) {
    if (!this.current(rev)) return
    const sample = this.samples[this.sampleIndex]
    if (!sample) { this.end('预置台词体验完成，可回放自己的录音。'); return }
    this.update({ phase: 'speaking', messages: [...this.state.messages, { kind: 'sample', text: sample.text }] })
    this.playback = this.media.play(sample.src)
    await this.playback.done
    if (!this.current(rev)) return
    this.playback = undefined
    if (this.sampleIndex === this.samples.length - 1) {
      this.end('预置台词体验完成，可回放自己的录音。')
      return
    }
    await this.listen(rev)
  }

  private async listen(rev: number) {
    try {
      await this.draining
      if (!this.current(rev)) return
      this.update({ phase: 'starting' })
      const task = this.media.record(() => {
        if (this.current(rev)) this.update({ phase: 'listening' })
      })
      this.recording = task
      const clip = await task.done
      if (!this.current(rev)) { this.media.remove(clip.path); return }
      this.recording = undefined
      if (clip.durationMs < 400) {
        this.media.remove(clip.path)
        this.update({ phase: 'muted', note: '录音太短，请开启麦克风后再试一次。' })
        return
      }
      this.update({
        phase: 'processing',
        recordings: [...this.state.recordings, clip],
        messages: [...this.state.messages, { kind: 'recording', text: `本地录音 ${(clip.durationMs / 1000).toFixed(1)} 秒 · 未识别内容` }]
      })
      ++this.sampleIndex
      await this.speakSample(rev)
    } catch (error) { this.fail(error, rev) }
  }

  finishTurn() {
    if (this.state.phase !== 'listening') return
    this.update({ phase: 'processing' })
    this.recording?.stop()
  }

  toggleMute() {
    if (this.state.phase === 'muted') {
      this.cancel()
      this.update({ phase: 'starting', note: '' })
      void this.listen(this.revision)
    } else if (['listening', 'speaking', 'starting', 'processing'].includes(this.state.phase)) {
      this.cancel()
      this.update({ phase: 'muted', note: '麦克风已关闭，本轮未完成的录音已丢弃。' })
    }
  }

  interrupt() {
    if (this.state.phase !== 'speaking') return
    this.cancel()
    this.update({ phase: 'starting' })
    void this.listen(this.revision)
  }

  end(note = '已挂断，麦克风与播放已停止。') {
    this.cancel()
    this.update({ phase: 'ended', note })
  }

  tick(now = Date.now()) {
    if (!['starting', 'listening', 'speaking', 'processing', 'muted'].includes(this.state.phase)) return
    const elapsed = Math.max(0, Math.floor((now - this.startedAt) / 1000))
    this.update({ elapsed })
    if (elapsed >= 180) this.end('已达到本次 3 分钟体验上限。')
  }

  async replay(path: string) {
    if (!['ended', 'muted'].includes(this.state.phase) || !this.state.recordings.some((clip) => clip.path === path)) return
    this.cancel()
    const rev = this.revision
    this.update({ replaying: path, error: '' })
    try {
      await this.draining
      if (!this.current(rev)) return
      this.playback = this.media.play(path)
      await this.playback.done
      if (this.current(rev)) { this.playback = undefined; this.update({ replaying: '' }) }
    } catch (error) {
      if (this.current(rev)) this.update({ replaying: '', error: error instanceof Error ? error.message : '录音回放失败' })
    }
  }

  private fail(error: unknown, rev: number) {
    if (!this.current(rev)) return
    this.cancel()
    this.update({ phase: 'error', error: error instanceof Error ? error.message : '设备音频不可用，请稍后重试。' })
  }

  private clearRecordings() {
    this.state.recordings.forEach((clip) => this.media.remove(clip.path))
    this.update({ recordings: [] })
  }

  dispose() {
    this.end()
    this.clearRecordings()
    this.disposed = true
    this.listeners.clear()
  }
}
