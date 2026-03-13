export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export const triggerPushNotification = (
  title: string,
  body: string,
  url?: string
) => {
  if (Notification.permission !== 'granted') return
  const n = new Notification(title, {
    body,
    icon: '/logo.png',
  })
  n.onclick = () => {
    window.focus()
    if (url) window.location.href = url
    n.close()
  }
  setTimeout(() => n.close(), 5000)
}
