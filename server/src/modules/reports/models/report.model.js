import mongoose from 'mongoose'
const s=new mongoose.Schema({adminId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},reportType:{type:String,enum:['USERS','RECOMMENDATIONS','FEEDBACK','TRANSACTIONS','FINANCIAL','APPLICATIONS'],required:true},reportPeriod:{type:String,enum:['DAILY','WEEKLY','MONTHLY','YEARLY','ALL_TIME'],default:'ALL_TIME'},dateFrom:{type:Date,default:null},dateTo:{type:Date,default:null},summary:{type:Object,default:{}},generatedAt:{type:Date,default:Date.now}})
export default mongoose.model('Report',s)
