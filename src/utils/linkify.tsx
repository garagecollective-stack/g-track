import React from 'react'

const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi

export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return []

  // Reset lastIndex before splitting
  URL_REGEX.lastIndex = 0
  const parts = text.split(URL_REGEX)

  return parts.map((part, i) => {
    // Test if this part is a URL
    const isUrl = /^https?:\/\//i.test(part)
    if (isUrl) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-[#0A5540] underline hover:text-[#084633] break-all"
        >
          {part}
        </a>
      )
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}
