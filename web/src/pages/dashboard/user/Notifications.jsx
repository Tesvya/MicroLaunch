import { useEffect } from 'react'
import { toast } from 'sonner'
import { LuBell, LuCheck, LuTrash2 } from 'react-icons/lu'
import { useNotificationsStore } from '../../../store/user/notifications.store'

const TYPE_STYLES = {
    RECOMMENDATION: 'bg-amber-100 text-amber-600',
    APPLICATION: 'bg-success-100 text-success-600',
    PAYMENT: 'bg-ink-900/5 text-ink-900',
    SYSTEM: 'bg-ink-faint/20 text-ink-muted'
}

const Notifications = () => {
    const { notifications, isLoading, fetchNotifications, markRead, markAllRead, remove } = useNotificationsStore()

    useEffect(() => {
        fetchNotifications()
    }, [])

    const handleMarkAllRead = async () => {
        await markAllRead()
        toast.success('All notifications marked as read')
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-ink-900">Notifications</h1>
                    <p className="mt-1 text-sm text-ink-muted">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                    </p>
                </div>
                {unreadCount > 0 ? (
                    <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1.5 rounded-xl border border-ink-faint/30 px-3 py-2 text-sm font-medium text-ink-muted hover:border-ink-900/40 hover:text-ink-900"
                    >
                        <LuCheck className="h-4 w-4" /> Mark all as read
                    </button>
                ) : null}
            </div>

            {isLoading ? (
                <p className="text-sm text-ink-muted">Loading notifications...</p>
            ) : notifications.length === 0 ? (
                <div className="rounded-2xl border border-ink-faint/15 bg-surface p-8 text-center">
                    <LuBell className="mx-auto mb-3 h-8 w-8 text-ink-faint" />
                    <p className="text-sm text-ink-muted">No notifications yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.map((notif) => (
                        <div
                            key={notif._id}
                            className={`rounded-2xl border p-4 transition-colors ${
                                notif.isRead
                                    ? 'border-ink-faint/15 bg-surface'
                                    : 'border-amber-500/20 bg-amber-100/20'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="mb-1 flex items-center gap-2">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[notif.notificationType] || TYPE_STYLES.SYSTEM}`}>
                                            {notif.notificationType}
                                        </span>
                                        {!notif.isRead ? (
                                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                                        ) : null}
                                    </div>
                                    <p className="text-sm font-medium text-ink-900">{notif.title}</p>
                                    <p className="mt-0.5 text-sm text-ink-muted">{notif.message}</p>
                                    <p className="mt-1 text-xs text-ink-faint">
                                        {new Date(notif.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    {!notif.isRead ? (
                                        <button
                                            onClick={() => markRead(notif._id)}
                                            className="rounded-lg p-1.5 text-ink-faint hover:bg-ink-900/5 hover:text-ink-900"
                                            title="Mark as read"
                                        >
                                            <LuCheck className="h-4 w-4" />
                                        </button>
                                    ) : null}
                                    <button
                                        onClick={() => remove(notif._id)}
                                        className="rounded-lg p-1.5 text-ink-faint hover:bg-danger-100 hover:text-danger-600"
                                        title="Delete"
                                    >
                                        <LuTrash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Notifications
