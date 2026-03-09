import { getInitials } from '../utils/helpers'

interface AvatarProps {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  imageUrl?: string | null
  status?: 'active' | 'away' | 'offline' | null
  className?: string
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
  xl: 'w-16 h-16 text-xl',
}

const statusColors = {
  active: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-400',
}

const statusSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
}

export function Avatar({ name, size = 'md', imageUrl, status, className = '' }: AvatarProps) {
  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`${sizeMap[size]} rounded-full bg-[#0A5540] text-white font-semibold flex items-center justify-center overflow-hidden`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span style={{ fontFamily: 'DM Sans, sans-serif' }}>{getInitials(name)}</span>
        )}
      </div>
      {status && (
        <span
          className={`absolute bottom-0 right-0 ${statusSizes[size]} ${statusColors[status]} rounded-full ring-2 ring-white`}
        />
      )}
    </div>
  )
}
