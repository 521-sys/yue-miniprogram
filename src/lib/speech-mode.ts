export type SpeechMode = 'offline' | 'ai' | 'login'

export function speechMode(hasOfflineAudio: boolean, loggedIn: boolean): SpeechMode {
  if (hasOfflineAudio) return 'offline'
  return loggedIn ? 'ai' : 'login'
}
