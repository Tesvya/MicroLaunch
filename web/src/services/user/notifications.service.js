import { apiInstance } from '../../api/_base_.js'
export const getMyNotifications = async () => apiInstance.get('notifications')
export const getUnreadCount = async () => apiInstance.get('notifications/unread-count')
export const markAsRead = async (id) => apiInstance.patch(`notifications/${id}/read`)
export const markAllAsRead = async () => apiInstance.patch('notifications/read-all')
export const deleteNotification = async (id) => apiInstance.delete(`notifications/${id}`)
