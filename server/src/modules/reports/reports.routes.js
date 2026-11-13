import express from 'express'
import { generateReport,listReports,getReport } from './reports.controller.js'
import { guard } from '../../shared/middlewares/guard.js'
const r=express.Router()
r.post('/generate',guard(['ADMIN']),generateReport)
r.get('/',guard(['ADMIN']),listReports)
r.get('/:id',guard(['ADMIN']),getReport)
export default r
