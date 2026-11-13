import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { LuFileText, LuPlus } from 'react-icons/lu'
import { useReportsStore } from '../../../store/admin/reports.store'

const REPORT_TYPES = [
    { value: 'USERS', label: 'Users Report' },
    { value: 'APPLICATIONS', label: 'Applications Report' },
    { value: 'RECOMMENDATIONS', label: 'Recommendations Report' },
    { value: 'FINANCIAL', label: 'Financial Report' },
    { value: 'FEEDBACK', label: 'Feedback & Ratings Report' },
    { value: 'TRANSACTIONS', label: 'Transactions Report' }
]

const PERIODS = [
    { value: 'ALL_TIME', label: 'All time' },
    { value: 'DAILY', label: 'Last 24 hours' },
    { value: 'WEEKLY', label: 'Last 7 days' },
    { value: 'MONTHLY', label: 'This month' },
    { value: 'YEARLY', label: 'This year' }
]

const SummaryDisplay = ({ summary }) => {
    if (!summary || Object.keys(summary).length === 0) return null
    return (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(summary).map(([key, value]) => (
                typeof value === 'object' ? null : (
                    <div key={key} className="rounded-xl bg-canvas p-3">
                        <p className="text-xs text-ink-muted capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                        <p className="text-sm font-semibold text-ink-900">
                            {typeof value === 'number' && key.toLowerCase().includes('earned') || key.toLowerCase().includes('transacted')
                                ? `₱${value.toLocaleString('en-PH')}`
                                : value?.toString()}
                        </p>
                    </div>
                )
            ))}
        </div>
    )
}

const AdminReports = () => {
    const { reports, isLoading, fetchReports, generate } = useReportsStore()
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ reportType: 'USERS', reportPeriod: 'ALL_TIME' })
    const [isGenerating, setIsGenerating] = useState(false)
    const [expandedId, setExpandedId] = useState(null)

    useEffect(() => {
        fetchReports()
    }, [])

    const handleGenerate = async (e) => {
        e.preventDefault()
        setIsGenerating(true)
        try {
            await generate(form)
            toast.success('Report generated')
            setShowForm(false)
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not generate report')
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-ink-900">Reports</h1>
                    <p className="mt-1 text-sm text-ink-muted">Generate and review platform reports.</p>
                </div>
                <button
                    onClick={() => setShowForm((s) => !s)}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-ink-900 hover:bg-amber-400"
                >
                    <LuPlus className="h-4 w-4" /> Generate report
                </button>
            </div>

            {showForm ? (
                <div className="rounded-2xl border border-ink-faint/15 bg-surface p-6 shadow-sm">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">New report</h2>
                    <form onSubmit={handleGenerate} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-ink-900">Report type</span>
                                <select
                                    value={form.reportType}
                                    onChange={(e) => setForm({ ...form, reportType: e.target.value })}
                                    className="w-full rounded-xl border border-ink-faint/40 bg-surface px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-ink-900"
                                >
                                    {REPORT_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium text-ink-900">Period</span>
                                <select
                                    value={form.reportPeriod}
                                    onChange={(e) => setForm({ ...form, reportPeriod: e.target.value })}
                                    className="w-full rounded-xl border border-ink-faint/40 bg-surface px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-ink-900"
                                >
                                    {PERIODS.map((p) => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={isGenerating}
                                className="rounded-xl bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-800 disabled:opacity-50"
                            >
                                {isGenerating ? 'Generating...' : 'Generate'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="rounded-xl border border-ink-faint/30 px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink-900"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            ) : null}

            {isLoading ? (
                <p className="text-sm text-ink-muted">Loading reports...</p>
            ) : reports.length === 0 ? (
                <div className="rounded-2xl border border-ink-faint/15 bg-surface p-8 text-center">
                    <LuFileText className="mx-auto mb-3 h-8 w-8 text-ink-faint" />
                    <p className="text-sm text-ink-muted">No reports generated yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reports.map((report) => (
                        <div key={report._id} className="rounded-2xl border border-ink-faint/15 bg-surface p-5 shadow-sm">
                            <div
                                className="flex cursor-pointer flex-wrap items-center justify-between gap-3"
                                onClick={() => setExpandedId(expandedId === report._id ? null : report._id)}
                            >
                                <div>
                                    <p className="font-medium text-ink-900">
                                        {REPORT_TYPES.find((t) => t.value === report.reportType)?.label || report.reportType}
                                    </p>
                                    <p className="text-xs text-ink-muted">
                                        {report.reportPeriod} · Generated by {report.adminId?.name} · {new Date(report.generatedAt).toLocaleString()}
                                    </p>
                                </div>
                                <span className="text-xs text-ink-faint">{expandedId === report._id ? '▲ Hide' : '▼ View'}</span>
                            </div>
                            {expandedId === report._id ? (
                                <SummaryDisplay summary={report.summary} />
                            ) : null}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default AdminReports
