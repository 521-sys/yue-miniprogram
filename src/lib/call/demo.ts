import hello from '../../assets/call-demo/a0072.mp3'
import drink from '../../assets/call-demo/a0074.mp3'
import food from '../../assets/call-demo/a0076.mp3'
import finish from '../../assets/call-demo/a0078.mp3'
import type { Sample } from './session'

// Existing recordings packaged locally. Fixed sequence, not AI responses.
export const DEMO_SAMPLES: Sample[] = [
  { text: '你好！幾多位？', src: hello },
  { text: '飲咩嘢？', src: drink },
  { text: '食唔食嘢？', src: food },
  { text: '好，等陣。', src: finish }
]
