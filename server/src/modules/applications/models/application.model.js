import mongoose from 'mongoose'
const s=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},sideHustleId:{type:mongoose.Schema.Types.ObjectId,ref:'SideHustle',required:true},recommendationId:{type:mongoose.Schema.Types.ObjectId,ref:'RecommendationLog',default:null},coverNote:{type:String,default:''},applicationStatus:{type:String,enum:['PENDING','APPROVED','REJECTED','COMPLETED','CANCELLED'],default:'PENDING'},applicationDate:{type:Date,default:Date.now},updatedAt:{type:Date,default:null}})
s.index({userId:1,sideHustleId:1},{unique:true})
export default mongoose.model('Application',s)
