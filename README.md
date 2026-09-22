# 粤语学习小程序（yue-miniprogram）

由网页版 `yue-frontend`（React + Vite）用 **Taro 4 + React 18 + TypeScript** 迁移而来的微信小程序，复用同一套后端 `yue-backend`（Spring Boot）与学习数据。

## 一、功能对照



| 模块                | 网页版                   | 小程序版                                           |
| ----------------- | --------------------- | ---------------------------------------------- |
| 记粤语（词汇卡片跟读）       | ✅                     | ✅ 完整迁移                                         |
| 场景对话              | ✅                     | ✅ 场景列表 → 对话气泡                                  |
| 生词本 / 已掌握 / 自我检测  | ✅                     | ✅                                              |
| 粤语字典（双向查询）        | ✅                     | ✅                                              |
| AI 语音助手（聊天）       | 浏览器语音输入 + 文字          | ✅ 文字聊天（服务端代理 / 自带 Key），语音输入见「已知差异」             |
| 跟读训练              | 浏览器录音 + Web Speech 评分 | ✅ 录音 / 回放可用；AI 评分待接识别能力（见下）                    |
| 学习记录 / 打卡日历 / 成就墙 | ✅                     | ✅                                              |
| 登录                | 账号 / 手机号              | ✅ 账号 / 手机号 / **微信一键登录**（后端 `/api/auth/wechat`） |
| 底部导航              | 自绘 Tab                | 小程序原生 tabBar                                   |

## 二、目录结构



```
yue-miniprogram/

├── config/                 # Taro 编译配置

├── scripts/

│   └── gen-audio-manifest.cjs   # 音频清单生成（远程 / --local 两种模式）

├── src/

│   ├── app.tsx / app.config.ts / app.scss   # 入口、页面与 tabBar 配置、全局样式

│   ├── pages/

│   │   ├── home/          # 首页（全部入口跳独立页面）

│   │   ├── dialogue/      # 场景对话列表 → 跳转 dlgdetail

│   │   ├── profile/       # 我（数据/设置项跳独立页面）

│   │   └── 16 个功能页：learn 记粤语 / ai AI语音 / practice 跟读训练 / vocab 生词本
│   │                     / quiz 自我检测 / dict 粤语字典 / notify 通知 / words 全部词汇
│   │                     / login 登录注册 / mastered 已掌握 / history 学习记录
│   │                     / checkin 打卡日历 / achieve 成就 / nickname 改昵称
│   │                     / goal 每日目标 / dlgdetail 对话详情

│   ├── components/        # LearnCards / Sheet(共享部件) / ProfileSheets(成就+目标徽章) + 各样式

│   ├── data/              # words / dictionary / dialogues（纯数据，直接复用）+ audio-manifest

│   ├── lib/

│   │   ├── config.ts      # ★ API\_BASE / AUDIO\_BASE 地址配置

│   │   ├── api.ts         # Taro.request 封装、登录、TTS、微信 code 登录

│   │   ├── store.ts       # 学习状态机（useSyncExternalStore + 本地缓存 + 云同步）

│   │   └── speech.ts      # InnerAudioContext 发音

│   └── assets/            # --local 模式才放音频（默认空）

├── project.config.json    # 微信开发者工具项目配置（已关闭 urlCheck）

└── dist/                  # 编译产物（微信开发者工具实际加载目录）
```

> **交互规范（v1.1 起）**：所有功能交互一律 `Taro.navigateTo` 跳转独立全屏页面，不保留半页弹层（底部抽屉/选择器）。仅保留原生确认弹窗（重置记录、麦克风权限、AI 评分说明）。

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