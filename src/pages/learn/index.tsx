import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import LearnCards from '../../components/LearnCards'
import './index.scss'

/** 记粤语 · 词汇卡片跟读（独立页面，退出/返回都回上一页） */
export default function LearnPage() {
  return (
    <View className='learn-page'>
      <LearnCards onExit={() => Taro.navigateBack()} />
    </View>
  )
}
