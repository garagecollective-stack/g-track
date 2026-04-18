import { isDndActive } from './notificationSound'

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

// "hidden" = user is on another tab, browser is minimized, or OS is locked.
// We only fire OS-level notifications in that state so we don't double-notify
// someone who's already looking at the in-app toast.
const isTabHidden = (): boolean => {
  if (typeof document === 'undefined') return true
  return document.hidden || !document.hasFocus()
}

export interface PushOptions {
  tag?: string          // dedupes rapid-fire notifications (same tag replaces)
  urgent?: boolean      // stays visible until user dismisses (requireInteraction)
  force?: boolean       // show even when tab is focused (rare)
}

export const triggerPushNotification = (
  title: string,
  body: string,
  url?: string,
  options: PushOptions = {},
): Notification | null => {
  if (!('Notification' in window)) return null
  if (Notification.permission !== 'granted') return null
  if (isDndActive()) return null
  if (!options.force && !isTabHidden()) return null

  try {
    const n = new Notification(title, {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: options.tag,
      requireInteraction: !!options.urgent,
      silent: false,
    })
    n.onclick = () => {
      window.focus()
      if (url) window.location.href = url
      n.close()
    }
    if (!options.urgent) setTimeout(() => n.close(), 6000)
    return n
  } catch {
    return null
  }
}
