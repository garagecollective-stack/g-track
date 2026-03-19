import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Like useState but persists values to sessionStorage so form fields survive
 * tab switches and same-session navigations.
 *
 * @param key      Unique storage key — used as `gtrack_form_<key>` in sessionStorage
 * @param initialValues  Default field values (used on first mount and after clearForm)
 * @returns [values, updateValues, clearForm]
 */
export function usePersistedForm<T extends Record<string, unknown>>(
  key: string,
  initialValues: T
): [T, (updates: Partial<T>) => void, () => void] {
  // Capture initial values once so clearForm always resets to the original defaults
  const initialRef = useRef<T>(initialValues)

  const [values, setValues] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(`gtrack_form_${key}`)
      if (stored) return { ...initialRef.current, ...JSON.parse(stored) }
    } catch {
      // Ignore parse errors — fall through to initial values
    }
    return initialRef.current
  })

  // Persist to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(`gtrack_form_${key}`, JSON.stringify(values))
    } catch {
      // Ignore storage errors (e.g. private browsing quota)
    }
  }, [key, values])

  // Merge partial updates into current values
  const updateValues = useCallback((updates: Partial<T>) => {
    setValues(prev => ({ ...prev, ...updates }))
  }, [])

  // Reset to initial values and clear sessionStorage — call after successful submit
  const clearForm = useCallback(() => {
    setValues(initialRef.current)
    try {
      sessionStorage.removeItem(`gtrack_form_${key}`)
    } catch {
      // Ignore
    }
  }, [key])

  return [values, updateValues, clearForm]
}
