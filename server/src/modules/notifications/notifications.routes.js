import express from 'express'
import { getMyNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from './notifications.controller.js'
import { guard } from '../../shared/middlewares/guard.js'
const r = express.Router()
r.get('/', guard(['USER','ADMIN']), getMyNotifications)
r.get('/unread-count', guard(['USER','ADMIN']), getUnreadCount)
r.patch('/:id/read', guard(['USER','ADMIN']), markAsRead)
r.patch('/read-all', guard(['USER','ADMIN']), markAllAsRead)
r.delete('/:id', guard(['USER','ADMIN']), deleteNotification)
export default r
