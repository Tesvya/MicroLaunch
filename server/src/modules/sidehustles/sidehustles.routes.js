import express from 'express'
import { createSideHustle, updateSideHustle, deleteSideHustle, listSideHustlesAdmin, listActiveSideHustles, getSideHustleById } from './sidehustles.controller.js'
import { validateRequest } from '../../shared/middlewares/validateRequest.js'
import { createSideHustleSchema, updateSideHustleSchema } from './sidehustles.validator.js'
import { guard } from '../../shared/middlewares/guard.js'
import { objectIdParam } from '../../shared/middlewares/objectIdParam.js'
const r = express.Router()
r.param('id', objectIdParam)
r.get('/', guard(['USER','ADMIN']), listActiveSideHustles)
r.get('/admin/all', guard(['ADMIN']), listSideHustlesAdmin)
r.get('/:id', guard(['USER','ADMIN']), getSideHustleById)
r.post('/', guard(['ADMIN']), validateRequest(createSideHustleSchema), createSideHustle)
r.put('/:id', guard(['ADMIN']), validateRequest(updateSideHustleSchema), updateSideHustle)
r.delete('/:id', guard(['ADMIN']), deleteSideHustle)
export default r
