import mongoose from 'mongoose'
const s=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},sideHustleId:{type:mongoose.Schema.Types.ObjectId,ref:'SideHustle',default:null},title:{type:String,required:true},amountEarned:{type:Number,required:true,min:0},hoursSpent:{type:Number,default:0,min:0},status:{type:String,enum:['IN_PROGRESS','COMPLETED','CANCELLED'],default:'IN_PROGRESS'},notes:{type:String,default:''},completedAt:{type:Date,default:null},createdAt:{type:Date,default:Date.now},updatedAt:{type:Date,default:null}})
s.index({userId:1,createdAt:-1})
export default mongoose.model('IncomeEntry',s)
