import { useEffect, useRef, useState } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { speakAiReply, stopSpeak } from '../../lib/speech'
import { aiChat, isLoggedin, onAuthChanged } from '../../lib/api'
import '../../components/AiSheets.scss'
import './index.scss'

/* ============================ AI语音（粤语 AI 助手） ============================ */

interface AiCfg {
  baseUrl: string
  apiKey: string
  model: string
}

const CFG_KEY = 'yueAiChatCfgV1'
const DEFAULT_CFG: AiCfg = {
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat'
}

function loadCfg(): AiCfg {
  try {
    const raw = Taro.getStorageSync(CFG_KEY)
    if (raw) return { ...DEFAULT_CFG, ...(typeof raw === 'string' ? JSON.parse(raw) : raw) }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_CFG }
}

interface ChatMsg {
  role: 'user' | 'ai'
  yue: string
  man?: string
}

const WELCOME: ChatMsg = {
  role: 'ai',
  yue: '哈佬！我係你嘅粤语AI老师～用粤语或者普通话同我倾偈，讲错唔紧要，我会教你点讲。',
  man: '你好！我是你的粤语AI老师～用粤语或普通话跟我聊天，说错没关系，我会教你怎么说。'
}

const SYS_PROMPT = [
  '你是一位亲切耐心的粤语老师，正在和一位普通话母语的初学者用粤语聊天练习。',
  '规则：每次回复先用简短自然的广州话口语说 1~2 句，然后另起一行用「普通话：」给出翻译。',
  '如果对方说了不地道的粤语，温和地示范正确说法；多围绕问候、饮食、购物、交通等日常场景引导对方开口。',
  '严格按以下格式回复，不要输出其他内容：',
  '粤语：……',
  '普通话：……'
].join('\n')

const FALLBACKS: { k: RegExp; yue: string; man: string }[] = [
  { k: /你好|哈佬|hello|hi/i, yue: '你好呀！今日过得点呀？想学啲乜嘢粤语？', man: '你好呀！今天过得怎么样？想学点什么粤语？' },
  { k: /多谢|唔该|thank/i, yue: '唔使客气！「多谢」用嚟谢人送嘢，「唔该」用嚟请人帮忙，好易分㗎。', man: '不客气！「多谢」用于谢人送东西，「唔该」用于请人帮忙，很好区分。' },
  { k: /食|饮|饿|饭|茶|餐/i, yue: '讲起食嘢，「唔该，一杯冻柠茶」呢句喺茶餐厅好常用，同我读一次啦！', man: '说起吃的，「麻烦来一杯冻柠茶」这句在茶餐厅很常用，跟我读一次吧！' },
  { k: /几多|几钱|价钱|平|贵/i, yue: '问价可以说「呢个几多钱？」，讲价就说「平啲啦！」，好实用㗎。', man: '问价可以说「这个多少钱？」，讲价就说「便宜点吧！」，很实用的。' },
  { k: /再见|拜拜|走/i, yue: '得闲饮茶！下次再同你练习啦～', man: '有空来喝茶！下次再跟你练习吧～' }
]

const LOCAL_GENERIC: ChatMsg[] = [
  { role: 'ai', yue: '好呀！你可以问我「呢句粤语点讲？」，或者介绍下你今日做咗乜嘢～', man: '好呀！你可以问我「这句粤语怎么说？」，或者介绍下你今天做了什么～' },
  { role: 'ai', yue: '唔使急，慢慢讲。讲错咗我会教你正确讲法㗎！试下同我打个招呼啦～', man: '不用急，慢慢说。说错了我也会教你正确说法！试着跟我打个招呼吧～' },
  { role: 'ai', yue: '想学食嘢嘅粤语？「食飯未呀？」即系「吃饭了吗？」，好常用㗎！', man: '想学吃的粤语？「食饭未呀？」就是「吃饭了吗？」，很常用哦！' },
  { role: 'ai', yue: '问路可以用「唔该，XX 点去呀？」例如「唔该，地铁站点去呀？」', man: '问路可以用「劳驾，XX 怎么去？」比如「请问地铁站怎么走？」' }
]

const lastGeneric = { i: -1 }
function localReply(text: string): ChatMsg {
  const hit = FALLBACKS.find((f) => f.k.test(text))
  if (hit) return { role: 'ai', yue: hit.yue, man: hit.man }
  let i = Math.floor(Math.random() * LOCAL_GENERIC.length)
  if (LOCAL_GENERIC.length > 1 && i === lastGeneric.i) i = (i + 1) % LOCAL_GENERIC.length
  lastGeneric.i = i
  return LOCAL_GENERIC[i]
}

function parseReply(text: string): ChatMsg {
  const yueM = text.match(/粤语[:：]\s*([\s\S]*?)(?=\n\s*普通话[:：]|$)/)
  const manM = text.match(/普通话[:：]\s*([\s\S]*?)(?=\n\s*粤语[:：]|$)/)
  if (yueM) return { role: 'ai', yue: yueM[1].trim(), man: manM ? manM[1].trim() : undefined }
  return { role: 'ai', yue: text.trim() }
}

export default function AiPage() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([WELCOME])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showCfg, setShowCfg] = useState(false)
  const [cfg, setCfg] = useState<AiCfg>(loadCfg)
  const [authed, setAuthed] = useState(isLoggedin())
  const scrollTopRef = useRef(0)
  const hasKey = cfg.apiKey.trim().length > 0

  // 订阅登录态变化 + 离开页面停止朗读
  useEffect(() => onAuthChanged(() => setAuthed(isLoggedin())), [])
  useEffect(() => () => stopSpeak(), [])

  function handleClose() {
    stopSpeak()
    Taro.navigateBack()
  }

  async function callAi(history: ChatMsg[]): Promise<ChatMsg> {
    const messages = [
      { role: 'system', content: SYS_PROMPT },
      ...history.slice(-12).map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.man ? `粤语：${m.yue}\n普通话：${m.man}` : m.yue
      }))
    ]
    let text = ''
    if (hasKey) {
      const res = await Taro.request({
        url: cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions',
        method: 'POST',
        timeout: 30000,
        data: { model: cfg.model, messages, temperature: 0.7 },
        header: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey.trim()}`
        }
      })
      if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}`)
      text = res.data?.choices?.[0]?.message?.content ?? ''
    } else {
      const data = await aiChat(messages)
      text = data.choices?.[0]?.message?.content ?? ''
    }
    if (!text.trim()) throw new Error('empty reply')
    return parseReply(text)
  }

  async function send(raw?: string) {
    const text = (raw ?? input).trim()
    if (!text || sending) return
    setInput('')
    const history: ChatMsg[] = [...msgs, { role: 'user', yue: text }]
    setMsgs(history)
    setSending(true)
    scrollTopRef.current += 400
    try {
      const reply = hasKey || authed ? await callAi(history) : localReply(text)
      setMsgs((prev) => [...prev, reply])
      scrollTopRef.current += 400
      setTimeout(() => speakAiReply(reply.yue), 200)
    } catch (e) {
      const detail = e instanceof Error && e.message ? e.message : ''
      setMsgs((prev) => [
        ...prev,
        {
          role: 'ai',
          yue: '唔好意思，我暫時聯絡唔上大腦，你遲啲再試下啦～',
          man: detail ? `AI 调用失败：${detail}` : 'AI 调用失败，请检查网络或设置里的接口配置。'
        }
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <View className='ai-page'>
      <View className='ai-topbar'>
        {hasKey ? (
          <Text className='t-muted t-xs'>直连 AI · {cfg.model}</Text>
        ) : authed ? (
          <Text className='t-muted t-xs'>已连接 AI 老师（服务端）</Text>
        ) : (
          <Text className='t-muted t-xs'>本地练习模式（登录后解锁 AI 老师）</Text>
        )}
        <View className='flex gap-2'>
          <View
            className='ai-icon-btn tap'
            onClick={() => {
              stopSpeak()
              setMsgs([WELCOME])
            }}
          >
            <Text>🗑</Text>
          </View>
          <View className='ai-icon-btn tap' onClick={() => setShowCfg((v) => !v)}>
            <Text>⚙️</Text>
          </View>
        </View>
      </View>

      {showCfg && (
        <View className='ai-cfg'>
          <Text className='t-muted t-xs ai-cfg-tip'>
            登录用户默认使用服务端 AI（无需 Key）。也可填自己的 OpenAI 兼容接口直连，Key 仅保存在本机。
          </Text>
          <Input className='ai-cfg-input' value={cfg.baseUrl} placeholder='API 地址（以 /v1 结尾）'
            placeholderClass='ai-ph' onInput={(e) => setCfg({ ...cfg, baseUrl: e.detail.value })} />
          <Input className='ai-cfg-input' password value={cfg.apiKey} placeholder='API Key'
            placeholderClass='ai-ph' onInput={(e) => setCfg({ ...cfg, apiKey: e.detail.value })} />
          <Input className='ai-cfg-input' value={cfg.model} placeholder='模型名'
            placeholderClass='ai-ph' onInput={(e) => setCfg({ ...cfg, model: e.detail.value })} />
          <View
            className='btn-gradient ai-cfg-save tap'
            onClick={() => {
              Taro.setStorageSync(CFG_KEY, JSON.stringify(cfg))
              setShowCfg(false)
              Taro.showToast({ title: '已保存', icon: 'success' })
            }}
          >
            <Text>保存</Text>
          </View>
        </View>
      )}

      <ScrollView scrollY className='ai-msg-list' scrollTop={scrollTopRef.current} scrollWithAnimation>
        {msgs.map((m, i) =>
          m.role === 'ai' ? (
            <View key={i} className='ai-bubble-ai'>
              <Text className='ai-yue'>{m.yue}</Text>
              {!!m.man && (
                <View>
                  <Text className='ai-man'>{m.man}</Text>
                </View>
              )}
              <View className='ai-listen tap' onClick={() => speakAiReply(m.yue)}>
                <Text>🔊 再听一次</Text>
              </View>
            </View>
          ) : (
            <View key={i} className='ai-bubble-user'>
              <Text>{m.yue}</Text>
            </View>
          )
        )}
        {sending && (
          <View className='ai-bubble-ai'>
            <Text className='t-muted t-sm'>AI 老师思考中…</Text>
          </View>
        )}
      </ScrollView>

      <View className='ai-input-row'>
        <Input
          className='ai-input'
          value={input}
          placeholder='用粤语或普通话打字'
          placeholderClass='ai-ph'
          disabled={sending}
          confirmType='send'
          onInput={(e) => setInput(e.detail.value)}
          onConfirm={() => send()}
        />
        <View
          className={`ai-send tap ${sending || !input.trim() ? 'ai-send-disabled' : ''}`}
          onClick={() => send()}
        >
          <Text>➤</Text>
        </View>
      </View>
    </View>
  )
}
