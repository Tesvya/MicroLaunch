import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useApplicationsStore } from '../../../store/user/applications.store'

const STATUS_TONE = {
    PENDING: 'bg-amber-100 text-amber-600',
    APPROVED: 'bg-success-100 text-success-600',
    REJECTED: 'bg-danger-100 text-danger-600',
    COMPLETED: 'bg-ink-900/5 text-ink-muted',
    CANCELLED: 'bg-ink-900/5 text-ink-faint'
}

const AdminApplications = () => {
    const { adminApplications, isLoading, fetchAllApplications, changeStatus } = useApplicationsStore()
    const [filter, setFilter] = useState('')
    const [busyId, setBusyId] = useState(null)

    useEffect(() => {
        fetchAllApplications(filter)
    }, [filter])

    const handleStatus = async (id, status) => {
        setBusyId(id)
        try {
            await changeStatus(id, status)
            toast.success(`Application ${status.toLowerCase()}`)
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not update status')
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-ink-900">Applications</h1>
                    <p className="mt-1 text-sm text-ink-muted">Review and manage user applications.</p>
                </div>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="rounded-xl border border-ink-faint/30 bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-ink-900"
                >
                    <option value="">All statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
            </div>

            {isLoading ? (
                <p className="text-sm text-ink-muted">Loading applications...</p>
            ) : adminApplications.length === 0 ? (
                <p className="text-sm text-ink-muted">No applications found.</p>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-ink-faint/15 bg-surface shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-ink-faint/15 bg-canvas text-xs uppercase tracking-wide text-ink-muted">
                            <tr>
                                <th className="px-5 py-3 font-medium">Applicant</th>
                                <th className="px-5 py-3 font-medium">Side-Hustle</th>
                                <th className="px-5 py-3 font-medium">Date Applied</th>
                                <th className="px-5 py-3 font-medium">Status</th>
                                <th className="px-5 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-faint/10">
                            {adminApplications.map((app) => (
                                <tr key={app._id}>
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-ink-900">{app.userId?.name}</p>
                                        <p className="text-xs text-ink-muted">{app.userId?.email}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-900">{app.sideHustleId?.title}</td>
                                    <td className="px-5 py-3 text-ink-muted">
                                        {new Date(app.applicationDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[app.applicationStatus] || STATUS_TONE.PENDING}`}>
                                            {app.applicationStatus}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        {app.applicationStatus === 'PENDING' ? (
                                            <div className="flex gap-2">
                                                <button
                                                    disabled={busyId === app._id}
                                                    onClick={() => handleStatus(app._id, 'APPROVED')}
                                                    className="rounded-lg border border-success-600/30 px-3 py-1 text-xs font-medium text-success-600 hover:bg-success-100 disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    disabled={busyId === app._id}
                                                    onClick={() => handleStatus(app._id, 'REJECTED')}
                                                    className="rounded-lg border border-danger-600/30 px-3 py-1 text-xs font-medium text-danger-600 hover:bg-danger-100 disabled:opacity-50"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        ) : app.applicationStatus === 'APPROVED' ? (
                                            <button
                                                disabled={busyId === app._id}
                                                onClick={() => handleStatus(app._id, 'COMPLETED')}
                                                className="rounded-lg border border-ink-faint/30 px-3 py-1 text-xs font-medium text-ink-muted hover:border-ink-900/40 hover:text-ink-900 disabled:opacity-50"
                                            >
                                                Mark completed
                                            </button>
                                        ) : (
                                            <span className="text-xs text-ink-faint">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default AdminApplications
