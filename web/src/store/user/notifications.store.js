import { create } from 'zustand'
import { getMyNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '../../services/user/notifications.service'
export const useNotificationsStore = create((set, get) => ({
  notifications: [], unreadCount: 0, isLoading: false,
  fetchNotifications: async () => { set({ isLoading: true }); const r = await getMyNotifications(); set({ notifications: r.data?.properties?.notifications || [], isLoading: false }); return r },
  fetchUnreadCount: async () => { const r = await getUnreadCount(); set({ unreadCount: r.data?.properties?.count || 0 }); return r },
  markRead: async (id) => { await markAsRead(id); set({ notifications: get().notifications.map((n) => n._id === id ? { ...n, isRead: true } : n), unreadCount: Math.max(0, get().unreadCount - 1) }) },
  markAllRead: async () => { await markAllAsRead(); set({ notifications: get().notifications.map((n) => ({ ...n, isRead: true })), unreadCount: 0 }) },
  remove: async (id) => { await deleteNotification(id); const removed = get().notifications.find((n) => n._id === id); set({ notifications: get().notifications.filter((n) => n._id !== id), unreadCount: removed && !removed.isRead ? Math.max(0, get().unreadCount - 1) : get().unreadCount }) }
}))
