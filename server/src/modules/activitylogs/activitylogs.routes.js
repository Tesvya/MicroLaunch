import express from 'express'
import { getActivityLogs } from './activitylogs.controller.js'
import { guard } from '../../shared/middlewares/guard.js'
const r = express.Router()
r.get('/', guard(['ADMIN']), getActivityLogs)
export default r
