export function getAppOrigin(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  return window.location.origin.replace(/\/$/, '')
}

export function getAuthCallbackUrl(): string {
  return `${getAppOrigin()}/auth/callback`
}

export function getResetPasswordUrl(): string {
  return `${getAppOrigin()}/reset-password`
}
