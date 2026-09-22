/**
 * 全局运行配置
 */

/**
 * 后端 API 地址。
 * - 本地开发：保持 http://localhost:8080，并在微信开发者工具
 *   「详情 → 本地设置」勾选「不校验合法域名」（project.config.json 已默认 urlCheck:false）。
 * - 上线发布：必须改成 https:// 且已 ICP 备案的域名，并在小程序管理后台
 *   「开发管理 → 服务器域名」把该域名同时加入 request 合法域名与 downloadFile 合法域名。
 */
export const API_BASE = 'https://gnep.online'

/**
 * 离线粤语音频（208 个 mp3）的访问根地址。
 * 默认由后端静态托管（yue-backend/src/main/resources/static/audio），
 * 这样音频不占用小程序主包体积（主包限制 2MB）。
 * 上线时可换成 OSS/CDN 地址，如 'https://cdn.example.com/audio'。
 */
export const AUDIO_BASE = `${API_BASE}/audio`
