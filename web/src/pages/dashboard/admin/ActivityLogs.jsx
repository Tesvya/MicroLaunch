import { useEffect, useState } from 'react'
import { LuActivity } from 'react-icons/lu'
import { useReportsStore } from '../../../store/admin/reports.store'

const MODULES = ['', 'USER_MANAGEMENT', 'LISTINGS', 'APPLICATIONS', 'RECOMMENDATIONS', 'REPORTS', 'TRANSACTIONS', 'FEEDBACK', 'SYSTEM']

const AdminActivityLogs = () => {
    const { logs, isLoading, fetchLogs } = useReportsStore()
    const [filter, setFilter] = useState('')

    useEffect(() => {
        fetchLogs(filter)
    }, [filter])

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-ink-900">Activity Logs</h1>
                    <p className="mt-1 text-sm text-ink-muted">Track all administrative actions on the platform.</p>
                </div>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="rounded-xl border border-ink-faint/30 bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-ink-900"
                >
                    {MODULES.map((m) => (
                        <option key={m} value={m}>{m || 'All modules'}</option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <p className="text-sm text-ink-muted">Loading activity logs...</p>
            ) : logs.length === 0 ? (
                <div className="rounded-2xl border border-ink-faint/15 bg-surface p-8 text-center">
                    <LuActivity className="mx-auto mb-3 h-8 w-8 text-ink-faint" />
                    <p className="text-sm text-ink-muted">No activity logs yet.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-ink-faint/15 bg-surface shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-ink-faint/15 bg-canvas text-xs uppercase tracking-wide text-ink-muted">
                            <tr>
                                <th className="px-5 py-3 font-medium">Admin</th>
                                <th className="px-5 py-3 font-medium">Activity</th>
                                <th className="px-5 py-3 font-medium">Module</th>
                                <th className="px-5 py-3 font-medium">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-faint/10">
                            {logs.map((log) => (
                                <tr key={log._id}>
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-ink-900">{log.adminId?.name}</p>
                                        <p className="text-xs text-ink-muted">{log.adminId?.email}</p>
                                    </td>
                                    <td className="px-5 py-3 text-ink-900">{log.activity}</td>
                                    <td className="px-5 py-3">
                                        <span className="rounded-full bg-ink-900/5 px-2.5 py-1 text-xs font-medium text-ink-muted">
                                            {log.module}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-ink-muted">
                                        {new Date(log.activityDate).toLocaleString()}
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

export default AdminActivityLogs
