import { useState } from 'react'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Input'

/** Asks an admin for the reason that is sent to the user. */
export const RejectForm = ({ busy, onSubmit, onCancel }) => {
  const [reason, setReason] = useState('')
  return (
    <div className="mt-4 rounded-xl border border-ink-faint/20 bg-canvas p-4">
      <p className="mb-2 text-sm font-medium text-ink-900">Reason for rejection (sent to the user)</p>
      <Textarea rows={3} maxLength={500} aria-label="Reason for rejection" value={reason} onChange={(e) => setReason(e.target.value)} />
      <p className="mt-1 text-xs text-ink-muted">At least 10 characters. {reason.length}/500</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="danger" isLoading={busy} disabled={reason.trim().length < 10} onClick={() => onSubmit(reason.trim())}>Reject and notify user</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
