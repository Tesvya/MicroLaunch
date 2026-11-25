import express from 'express'
import { requestPayout,listPayouts,approvePayout,rejectPayout } from './payouts.controller.js'
import { capturePaypal,paymongoWebhook,listMyTransactions,verifyPayment } from './payments.controller.js'
import { guard } from '../../shared/middlewares/guard.js'
const r=express.Router()
r.post('/request',guard(['USER']),requestPayout)
r.get('/admin/all',guard(['ADMIN']),listPayouts)
r.post('/:id/approve',guard(['ADMIN']),approvePayout)
r.post('/:id/reject',guard(['ADMIN']),rejectPayout)
r.get('/me',guard(['USER']),listMyTransactions)
r.post('/:id/verify',guard(['USER','ADMIN']),verifyPayment)
r.get('/paypal/capture',capturePaypal)
r.post('/paymongo/webhook',express.raw({type:'application/json'}),paymongoWebhook)
export default r
