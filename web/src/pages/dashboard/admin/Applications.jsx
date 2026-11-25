import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { LuChevronDown, LuChevronUp } from 'react-icons/lu'
import { useApplicationsStore } from '../../../store/user/applications.store'
import { AttachmentList } from '../../../components/applications/AttachmentList'

const STATUS_TONE = {
  PENDING: 'bg-amber-100 text-amber-600',
  APPROVED: 'bg-success-100 text-success-600',
  REJECTED: 'bg-danger-100 text-danger-600',
  COMPLETED: 'bg-ink-900/5 text-ink-muted',
  CANCELLED: 'bg-ink-900/5 text-ink-faint'
}
const list = (a) => (Array.isArray(a) ? a.join(', ') : a) || '—' // qualifications is a plain string; skills and interests are arrays

const DecisionBox = ({ mode, busy, onSubmit, onCancel }) => {
  const [text, setText] = useState('')
  const reject = mode === 'REJECTED'
  const tooShort = reject && text.trim().length < 10
  return (
    <div className="mt-4 rounded-xl border border-ink-faint/20 bg-surface p-4">
      <label className="text-sm font-medium text-ink-900">
        {reject ? 'Reason for rejection (sent to the applicant)' : 'Message to the applicant (optional)'}
      </label>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={500}
        placeholder={reject ? 'e.g. We need someone with at least 6 months of customer-service experience.' : 'e.g. Welcome aboard! We will contact you with the schedule.'}
        className="mt-2 w-full rounded-xl border border-ink-faint/30 bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-ink-900" />
      <div className="mt-1 text-xs text-ink-muted">{reject ? 'At least 10 characters. ' : ''}{text.length}/500</div>
      <div className="mt-3 flex gap-2">
        <button disabled={busy || tooShort} onClick={() => onSubmit(text.trim())}
          className={`rounded-lg px-4 py-1.5 text-xs font-medium disabled:opacity-50 ${reject ? 'bg-danger-600 text-white' : 'bg-success-600 text-white'}`}>
          {reject ? 'Reject and notify applicant' : 'Approve applicant'}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-ink-faint/30 px-4 py-1.5 text-xs text-ink-muted">Cancel</button>
      </div>
    </div>
  )
}

const AdminApplications = () => {
  const { adminApplications, isLoading, fetchAllApplications, changeStatus } = useApplicationsStore()
  const [filter, setFilter] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [deciding, setDeciding] = useState(null) // { id, mode }

  useEffect(() => { fetchAllApplications(filter) }, [filter])

  const handleStatus = async (id, status, message) => {
    setBusyId(id)
    try {
      await changeStatus(id, status, message)
      toast.success(status === 'REJECTED' ? 'Applicant rejected and notified' : `Application ${status.toLowerCase()}`)
      setDeciding(null)
      await fetchAllApplications(filter)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update status')
      fetchAllApplications(filter)
    } finally { setBusyId(null) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Applications</h1>
          <p className="mt-1 text-sm text-ink-muted">Open an application to read the applicant's message, profile and uploaded files before deciding.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-ink-faint/30 bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-ink-900">
          <option value="">All statuses</option>
          {['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}
        </select>
      </div>

      {isLoading ? <p className="text-sm text-ink-muted">Loading applications...</p>
        : adminApplications.length === 0 ? <p className="text-sm text-ink-muted">No applications found.</p>
        : <div className="space-y-3">
          {adminApplications.map((app) => {
            const open = openId === app._id
            const p = app.applicantProfile
            const sh = app.sideHustleId
            const files = app.attachments || []
            return (
              <div key={app._id} className="rounded-2xl border border-ink-faint/15 bg-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink-900">{app.userId?.name} <span className="text-xs font-normal text-ink-muted">{app.userId?.email}</span></p>
                    <p className="text-sm text-ink-muted">
                      Applied for <span className="text-ink-900">{sh?.title}</span> &middot; {new Date(app.applicationDate).toLocaleDateString()}
                      {sh?.openings ? <> &middot; {app.approvedCount} of {sh.openings} openings filled</> : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {files.length ? <span className="text-xs text-ink-muted">{files.length} file{files.length > 1 ? 's' : ''}</span> : null}
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[app.applicationStatus] || STATUS_TONE.PENDING}`}>{app.applicationStatus}</span>
                    <button onClick={() => setOpenId(open ? null : app._id)} className="inline-flex items-center gap-1 rounded-lg border border-ink-faint/30 px-3 py-1 text-xs font-medium text-ink-900">
                      {open ? <>Hide <LuChevronUp className="h-3.5 w-3.5" /></> : <>Review <LuChevronDown className="h-3.5 w-3.5" /></>}
                    </button>
                  </div>
                </div>

                {open ? (
                  <div className="mt-4 space-y-4 border-t border-ink-faint/15 pt-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Applicant's message</p>
                      <p className="mt-1 whitespace-pre-wrap text-ink-900">{app.coverNote || 'No message was included.'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Uploaded files</p>
                      <div className="mt-1"><AttachmentList attachments={files} /></div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Applicant profile</p>
                      {p ? (
                        <dl className="mt-1 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                          <div><dt className="inline text-ink-muted">Skills: </dt><dd className="inline text-ink-900">{list(p.skills)}</dd></div>
                          <div><dt className="inline text-ink-muted">Interests: </dt><dd className="inline text-ink-900">{list(p.interests)}</dd></div>
                          <div><dt className="inline text-ink-muted">Experience: </dt><dd className="inline text-ink-900">{p.experienceLevel || '—'}</dd></div>
                          <div><dt className="inline text-ink-muted">Hours/week: </dt><dd className="inline text-ink-900">{p.weeklyAvailabilityHours ?? '—'}</dd></div>
                          <div><dt className="inline text-ink-muted">Qualifications: </dt><dd className="inline text-ink-900">{list(p.qualifications)}</dd></div>
                          <div><dt className="inline text-ink-muted">Location: </dt><dd className="inline text-ink-900">{p.location || '—'}</dd></div>
                          {p.bio ? <div className="sm:col-span-2"><dt className="inline text-ink-muted">Bio: </dt><dd className="inline text-ink-900">{p.bio}</dd></div> : null}
                        </dl>
                      ) : <p className="mt-1 text-ink-muted">This applicant has not filled in a profile.</p>}
                    </div>
                    {app.decisionMessage ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Message sent to applicant</p>
                        <p className="mt-1 whitespace-pre-wrap text-ink-900">{app.decisionMessage}</p>
                      </div>
                    ) : null}

                    {deciding?.id === app._id ? (
                      <DecisionBox mode={deciding.mode} busy={busyId === app._id}
                        onSubmit={(msg) => handleStatus(app._id, deciding.mode, msg)} onCancel={() => setDeciding(null)} />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {app.applicationStatus === 'PENDING' ? (<>
                          <button onClick={() => setDeciding({ id: app._id, mode: 'APPROVED' })} className="rounded-lg border border-success-600/30 px-3 py-1 text-xs font-medium text-success-600 hover:bg-success-100">Approve</button>
                          <button onClick={() => setDeciding({ id: app._id, mode: 'REJECTED' })} className="rounded-lg border border-danger-600/30 px-3 py-1 text-xs font-medium text-danger-600 hover:bg-danger-100">Reject</button>
                        </>) : app.applicationStatus === 'APPROVED' ? (<>
                          <button disabled={busyId === app._id} onClick={() => handleStatus(app._id, 'COMPLETED')} className="rounded-lg border border-ink-faint/30 px-3 py-1 text-xs font-medium text-ink-muted hover:text-ink-900 disabled:opacity-50">Mark completed</button>
                          <button onClick={() => setDeciding({ id: app._id, mode: 'REJECTED' })} className="rounded-lg border border-danger-600/30 px-3 py-1 text-xs font-medium text-danger-600 hover:bg-danger-100">Withdraw approval</button>
                        </>) : null}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>}
    </div>
  )
}

export default AdminApplications
