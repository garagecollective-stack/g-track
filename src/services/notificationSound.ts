// Notification sound — uses a real MP3 file from /public.
//
// Chrome/Safari autoplay policy: audio.play() called from a non-gesture
// context (e.g. a WebSocket/realtime callback) is only allowed AFTER the
// audio element has been "unlocked" inside a genuine user gesture.
// We unlock it on the first click/keydown by calling play()+pause() so
// subsequent calls from realtime events work without restriction.

let audio: HTMLAudioElement | null = null
let unlocked = false

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio('/notification_sound.mp3')
    audio.preload = 'auto'
    audio.volume = 1
  }
  return audio
}

// Unlock on first user interaction
if (typeof window !== 'undefined') {
  const unlock = () => {
    if (unlocked) return
    const a = ensureAudio()
    // play a silent instant to unlock, then immediately pause
    a.volume = 0
    a.play().then(() => {
      a.pause()
      a.currentTime = 0
      a.volume = 1
      unlocked = true
    }).catch(() => {
      // still blocked — will retry on next interaction
    })
  }
  window.addEventListener('click',      unlock, { passive: true })
  window.addEventListener('keydown',    unlock, { passive: true })
  window.addEventListener('touchstart', unlock, { passive: true })
}

export async function playNotificationSound(_soundType: 'default' | 'chat' | 'urgent' = 'default') {
  if (!isSoundEnabled()) return
  if (isDndActive()) return
  if (!unlocked) return   // not unlocked yet — skip silently

  try {
    const a = ensureAudio()
    // Clone so rapid-fire notifications don't cancel the previous play()
    // (cloneNode reuses the same decoded buffer — cheap)
    const clip = a.cloneNode(true) as HTMLAudioElement
    clip.volume = a.volume
    await clip.play()
  } catch {
    // Fail silently — sound is non-critical. Chrome can reject if the tab
    // hasn't had any recent interaction; it will accept again on next click.
  }
}

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem('gtrack_sound_enabled') !== 'false'
  } catch {
    return true
  }
}

export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem('gtrack_sound_enabled', String(enabled))
  } catch {
    // ignore
  }
}

// DND gate — AppContext mirrors the profile's dnd_until here so any module can
// check without pulling the React context in. Kept in localStorage so it also
// survives tab reloads before the profile refetch lands.
export function setDndUntil(until: string | null) {
  try {
    if (until) localStorage.setItem('gtrack_dnd_until', until)
    else localStorage.removeItem('gtrack_dnd_until')
  } catch {
    // ignore
  }
}

export function isDndActive(): boolean {
  try {
    const until = localStorage.getItem('gtrack_dnd_until')
    if (!until) return false
    return new Date(until).getTime() > Date.now()
  } catch {
    return false
  }
}
