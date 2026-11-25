import User from '../auth/models/user.model.js'
import SideHustle from '../sidehustles/models/side-hustle.model.js'
import IncomeEntry from '../income/models/income-entry.model.js'
import Transaction from '../transactions/models/transaction.model.js'
import Rating from '../ratings/models/rating.model.js'
import Application from '../applications/models/application.model.js'
import PwdVerification from '../profile/models/pwd-verification.model.js'
import { logActivity } from '../activitylogs/activitylogs.controller.js'
import { createNotification } from '../notifications/notifications.controller.js'
export const listUsers=async(_req,res)=>{try{return res.status(200).json({properties:{users:await User.find().populate('roleId','name').select('-password').sort({createdAt:-1})}})}catch(error){return res.status(500).json({message:error.message})}}
export const setUserActiveStatus=async(req,res)=>{
    try{
        const{isActive}=req.body;if(typeof isActive!=='boolean')return res.status(400).json({message:'isActive must be boolean'})
        const result=await User.updateOne({_id:req.params.id},{$set:{isActive,updatedAt:new Date()}})
        if(!result.matchedCount)return res.status(404).json({message:'User not found'})
        const user=await User.findById(req.params.id).populate('roleId','name').select('-password')
        await logActivity({adminId:req.user._id,activity:`${isActive?'Reactivated':'Suspended'} user: ${user.name} (${user.email})`,module:'USER_MANAGEMENT'})
        return res.status(200).json({message:'User status updated',properties:{user}})
    }catch(error){return res.status(500).json({message:error.message})}
}
export const getPlatformOverview=async(_req,res)=>{
    try{
        const[uc,alc,tia,txc,ra,pa,ta,pp,pv]=await Promise.all([User.countDocuments(),SideHustle.countDocuments({status:'ACTIVE'}),IncomeEntry.aggregate([{$match:{status:'COMPLETED'}},{$group:{_id:null,total:{$sum:'$amountEarned'}}}]),Transaction.countDocuments({status:'SUCCESS'}),Rating.aggregate([{$group:{_id:null,sum:{$sum:'$stars'},count:{$sum:1}}}]),Application.countDocuments({applicationStatus:'PENDING'}),Application.countDocuments(),Transaction.countDocuments({status:'REQUESTED'}),PwdVerification.countDocuments({status:'PENDING'})])
        return res.status(200).json({properties:{userCount:uc,activeListingCount:alc,totalIncomeFacilitated:tia[0]?.total||0,successfulTransactionCount:txc,averageSatisfactionStars:ra[0]?.count?Math.round((ra[0].sum/ra[0].count)*10)/10:0,totalRatings:ra[0]?.count||0,pendingApplications:pa,pendingPayouts:pp,pendingPwdVerifications:pv,totalApplications:ta}})
    }catch(error){return res.status(500).json({message:error.message})}
}

export const verifyUserEmail=async(req,res)=>{
    try{
        const user=await User.findById(req.params.id).select('name email isEmailVerified')
        if(!user)return res.status(404).json({message:'User not found'})
        if(user.isEmailVerified)return res.status(409).json({message:'This account is already verified'})
        await User.updateOne({_id:user._id},{$set:{isEmailVerified:true,emailVerificationTokenHash:null,emailVerificationExpires:null,updatedAt:new Date()}})
        await createNotification({userId:user._id,notificationType:'SYSTEM',title:'Welcome to MICROLAUNCH',message:'Your account has been verified by an administrator. Complete your profile to get your first side-hustle matches.'})
        await logActivity({adminId:req.user._id,activity:`Manually verified email for ${user.name} (${user.email})`,module:'USER_MANAGEMENT'})
        const updated=await User.findById(user._id).populate('roleId','name').select('-password')
        return res.status(200).json({message:'Email marked as verified',properties:{user:updated}})
    }catch(error){return res.status(500).json({message:error.message})}
}
