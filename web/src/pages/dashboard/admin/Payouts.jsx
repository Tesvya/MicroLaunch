import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { LuExternalLink, LuRefreshCw } from 'react-icons/lu'
import { listPayouts, approvePayout, rejectPayout, checkPayout } from '../../../services/admin/reviews.service'
import { RejectForm } from '../../../components/dashboard/RejectForm'
import { Card, Badge } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'

const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH')}`
const STATUS = {
  REQUESTED: { label: 'Awaiting approval', tone: 'amber' },
  PENDING: { label: 'Approved, payment pending', tone: 'amber' },
  SUCCESS: { label: 'Paid', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' }
}
const payRange = (s) => `${peso(s.payAmountMin)}${s.payAmountMax && s.payAmountMax !== s.payAmountMin ? `–${peso(s.payAmountMax)}` : ''} (${(s.payType || '').replace('_', ' ').toLowerCase()})`
const Info = ({ label, children }) => <div><dt className="text-xs text-ink-muted">{label}</dt><dd className="text-ink-900">{children}</dd></div>

const ApproveForm = ({ payout, busy, onApprove, onCancel }) => {
  const [confirmed, setConfirmed] = useState(false)
  return (
    <div className="mt-4 rounded-xl border border-ink-faint/20 bg-canvas p-4">
      <label className="flex items-start gap-2 text-sm text-ink-900">
        <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        <span>I confirm this job was completed and {peso(payout.amount)} can be paid.{payout.applicationStatus === 'APPROVED' ? ' The application will be marked as completed.' : ''}</span>
      </label>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="accent" isLoading={busy} disabled={!confirmed} onClick={onApprove}>Approve payout</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

const AdminPayouts = () => {
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState('REQUESTED')
  const [payouts, setPayouts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [deciding, setDeciding] = useState(null) // { id, mode }

  const load = async (status = filter) => {
    try { const r = await listPayouts(status); setPayouts(r.data?.properties?.payouts || []) }
    catch (error) { toast.error(error?.response?.data?.message || 'Could not load payouts') }
    finally { setIsLoading(false) }
  }
  useEffect(() => { setIsLoading(true); load(filter) }, [filter])

  // PayPal sends the admin back here after checkout
  useEffect(() => {
    const result = params.get('paypal')
    if (!result) return
    if (result === 'success') toast.success('Returned from PayPal. The payout status is shown below.')
    else toast.error('PayPal checkout was not completed')
    setFilter('')
    setParams({}, { replace: true })
  }, [])

  const run = async (id, action) => {
    setBusyId(id)
    try { await action(); setDeciding(null) }
    catch (error) { toast.error(error?.response?.data?.message || 'Something went wrong') }
    finally { await load(); setBusyId(null) }
  }
  const approve = (id) => run(id, async () => {
    const r = await approvePayout(id)
    if (r.data?.properties?.checkoutUrl) { setFilter('PENDING'); toast.success('Approved. Press "Pay now" to complete the payment.') }
    else toast.success('Payout approved and paid')
  })
  const reject = (id, reason) => run(id, async () => { await rejectPayout(id, reason); toast.success('Payout rejected and user notified') })
  const check = (id) => run(id, async () => {
    const r = await checkPayout(id)
    const paid = r.data?.properties?.transaction?.status === 'SUCCESS'
    toast[paid ? 'success' : 'info'](paid ? 'Payment confirmed' : 'Still pending at the payment provider')
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Payouts</h1>
          <p className="mt-1 text-sm text-ink-muted">Confirm that a job was completed before its payout is released.</p>
        </div>
        <select aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-ink-faint/30 bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-ink-900">
          <option value="">All statuses</option>
          {Object.entries(STATUS).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
        </select>
      </div>

      {isLoading ? <p className="text-sm text-ink-muted">Loading payouts...</p>
        : payouts.length === 0 ? <p className="text-sm text-ink-muted">No payouts here.</p>
        : <div className="space-y-3">
          {payouts.map((t) => {
            const entry = t.incomeEntryId
            const listing = entry?.sideHustleId
            const st = STATUS[t.status] || { label: t.status, tone: 'neutral' }
            const mode = deciding?.id === t._id ? deciding.mode : null
            return (
              <Card key={t._id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink-900">{t.userId?.name || 'Deleted user'} <span className="text-xs font-normal text-ink-muted">{t.userId?.email}</span></p>
                    <p className="text-sm text-ink-muted">{listing?.title || entry?.title || 'No linked job'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums text-ink-900">{peso(t.amount)}</span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <Info label="Hours logged">{entry?.hoursSpent ?? '—'}</Info>
                  <Info label="Listing pay">{listing ? payRange(listing) : '—'}</Info>
                  <Info label="Application">{t.applicationStatus ? t.applicationStatus.toLowerCase() : 'none'}</Info>
                  <Info label="Already paid for this job">{peso(t.paidForSameJob)}</Info>
                  <Info label="Method">{t.method.replace('MOCK_', 'Simulated ')}</Info>
                  <Info label="Requested">{new Date(t.createdAt).toLocaleString()}</Info>
                </dl>
                {entry?.notes ? <p className="mt-3 whitespace-pre-wrap text-sm text-ink-900">{entry.notes}</p> : null}
                {t.rejectionReason ? <p className="mt-3 text-sm text-danger-600">Reason: {t.rejectionReason}</p> : null}
                <p className="mt-3 text-xs text-ink-muted">{t.referenceNumber}{t.reviewedBy?.name ? ` · Reviewed by ${t.reviewedBy.name}` : ''}</p>

                {mode === 'approve' ? <ApproveForm payout={t} busy={busyId === t._id} onApprove={() => approve(t._id)} onCancel={() => setDeciding(null)} />
                  : mode === 'reject' ? <RejectForm busy={busyId === t._id} onSubmit={(reason) => reject(t._id, reason)} onCancel={() => setDeciding(null)} />
                  : t.status === 'REQUESTED' ? (
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="accent" onClick={() => setDeciding({ id: t._id, mode: 'approve' })}>Approve</Button>
                      <Button size="sm" variant="ghost" className="border border-danger-600/30 text-danger-600" onClick={() => setDeciding({ id: t._id, mode: 'reject' })}>Reject</Button>
                    </div>
                  ) : t.status === 'PENDING' ? (
                    <div className="mt-4 flex gap-2">
                      {t.checkoutUrl ? <a href={t.checkoutUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-1.5 text-sm font-medium text-ink-900 hover:bg-amber-400"><LuExternalLink className="h-3.5 w-3.5" /> Pay now</a> : null}
                      <Button size="sm" variant="ghost" className="border border-ink-faint/30" isLoading={busyId === t._id} onClick={() => check(t._id)}><LuRefreshCw className="h-3.5 w-3.5" /> Check status</Button>
                    </div>
                  ) : null}
              </Card>
            )
          })}
        </div>}
    </div>
  )
}
export default AdminPayouts
