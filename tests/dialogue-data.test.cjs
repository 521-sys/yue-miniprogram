const assert = require('node:assert/strict')
const { test } = require('node:test')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(require('node:fs').readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, filename)
}

const { parseGeneratedDialogue } = require('../src/lib/dialogue-data.ts')

test('parses an AI generated dialogue and normalizes its line speakers', () => {
  const result = parseGeneratedDialogue(JSON.stringify({
    id: 'airport', emoji: '✈️', title: '机场值机', place: '机场',
    roles: ['旅客', '职员'],
    lines: [
      { speaker: 'A', yue: '唔該，我想辦理登機。', man: '你好，我想办理登机。' },
      { speaker: 'B', yue: '請出示護照。', man: '请出示护照。' }
    ]
  }))

  assert.equal(result.id, 'airport')
  assert.equal(result.lines.length, 2)
  assert.equal(result.lines[1].speaker, 'B')
})

test('rejects generated dialogue with missing bilingual lines', () => {
  assert.throws(
    () => parseGeneratedDialogue('{"id":"empty","title":"缺句子","place":"测试","roles":["A","B"],"lines":[]}'),
    /至少需要 2 句/
  )
})

test('repairs common AI aliases and infers alternating speakers', () => {
  const result = parseGeneratedDialogue('```json\n' + JSON.stringify({
    id: 'lunch', title: '约午饭', place: '办公室', roles: ['同事甲', '同事乙'],
    lines: [
      { cantonese: '食飯未呀？', mandarin: '吃饭了吗？' },
      { cantonese: '未呀，一齊食啦。', translation: '还没，一起吃吧。' }
    ]
  }) + '\n```')
  assert.equal(result.lines[0].speaker, 'A')
  assert.equal(result.lines[1].speaker, 'B')
  assert.equal(result.lines[1].man, '还没，一起吃吧。')
})
