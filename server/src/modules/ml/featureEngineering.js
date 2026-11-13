const ER = { NONE:0,BEGINNER:1,INTERMEDIATE:2,EXPERIENCED:3 }
const or = (a=[],b=[]) => { if(!b.length) return 1; if(!a.length) return 0; const s=new Set(a); return b.filter((i)=>s.has(i)).length/b.length }
export const FEATURE_NAMES = ['skillOverlapRatio','interestOverlapRatio','hoursAdequacyRatio','dayOverlapRatio','experienceGap','workModeMatch','payAttractiveness','userGroupSuitability']
export const extractFeatures = (p, l) => {
    const req=l.estimatedWeeklyHours||0
    const hoursAdequacyRatio=req===0?1:Math.min(1,(p.weeklyAvailabilityHours||0)/req)
    const preferred=p.preferredWorkMode||'ANY'
    const avgPay=((l.payAmountMin||0)+(l.payAmountMax||0))/2
    let ugs=0.5; if(Array.isArray(l.suitableFor)&&l.suitableFor.length>0) ugs=l.suitableFor.includes(p.userGroup)?1:0
    return [or(p.skills,l.requiredSkills),or(p.interests,l.category),hoursAdequacyRatio,or(p.availableDays,l.requiredDays),((ER[p.experienceLevel]??0)-(ER[l.experienceLevelRequired]??0))/3,(preferred==='ANY'||preferred===l.workMode)?1:0,Math.min(1,avgPay/3000),ugs]
}
