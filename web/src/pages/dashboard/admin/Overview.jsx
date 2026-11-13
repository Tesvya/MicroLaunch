import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    LuUsers,
    LuBriefcase,
    LuWallet,
    LuStar,
    LuCircleCheck,
    LuClipboardList,
    LuArrowRight
} from 'react-icons/lu'
import { useAdminStore } from '../../../store/admin/admin.store'

const peso = (n) => `\u20b1${Number(n || 0).toLocaleString('en-PH')}`

const StatCard = ({ icon: Icon, label, value, tone = 'text-ink-900', to }) => (
    <div className="rounded-2xl border border-ink-faint/15 bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900/5">
                <Icon className="h-5 w-5 text-ink-muted" />
            </div>
            <div className="flex-1">
                <p className="text-xs text-ink-muted">{label}</p>
                <p className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
            </div>
            {to ? (
                <Link to={to} className="text-ink-faint hover:text-ink-900">
                    <LuArrowRight className="h-4 w-4" />
                </Link>
            ) : null}
        </div>
    </div>
)

const AdminOverview = () => {
    const { overview, fetchOverview } = useAdminStore()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchOverview().finally(() => setIsLoading(false))
    }, [])

    if (isLoading) {
        return <p className="text-sm text-ink-muted">Loading platform overview...</p>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-ink-900">Platform Overview</h1>
                <p className="mt-1 text-sm text-ink-muted">A real-time snapshot of MICROLAUNCH activity.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard
                    icon={LuUsers}
                    label="Registered users"
                    value={overview?.userCount ?? 0}
                    to="/admin/users"
                />
                <StatCard
                    icon={LuBriefcase}
                    label="Active listings"
                    value={overview?.activeListingCount ?? 0}
                    to="/admin/listings"
                />
                <StatCard
                    icon={LuClipboardList}
                    label="Pending applications"
                    value={overview?.pendingApplications ?? 0}
                    tone={overview?.pendingApplications > 0 ? 'text-amber-500' : 'text-ink-900'}
                    to="/admin/applications"
                />
                <StatCard
                    icon={LuWallet}
                    label="Income facilitated"
                    value={peso(overview?.totalIncomeFacilitated)}
                    tone="text-success-600"
                />
                <StatCard
                    icon={LuCircleCheck}
                    label="Successful transactions"
                    value={overview?.successfulTransactionCount ?? 0}
                />
                <StatCard
                    icon={LuStar}
                    label="Average satisfaction"
                    value={overview?.averageSatisfactionStars
                        ? `${overview.averageSatisfactionStars} / 5`
                        : 'No ratings yet'}
                />
            </div>

            {overview?.pendingApplications > 0 ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-100/30 p-4">
                    <p className="text-sm font-medium text-amber-600">
                        {overview.pendingApplications} application{overview.pendingApplications > 1 ? 's' : ''} waiting for review.
                    </p>
                    <Link
                        to="/admin/applications"
                        className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:underline"
                    >
                        Review now <LuArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            ) : null}
        </div>
    )
}

export default AdminOverview
