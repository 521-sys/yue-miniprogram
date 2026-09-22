import type { Dialogue, DialogueLine } from '../data/dialogues'

const SPEAKERS = new Set(['A', 'B'])

/** Parse and validate one dialogue returned by the AI scene generator. */
export function parseGeneratedDialogue(raw: string): Dialogue {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  let value: unknown
  try {
    value = JSON.parse(cleaned)
  } catch {
    throw new Error('AI 返回的内容不是有效 JSON')
  }

  if (!value || typeof value !== 'object') throw new Error('场景数据格式不正确')
  const root = value as Record<string, unknown>
  const data = root.dialogue && typeof root.dialogue === 'object' ? root.dialogue as Record<string, unknown> : root
  const id = typeof data.id === 'string' ? data.id.trim() : ''
  const title = typeof data.title === 'string' ? data.title.trim() : ''
  const place = typeof data.place === 'string' ? data.place.trim() : ''
  const emoji = typeof data.emoji === 'string' && data.emoji.trim() ? data.emoji.trim() : '💬'
  const roles = Array.isArray(data.roles) ? data.roles.filter((r): r is string => typeof r === 'string').map((r) => r.trim()) : []
  const lines = Array.isArray(data.lines) ? data.lines : []

  if (!id || !title || !place || roles.length !== 2) throw new Error('场景需要 id、标题、地点和两个角色')
  if (lines.length < 2) throw new Error('至少需要 2 句对话')

  const normalized: DialogueLine[] = lines.map((line, index) => {
    if (!line || typeof line !== 'object') throw new Error(`第 ${index + 1} 句格式不正确`)
    const item = line as Record<string, unknown>
    const rawSpeaker = typeof item.speaker === 'string' ? item.speaker : typeof item.role === 'string' ? item.role : ''
    const speaker = rawSpeaker.trim().toUpperCase() || (index % 2 === 0 ? 'A' : 'B')
    const yue = typeof item.yue === 'string' ? item.yue.trim()
      : typeof item.cantonese === 'string' ? item.cantonese.trim()
        : typeof item.cantoneseText === 'string' ? item.cantoneseText.trim() : ''
    const man = typeof item.man === 'string' ? item.man.trim()
      : typeof item.mandarin === 'string' ? item.mandarin.trim()
        : typeof item.translation === 'string' ? item.translation.trim() : ''
    if (!SPEAKERS.has(speaker) || !yue || !man) throw new Error(`第 ${index + 1} 句需要 speaker、粤语和普通话翻译`)
    return { speaker: speaker as 'A' | 'B', yue, man }
  })

  return { id, emoji, title, place, roles: [roles[0], roles[1]], lines: normalized }
}

export function dialoguePrompt(topic: string): string {
  return [
    '请生成一个适合粤语初学者的生活场景对话，只返回 JSON，不要 Markdown 代码围栏。',
    '格式：{"id":"英文短 id","emoji":"一个 emoji","title":"中文标题","place":"地点","roles":["角色A","角色B"],"lines":[{"speaker":"A","yue":"粤语","man":"普通话"}]}',
    '对话需要 8 到 12 句，A/B 交替，使用自然广州口语，每句都要有普通话翻译。',
    `场景主题：${topic.trim()}`
  ].join('\n')
}

export const CUSTOM_DIALOGUES_KEY = 'yueCustomDialoguesV1'

export interface CustomDialogueEntry {
  dialogue: Dialogue
  favorite: boolean
  expiresAt: number | null
  createdAt: number
}

export function readCustomDialogueEntries(raw: unknown, now = Date.now()): CustomDialogueEntry[] {
  try {
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(list)) return []
    return list.flatMap((item): CustomDialogueEntry[] => {
      try {
        const wrapped = item && typeof item === 'object' && 'dialogue' in item
        const dialogue = parseGeneratedDialogue(JSON.stringify(wrapped ? (item as { dialogue: unknown }).dialogue : item))
        const favorite = wrapped && (item as { favorite?: unknown }).favorite === true
        const expiresAt = wrapped && typeof (item as { expiresAt?: unknown }).expiresAt === 'number'
          ? (item as { expiresAt: number }).expiresAt : null
        if (!favorite && expiresAt !== null && expiresAt <= now) return []
        return [{ dialogue, favorite, expiresAt: favorite ? null : expiresAt, createdAt: wrapped && typeof (item as { createdAt?: unknown }).createdAt === 'number' ? (item as { createdAt: number }).createdAt : now }]
      } catch {
        return []
      }
    })
  } catch {
    return []
  }
}

export function toggleDialogueFavorite(raw: unknown, id: string, now = Date.now()): CustomDialogueEntry[] {
  const entries = readCustomDialogueEntries(raw, now)
  return entries.map((entry) => entry.dialogue.id === id
    ? { ...entry, favorite: !entry.favorite, expiresAt: entry.favorite ? now + 2 * 60 * 60 * 1000 : null }
    : entry)
}

export function readCustomDialogues(raw: unknown): Dialogue[] {
  return readCustomDialogueEntries(raw).map((entry) => entry.dialogue)
}
