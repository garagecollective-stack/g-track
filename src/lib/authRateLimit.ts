interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
  blockMs?: number
}

interface RateLimitState {
  attempts: number[]
  blockedUntil: number
}

function getStorageKey(key: string): string {
  return `gtrack-rate-limit:${key}`
}

function readState(key: string): RateLimitState {
  if (typeof window === 'undefined') {
    return { attempts: [], blockedUntil: 0 }
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(key))
    if (!raw) {
      return { attempts: [], blockedUntil: 0 }
    }

    const parsed = JSON.parse(raw) as Partial<RateLimitState>
    return {
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts.filter(v => typeof v === 'number') : [],
      blockedUntil: typeof parsed.blockedUntil === 'number' ? parsed.blockedUntil : 0,
    }
  } catch {
    return { attempts: [], blockedUntil: 0 }
  }
}

function writeState(key: string, state: RateLimitState) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(getStorageKey(key), JSON.stringify(state))
}

function toCooldown(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`
  }

  const minutes = Math.ceil(seconds / 60)
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

export function assertRateLimit({ key, limit, windowMs, blockMs = windowMs }: RateLimitOptions) {
  const now = Date.now()
  const state = readState(key)

  if (state.blockedUntil > now) {
    const waitSeconds = Math.max(1, Math.ceil((state.blockedUntil - now) / 1000))
    throw new Error(`Too many attempts. Try again in ${toCooldown(waitSeconds)}.`)
  }

  const recentAttempts = state.attempts.filter(attempt => now - attempt < windowMs)
  if (recentAttempts.length >= limit) {
    const blockedUntil = now + blockMs
    writeState(key, { attempts: recentAttempts, blockedUntil })
    const waitSeconds = Math.max(1, Math.ceil(blockMs / 1000))
    throw new Error(`Too many attempts. Try again in ${toCooldown(waitSeconds)}.`)
  }
}

export function recordRateLimitFailure({ key, windowMs, blockMs = windowMs }: Omit<RateLimitOptions, 'limit'>) {
  const now = Date.now()
  const state = readState(key)
  const attempts = [...state.attempts.filter(attempt => now - attempt < windowMs), now]
  writeState(key, { attempts, blockedUntil: state.blockedUntil > now ? state.blockedUntil : 0 })

  if (attempts.length === 0) {
    writeState(key, { attempts, blockedUntil: now + blockMs })
  }
}

export function clearRateLimit(key: string) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(getStorageKey(key))
}
