const assert = require('node:assert/strict')
const { test } = require('node:test')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(require('node:fs').readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, filename)
}

const { speechMode } = require('../src/lib/speech-mode.ts')

test('logged-in users with no offline clip use AI TTS without login warning', () => {
  assert.equal(speechMode(false, true), 'ai')
})

test('logged-out users with no offline clip are prompted to log in', () => {
  assert.equal(speechMode(false, false), 'login')
})

test('offline clips always use local playback', () => {
  assert.equal(speechMode(true, false), 'offline')
})
