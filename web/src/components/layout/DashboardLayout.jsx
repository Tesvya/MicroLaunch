import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LuLayoutDashboard, LuSparkles, LuWallet, LuStar, LuUser, LuLogOut, LuUsers, LuBriefcase, LuGauge, LuClipboardList, LuBell, LuFileText, LuActivity, LuMenu, LuX, LuReceipt, LuHeart, LuBadgeCheck } from 'react-icons/lu'
import { FAVORITE } from '../../shared/labels'
import { useAuth } from '../../hooks/useAuth.hook'
import { useAuthStore } from '../../store/auth/auth.store'
import { useNotificationsStore } from '../../store/user/notifications.store'

const USER_NAV = [
    { to: '/app/recommendations', label: 'Recommendations', icon: LuSparkles },
    { to: '/app/explore', label: 'Browse Side-Hustles', icon: LuBriefcase },
    { to: '/app/favorites', label: FAVORITE.navLabel, icon: LuHeart },
    { to: '/app/applications', label: 'My Applications', icon: LuClipboardList },
    { to: '/app/income', label: 'Income Tracker', icon: LuWallet },
    { to: '/app/transactions', label: 'Transactions', icon: LuReceipt },
    { to: '/app/ratings', label: 'My Ratings', icon: LuStar },
    { to: '/app/notifications', label: 'Notifications', icon: LuBell },
    { to: '/app/profile', label: 'My Profile', icon: LuUser }
]
const ADMIN_NAV = [
    { to: '/admin/dashboard', label: 'Overview', icon: LuGauge },
    { to: '/admin/listings', label: 'Side-Hustle Listings', icon: LuBriefcase },
    { to: '/admin/applications', label: 'Applications', icon: LuClipboardList },
    { to: '/admin/payouts', label: 'Payouts', icon: LuReceipt },
    { to: '/admin/pwd-verifications', label: 'PWD Verification', icon: LuBadgeCheck },
    { to: '/admin/users', label: 'Manage Users', icon: LuUsers },
    { to: '/admin/reports', label: 'Reports', icon: LuFileText },
    { to: '/admin/activity-logs', label: 'Activity Logs', icon: LuActivity }
]

const Sidebar = ({ variant, user, unreadCount, onLogout, onClose }) => {
    const navItems = variant === 'admin' ? ADMIN_NAV : USER_NAV
    return (
        <div className="flex h-full flex-col border-r border-ink-faint/15 bg-surface px-4 py-6">
            <div className="mb-8 flex items-center justify-between px-2">
                <div className="flex items-center gap-2"><LuLayoutDashboard className="h-5 w-5 text-amber-500" /><span className="font-display text-lg font-semibold text-ink-900">MICROLAUNCH</span></div>
                {onClose ? <button onClick={onClose} className="text-ink-muted hover:text-ink-900 md:hidden"><LuX className="h-5 w-5" /></button> : null}
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
                {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-ink-900 text-white' : 'text-ink-muted hover:bg-ink-900/5 hover:text-ink-900'}`}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{label}</span>
                        {to === '/app/notifications' && unreadCount > 0 ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-ink-900">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
                    </NavLink>
                ))}
            </nav>
            <div className="border-t border-ink-faint/15 pt-4">
                <div className="mb-3 px-2"><p className="truncate text-sm font-medium text-ink-900">{user?.name}</p><p className="truncate text-xs text-ink-muted">{user?.email}</p></div>
                <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-danger-100 hover:text-danger-600"><LuLogOut className="h-4 w-4" />Log out</button>
            </div>
        </div>
    )
}

export const DashboardLayout = ({ variant = 'user' }) => {
    const { user } = useAuth()
    const logout = useAuthStore((s) => s.logout)
    const navigate = useNavigate()
    const [mobileOpen, setMobileOpen] = useState(false)
    const { unreadCount, fetchUnreadCount } = useNotificationsStore()

    useEffect(() => {
        if (variant === 'user') {
            fetchUnreadCount().catch(() => {})
            const interval = setInterval(() => fetchUnreadCount().catch(() => {}), 60000)
            return () => clearInterval(interval)
        }
    }, [variant])

    const handleLogout = async () => { await logout(); navigate('/login', { replace: true }) }

    return (
        <div className="flex min-h-screen bg-canvas">
            <aside className="hidden w-64 shrink-0 md:block"><div className="sticky top-0 h-screen"><Sidebar variant={variant} user={user} unreadCount={unreadCount} onLogout={handleLogout} /></div></aside>
            {mobileOpen ? (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-ink-900/30" onClick={() => setMobileOpen(false)} />
                    <div className="absolute left-0 top-0 h-full w-64 shadow-xl"><Sidebar variant={variant} user={user} unreadCount={unreadCount} onLogout={handleLogout} onClose={() => setMobileOpen(false)} /></div>
                </div>
            ) : null}
            <div className="flex flex-1 flex-col">
                <header className="flex items-center gap-3 border-b border-ink-faint/15 bg-surface px-4 py-4 md:hidden">
                    <button onClick={() => setMobileOpen(true)} className="text-ink-muted hover:text-ink-900"><LuMenu className="h-5 w-5" /></button>
                    <div className="flex items-center gap-2"><LuLayoutDashboard className="h-4 w-4 text-amber-500" /><span className="font-display font-semibold text-ink-900">MICROLAUNCH</span></div>
                </header>
                <main className="flex-1 px-4 py-6 md:px-8 md:py-8"><Outlet /></main>
            </div>
        </div>
    )
}
