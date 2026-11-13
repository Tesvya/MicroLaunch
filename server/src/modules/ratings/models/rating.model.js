import mongoose from 'mongoose'
const s=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},sideHustleId:{type:mongoose.Schema.Types.ObjectId,ref:'SideHustle',default:null},incomeEntryId:{type:mongoose.Schema.Types.ObjectId,ref:'IncomeEntry',default:null},stars:{type:Number,required:true,min:1,max:5},feedback:{type:String,default:''},wasAccurateMatch:{type:Boolean,default:null},createdAt:{type:Date,default:Date.now}})
s.index({sideHustleId:1})
export default mongoose.model('Rating',s)
