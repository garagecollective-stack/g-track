import { useState, useEffect, useRef } from 'react'
import {
  X, CheckCircle, Clock, Send, CheckCheck,
  Folder, CheckSquare,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useIssues, useIssueReplies } from '../hooks/useIssues'
import { useToast } from '../hooks/useToast'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { friendlyError, timeAgo } from '../utils/helpers'
import type { Issue } from '../types'

const PRIORITY_STYLE: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border border-red-200',
  high: 'bg-orange-100 text-orange-700 border border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  low: 'bg-[var(--surface-2)] text-[var(--ink-700)] border border-[var(--line-1)]',
}

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_review: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-[var(--surface-2)] text-[var(--ink-700)]',
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_review: 'In Review',
  resolved: 'Resolved',
  closed: 'Closed',
}

interface Props {
  issue: Issue
  onClose: () => void
  onUpdate: () => void
  readOnly?: boolean
}

export function IssueDetailDrawer({ issue: initialIssue, onClose, onUpdate, readOnly = false }: Props) {
  const { currentUser } = useApp()
  const toast = useToast()
  const { replyToIssue, resolveIssue, markInReview, closeIssue } = useIssues()
  const { replies, loading: repliesLoading } = useIssueReplies(initialIssue.id)
  const [issue, setIssue] = useState<Issue>(initialIssue)
  const [replyText, setReplyText] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [markingReview, setMarkingReview] = useState(false)
  const [closing, setClosing] = useState(false)
  const [showReplyConfirm, setShowReplyConfirm] = useState(false)
  const [showReviewConfirm, setShowReviewConfirm] = useState(false)
  const [showResolveConfirm, setShowResolveConfirm] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const isMember = currentUser?.role === 'member'
  const canReply = !readOnly
  const canResolve = !readOnly && !isMember

  useEffect(() => {
    setIssue(initialIssue)
  }, [initialIssue])

  const doSendReply = async () => {
    setSendingReply(true)
    try {
      await replyToIssue(issue.id, replyText.trim())
      setReplyText('')
      toast.success('Reply sent')
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSendingReply(false)
    }
  }

  const doResolve = async () => {
    setResolving(true)
    try {
      await resolveIssue(issue.id, resolutionNote.trim())
      setIssue(prev => ({ ...prev, status: 'resolved', resolution_note: resolutionNote.trim() }))
      toast.success('Issue resolved')
      onUpdate()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setResolving(false)
    }
  }

  const doMarkInReview = async () => {
    setMarkingReview(true)
    try {
      await markInReview(issue.id)
      setIssue(prev => ({ ...prev, status: 'in_review' }))
      toast.success('Marked as In Review')
      onUpdate()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setMarkingReview(false)
    }
  }

  const doClose = async () => {
    setClosing(true)
    try {
      await closeIssue(issue.id)
      setIssue(prev => ({ ...prev, status: 'closed' }))
      toast.success('Issue closed')
      onUpdate()
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setClosing(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 w-full md:w-[480px] bg-[var(--surface-1)] z-50 flex flex-col shadow-2xl" style={{ height: '100dvh' }}>
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-[var(--line-1)] shrink-0">
          <button onClick={onClose} aria-label="Close issue" className="p-2.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0">
            <X size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-[var(--ink-900)] leading-tight">{issue.title}</h2>
            <p className="text-xs text-[var(--ink-500)] mt-0.5">
              Raised by <span className="font-medium">{issue.raised_by_name}</span> · {timeAgo(issue.created_at)}
            </p>
          </div>
        </div>

        {/* Status + Priority row */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--line-1)] shrink-0 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORITY_STYLE[issue.priority] || 'bg-[var(--surface-2)] text-[var(--ink-700)]'}`}>
            {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)} Priority
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[issue.status] || 'bg-[var(--surface-2)] text-[var(--ink-700)]'}`}>
            {STATUS_LABEL[issue.status] || issue.status}
          </span>
          <span className="ml-1 flex items-center gap-1 text-xs text-[var(--ink-500)]">
            {issue.entity_type === 'project' ? <Folder size={12} /> : <CheckSquare size={12} />}
            {issue.entity_name}
          </span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {/* Description */}
          <div className="px-5 py-4 border-b border-[var(--line-1)]">
            <p className="text-[11px] font-bold text-[var(--ink-400)] uppercase tracking-wider mb-2">Description</p>
            <p className="text-sm text-[var(--ink-700)] leading-relaxed whitespace-pre-line">{issue.description}</p>
          </div>

          {/* Resolution note (if resolved) */}
          {issue.status === 'resolved' && issue.resolution_note && (
            <div className="px-5 py-4 border-b border-[var(--line-1)] bg-green-50">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle size={14} className="text-green-600" />
                <p className="text-[11px] font-bold text-green-700 uppercase tracking-wider">Resolution</p>
              </div>
              <p className="text-sm text-green-800 leading-relaxed">{issue.resolution_note}</p>
            </div>
          )}

          {/* Replies */}
          <div className="px-5 py-4 border-b border-[var(--line-1)]">
            <p className="text-[11px] font-bold text-[var(--ink-400)] uppercase tracking-wider mb-3">
              Conversation ({replies.length})
            </p>
            {repliesLoading ? (
              <div className="space-y-2">
                {[1,2].map(i => <div key={i} className="h-12 bg-[var(--surface-2)] rounded-[var(--r-sm)] animate-pulse" />)}
              </div>
            ) : replies.length === 0 ? (
              <p className="text-sm text-[var(--ink-400)] text-center py-4">No replies yet.</p>
            ) : (
              <div className="space-y-3">
                {replies.map(reply => (
                  <div key={reply.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0 text-xs font-bold text-[var(--primary)]">
                      {reply.replied_by_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 bg-[var(--surface-2)] rounded-[var(--r-lg)] px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-[var(--ink-900)]">{reply.replied_by_name}</span>
                        <span className="text-[10px] text-[var(--ink-400)] capitalize">{reply.replied_by_role}</span>
                        <span className="text-[10px] text-[var(--ink-400)] ml-auto">{timeAgo(reply.created_at)}</span>
                      </div>
                      <p className="text-sm text-[var(--ink-700)] leading-relaxed">{reply.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reply input — hidden in read-only mode */}
          {canReply && (
            <div className="px-5 py-4 border-b border-[var(--line-1)]">
              <p className="text-[11px] font-bold text-[var(--ink-400)] uppercase tracking-wider mb-2">Reply</p>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                rows={3}
                className="w-full text-sm border border-[var(--line-1)] rounded-[var(--r-lg)] px-3 py-2.5 focus:outline-none focus:border-[var(--primary)] resize-none"
              />
              <button
                onClick={() => { if (replyText.trim()) setShowReplyConfirm(true) }}
                disabled={!replyText.trim() || sendingReply}
                className="mt-2 flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-[var(--r-sm)] hover:bg-[var(--primary-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={14} />
                {sendingReply ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          )}

          {/* Resolution actions — hidden for members and read-only views */}
          {canResolve && issue.status !== 'resolved' && issue.status !== 'closed' && (
            <div className="px-5 py-4">
              <p className="text-[11px] font-bold text-[var(--ink-400)] uppercase tracking-wider mb-2">Resolution</p>
              <textarea
                value={resolutionNote}
                onChange={e => setResolutionNote(e.target.value)}
                placeholder="Resolution note (required to resolve)..."
                rows={2}
                className="w-full text-sm border border-[var(--line-1)] rounded-[var(--r-lg)] px-3 py-2.5 focus:outline-none focus:border-[var(--primary)] resize-none mb-3"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowReviewConfirm(true)}
                  disabled={markingReview || issue.status === 'in_review'}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-[var(--r-sm)] hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <Clock size={14} />
                  {markingReview ? 'Updating...' : 'Mark In Review'}
                </button>
                <button
                  onClick={() => { if (resolutionNote.trim()) setShowResolveConfirm(true) }}
                  disabled={!resolutionNote.trim() || resolving}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-[var(--r-sm)] hover:bg-[var(--primary-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCheck size={14} />
                  {resolving ? 'Resolving...' : '✓ Resolve Issue'}
                </button>
                <button
                  onClick={() => setShowCloseConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[var(--ink-700)] bg-[var(--surface-2)] border border-[var(--line-1)] rounded-[var(--r-sm)] hover:bg-gray-200 transition-colors"
                >
                  <X size={14} />
                  Close Issue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showReplyConfirm}
        onClose={() => setShowReplyConfirm(false)}
        onConfirm={doSendReply}
        title="Send Reply"
        description="Send this reply to the issue thread?"
        confirmLabel="Send Reply"
        variant="confirm"
      />

      <ConfirmDialog
        open={showReviewConfirm}
        onClose={() => setShowReviewConfirm(false)}
        onConfirm={doMarkInReview}
        title="Mark In Review"
        description={`Mark "${issue.title}" as In Review? The member will be notified.`}
        confirmLabel="Mark In Review"
        variant="confirm"
      />

      <ConfirmDialog
        open={showResolveConfirm}
        onClose={() => setShowResolveConfirm(false)}
        onConfirm={doResolve}
        title="Resolve Issue"
        description={`Resolve "${issue.title}"? This will notify the member with your resolution note.`}
        confirmLabel="Resolve Issue"
        variant="confirm"
      />

      <ConfirmDialog
        open={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={doClose}
        title="Close Issue"
        description="Close this issue without resolving it? The member will not receive a resolution notification."
        confirmLabel="Close Issue"
        cancelLabel="Keep Open"
        variant="danger"
        isLoading={closing}
      />
    </>
  )
}
