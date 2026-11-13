import express from 'express'
import { listUsers,setUserActiveStatus,getPlatformOverview,verifyUserEmail } from './admin.controller.js'
import { guard } from '../../shared/middlewares/guard.js'
const r=express.Router()
r.get('/overview',guard(['ADMIN']),getPlatformOverview)
r.get('/users',guard(['ADMIN']),listUsers)
r.patch('/users/:id/status',guard(['ADMIN']),setUserActiveStatus)
r.patch('/users/:id/verify-email',guard(['ADMIN']),verifyUserEmail)
export default r
