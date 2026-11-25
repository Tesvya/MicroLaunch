import express from 'express'
import { applyToSideHustle, listMyApplications, cancelApplication, downloadAttachment, listAllApplications, updateApplicationStatus } from './applications.controller.js'
import { validateRequest } from '../../shared/middlewares/validateRequest.js'
import { createApplicationSchema, updateApplicationStatusSchema } from './applications.validator.js'
import { parseAttachments } from './uploads.js'
import { guard } from '../../shared/middlewares/guard.js'
import { objectIdParam } from '../../shared/middlewares/objectIdParam.js'
const r = express.Router()
r.param('id', objectIdParam)
// guard runs BEFORE the upload parser so anonymous requests never get their files read
r.post('/', guard(['USER']), parseAttachments, validateRequest(createApplicationSchema), applyToSideHustle)
r.get('/me', guard(['USER']), listMyApplications)
r.get('/files/:fileId', guard(['USER', 'ADMIN']), downloadAttachment)
r.patch('/:id/cancel', guard(['USER']), cancelApplication)
r.get('/admin/all', guard(['ADMIN']), listAllApplications)
r.patch('/:id/status', guard(['ADMIN']), validateRequest(updateApplicationStatusSchema), updateApplicationStatus)
export default r
