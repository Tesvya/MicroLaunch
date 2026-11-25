import mongoose from 'mongoose'
import IncomeEntry from '../income/models/income-entry.model.js'
import Application from '../applications/models/application.model.js'
import Rating from './models/rating.model.js'
export const createRating=async(req,res)=>{try{const{incomeEntryId,stars,feedback,wasAccurateMatch}=req.body;const n=Number(stars);if(!n||n<1||n>5)return res.status(400).json({message:'A star rating from 1 to 5 is required'});
    // Only completed work can be rated, and a listing only by someone approved for it. The listing comes from the entry, not the client.
    const entry=mongoose.isValidObjectId(incomeEntryId)?await IncomeEntry.findOne({_id:String(incomeEntryId),userId:req.user._id}):null
    if(!entry)return res.status(404).json({message:'Income entry not found'})
    if(entry.status!=='COMPLETED')return res.status(400).json({message:'Only completed work can be rated'})
    if(entry.sideHustleId&&!(await Application.exists({userId:req.user._id,sideHustleId:entry.sideHustleId,applicationStatus:{$in:['APPROVED','COMPLETED']}})))return res.status(403).json({message:'You can only rate side-hustles you were approved for'})
    const r=await Rating.create({userId:req.user._id,sideHustleId:entry.sideHustleId,incomeEntryId:entry._id,stars:Number(stars),feedback:feedback||'',wasAccurateMatch:typeof wasAccurateMatch==='boolean'?wasAccurateMatch:null});return res.status(201).json({message:'Thanks for your feedback',properties:{rating:r}})}catch(error){return res.status(500).json({message:error.message})}}
export const listMyRatings=async(req,res)=>{try{return res.status(200).json({properties:{ratings:await Rating.find({userId:req.user._id}).sort({createdAt:-1})}})}catch(error){return res.status(500).json({message:error.message})}}
export const getSideHustleRatingsSummary=async(req,res)=>{try{const result=await Rating.aggregate([{$match:{sideHustleId:new mongoose.Types.ObjectId(req.params.sideHustleId)}},{$group:{_id:'$sideHustleId',sumStars:{$sum:'$stars'},totalRatings:{$sum:1}}}]);const s=result[0]||{sumStars:0,totalRatings:0};const avg=s.totalRatings?s.sumStars/s.totalRatings:0;return res.status(200).json({properties:{averageStars:Math.round(avg*10)/10,totalRatings:s.totalRatings||0}})}catch(error){return res.status(500).json({message:error.message})}}
