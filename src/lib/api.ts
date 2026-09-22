// 后端 API 客户端（Taro 小程序版）：用户认证 + 学习状态同步
// 对应网页版 lib/api.ts，把 localStorage/fetch/window.Event 替换为 Taro 能力
import Taro from '@tarojs/taro'
import { API_BASE } from './config'
import { AI_REQUEST_TIMEOUT_MS } from './ai-config'

const BASE = API_BASE
const TOKEN_KEY = 'yueToken'
const USER_KEY = 'yueUser'
/** 登录状态变化事件名（保留与网页版同名，组件用 onAuthChanged 订阅） */
export const AUTH_CHANGED_EVENT = 'yue-auth-changed'

/* ---------- 登录态变化的轻量事件总线（替代 window Event） ---------- */
const authListeners = new Set<() => void>()
function notifyAuthChanged(): void {
  authListeners.forEach((l) => {
    try {
      l()
    } catch {
      /* ignore */
    }
  })
}
/** 订阅登录态变化，返回取消订阅函数 */
export function onAuthChanged(fn: () => void): () => void {
  authListeners.add(fn)
  return () => {
    authListeners.delete(fn)
  }
}

export function getToken(): string | null {
  return Taro.getStorageSync(TOKEN_KEY) || null
}

export function setToken(token: string): void {
  Taro.setStorageSync(TOKEN_KEY, token)
  notifyAuthChanged()
}

export function clearToken(): void {
  Taro.removeStorageSync(TOKEN_KEY)
  Taro.removeStorageSync(USER_KEY)
  notifyAuthChanged()
}

export function setUser(username: string): void {
  Taro.setStorageSync(USER_KEY, username)
}

export function currentUser(): string | null {
  return Taro.getStorageSync(USER_KEY) || null
}

export function isLoggedin(): boolean {
  return !!getToken()
}

export interface AuthResponse {
  token: string
  username: string
  userId: number
  nickname?: string | null
  avatar?: string | null
}

export interface Profile {
  username: string
  phone?: string | null
  nickname?: string | null
  avatar?: string | null
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** Taro.request 的 Promise 封装，自动带 token、401 自动清登录态 */
function request<T>(
  path: string,
  method: Method = 'GET',
  data?: unknown
): Promise<T> {
  const token = getToken()
  const header: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) header['Authorization'] = `Bearer ${token}`
  return new Promise<T>((resolve, reject) => {
    Taro.request({
      url: `${BASE}${path}`,
      method,
      data: data as Record<string, unknown>,
      header,
      timeout: AI_REQUEST_TIMEOUT_MS,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T)
          return
        }
        if (res.statusCode === 401) clearToken()
        const errData = res.data as { error?: string } | undefined
        reject(new Error(errData?.error || `请求失败(${res.statusCode})`))
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络异常，请检查后端是否启动'))
      }
    })
  })
}

/** 注册 */
export function register(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/register', 'POST', { username, password })
}

/** 登录 */
export function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', 'POST', { username, password })
}

/** 手机号注册 */
export function phoneRegister(phone: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/phone/register', 'POST', { phone, password })
}

/** 手机号登录 */
export function phoneLogin(phone: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/phone/login', 'POST', { phone, password })
}

/** 微信小程序 code 登录（wx.login → 后端 /api/auth/wechat） */
export function wxLoginByCode(code: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/wechat', 'POST', { code })
}

/** 拉取个人资料 */
export function getProfile(): Promise<Profile> {
  return request<Profile>('/api/user/profile')
}

/** 更新个人资料 */
export function updateProfile(patch: {
  nickname?: string
  avatar?: string
}): Promise<Profile> {
  return request<Profile>('/api/user/profile', 'PUT', patch)
}

/** 拉取云端学习状态 */
export function fetchState(): Promise<{ hasCloudData: boolean; state?: unknown }> {
  return request('/api/learn/state')
}

/** 上传学习状态（整体覆盖） */
export function pushState(state: unknown): Promise<{ status: string; updatedAt: string }> {
  return request('/api/learn/state', 'PUT', state)
}

/** AI 聊天代理（大模型 Key 在服务端，需登录） */
export function aiChat(
  messages: { role: string; content: string }[],
  temperature = 0.7
): Promise<{ choices?: { message?: { content?: string } }[] }> {
  return request('/api/ai/chat', 'POST', { messages, temperature })
}

/**
 * 粤语 TTS：小程序版把服务端返回的 mp3 二进制写入本地临时文件，
 * 返回可供 InnerAudioContext 播放的文件路径（替代网页版的 Blob URL）。
 */
export async function ttsCantoneseFile(text: string): Promise<string> {
  const token = getToken()
  if (!token) throw new Error('未登录')
  const res = await Taro.request({
    url: `${BASE}/api/ai/tts`,
    method: 'POST',
    responseType: 'arraybuffer',
    timeout: AI_REQUEST_TIMEOUT_MS,
    data: { text: text.slice(0, 200) },
    header: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
  if (res.statusCode !== 200) {
    if (res.statusCode === 401) clearToken()
    throw new Error('语音合成失败')
  }
  const filePath = `${Taro.env.USER_DATA_PATH}/tts_${Date.now()}.mp3`
  Taro.getFileSystemManager().writeFileSync(filePath, res.data as ArrayBuffer, 'binary')
  return filePath
}
