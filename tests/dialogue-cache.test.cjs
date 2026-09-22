const assert = require('node:assert/strict')
const { test } = require('node:test')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(require('node:fs').readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, filename)
}

const { readCustomDialogueEntries, toggleDialogueFavorite } = require('../src/lib/dialogue-data.ts')

const dialogue = { id: 'airport', emoji: '✈️', title: '机场', place: '机场', roles: ['旅客', '职员'], lines: [
  { speaker: 'A', yue: '你好', man: '你好' }, { speaker: 'B', yue: '你好呀', man: '你好呀' }
] }

test('removes non-favorited custom dialogues after their expiry time', () => {
  const raw = JSON.stringify([{ dialogue, favorite: false, expiresAt: 2000 }])
  assert.equal(readCustomDialogueEntries(raw, 2001).length, 0)
})

test('keeps favorited custom dialogues permanently even with an old expiry time', () => {
  const raw = JSON.stringify([{ dialogue, favorite: true, expiresAt: 2000 }])
  const entries = readCustomDialogueEntries(raw, 999999)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].favorite, true)
})

test('favorite toggle clears expiry time', () => {
  const raw = JSON.stringify([{ dialogue, favorite: false, expiresAt: 2000 }])
  const next = toggleDialogueFavorite(raw, 'airport', 1000)
  assert.equal(next[0].favorite, true)
  assert.equal(next[0].expiresAt, null)
})
