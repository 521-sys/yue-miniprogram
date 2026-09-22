const assert = require('node:assert/strict')
const { test } = require('node:test')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(require('node:fs').readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, filename)
}

const { AI_REQUEST_TIMEOUT_MS } = require('../src/lib/ai-config.ts')

test('AI generation waits longer than the backend 60 second upstream window', () => {
  assert.equal(AI_REQUEST_TIMEOUT_MS, 90000)
})
