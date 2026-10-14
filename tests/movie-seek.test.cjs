const test = require('node:test')
const assert = require('node:assert/strict')
const { seekTimeFromClientX } = require('../src/pages/movie/seek-math')

test('拖动轨道中点定位到视频中点', () => {
  assert.equal(seekTimeFromClientX(160, 10, 300, 125), 62.5)
})

test('轨道边界外的触点限制在视频首尾', () => {
  assert.equal(seekTimeFromClientX(-20, 10, 300, 125), 0)
  assert.equal(seekTimeFromClientX(400, 10, 300, 125), 125)
})

test('时长或轨道宽度未知时不发起定位', () => {
  assert.equal(seekTimeFromClientX(160, 10, 300, 0), null)
  assert.equal(seekTimeFromClientX(160, 10, 0, 125), null)
})
