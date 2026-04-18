import { useRef, useState } from 'react'
import { CloudUpload, X } from 'lucide-react'
import { formatFileSize, getFileIcon } from '../utils/helpers'

interface Props {
  onFiles: (files: File[]) => void
  files: File[]
  onRemove: (index: number) => void
  accept?: string
  maxSize?: number
}

export function FileUpload({ onFiles, files, onRemove, accept = '*', maxSize = 10 * 1024 * 1024 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    const valid = Array.from(newFiles).filter(f => f.size <= maxSize)
    onFiles(valid)
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        className={`border border-dashed rounded-[var(--r-lg)] p-8 text-center cursor-pointer transition-all duration-200 ${
          dragging
            ? 'border-[var(--primary)] bg-[var(--primary-50)] scale-[1.01]'
            : 'border-[var(--line-2)] hover:border-[var(--primary-300)] hover:bg-[var(--surface-2)]'
        }`}
      >
        <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2.5 transition-colors ${dragging ? 'bg-[var(--primary)]/10' : 'bg-[var(--surface-2)]'}`}>
          <CloudUpload size={18} className={dragging ? 'text-[var(--primary)]' : 'text-[var(--ink-400)]'} strokeWidth={1.8} />
        </div>
        <p className="text-[13px] font-medium text-[var(--ink-700)]">Drop files here or click to upload</p>
        <p className="text-[11px] text-[var(--ink-400)] mt-1 font-mono tabular-nums">Max {Math.round(maxSize / (1024 * 1024))}MB per file</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((file, i) => (
            <li key={i} className="flex items-center gap-3 bg-[var(--surface-2)] border border-[var(--line-1)] rounded-[var(--r-sm)] px-3 py-2">
              <span className="text-lg">{getFileIcon(file.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[var(--ink-900)] truncate">{file.name}</p>
                <p className="text-[11px] text-[var(--ink-400)] font-mono tabular-nums">{formatFileSize(file.size)}</p>
              </div>
              <button onClick={() => onRemove(i)} className="text-[var(--ink-400)] hover:text-red-500 transition-colors p-1" aria-label="Remove file">
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
