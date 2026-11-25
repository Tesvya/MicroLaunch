import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { listPwdVerifications, decidePwdVerification } from '../../../services/admin/reviews.service'
import { downloadPwdFile } from '../../../services/user/profile.service'
import { AttachmentList } from '../../../components/applications/AttachmentList'
import { RejectForm } from '../../../components/dashboard/RejectForm'
import { Card, Badge } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'

const TONE = { PENDING: 'amber', APPROVED: 'success', REJECTED: 'danger' }

const AdminPwdVerifications = () => {
  const [filter, setFilter] = useState('PENDING')
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)

  const load = async () => {
    try { const r = await listPwdVerifications(filter); setItems(r.data?.properties?.verifications || []) }
    catch (error) { toast.error(error?.response?.data?.message || 'Could not load verifications') }
    finally { setIsLoading(false) }
  }
  useEffect(() => { setIsLoading(true); load() }, [filter])

  const decide = async (id, decision, reason) => {
    setBusyId(id)
    try {
      await decidePwdVerification(id, decision, reason)
      toast.success(decision === 'APPROVED' ? 'PWD status approved' : 'Rejected and user notified')
      setRejectingId(null)
    } catch (error) { toast.error(error?.response?.data?.message || 'Could not save the decision') }
    finally { await load(); setBusyId(null) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">PWD Verification</h1>
          <p className="mt-1 text-sm text-ink-muted">Review the PWD card or documents users submitted. These files are confidential.</p>
        </div>
        <select aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-ink-faint/30 bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-ink-900">
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {isLoading ? <p className="text-sm text-ink-muted">Loading...</p>
        : items.length === 0 ? <p className="text-sm text-ink-muted">No verifications here.</p>
        : <div className="space-y-3">
          {items.map((v) => (
            <Card key={v._id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink-900">{v.userId?.name || 'Deleted user'} <span className="text-xs font-normal text-ink-muted">{v.userId?.email}</span></p>
                  <p className="text-xs text-ink-muted">Submitted {new Date(v.submittedAt).toLocaleString()}</p>
                </div>
                <Badge tone={TONE[v.status]}>{v.status}</Badge>
              </div>
              <div className="mt-4"><AttachmentList attachments={v.files} download={downloadPwdFile} /></div>
              {v.rejectionReason ? <p className="mt-3 text-sm text-danger-600">Reason: {v.rejectionReason}</p> : null}
              {v.status === 'PENDING' ? (
                rejectingId === v._id
                  ? <RejectForm busy={busyId === v._id} onSubmit={(reason) => decide(v._id, 'REJECTED', reason)} onCancel={() => setRejectingId(null)} />
                  : <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="accent" isLoading={busyId === v._id} onClick={() => decide(v._id, 'APPROVED')}>Approve</Button>
                      <Button size="sm" variant="ghost" className="border border-danger-600/30 text-danger-600" onClick={() => setRejectingId(v._id)}>Reject</Button>
                    </div>
              ) : null}
            </Card>
          ))}
        </div>}
    </div>
  )
}
export default AdminPwdVerifications
