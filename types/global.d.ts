/// <reference types="@tarojs/taro" />

declare module '*.png'
declare module '*.gif'
declare module '*.jpg'
declare module '*.jpeg'
declare module '*.svg'
declare module '*.css'
declare module '*.less'
declare module '*.scss'
declare module '*.sass'
declare module '*.styl'
declare module '*.mp3' {
  const src: string
  export default src
}

declare namespace NodeJS {
  interface ProcessEnv {
    /** NODE 内置环境变量 */
    NODE_ENV: 'development' | 'production'
    /** 当前编译平台 */
    TARO_ENV:
      | 'weapp'
      | 'swan'
      | 'alipay'
      | 'h5'
      | 'rn'
      | 'tt'
      | 'quickapp'
      | 'qq'
      | 'jd'
  }
}
