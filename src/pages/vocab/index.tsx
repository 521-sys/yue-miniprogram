import { View } from '@tarojs/components'
import { StuckList } from '../../components/Sheet'
import './index.scss'

/** 生词本（独立页面） */
export default function VocabPage() {
  return (
    <View className='pg-page'>
      <StuckList />
    </View>
  )
}
