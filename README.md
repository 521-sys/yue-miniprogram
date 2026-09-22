# 粤语学习小程序（yue-miniprogram）

由网页版 `yue-frontend`（React + Vite）用 **Taro 4 + React 18 + TypeScript** 迁移而来的微信小程序，复用同一套后端 `yue-backend`（Spring Boot）与学习数据。

## 一、当前版本：粤语开口练

当前产品以「AI语音 / 场景对话 / 电影模仿 / 我」四个底部入口为准，不再使用旧版词汇学习功能对照表描述当前首页。

| 当前入口 | 对应源码 | 当前内容 |
|---|---|---|
| AI语音 | src/pages/home/index.tsx | 粤语开口练、AI 语音陪练、「开口讲，慢慢学。」、圆形「开始对话」按钮 |
| 场景对话 | src/pages/dialogue/index.tsx | 场景对话入口 |
| 电影模仿 | src/pages/movie/index.tsx | 电影模仿页面 |
| 我 | src/pages/profile/index.tsx | 登录/退出、每日学习目标、重置学习进度 |

首页「开始对话」通过 Taro.navigateTo 跳转 `/pages/ai/index`。按钮外观是麦克风，不代表点击即开始录音或实时语音通话；语音识别、AI 服务和朗读的可用性需分别验证。首页与底部导航源码已与用户提供的目标截图核对。

## 二、源码与历史页面

- `src/app.config.ts`：页面注册、窗口标题和四个 tabBar 入口。
- `src/pages/home/index.tsx`、`index.scss`：当前首页及样式。
- `src/pages/ai/`：首页按钮进入的 AI 聊天页面。
- `src/pages/dialogue/`、`dlgdetail/`：场景列表及详情。
- `src/pages/movie/`：电影模仿。
- `src/pages/profile/`、`login/`：个人中心及登录。
- `src/lib/`：API、登录状态、学习状态、语音等支持代码。
- `src/data/`：词汇、字典、对话和音频清单。
- `tests/`：现有测试；文件存在不代表本次已全部运行通过。
- `config/`、`project.config.json`：Taro 构建和微信开发者工具配置。

目录仍保留 learn、vocab、dict、quiz、practice、history、checkin、achieve、call 等页面和代码，部分仍注册在页面配置中；不能把这些历史页面直接视为当前首页或个人中心已经提供的入口。此轮只纠正文档，没有删除历史代码，也没有改回旧版首页。

微信开发者工具读取 `dist/`（见 project.config.json 的 miniprogramRoot）；GitHub 保存的是源码，dist 不入库，拉取后需重新构建。docs 下既有设计记录是历史背景，不是当前界面功能的验收清单。

## 三、本地运行步骤

### 1. 安装依赖（已安装可跳过）



```
cd yue-miniprogram

npm install --legacy-peer-deps
```

### 2. 编译小程序



```
\# 方式 A：watch 模式（改代码自动重编译，开发推荐）

npm run dev:weapp

\# 方式 B：只构建一次

npm run build:weapp
```

编译产物输出到 `dist/`。

### 3. 微信开发者工具打开



1. 打开「微信开发者工具」→ 导入项目，**项目目录选&#x20;**`yue-miniprogram`**&#x20;文件夹本身**（`project.config.json` 里 `miniprogramRoot` 已指向 `dist/`，不要选 dist）。

2. AppID：默认 `touristappid`（游客模式，可看界面）；要真机调试 / 微信登录，请在 `project.config.json` 改成你自己的小程序 AppID。

3. 「详情 → 本地设置」勾选 **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**（工程已默认 `urlCheck:false`），这样才能请求 `http://localhost:8080`。

### 4. 启动后端（发音与登录 / 同步依赖）



* 后端在 `yue-backend`，默认 `http://localhost:8080`。

* **208 个离线发音 mp3 已复制到** `yue-backend/src/main/resources/static/audio/`，并在 `SecurityConfig` 放行 `/audio/**`，后端启动后即可通过 `http://localhost:8080/audio/a0001.mp3` 访问。

* 小程序 `src/lib/config.ts` 的 `API_BASE` 默认指向它，一般无需改动。

## 四、音频与主包体积（重要）

微信小程序主包上限 2MB。208 个发音音频共约 1.75MB，若全部打进主包会超限，因此默认采用**后端托管**：



* `audio-manifest.ts` 只保存「文本 → 文件名」映射，运行时用 `AUDIO_BASE` 拼 URL 播放，**主包仅约 463KB**。

* 上线时把音频传到 OSS/CDN，把 `config.ts` 的 `AUDIO_BASE` 改成 CDN 地址即可（API 与音频可不同域）。

如确实需要**完全离线、音频内置进包**（主包会增大到约 2.2MB，需配合分包或精简音频，不推荐）：



```
\# 1) 把音频复制到 src/assets/audio（可从 yue-backend/.../static/audio 复制）

\# 2) 生成本地 import 版清单

node scripts/gen-audio-manifest.cjs --local

\# 3) 重新构建
```

## 五、上线发布 Checklist



1. `project.config.json` 的 `appid` 换成正式 AppID；后端 `application.yml` 配置 `WX_APPID` / `WX_SECRET`（否则微信登录为开发模拟模式）。

2. `src/lib/config.ts`：

* `API_BASE` 改成 **https:// 且已 ICP 备案**的后端域名；

* `AUDIO_BASE` 改成同域 `/audio` 或 CDN 域名。

1. 小程序管理后台「开发管理 → 服务器域名」：

* **request 合法域名**加入 API 域名（聊天 / 登录 / 同步 / TTS）；

* 音频若走远程，确保可直接访问（InnerAudioContext 不受 request 域名限制，但建议在 downloadFile 合法域名也配置）。

1. `npm run build:weapp` 后用开发者工具上传，确认主包体积、真机发音与登录正常。

## 六、网页版 → 小程序的主要技术替换



| 网页版                          | 小程序版                                    |
| ---------------------------- | --------------------------------------- |
| div / span / button          | View / Text（按钮用 View + onClick）         |
| input onChange               | Input onInput（`e.detail.value`）         |
| localStorage                 | Taro.setStorageSync / getStorageSync    |
| fetch                        | Taro.request                            |
| `<audio>` / HTMLAudioElement | Taro.createInnerAudioContext            |
| Blob URL（TTS）                | arraybuffer → FileSystemManager 写临时文件播放 |
| 自绘底部 Tab                     | app.config 原生 tabBar                    |
| lucide-react 图标              | emoji / 字符（小程序无 DOM SVG）                |
| 浏览器 SpeechRecognition        | 无对应能力（见下）                               |

## 七、已知差异 / 待增强（诚实说明）



1. **跟读训练的「AI 评分」**：小程序没有浏览器 Web Speech 语音识别。当前录音（`RecorderManager`）与录音回放完整可用；点击「AI 评分」会弹说明。要真正打分，需二选一：

* 接入「微信同声传译」插件（`WechatSI`，小程序后台添加插件）做语音识别；

* 或把录音上传后端，由后端调用 ASR 返回文本，再用组件内已保留的 `similarity()` 算法打分。

1. **AI 聊天的语音输入**：同理移除了浏览器语音转文字，保留文字输入与 AI 回复朗读。

2. **tabBar 为纯文字**（未配图标），可在 `app.config.ts` 的 list 中补 `iconPath/selectedIconPath`。

3. 图标以 emoji 呈现，与网页版 lucide 线性图标风格略有差异，但功能与布局一致。
