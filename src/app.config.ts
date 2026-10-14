export default defineAppConfig({
  lazyCodeLoading: 'requiredComponents',
  pages: [
    'pages/home/index',
    'pages/dialogue/index',
    'pages/movie/index',
    'pages/profile/index',
    'pages/ai/index',
    'pages/login/index',
    'pages/dlgdetail/index'
  ],
  window: {
    backgroundColor: '#F0F4FF',
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#2B5CE6',
    navigationBarTitleText: '粤语学习',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#9aa3b2',
    selectedColor: '#2B5CE6',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/home/index', text: 'AI语音' },
      { pagePath: 'pages/dialogue/index', text: '场景对话' },
      { pagePath: 'pages/movie/index', text: '电影模仿' },
      { pagePath: 'pages/profile/index', text: '我' }
    ]
  }
})

