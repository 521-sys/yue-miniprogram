const assert = require('node:assert/strict')
const { test } = require('node:test')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(require('node:fs').readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, filename)
}
const { createCallMedia } = require('../src/lib/call/media.ts')
function fixture() {
  const events = {}, removed = [], registrations = {}
  const recorder = { start(o) { recorder.options = o }, stop() { recorder.stops++ }, stops: 0 }
  for (const event of ['Start', 'Stop', 'Error', 'InterruptionBegin']) {
    recorder['on' + event] = (fn) => { events[event] = fn; registrations[event] = (registrations[event] || 0) + 1 }
  }
  const audioEvents = {}
  const audio = {
    play() {}, stop() { audio.stopped = true }, destroy() { audio.destroyed = true },
    onEnded(fn) { audioEvents.end = fn }, onError(fn) { audioEvents.error = fn }
  }
  const platform = {
    authorize: async () => {},
    getRecorderManager: () => recorder,
    createInnerAudioContext: () => audio,
    getFileSystemManager: () => ({ unlinkSync: (path) => removed.push(path) })
  }
  return { media: createCallMedia(platform), events, audioEvents, recorder, audio, removed, registrations }
}
test('stop requested during microphone startup stops onStart instead of opening the mic UI', async () => {
  const f = fixture()
  let started = false
  const task = f.media.record(() => { started = true })
  task.stop()
  f.events.Start()
  assert.equal(started, false)
  assert.equal(f.recorder.stops, 1)
  f.events.Stop({ tempFilePath: '/voice.mp3', duration: 850 })
  assert.deepEqual(await task.done, { path: '/voice.mp3', durationMs: 850 })
  assert.equal(f.registrations.Stop, 1)
})
test('recorder without off APIs routes new takes without registering duplicate callbacks', async () => {
  const f = fixture()
  const first = f.media.record(() => {})
  f.events.Start()
  f.events.Stop({ tempFilePath: '/one.mp3', duration: 1000 })
  await first.done
  let started = 0
  const second = f.media.record(() => { started++ })
  f.events.Start()
  assert.equal(started, 1)
  f.events.Stop({ tempFilePath: '/two.mp3', duration: 2000 })
  assert.equal((await second.done).path, '/two.mp3')
  assert.deepEqual(f.registrations, { Start: 1, Stop: 1, Error: 1, InterruptionBegin: 1 })
})
test('system interruption stops recorder and rejects with actionable error', async () => {
  const f = fixture()
  const task = f.media.record(() => {})
  const rejected = assert.rejects(task.done, /中断/)
  f.events.Start()
  f.events.InterruptionBegin()
  assert.equal(f.recorder.stops, 1)
  f.events.Stop({ tempFilePath: '/interrupted.mp3', duration: 1000 })
  await rejected
  assert.ok(f.removed.includes('/interrupted.mp3'))
})
test('playback cancellation resolves the task and destroys audio resources', async () => {
  const f = fixture()
  const task = f.media.play('/local.mp3')
  task.stop()
  await task.done
  assert.equal(f.audio.stopped, true)
  assert.equal(f.audio.destroyed, true)
  f.audioEvents.end()
})
test('playback errors are surfaced instead of leaving a permanently speaking session', async () => {
  const f = fixture()
  const task = f.media.play('/local.mp3')
  const rejected = assert.rejects(task.done, /播放/)
  f.audioEvents.error({ errMsg: 'invalid file' })
  await rejected
  assert.equal(f.audio.destroyed, true)
})
test('timed-out microphone startup stops late start and cleans late file before reuse', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const f = fixture()
  let started = false
  const task = f.media.record(() => { started = true })
  const rejected = assert.rejects(task.done, /启动超时/)
  t.mock.timers.tick(8001)
  await rejected
  assert.throws(() => f.media.record(() => {}), /上一段录音/)
  f.events.Start()
  assert.equal(started, false)
  assert.equal(f.recorder.stops, 2)
  f.events.Stop({ tempFilePath: '/late.mp3', duration: 100 })
  assert.ok(f.removed.includes('/late.mp3'))
  const next = f.media.record(() => {})
  f.events.Start()
  f.events.Stop({ tempFilePath: '/next.mp3', duration: 1000 })
  await next.done
})
