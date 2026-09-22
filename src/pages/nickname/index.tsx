import { useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { updateProfile, isLoggedin, currentUser } from '../../lib/api'
import './index.scss'

/** 修改昵称（独立页面，替代原先的输入弹窗） */
export default function NicknamePage() {
  const [nick, setNick] = useState(currentUser() || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    const value = nick.trim()
    if (!value) return setError('昵称不能为空')
    if (value.length > 20) return setError('昵称最多 20 个字符')
    if (!isLoggedin()) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateProfile({ nickname: value })
      Taro.showToast({ title: '已更新', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 500)
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className='pg-page'>
      <View className='nm-card'>
        <Text className='nm-label'>新昵称</Text>
        <Input
          className='input-box'
          value={nick}
          maxlength={20}
          placeholder='输入新昵称'
          placeholderClass='nm-ph'
          focus
          onInput={(e) => setNick(e.detail.value)}
        />
        {!!error && <Text className='t-danger t-xs'>{error}</Text>}
        <View className={`nm-save tap ${saving || !nick.trim() ? 'nm-save-disabled' : ''}`} onClick={saving ? undefined : save}>
          <Text>{saving ? '保存中...' : '保存'}</Text>
        </View>
        <Text className='t-muted t-xs nm-tip'>昵称会显示在个人中心，并随云端同步</Text>
      </View>
    </View>
  )
}
