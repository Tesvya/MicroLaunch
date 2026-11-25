import { useState } from 'react'
import { LuPaperclip, LuDownload } from 'react-icons/lu'
import { toast } from 'sonner'
import { downloadAttachment } from '../../services/user/applications.service'

const prettySize = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

/** Lists attached files; clicking one downloads it (the server only allows the applicant and admins). */
export const AttachmentList = ({ attachments = [], emptyText = 'No files attached', download: fetchFile = downloadAttachment }) => {
  const [busyId, setBusyId] = useState(null)
  const download = async (f) => {
    setBusyId(f.fileId)
    try {
      const r = await fetchFile(f.fileId)
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a'); a.href = url; a.download = f.originalName
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1500)
    } catch (error) {
      let message = 'Could not download this file'
      try { message = JSON.parse(await error.response.data.text()).message || message } catch { /* keep default */ }
      toast.error(message)
    } finally { setBusyId(null) }
  }
  if (!attachments.length) return <p className="text-xs text-ink-faint">{emptyText}</p>
  return (
    <ul className="space-y-1.5">
      {attachments.map((f) => (
        <li key={f.fileId}>
          <button type="button" onClick={() => download(f)} disabled={busyId === f.fileId} className="flex w-full items-center gap-2 rounded-xl border border-ink-faint/20 bg-surface px-3 py-2 text-left text-sm transition-colors hover:border-ink-900/30 disabled:opacity-60">
            <LuPaperclip className="h-4 w-4 shrink-0 text-ink-faint" />
            <span className="min-w-0 flex-1 truncate font-medium text-ink-900">{f.originalName}</span>
            <span className="shrink-0 text-xs text-ink-muted">{prettySize(f.size)}</span>
            <LuDownload className="h-4 w-4 shrink-0 text-ink-muted" />
          </button>
        </li>
      ))}
    </ul>
  )
}
