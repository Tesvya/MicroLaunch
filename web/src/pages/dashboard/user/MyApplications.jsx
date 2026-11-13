import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { LuBriefcase, LuX, LuArrowRight } from 'react-icons/lu'
import { useApplicationsStore } from '../../../store/user/applications.store'

const STATUS_TONE = {
    PENDING: 'bg-amber-100 text-amber-600',
    APPROVED: 'bg-success-100 text-success-600',
    REJECTED: 'bg-danger-100 text-danger-600',
    COMPLETED: 'bg-ink-900/5 text-ink-muted',
    CANCELLED: 'bg-ink-900/5 text-ink-faint'
}

const MyApplications = () => {
    const { applications, isLoading, fetchMyApplications, cancel } = useApplicationsStore()
    const [cancellingId, setCancellingId] = useState(null)

    useEffect(() => {
        fetchMyApplications()
    }, [])

    const handleCancel = async (id) => {
        if (!confirm('Cancel this application?')) return
        setCancellingId(id)
        try {
            await cancel(id)
            toast.success('Application cancelled')
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not cancel application')
        } finally {
            setCancellingId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-ink-900">My Applications</h1>
                <p className="mt-1 text-sm text-ink-muted">
                    Track the status of your side-hustle applications.
                </p>
            </div>

            {isLoading ? (
                <p className="text-sm text-ink-muted">Loading your applications...</p>
            ) : applications.length === 0 ? (
                <div className="rounded-2xl border border-ink-faint/15 bg-surface p-8 text-center">
                    <LuBriefcase className="mx-auto mb-3 h-8 w-8 text-ink-faint" />
                    <p className="text-sm font-medium text-ink-900">No applications yet</p>
                    <p className="mt-1 text-sm text-ink-muted">
                        Browse side-hustles and apply to opportunities that interest you.
                    </p>
                    <Link
                        to="/app/explore"
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-amber-500 hover:underline"
                    >
                        Browse opportunities <LuArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {applications.map((app) => (
                        <div
                            key={app._id}
                            className="rounded-2xl border border-ink-faint/15 bg-surface p-5 shadow-sm"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-semibold text-ink-900">
                                            {app.sideHustleId?.title || 'Side-hustle listing'}
                                        </h3>
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[app.applicationStatus] || STATUS_TONE.PENDING}`}>
                                            {app.applicationStatus}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                                        <span>{app.sideHustleId?.workMode}</span>
                                        {app.sideHustleId?.payAmountMin ? (
                                            <span>₱{app.sideHustleId.payAmountMin}–{app.sideHustleId.payAmountMax}</span>
                                        ) : null}
                                        <span>Applied {new Date(app.applicationDate).toLocaleDateString()}</span>
                                    </div>
                                    {app.coverNote ? (
                                        <p className="mt-2 text-sm text-ink-muted italic">"{app.coverNote}"</p>
                                    ) : null}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Link to={`/app/explore/${app.sideHustleId?._id}`}>
                                        <button className="flex items-center gap-1.5 rounded-xl border border-ink-faint/30 px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-ink-900/40 hover:text-ink-900">
                                            View <LuArrowRight className="h-3 w-3" />
                                        </button>
                                    </Link>
                                    {app.applicationStatus === 'PENDING' ? (
                                        <button
                                            onClick={() => handleCancel(app._id)}
                                            disabled={cancellingId === app._id}
                                            className="flex items-center gap-1.5 rounded-xl border border-danger-600/30 px-3 py-1.5 text-xs font-medium text-danger-600 hover:bg-danger-100 disabled:opacity-50"
                                        >
                                            <LuX className="h-3 w-3" />
                                            {cancellingId === app._id ? 'Cancelling...' : 'Cancel'}
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default MyApplications
