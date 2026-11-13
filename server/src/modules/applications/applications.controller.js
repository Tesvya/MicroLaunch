import Application from './models/application.model.js'
import SideHustle from '../sidehustles/models/side-hustle.model.js'
import { createNotification } from '../notifications/notifications.controller.js'
import { logActivity } from '../activitylogs/activitylogs.controller.js'
export const applyToSideHustle=async(req,res)=>{
    try{
        const{sideHustleId,recommendationId,coverNote}=req.validatedData.body
        const listing=await SideHustle.findById(sideHustleId)
        if(!listing||listing.status!=='ACTIVE')return res.status(404).json({message:'Listing not found or no longer active'})
        if(await Application.findOne({userId:req.user._id,sideHustleId}))return res.status(409).json({message:'You have already applied to this opportunity'})
        const application=await Application.create({userId:req.user._id,sideHustleId,recommendationId:recommendationId||null,coverNote:coverNote||''})
        await createNotification({userId:req.user._id,notificationType:'APPLICATION',title:'Application submitted',message:`You successfully applied to "${listing.title}". Your application is pending review.`})
        return res.status(201).json({message:'Application submitted successfully',properties:{application}})
    }catch(error){if(error.code===11000)return res.status(409).json({message:'You have already applied to this opportunity'});return res.status(500).json({message:error.message})}
}
export const listMyApplications=async(req,res)=>{try{const apps=await Application.find({userId:req.user._id}).populate('sideHustleId','title workMode payAmountMin payAmountMax payType location status').sort({applicationDate:-1});return res.status(200).json({properties:{applications:apps}})}catch(error){return res.status(500).json({message:error.message})}}
export const cancelApplication=async(req,res)=>{
    try{
        const app=await Application.findOne({_id:req.params.id,userId:req.user._id})
        if(!app)return res.status(404).json({message:'Application not found'})
        if(app.applicationStatus!=='PENDING')return res.status(400).json({message:'Only pending applications can be cancelled'})
        app.applicationStatus='CANCELLED';app.updatedAt=new Date();await app.save()
        return res.status(200).json({message:'Application cancelled',properties:{application:app}})
    }catch(error){return res.status(500).json({message:error.message})}
}
export const listAllApplications=async(req,res)=>{try{const{status}=req.query;const apps=await Application.find(status?{applicationStatus:status}:{}).populate('userId','name email').populate('sideHustleId','title workMode payAmountMin payAmountMax payType').sort({applicationDate:-1});return res.status(200).json({properties:{applications:apps}})}catch(error){return res.status(500).json({message:error.message})}}
export const updateApplicationStatus=async(req,res)=>{
    try{
        const{applicationStatus}=req.validatedData.body
        const app=await Application.findByIdAndUpdate(req.params.id,{$set:{applicationStatus,updatedAt:new Date()}},{new:true}).populate('userId','name email').populate('sideHustleId','title')
        if(!app)return res.status(404).json({message:'Application not found'})
        const msgs={APPROVED:`Congratulations! Your application to "${app.sideHustleId.title}" has been approved.`,REJECTED:`Your application to "${app.sideHustleId.title}" was not approved at this time.`,COMPLETED:`Your application to "${app.sideHustleId.title}" has been marked as completed.`}
        if(msgs[applicationStatus])await createNotification({userId:app.userId._id,notificationType:'APPLICATION',title:`Application ${applicationStatus.toLowerCase()}`,message:msgs[applicationStatus]})
        await logActivity({adminId:req.user._id,activity:`Updated application to ${applicationStatus} for ${app.userId.name} — ${app.sideHustleId.title}`,module:'APPLICATIONS'})
        return res.status(200).json({message:'Status updated',properties:{application:app}})
    }catch(error){return res.status(500).json({message:error.message})}
}
