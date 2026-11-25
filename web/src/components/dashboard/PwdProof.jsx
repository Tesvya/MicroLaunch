import { useRef, useState } from 'react'
import { LuPaperclip, LuX } from 'react-icons/lu'
import { AttachmentList } from '../applications/AttachmentList'
import { downloadPwdFile } from '../../services/user/profile.service'
import { Button } from '../ui/Button'

const MAX_FILES = 3, MAX_MB = 3
const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx']
const BANNER = {
  PENDING: { tone: 'border-amber-500/30 bg-amber-100/40', text: 'Your proof is waiting for admin review. PWD will count toward your matches once approved.' },
  APPROVED: { tone: 'border-success-600/30 bg-success-100/50', text: 'Your PWD status is verified.' },
  REJECTED: { tone: 'border-danger-600/30 bg-danger-100/50', text: 'Your proof was not approved. You can submit new proof below.' }
}

/** Shown on My Profile: current review status, plus the file picker when proof still has to be sent. */
export const PwdProof = ({ verification, files, onFiles }) => {
  const input = useRef(null)
  const [error, setError] = useState('')
  const banner = verification && BANNER[verification.status]
  const needsProof = !verification || verification.status === 'REJECTED'

  const onPick = (e) => {
    const picked = [...e.target.files]
    e.target.value = ''
    const problems = [], next = [...files]
    for (const f of picked) {
      if (!ALLOWED_EXT.includes(f.name.split('.').pop().toLowerCase())) { problems.push(`"${f.name}" is not a PDF, PNG, JPG or Word file.`); continue }
      if (f.size === 0) { problems.push(`"${f.name}" is empty.`); continue }
      if (f.size > MAX_MB * 1024 * 1024) { problems.push(`"${f.name}" is larger than ${MAX_MB} MB.`); continue }
      if (next.some((x) => x.name === f.name && x.size === f.size)) continue
      if (next.length >= MAX_FILES) { problems.push(`You can attach up to ${MAX_FILES} files.`); break }
      next.push(f)
    }
    onFiles(next); setError(problems.join(' '))
  }

  return (
    <div className="space-y-3 rounded-xl border border-ink-faint/20 bg-canvas p-4">
      {banner ? (
        <div className={`rounded-xl border px-4 py-3 text-sm text-ink-900 ${banner.tone}`}>
          {banner.text}
          {verification.rejectionReason ? <p className="mt-1">Reason: {verification.rejectionReason}</p> : null}
        </div>
      ) : null}
      {verification?.files?.length ? <AttachmentList attachments={verification.files} download={downloadPwdFile} /> : null}
      {needsProof ? (
        <div>
          <p className="text-sm font-medium text-ink-900">Proof of PWD status (required)</p>
          <p className="mb-2 text-xs text-ink-muted">Attach your PWD card or supporting documents. Only you and the admins can see them. They are sent when you save your profile.</p>
          <input ref={input} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={onPick} className="hidden" />
          <Button size="sm" variant="ghost" className="border border-ink-faint/30" onClick={() => input.current?.click()} disabled={files.length >= MAX_FILES}><LuPaperclip className="h-4 w-4" /> Attach files</Button>
          <p className="mt-1.5 text-xs text-ink-muted">PDF, PNG, JPG or Word &middot; up to {MAX_FILES} files &middot; {MAX_MB} MB each</p>
          {error ? <p role="alert" className="mt-1.5 text-xs text-danger-600">{error}</p> : null}
          {files.length ? (
            <ul className="mt-2 space-y-1.5">
              {files.map((f) => (
                <li key={`${f.name}-${f.size}`} className="flex items-center gap-2 rounded-xl border border-ink-faint/20 bg-surface px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-ink-900">{f.name}</span>
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onFiles(files.filter((x) => x !== f))} className="text-ink-faint hover:text-danger-600"><LuX className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
