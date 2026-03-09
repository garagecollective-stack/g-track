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
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-[#0A5540] bg-[#edf8f4]'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <CloudUpload size={24} className="mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">Drop files here or click to upload</p>
        <p className="text-xs text-gray-400 mt-0.5">Max {Math.round(maxSize / (1024 * 1024))}MB per file</p>
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
        <ul className="mt-3 space-y-2">
          {files.map((file, i) => (
            <li key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-lg">{getFileIcon(file.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
              </div>
              <button onClick={() => onRemove(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
