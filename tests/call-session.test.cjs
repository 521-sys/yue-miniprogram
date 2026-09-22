const assert = require('node:assert/strict')
const { test } = require('node:test')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(require('node:fs').readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, filename)
}
const { CallSession } = require('../src/lib/call/session.ts')
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function fixture() {
  const permission = deferred()
  const recordings = [], plays = [], removed = []
  const media = {
    authorize: () => permission.promise,
    record(onStart) {
      const done = deferred()
      const handle = { done: done.promise, stop() { handle.stopped = true }, ...done }
      recordings.push(handle)
      onStart()
      return handle
    },
    play(src) {
      const done = deferred()
      const handle = { done: done.promise, stop() { handle.stopped = true; done.resolve() }, src, ...done }
      plays.push(handle)
      return handle
    },
    remove: (path) => removed.push(path)
  }
  const session = new CallSession(media, [{ text: '你好！幾多位？', src: '/a.mp3' }, { text: '飲咩嘢？', src: '/b.mp3' }])
  return { session, permission, recordings, plays, removed }
}
async function listening(f) {
  f.session.start()
  f.permission.resolve()
  await flush()
  f.plays[0].resolve()
  await flush()
  assert.equal(f.session.state.phase, 'listening')
}
test('permission completion after hangup cannot activate microphone or audio', async () => {
  const f = fixture()
  f.session.start()
  f.session.end()
  f.permission.resolve()
  await flush()
  assert.equal(f.session.state.phase, 'ended')
  assert.equal(f.recordings.length, 0)
  assert.equal(f.plays.length, 0)
})
test('permission denial reports an error without starting recording', async () => {
  const f = fixture()
  f.session.start()
  f.permission.reject(new Error('麦克风权限未开启'))
  await flush()
  assert.equal(f.session.state.phase, 'error')
  assert.match(f.session.state.error, /麦克风/)
  assert.equal(f.recordings.length, 0)
})
test('records real local clip, labels it untranscribed, advances preset playback', async () => {
  const f = fixture()
  await listening(f)
  f.session.finishTurn()
  assert.equal(f.recordings[0].stopped, true)
  f.recordings[0].resolve({ path: '/voice.mp3', durationMs: 2400 })
  await flush()
  assert.equal(f.session.state.phase, 'speaking')
  assert.equal(f.session.state.recordings[0].path, '/voice.mp3')
  assert.equal(f.session.state.messages[1].kind, 'recording')
  assert.match(f.session.state.messages[1].text, /未识别/)
  assert.equal(f.plays[1].src, '/b.mp3')
})
test('late recording after hangup is deleted and never triggers another reply', async () => {
  const f = fixture()
  await listening(f)
  f.session.end()
  f.recordings[0].resolve({ path: '/late.mp3', durationMs: 1000 })
  await flush()
  assert.ok(f.removed.includes('/late.mp3'))
  assert.equal(f.plays.length, 1)
  assert.equal(f.session.state.phase, 'ended')
})
test('mute discards in-flight recording and resume waits for recorder to stop', async () => {
  const f = fixture()
  await listening(f)
  f.session.toggleMute()
  assert.equal(f.session.state.phase, 'muted')
  f.session.toggleMute()
  await flush()
  assert.equal(f.recordings.length, 1)
  f.recordings[0].resolve({ path: '/muted.mp3', durationMs: 1000 })
  await flush()
  assert.ok(f.removed.includes('/muted.mp3'))
  assert.equal(f.recordings.length, 2)
  assert.equal(f.session.state.phase, 'listening')
})
test('interrupt stops preset playback and stale completion cannot open a second recorder', async () => {
  const f = fixture()
  f.session.start()
  f.permission.resolve()
  await flush()
  f.session.interrupt()
  await flush()
  assert.equal(f.plays[0].stopped, true)
  assert.equal(f.recordings.length, 1)
  assert.equal(f.session.state.phase, 'listening')
})
test('dispose deletes saved clips without starting playback again', async () => {
  const f = fixture()
  await listening(f)
  f.recordings[0].resolve({ path: '/saved.mp3', durationMs: 2000 })
  await flush()
  f.session.end()
  f.session.dispose()
  assert.ok(f.removed.includes('/saved.mp3'))
  assert.equal(f.session.state.recordings.length, 0)
  f.session.start()
  await flush()
  assert.equal(f.plays.length, 2)
})
test('three minute cap stops an active recording', async () => {
  const f = fixture()
  await listening(f)
  f.session.tick(Date.now() + 181000)
  assert.equal(f.session.state.phase, 'ended')
  assert.equal(f.recordings[0].stopped, true)
})
test('local playback failure is visible and does not silently record', async () => {
  const f = fixture()
  f.session.start()
  f.permission.resolve()
  await flush()
  f.plays[0].reject(new Error('音频无法播放'))
  await flush()
  assert.equal(f.session.state.phase, 'error')
  assert.match(f.session.state.error, /音频/)
  assert.equal(f.recordings.length, 0)
})
test('dispose while recording drains deletes the late file and cannot restart', async () => {
  const f = fixture()
  await listening(f)
  f.session.dispose()
  f.recordings[0].resolve({ path: '/late-disposed.mp3', durationMs: 1200 })
  await flush()
  assert.ok(f.removed.includes('/late-disposed.mp3'))
  assert.equal(f.plays.length, 1)
  assert.equal(f.session.state.recordings.length, 0)
})
test('restart waits for old recorder; stale result never becomes a new reply', async () => {
  const f = fixture()
  await listening(f)
  f.session.end()
  f.session.start()
  await flush()
  assert.equal(f.plays.length, 1)
  f.recordings[0].resolve({ path: '/old.mp3', durationMs: 1000 })
  await flush()
  assert.ok(f.removed.includes('/old.mp3'))
  assert.equal(f.plays.length, 2)
  f.plays[1].resolve()
  await flush()
  assert.equal(f.recordings.length, 2)
  assert.equal(f.session.state.recordings.length, 0)
})
test('replacing replay stops old playback, unmute stops replay before recording', async () => {
  const f = fixture()
  await listening(f)
  f.recordings[0].resolve({ path: '/saved.mp3', durationMs: 1000 })
  await flush()
  f.session.toggleMute()
  f.session.replay('/saved.mp3')
  await flush()
  const old = f.plays.at(-1)
  f.session.replay('/saved.mp3')
  await flush()
  assert.equal(old.stopped, true)
  const current = f.plays.at(-1)
  f.session.toggleMute()
  await flush()
  assert.equal(current.stopped, true)
  assert.equal(f.session.state.phase, 'listening')
  assert.equal(f.session.state.replaying, '')
})
