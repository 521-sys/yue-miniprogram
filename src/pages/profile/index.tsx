import { useEffect, useState } from 'react'
import { View, Text, Slider, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { currentUser, isLoggedin, logout, onAuthChanged, resetAll, setDailyGoal, useLearning } from '../../lib/store'
import './index.scss'

export default function ProfilePage() {
  const s = useLearning()
  const [logged, setLogged] = useState(isLoggedin())
  const [user, setUser] = useState(currentUser())
  useEffect(() => onAuthChanged(() => { setLogged(isLoggedin()); setUser(currentUser()) }), [])
  return <View className='simple-profile'>
    <Text className='profile-eyebrow'>账号与偏好</Text><Text className='profile-title'>我的</Text>
    <View className='profile-account'><View className='profile-avatar'><Text>{logged ? (user || 'U').slice(0, 1).toUpperCase() : '😊'}</Text></View><View className='flex-1'><Text className='profile-name'>{logged ? user || '学习者' : '粤语学习者'}</Text><Text className='profile-desc'>{logged ? '已登录 · 进度云端同步' : '登录后同步学习进度'}</Text></View>{logged ? <Button size='mini' onClick={() => { logout(); Taro.showToast({ title: '已退出', icon: 'none' }) }}>退出</Button> : <Button size='mini' className='profile-login' onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}>登录</Button>}</View>
    <View className='profile-settings'><Text className='profile-section'>⚙️ 基础设置</Text><View className='profile-goal'><View className='flex justify-between'><Text>每日学习目标</Text><Text className='t-primary'>{s.dailyGoal} 词</Text></View><Slider value={s.dailyGoal} min={5} max={50} step={5} activeColor='#335eea' onChanging={(e) => setDailyGoal(e.detail.value)} /><View className='profile-scale'><Text>5</Text><Text>25</Text><Text>50</Text></View></View><Button className='profile-reset' onClick={() => Taro.showModal({ title: '重置学习记录', content: '确定清空学习进度吗？', success: (r) => r.confirm && resetAll() })}>↻ 重置学习进度</Button></View>
    <View className='profile-foot'><Text>粤语开口练 · AI语音 / 场景对话 / 电影模仿</Text></View>
  </View>
}
