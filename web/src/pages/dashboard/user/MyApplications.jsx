import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { LuBriefcase, LuX, LuArrowRight } from 'react-icons/lu'
import { useApplicationsStore } from '../../../store/user/applications.store'
import { AttachmentList } from '../../../components/applications/AttachmentList'
import { Card, Badge } from '../../../components/ui/Card'

const TONE = { PENDING: 'amber', APPROVED: 'success', REJECTED: 'danger', COMPLETED: 'neutral', CANCELLED: 'neutral' }

const MyApplications = () => {
  const { applications, isLoading, fetchMyApplications, cancel } = useApplicationsStore()
  const [cancellingId, setCancellingId] = useState(null)
  useEffect(() => { fetchMyApplications() }, [])

  const handleCancel = async (id) => {
    if (!confirm('Cancel this application? You can apply again later.')) return
    setCancellingId(id)
    try { await cancel(id); toast.success('Application cancelled') }
    catch (error) { toast.error(error?.response?.data?.message || 'Could not cancel application') }
    finally { setCancellingId(null) }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-ink-900">My Applications</h1><p className="mt-1 text-sm text-ink-muted">Track your applications, the files you sent, and the admin&rsquo;s response.</p></div>
      {isLoading ? <p className="text-sm text-ink-muted">Loading your applications...</p>
        : applications.length === 0 ? (
          <Card className="text-center">
            <LuBriefcase className="mx-auto mb-3 h-8 w-8 text-ink-faint" />
            <p className="text-sm font-medium text-ink-900">No applications yet</p>
            <p className="mt-1 text-sm text-ink-muted">Browse side-hustles and apply to opportunities that interest you.</p>
            <Link to="/app/explore" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-amber-500 hover:underline">Browse opportunities <LuArrowRight className="h-4 w-4" /></Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const l = app.sideHustleId
              return (
                <Card key={app._id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-ink-900">{l?.title || 'Side-hustle listing'}</h3><Badge tone={TONE[app.applicationStatus] || 'neutral'}>{app.applicationStatus}</Badge></div>
                      <p className="mt-1 text-xs text-ink-muted">{[l?.workMode, l?.payAmountMin ? `\u20b1${l.payAmountMin}\u2013${l.payAmountMax}` : null, `Applied ${new Date(app.applicationDate).toLocaleDateString()}`].filter(Boolean).join(' \u00b7 ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {l?._id ? <Link to={`/app/explore/${l._id}`} className="inline-flex items-center gap-1 rounded-xl border border-ink-faint/30 px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-ink-900/40 hover:text-ink-900">{['CANCELLED', 'REJECTED'].includes(app.applicationStatus) && l.status === 'ACTIVE' ? 'Apply again' : 'View listing'} <LuArrowRight className="h-3 w-3" /></Link> : null}
                      {app.applicationStatus === 'PENDING' ? <button onClick={() => handleCancel(app._id)} disabled={cancellingId === app._id} className="inline-flex items-center gap-1 rounded-xl border border-danger-600/30 px-3 py-1.5 text-xs font-medium text-danger-600 hover:bg-danger-100 disabled:opacity-50"><LuX className="h-3 w-3" />{cancellingId === app._id ? 'Cancelling...' : 'Cancel'}</button> : null}
                    </div>
                  </div>

                  {app.applicationStatus === 'REJECTED' ? (
                    <div className="mt-4 rounded-xl border border-danger-600/25 bg-danger-100/50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-danger-600">Reason for rejection</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-ink-900">{app.decisionMessage || 'No reason was recorded.'}</p>
                    </div>
                  ) : null}
                  {app.applicationStatus === 'APPROVED' && app.decisionMessage ? (
                    <div className="mt-4 rounded-xl border border-success-600/25 bg-success-100/50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-success-600">Message from the admin</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-ink-900">{app.decisionMessage}</p>
                    </div>
                  ) : null}

                  {app.coverNote ? <div className="mt-4"><p className="text-xs font-medium text-ink-muted">Your message</p><p className="mt-1 whitespace-pre-line text-sm italic text-ink-900">&ldquo;{app.coverNote}&rdquo;</p></div> : null}
                  {app.attachments?.length ? <div className="mt-4"><p className="mb-1.5 text-xs font-medium text-ink-muted">Files you sent</p><AttachmentList attachments={app.attachments} /></div> : null}
                </Card>
              )
            })}
          </div>
        )}
    </div>
  )
}
export default MyApplications
