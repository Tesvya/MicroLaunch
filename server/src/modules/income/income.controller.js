import IncomeEntry from './models/income-entry.model.js'
import UserProfile from '../profile/models/user-profile.model.js'
export const createIncomeEntry=async(req,res)=>{try{const p=req.validatedData.body;const e=await IncomeEntry.create({...p,userId:req.user._id,completedAt:p.status==='COMPLETED'?new Date():null});return res.status(201).json({message:'Entry added',properties:{entry:e}})}catch(error){return res.status(500).json({message:error.message})}}
export const updateIncomeEntry=async(req,res)=>{try{const{id}=req.params;const p=req.validatedData.body;const u={...p,updatedAt:new Date()};if(p.status==='COMPLETED')u.completedAt=new Date();const e=await IncomeEntry.findOneAndUpdate({_id:id,userId:req.user._id},{$set:u},{new:true});if(!e)return res.status(404).json({message:'Entry not found'});return res.status(200).json({message:'Updated',properties:{entry:e}})}catch(error){return res.status(500).json({message:error.message})}}
export const deleteIncomeEntry=async(req,res)=>{try{const e=await IncomeEntry.findOneAndDelete({_id:req.params.id,userId:req.user._id});if(!e)return res.status(404).json({message:'Not found'});return res.status(200).json({message:'Deleted'})}catch(error){return res.status(500).json({message:error.message})}}
export const listMyIncomeEntries=async(req,res)=>{try{return res.status(200).json({properties:{entries:await IncomeEntry.find({userId:req.user._id}).sort({createdAt:-1})}})}catch(error){return res.status(500).json({message:error.message})}}
export const getMyDashboardSummary=async(req,res)=>{
    try{
        const uid=req.user._id;const entries=await IncomeEntry.find({userId:uid}).lean();const profile=await UserProfile.findOne({userId:uid}).lean()
        const completed=entries.filter((e)=>e.status==='COMPLETED')
        const totalEarned=completed.reduce((s,e)=>s+(e.amountEarned||0),0)
        const totalHours=entries.reduce((s,e)=>s+(e.hoursSpent||0),0)
        const now=new Date();const som=new Date(now.getFullYear(),now.getMonth(),1)
        const thisMonthEarned=completed.filter((e)=>e.completedAt&&new Date(e.completedAt)>=som).reduce((s,e)=>s+(e.amountEarned||0),0)
        const goal=profile?.monthlyIncomeGoal||0
        const goalProgressPercent=goal>0?Math.min(100,Math.round((thisMonthEarned/goal)*100)):null
        const monthlyTrend=[]
        for(let i=5;i>=0;i--){const md=new Date(now.getFullYear(),now.getMonth()-i,1);const nd=new Date(now.getFullYear(),now.getMonth()-i+1,1);monthlyTrend.push({label:md.toLocaleString('en-US',{month:'short'}),total:completed.filter((e)=>e.completedAt&&new Date(e.completedAt)>=md&&new Date(e.completedAt)<nd).reduce((s,e)=>s+(e.amountEarned||0),0)})}
        return res.status(200).json({properties:{totalEarned,totalHours,thisMonthEarned,monthlyIncomeGoal:goal,goalProgressPercent,completedCount:completed.length,inProgressCount:entries.filter((e)=>e.status==='IN_PROGRESS').length,monthlyTrend}})
    }catch(error){return res.status(500).json({message:error.message})}
}
