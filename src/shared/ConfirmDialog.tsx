import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Modal } from './Modal'
import { LoadingSpinner } from './LoadingSpinner'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  title: string
  description: string
  confirmLabel?: string
  variant?: 'danger' | 'warning'
  typeToConfirm?: string
}

export function ConfirmDialog({
  open, onClose, onConfirm,
  title, description,
  confirmLabel = 'Confirm',
  variant = 'danger',
  typeToConfirm,
}: Props) {
  const [typed, setTyped] = useState('')
  const [loading, setLoading] = useState(false)

  const canConfirm = typeToConfirm ? typed === typeToConfirm : true

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setLoading(false)
      setTyped('')
    }
  }

  const handleClose = () => {
    setTyped('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-100' : 'bg-yellow-100'}`}>
          {variant === 'danger'
            ? <Trash2 size={22} className="text-red-500" />
            : <AlertTriangle size={22} className="text-yellow-600" />
          }
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>

        {typeToConfirm && (
          <div className="w-full text-left">
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Type <span className="font-mono font-semibold text-gray-800">"{typeToConfirm}"</span> to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#0A5540] focus:ring-2 focus:ring-[#0A5540]/10"
              placeholder={typeToConfirm}
            />
          </div>
        )}

        <div className="flex gap-3 w-full">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none ${
              variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600'
            }`}
          >
            {loading && <LoadingSpinner size="sm" color="white" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
