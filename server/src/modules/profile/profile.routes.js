import express from 'express'
import { getMyProfile, upsertMyProfile } from './profile.controller.js'
import { submitPwdProof, downloadPwdFile, listPwdVerifications, decidePwdVerification } from './pwd.controller.js'
import { parseAttachments } from '../applications/uploads.js'
import { validateRequest } from '../../shared/middlewares/validateRequest.js'
import { upsertProfileSchema } from './profile.validator.js'
import { guard } from '../../shared/middlewares/guard.js'
const profileRoutes = express.Router()
profileRoutes.get('/me', guard(['USER']), getMyProfile)
profileRoutes.put('/me', guard(['USER']), validateRequest(upsertProfileSchema), upsertMyProfile)
profileRoutes.post('/pwd-verification', guard(['USER']), parseAttachments, submitPwdProof)
profileRoutes.get('/pwd-verification/files/:fileId', guard(['USER', 'ADMIN']), downloadPwdFile)
profileRoutes.get('/pwd-verification/admin/all', guard(['ADMIN']), listPwdVerifications)
profileRoutes.patch('/pwd-verification/:id/decision', guard(['ADMIN']), decidePwdVerification)
export default profileRoutes
