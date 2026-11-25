import express from 'express'
import { createIncomeEntry,updateIncomeEntry,deleteIncomeEntry,listMyIncomeEntries,getMyDashboardSummary } from './income.controller.js'
import { validateRequest } from '../../shared/middlewares/validateRequest.js'
import { createIncomeEntrySchema,updateIncomeEntrySchema } from './income.validator.js'
import { guard } from '../../shared/middlewares/guard.js'
import { objectIdParam } from '../../shared/middlewares/objectIdParam.js'
const r=express.Router()
r.param('id', objectIdParam)
r.get('/summary',guard(['USER']),getMyDashboardSummary)
r.get('/entries',guard(['USER']),listMyIncomeEntries)
r.post('/entries',guard(['USER']),validateRequest(createIncomeEntrySchema),createIncomeEntry)
r.put('/entries/:id',guard(['USER']),validateRequest(updateIncomeEntrySchema),updateIncomeEntry)
r.delete('/entries/:id',guard(['USER']),deleteIncomeEntry)
export default r
