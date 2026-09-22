import { useState } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { aiChat, isLoggedin } from '../../lib/api'
import { CUSTOM_DIALOGUES_KEY, dialoguePrompt, parseGeneratedDialogue, readCustomDialogueEntries } from '../../lib/dialogue-data'
import './index.scss'

function unwrapJson(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

function repairPrompt(raw: string): string {
  return [
    '请把下面 AI 返回的场景对话修复成严格 JSON。只返回 JSON，不要 Markdown，不要解释。',
    '每句 lines 必须包含 speaker（A 或 B）、yue（粤语原句）、man（普通话翻译）；如果 speaker 缺失请按 A、B 交替补齐。',
    '保留原有场景内容，缺少翻译时请根据粤语补上自然的普通话翻译。',
    '原始返回内容：',
    raw.slice(0, 12000)
  ].join('\n')
}

export default function DialogueGeneratePage() {
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function generate() {
    const value = topic.trim()
    if (!value || busy) return
    if (!isLoggedin()) {
      Taro.showToast({ title: '请先登录 AI 服务', icon: 'none' })
      return
    }
    setBusy(true)
    setStatus('AI 正在编写对话…')
    try {
      const result = await aiChat([{ role: 'user', content: dialoguePrompt(value) }], 0.7)
      const text = result.choices?.[0]?.message?.content ?? ''
      let dialogue
      try {
        dialogue = parseGeneratedDialogue(unwrapJson(text))
      } catch (formatError) {
        if (!text.trim()) throw formatError
        setStatus('AI 返回格式不完整，正在自动修复…')
        const repaired = await aiChat([{ role: 'user', content: repairPrompt(text) }], 0)
        const repairedText = repaired.choices?.[0]?.message?.content ?? ''
        dialogue = parseGeneratedDialogue(unwrapJson(repairedText))
      }
      const old = readCustomDialogueEntries(Taro.getStorageSync(CUSTOM_DIALOGUES_KEY))
      const entry = { dialogue, favorite: false, expiresAt: Date.now() + 2 * 60 * 60 * 1000, createdAt: Date.now() }
      const next = [entry, ...old.filter((item) => item.dialogue.id !== dialogue.id)].slice(0, 20)
      Taro.setStorageSync(CUSTOM_DIALOGUES_KEY, JSON.stringify(next))
      setStatus(`已生成「${dialogue.title}」，共 ${dialogue.lines.length} 句。`)
      setTimeout(() => Taro.redirectTo({ url: `/pages/dlgdetail/index?id=${dialogue.id}` }), 500)
    } catch (error) {
      const detail = error instanceof Error ? error.message : ''
      const message = /timeout|超时/i.test(detail)
        ? 'AI 响应较慢，请稍后重试（已等待 90 秒）'
        : detail || '生成失败，请稍后重试'
      setStatus(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View className='dlg-generate-page'>
      <Text className='dlg-generate-title'>生成一个你想练的场景</Text>
      <Text className='dlg-generate-tip'>例如“在诊所挂号”“和同事约午饭”“酒店入住”。生成内容只保存在你的设备上，不会直接发布给其他用户。</Text>
      <Textarea className='dlg-generate-input' value={topic} maxlength={80} placeholder='请输入你想练习的场景，例如：医院挂号' placeholderClass='dlg-generate-placeholder' onInput={(e) => setTopic(e.detail.value)} />
      <View className={`btn-gradient dlg-generate-submit tap ${busy ? 'disabled' : ''}`} onClick={generate}>
        <Text>{busy ? '生成中…' : '✨ 生成场景对话'}</Text>
      </View>
      {!!status && <Text className='dlg-generate-status'>{status}</Text>}
    </View>
  )
}
