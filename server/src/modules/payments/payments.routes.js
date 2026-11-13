import express from 'express'
import { initiatePayment,capturePaypal,paymongoWebhook,listMyTransactions,verifyPayment } from './payments.controller.js'
import { guard } from '../../shared/middlewares/guard.js'
const r=express.Router()
r.post('/initiate',guard(['USER']),initiatePayment)
r.get('/me',guard(['USER']),listMyTransactions)
r.post('/:id/verify',guard(['USER']),verifyPayment)
r.get('/paypal/capture',capturePaypal)
r.post('/paymongo/webhook',express.raw({type:'application/json'}),paymongoWebhook)
export default r
