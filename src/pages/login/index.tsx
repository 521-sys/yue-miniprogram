import { useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  loginAndSync,
  registerAndSync,
  phoneLoginAndSync,
  phoneRegisterAndSync,
  wxLoginAndSync
} from '../../lib/store'
import '../../components/AuthSheet.scss'
import './index.scss'

const PHONE_RE = /^1[3-9]\d{9}$/

/** 登录/注册页：微信一键登录 + 账号 + 手机号，登录后自动同步云端学习状态 */
export default function LoginPage() {
  const [tab, setTab] = useState<'account' | 'phone'>('account')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    if (tab === 'account') {
      if (username.trim().length < 3) return setError('用户名至少 3 个字符')
      if (password.length < 6) return setError('密码至少 6 位')
    } else {
      if (!PHONE_RE.test(phone.trim())) return setError('请输入正确的 11 位手机号')
      if (password.length < 6) return setError('密码至少 6 位')
    }
    setLoading(true)
    try {
      if (tab === 'account') {
        if (mode === 'login') await loginAndSync(username.trim(), password)
        else await registerAndSync(username.trim(), password)
      } else {
        if (mode === 'login') await phoneLoginAndSync(phone.trim(), password)
        else await phoneRegisterAndSync(phone.trim(), password)
      }
      Taro.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 500)
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  /** 微信一键登录（wx.login → 后端换 JWT；后端未配密钥时为开发模式也可联调） */
  async function wxLogin() {
    setError('')
    setLoading(true)
    try {
      await wxLoginAndSync()
      Taro.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 500)
    } catch (e) {
      setError(e instanceof Error ? e.message : '微信登录失败')
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <View className='pg-page'>
      <View className='auth-col'>
        {/* 微信一键登录 */}
        <Button className='auth-wx-btn' loading={loading} onClick={wxLogin}>
          <Text>微信一键登录</Text>
        </Button>
        <View className='auth-divider'>
          <View className='auth-divider-line' />
          <Text className='auth-divider-text'>或用账号登录</Text>
          <View className='auth-divider-line' />
        </View>

        {/* 账号 / 手机号 */}
        <View className='auth-seg'>
          {([
            ['account', '账号'],
            ['phone', '手机号']
          ] as const).map(([key, label]) => (
            <View
              key={key}
              className={`auth-seg-item tap ${tab === key ? 'auth-seg-on' : ''}`}
              onClick={() => {
                setTab(key)
                setError('')
              }}
            >
              <Text>{label}</Text>
            </View>
          ))}
        </View>

        {/* 登录 / 注册 */}
        <View className='auth-seg'>
          <View
            className={`auth-seg-item tap ${isLogin ? 'auth-seg-on' : ''}`}
            onClick={() => {
              setMode('login')
              setError('')
            }}
          >
            <Text>登录</Text>
          </View>
          <View
            className={`auth-seg-item tap ${!isLogin ? 'auth-seg-on' : ''}`}
            onClick={() => {
              setMode('register')
              setError('')
            }}
          >
            <Text>注册</Text>
          </View>
        </View>

        {tab === 'account' ? (
          <Input
            className='input-box'
            value={username}
            maxlength={32}
            placeholder='用户名（3~32 字符）'
            placeholderClass='auth-ph'
            onInput={(e) => setUsername(e.detail.value)}
          />
        ) : (
          <Input
            className='input-box'
            type='number'
            value={phone}
            maxlength={11}
            placeholder='手机号'
            placeholderClass='auth-ph'
            onInput={(e) => setPhone(e.detail.value.replace(/\D/g, '').slice(0, 11))}
          />
        )}
        <Input
          className='input-box'
          password
          value={password}
          maxlength={64}
          placeholder='密码（6~64 位）'
          placeholderClass='auth-ph'
          onInput={(e) => setPassword(e.detail.value)}
        />

        {!!error && <Text className='t-danger t-xs'>{error}</Text>}

        <View className={`auth-submit tap ${loading ? 'auth-submit-disabled' : ''}`} onClick={loading ? undefined : submit}>
          <Text>{loading ? '处理中...' : isLogin ? '登录' : '注册'}</Text>
        </View>

        <Text className='t-muted t-xs auth-tip'>
          {!isLogin && tab === 'phone'
            ? '注册后昵称默认为「用户+尾号4位」，可在个人中心修改'
            : isLogin
            ? '登录后学习进度将云端同步，跨设备可用'
            : '注册即创建账号，当前本地进度会作为初始记录上传'}
        </Text>
      </View>
    </View>
  )
}
