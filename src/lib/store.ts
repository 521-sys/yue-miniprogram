import Taro from '@tarojs/taro'
import { useSyncExternalStore } from 'react'
import {
  login as apiLogin,
  register as apiRegister,
  phoneLogin as apiPhoneLogin,
  phoneRegister as apiPhoneRegister,
  wxLoginByCode,
  fetchState,
  pushState,
  setToken,
  clearToken,
  getToken,
  type AuthResponse
} from './api'

export interface LearningState {
  learned: string[] // 已掌握（卡片「认识」）的词 id
  stuck: string[] // 生词本（选错 / 再背一次）
  seen: string[] // 卡片出现过的词 id
  reviewed: string[] // 复习测验答对过的词 id
  streak: number // 连续学习天数
  lastDay: string // 最后学习日期
  todayLearned: number // 今日已记数量
  todayLearnedDate: string
  todayReviewed: number // 今日已背数量
  todayReviewedDate: string
  dailyGoal: number // 每日目标（词）
  activity: Record<string, number> // date -> 当天学习动作数
}

const KEY = 'yueLearnReactV1'

const DEFAULT: LearningState = {
  learned: [],
  stuck: [],
  seen: [],
  reviewed: [],
  streak: 0,
  lastDay: '',
  todayLearned: 0,
  todayLearnedDate: '',
  todayReviewed: 0,
  todayReviewedDate: '',
  dailyGoal: 30,
  activity: {}
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function load(): LearningState {
  try {
    const raw = Taro.getStorageSync(KEY)
    if (!raw) return { ...DEFAULT }
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (parsed && parsed.dailyGoal === 10) parsed.dailyGoal = DEFAULT.dailyGoal
    return { ...DEFAULT, ...parsed }
  } catch {
    return { ...DEFAULT }
  }
}

let state: LearningState = load()
const listeners = new Set<() => void>()

function save(next: LearningState) {
  state = next
  try {
    Taro.setStorageSync(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
  if (getToken() && !skipUpload) scheduleUpload()
}

export function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function getState(): LearningState {
  return state
}

export function useLearning(): LearningState {
  return useSyncExternalStore(subscribe, getState, getState)
}

function touchStreak(s: LearningState): LearningState {
  const d = today()
  if (s.lastDay === d) return s
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  return { ...s, streak: s.lastDay === yest ? s.streak + 1 : 1, lastDay: d }
}

function bumpActivity(s: LearningState): LearningState {
  const d = today()
  return { ...s, activity: { ...s.activity, [d]: (s.activity[d] || 0) + 1 } }
}

/** 词汇卡片点「认识」 */
export function markLearned(id: string) {
  const s = bumpActivity(touchStreak(state))
  const d = today()
  const learned = s.learned.includes(id) ? s.learned : [...s.learned, id]
  save({
    ...s,
    learned,
    todayLearned: s.todayLearnedDate === d ? s.todayLearned + 1 : 1,
    todayLearnedDate: d
  })
}

/** 选错 / 「再背一次」：进生词本 */
export function markStuck(id: string) {
  const s = bumpActivity(touchStreak(state))
  const stuck = s.stuck.includes(id) ? s.stuck : [...s.stuck, id]
  save({ ...s, stuck })
}

/** 卡片作答过的词（认识 / 再背一次都算「出现过」） */
export function markSeen(id: string) {
  if (!state.seen) state.seen = []
  if (state.seen.includes(id)) return
  save({ ...state, seen: [...state.seen, id] })
}

/** 从生词本移除 */
export function removeStuck(id: string) {
  if (!state.stuck.includes(id)) return
  save({ ...state, stuck: state.stuck.filter((x) => x !== id) })
}

/** 复习测验答对 */
export function markReviewed(id: string) {
  const s = bumpActivity(touchStreak(state))
  const d = today()
  const reviewed = s.reviewed.includes(id) ? s.reviewed : [...s.reviewed, id]
  save({
    ...s,
    reviewed,
    todayReviewed: s.todayReviewedDate === d ? s.todayReviewed + 1 : 1,
    todayReviewedDate: d
  })
}

export function setDailyGoal(n: number) {
  save({ ...state, dailyGoal: n })
}

export function resetAll() {
  save({ ...DEFAULT })
}

// ==================== 云端同步 ====================

let uploadTimer: ReturnType<typeof setTimeout> | null = null
let skipUpload = false

function scheduleUpload() {
  if (uploadTimer) clearTimeout(uploadTimer)
  uploadTimer = setTimeout(async () => {
    try {
      await pushState(state)
    } catch (e) {
      console.warn('学习状态上传失败：', e)
    }
  }, 1500)
}

async function syncAfterLogin(r: AuthResponse): Promise<{ username: string }> {
  setToken(r.token)
  if (r.username) Taro.setStorageSync('yueUser', r.username)
  try {
    const cloud = await fetchState()
    if (cloud.hasCloudData && cloud.state) {
      skipUpload = true
      save({ ...DEFAULT, ...(cloud.state as LearningState) })
      skipUpload = false
    }
  } catch {
    /* 云端拉取失败不阻塞登录 */
  }
  return { username: r.username }
}

export async function loginAndSync(username: string, password: string) {
  return syncAfterLogin(await apiLogin(username, password))
}

export async function phoneLoginAndSync(phone: string, password: string) {
  return syncAfterLogin(await apiPhoneLogin(phone, password))
}

export async function registerAndSync(username: string, password: string) {
  const r = await apiRegister(username, password)
  setToken(r.token)
  try {
    await pushState(state)
  } catch (e) {
    console.warn('初始状态上传失败：', e)
  }
  return { username: r.username }
}

export async function phoneRegisterAndSync(phone: string, password: string) {
  const r = await apiPhoneRegister(phone, password)
  setToken(r.token)
  try {
    await pushState(state)
  } catch (e) {
    console.warn('初始状态上传失败：', e)
  }
  return { username: r.username }
}

/** 微信一键登录并同步云端状态 */
export async function wxLoginAndSync(): Promise<{ username: string }> {
  const { code } = await Taro.login()
  if (!code) throw new Error('微信登录失败：未拿到 code')
  return syncAfterLogin(await wxLoginByCode(code))
}

export function logout() {
  clearToken()
}

export { isLoggedin, currentUser, onAuthChanged } from './api'
