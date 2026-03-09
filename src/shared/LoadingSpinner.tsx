interface Props {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
}

const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' }

export function LoadingSpinner({ size = 'md', color = 'currentColor', className = '' }: Props) {
  return (
    <svg
      className={`${sizes[size]} animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke={color} strokeWidth="4" />
      <path className="opacity-75" fill={color} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
