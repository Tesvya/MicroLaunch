import express from 'express'
import { applyToSideHustle,listMyApplications,cancelApplication,listAllApplications,updateApplicationStatus } from './applications.controller.js'
import { validateRequest } from '../../shared/middlewares/validateRequest.js'
import { createApplicationSchema,updateApplicationStatusSchema } from './applications.validator.js'
import { guard } from '../../shared/middlewares/guard.js'
const r=express.Router()
r.post('/',guard(['USER']),validateRequest(createApplicationSchema),applyToSideHustle)
r.get('/me',guard(['USER']),listMyApplications)
r.patch('/:id/cancel',guard(['USER']),cancelApplication)
r.get('/admin/all',guard(['ADMIN']),listAllApplications)
r.patch('/:id/status',guard(['ADMIN']),validateRequest(updateApplicationStatusSchema),updateApplicationStatus)
export default r
