import IncomeEntry from './models/income-entry.model.js'
import Transaction from '../transactions/models/transaction.model.js'
import UserProfile from '../profile/models/user-profile.model.js'
const OPEN={$in:[null,'NONE','REJECTED']}
const LOCKED='This entry has a payout request or has already been paid, so it can no longer be changed'
// Payouts made before admin approval existed have a transaction but no payoutStatus on the entry
const isLocked=async(id)=>Boolean(await Transaction.exists({incomeEntryId:id,status:{$in:['REQUESTED','PENDING','SUCCESS']}}))
const notChanged=async(req,res)=>(await IncomeEntry.exists({_id:req.params.id,userId:req.user._id}))?res.status(409).json({message:LOCKED}):res.status(404).json({message:'Entry not found'})
export const createIncomeEntry=async(req,res)=>{try{const p=req.validatedData.body;const e=await IncomeEntry.create({...p,userId:req.user._id,completedAt:p.status==='COMPLETED'?new Date():null});return res.status(201).json({message:'Entry added',properties:{entry:e}})}catch(error){return res.status(500).json({message:error.message})}}
export const updateIncomeEntry=async(req,res)=>{try{const{id}=req.params;if(await isLocked(id))return notChanged(req,res);const p=req.validatedData.body;const u={...p,updatedAt:new Date()};if(p.status==='COMPLETED')u.completedAt=new Date();const e=await IncomeEntry.findOneAndUpdate({_id:id,userId:req.user._id,payoutStatus:OPEN},{$set:u},{new:true});if(!e)return notChanged(req,res);return res.status(200).json({message:'Updated',properties:{entry:e}})}catch(error){return res.status(500).json({message:error.message})}}
export const deleteIncomeEntry=async(req,res)=>{try{if(await isLocked(req.params.id))return notChanged(req,res);const e=await IncomeEntry.findOneAndDelete({_id:req.params.id,userId:req.user._id,payoutStatus:OPEN});if(!e)return notChanged(req,res);return res.status(200).json({message:'Deleted'})}catch(error){return res.status(500).json({message:error.message})}}
const PAYOUT_OF={REQUESTED:'REQUESTED',PENDING:'PROCESSING',SUCCESS:'PAID',REJECTED:'REJECTED'}
export const listMyIncomeEntries=async(req,res)=>{
    try{
        const entries=await IncomeEntry.find({userId:req.user._id}).sort({createdAt:-1}).lean()
        const txs=await Transaction.find({userId:req.user._id,incomeEntryId:{$ne:null}}).select('incomeEntryId status rejectionReason').sort({createdAt:1}).lean()
        const byEntry=new Map() // latest transaction per entry; a paid one always wins
        for(const t of txs){const k=String(t.incomeEntryId);if(byEntry.get(k)?.status!=='SUCCESS')byEntry.set(k,t)}
        const withPayout=entries.map((e)=>{const t=byEntry.get(String(e._id));return{...e,payoutStatus:PAYOUT_OF[t?.status]||e.payoutStatus||'NONE',payoutRejectionReason:t?.status==='REJECTED'?t.rejectionReason:''}})
        return res.status(200).json({properties:{entries:withPayout}})
    }catch(error){return res.status(500).json({message:error.message})}}
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
