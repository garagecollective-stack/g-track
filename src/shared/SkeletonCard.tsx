interface Props {
  count?: number
  height?: string
}

function SkeletonLine({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) {
  return <div className={`skeleton ${width} ${height} rounded`} />
}

export function SkeletonCard({ count = 5, height }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-xl p-5">
          {height ? (
            <div className={`skeleton w-full ${height} rounded`} />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <SkeletonLine width="w-2/3" height="h-4" />
                <SkeletonLine width="w-16" height="h-5" />
              </div>
              <SkeletonLine width="w-1/2" height="h-3" />
              <SkeletonLine width="w-full" height="h-2" />
              <div className="flex items-center justify-between">
                <SkeletonLine width="w-24" height="h-3" />
                <div className="flex gap-1">
                  <div className="skeleton w-7 h-7 rounded-full" />
                  <div className="skeleton w-7 h-7 rounded-full -ml-2" />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  )
}

export function SkeletonRow({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          <td className="p-3"><div className="skeleton w-4 h-4 rounded" /></td>
          <td className="p-3"><SkeletonLine width="w-48" height="h-4" /></td>
          <td className="p-3"><SkeletonLine width="w-24" height="h-4" /></td>
          <td className="p-3">
            <div className="flex items-center gap-2">
              <div className="skeleton w-7 h-7 rounded-full" />
              <SkeletonLine width="w-20" height="h-3" />
            </div>
          </td>
          <td className="p-3"><SkeletonLine width="w-16" height="h-5" /></td>
          <td className="p-3"><SkeletonLine width="w-20" height="h-3" /></td>
          <td className="p-3"><SkeletonLine width="w-20" height="h-5" /></td>
        </tr>
      ))}
    </>
  )
}
