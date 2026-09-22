/* 生成音频清单 audio-manifest.ts（文本 -> mp3 文件名）。
 *
 * 默认（远程模式，推荐）：只生成「文本 -> 文件名」映射，运行时由
 *   src/lib/config.ts 的 AUDIO_BASE 拼 URL（默认后端 static/audio 托管），
 *   音频不打进小程序主包，避免超过主包 2MB 限制。
 *
 * 本地内置模式：node scripts/gen-audio-manifest.cjs --local
 *   生成 import 版，把 src/assets/audio 下的 mp3 打进包内（离线可用，但主包增大约 1.75MB）。
 *   使用前需先把 mp3 放到 src/assets/audio。
 */
const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, '../src')
const oldFile = path.resolve(__dirname, '../../yue-frontend/src/data/audio-manifest.ts')
const outFile = path.join(SRC, 'data/audio-manifest.ts')
const audioDir = path.join(SRC, 'assets/audio')
const LOCAL = process.argv.includes('--local')

const text = fs.readFileSync(oldFile, 'utf8')
const re = /"((?:[^"\\]|\\.)*)"\s*:\s*"\/audio\/([^"]+\.mp3)"/g
const entries = []
let m
while ((m = re.exec(text)) !== null) {
  entries.push({ key: m[1], file: m[2] })
}

let out
if (LOCAL) {
  let missing = 0
  for (const e of entries) {
    if (!fs.existsSync(path.join(audioDir, e.file))) {
      missing++
      console.warn('缺少音频文件:', e.file)
    }
  }
  const imports = entries
    .map((e) => `import ${e.file.replace(/\.mp3$/, '')} from '@/assets/audio/${e.file}'`)
    .join('\n')
  const maps = entries
    .map((e) => `  ${JSON.stringify(e.key)}: ${e.file.replace(/\.mp3$/, '')},`)
    .join('\n')
  out = `// 自动生成（--local 本地内置模式），共 ${entries.length} 条，缺失 ${missing} 个
${imports}

export const AUDIO_FILES: Record<string, string> = {
${maps}
}
`
} else {
  const maps = entries
    .map((e) => `  ${JSON.stringify(e.key)}: ${JSON.stringify(e.file)},`)
    .join('\n')
  out = `// 自动生成（远程模式，默认）：文本 -> mp3 文件名，共 ${entries.length} 条
// 运行时由 src/lib/config.ts 的 AUDIO_BASE 拼接访问地址（默认后端 static/audio 托管）
// 如需把音频内置进小程序包，运行：node scripts/gen-audio-manifest.cjs --local
export const AUDIO_FILES: Record<string, string> = {
${maps}
}
`
}

fs.writeFileSync(outFile, out, 'utf8')
console.log(`生成 ${path.relative(process.cwd(), outFile)}：${entries.length} 条，模式=${LOCAL ? 'local' : 'remote'}`)
