const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const pageSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'pages', 'movie', 'index.tsx'),
  'utf8',
)

test('电影模仿页面支持选择本地视频并更新播放器地址', () => {
  assert.match(pageSource, /chooseMedia\(\{[^}]*mediaType:\s*\['video'\]/s)
  assert.match(pageSource, /setVideoSrc\(.*tempFilePath/s)
})

test('电影模仿页面不再显示预设分段和固定台词', () => {
  assert.doesNotMatch(pageSource, /movie-tabs/)
  assert.doesNotMatch(pageSource, /movie-card/)
  assert.doesNotMatch(pageSource, /const LINES/)
})

test('电影播放器不循环并保留可定位的原生控件', () => {
  assert.match(pageSource, /id=['"]movie-video['"]/) 
  assert.match(pageSource, /initialTime=\{0\}/)
  assert.match(pageSource, /loop=\{false\}/)
  assert.match(pageSource, /showProgress/)
  assert.match(pageSource, /enableProgressGesture/)
})

test('没有导入视频时不请求失效的远程示例视频', () => {
  assert.doesNotMatch(pageSource, /commons\.wikimedia\.org/)
  assert.doesNotMatch(pageSource, /const VIDEO/)
  assert.match(pageSource, /videoSrc\s*&&\s*<Video/)
})

test('电影页面使用自定义进度条实时定位视频', () => {
  assert.match(pageSource, /Slider/)
  assert.match(pageSource, /onTimeUpdate/)
  assert.match(pageSource, /onChanging/)
  assert.match(pageSource, /seeking/)
  assert.match(pageSource, /createVideoContext\(['"]movie-video['"]\)/)
  assert.match(pageSource, /\.seek\(/)
  assert.match(pageSource, /className=['"]movie-slider['"]/)
})
