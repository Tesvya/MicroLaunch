import Report from './models/report.model.js'
import User from '../auth/models/user.model.js'
import Application from '../applications/models/application.model.js'
import IncomeEntry from '../income/models/income-entry.model.js'
import Transaction from '../transactions/models/transaction.model.js'
import Rating from '../ratings/models/rating.model.js'
import RecommendationLog from '../recommendations/models/recommendation-log.model.js'
import { logActivity } from '../activitylogs/activitylogs.controller.js'
const buildDateFilter=(period,from,to)=>{if(from&&to)return{$gte:new Date(from),$lte:new Date(to)};const now=new Date();const periods={DAILY:new Date(now-864e5),WEEKLY:new Date(now-6048e5),MONTHLY:new Date(now.getFullYear(),now.getMonth(),1),YEARLY:new Date(now.getFullYear(),0,1)};return periods[period]?{$gte:periods[period]}:null}
export const generateReport=async(req,res)=>{
    try{
        const{reportType,reportPeriod='ALL_TIME',dateFrom,dateTo}=req.body
        const df=buildDateFilter(reportPeriod,dateFrom,dateTo);const cf=df?{createdAt:df}:{}
        let summary={}
        if(reportType==='USERS'){const t=await User.countDocuments();summary={totalUsers:t,activeUsers:await User.countDocuments({isActive:true}),withProfile:await User.countDocuments({hasCompletedProfile:true}),suspended:t-await User.countDocuments({isActive:true})}}
        else if(reportType==='APPLICATIONS'){const t=await Application.countDocuments(cf);summary={total:t,pending:await Application.countDocuments({...cf,applicationStatus:'PENDING'}),approved:await Application.countDocuments({...cf,applicationStatus:'APPROVED'}),rejected:await Application.countDocuments({...cf,applicationStatus:'REJECTED'}),completed:await Application.countDocuments({...cf,applicationStatus:'COMPLETED'})}}
        else if(reportType==='FINANCIAL'){const ia=await IncomeEntry.aggregate([{$match:{status:'COMPLETED',...cf}},{$group:{_id:null,totalEarned:{$sum:'$amountEarned'},totalHours:{$sum:'$hoursSpent'},count:{$sum:1}}}]);const ta=await Transaction.aggregate([{$match:{status:'SUCCESS',...cf}},{$group:{_id:null,total:{$sum:'$amount'},count:{$sum:1}}}]);summary={totalIncomeEarned:ia[0]?.totalEarned||0,totalHoursLogged:ia[0]?.totalHours||0,completedGigs:ia[0]?.count||0,totalTransacted:ta[0]?.total||0,successfulTransactions:ta[0]?.count||0}}
        else if(reportType==='FEEDBACK'){const ra=await Rating.aggregate([{$match:cf},{$group:{_id:null,sumStars:{$sum:'$stars'},total:{$sum:1}}}]);summary={totalRatings:ra[0]?.total||0,averageStars:ra[0]?.total?Math.round((ra[0].sumStars/ra[0].total)*10)/10:0,accurateMatchCount:await Rating.countDocuments({...cf,wasAccurateMatch:true})}}
        else if(reportType==='RECOMMENDATIONS'){const t=await RecommendationLog.countDocuments(cf);const s=await RecommendationLog.countDocuments({...cf,userResponse:'SAVED'});const st=await RecommendationLog.countDocuments({...cf,userResponse:'STARTED'});summary={totalRecommendations:t,saved:s,started:st,dismissed:await RecommendationLog.countDocuments({...cf,userResponse:'DISMISSED'}),engagementRate:t>0?Math.round(((s+st)/t)*100):0}}
        else if(reportType==='TRANSACTIONS'){const ta=await Transaction.aggregate([{$match:cf},{$group:{_id:'$status',count:{$sum:1},total:{$sum:'$amount'}}}]);const byStatus={};ta.forEach((t)=>{byStatus[t._id]={count:t.count,total:t.total}});summary={byStatus}}
        const report=await Report.create({adminId:req.user._id,reportType,reportPeriod,dateFrom:dateFrom||null,dateTo:dateTo||null,summary})
        await logActivity({adminId:req.user._id,activity:`Generated ${reportType} report (${reportPeriod})`,module:'REPORTS'})
        return res.status(201).json({message:'Report generated',properties:{report}})
    }catch(error){return res.status(500).json({message:error.message})}
}
export const listReports=async(req,res)=>{try{return res.status(200).json({properties:{reports:await Report.find().populate('adminId','name email').sort({generatedAt:-1}).limit(50)}})}catch(error){return res.status(500).json({message:error.message})}}
export const getReport=async(req,res)=>{try{const r=await Report.findById(req.params.id).populate('adminId','name email');if(!r)return res.status(404).json({message:'Not found'});return res.status(200).json({properties:{report:r}})}catch(error){return res.status(500).json({message:error.message})}}
