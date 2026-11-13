const WEIGHTS = { skills: 40, interests: 25, availability: 20, experience: 10, workMode: 5 }
const EXPERIENCE_RANK = { NONE: 0, BEGINNER: 1, INTERMEDIATE: 2, EXPERIENCED: 3 }
const overlapRatio = (a=[], b=[]) => { if (!b.length) return 1; if (!a.length) return 0; const s = new Set(a); return b.filter((i)=>s.has(i)).length/b.length }
export const computeMatchScore = (profile, listing) => {
    const skillRatio = overlapRatio(profile.skills, listing.requiredSkills)
    const interestRatio = overlapRatio(profile.interests, listing.category)
    const reqHrs = listing.estimatedWeeklyHours||0
    const hoursOk = (profile.weeklyAvailabilityHours||0) >= reqHrs
    const daysRatio = overlapRatio(profile.availableDays, listing.requiredDays)
    const availRatio = (hoursOk?0.6:Math.min(0.6,((profile.weeklyAvailabilityHours||0)/Math.max(reqHrs,1))*0.6)) + daysRatio*0.4
    const userExp = EXPERIENCE_RANK[profile.experienceLevel??'NONE']
    const reqExp = EXPERIENCE_RANK[listing.experienceLevelRequired??'NONE']
    const expRatio = userExp >= reqExp ? 1 : Math.max(0, 1-(reqExp-userExp)*0.4)
    const pref = profile.preferredWorkMode||'ANY'
    const modeRatio = (pref==='ANY'||pref===listing.workMode) ? 1 : 0
    const skills = { weight: WEIGHTS.skills, points: Math.round(skillRatio*WEIGHTS.skills), ratio: skillRatio, detail: skillRatio===1?'All required skills matched':skillRatio>0?`Partial skill match (${Math.round(skillRatio*100)}%)`:'No required skills matched' }
    const interests = { weight: WEIGHTS.interests, points: Math.round(interestRatio*WEIGHTS.interests), ratio: interestRatio, detail: interestRatio===1?'Interests fully aligned':interestRatio>0?'Partial interest alignment':'Outside your stated interests' }
    const availability = { weight: WEIGHTS.availability, points: Math.round(availRatio*WEIGHTS.availability), ratio: availRatio, detail: hoursOk&&daysRatio>=1?'Availability fully covers this opportunity':!hoursOk?`Needs ${reqHrs}hrs/week; you have ${profile.weeklyAvailabilityHours||0}`:'Partial availability overlap' }
    const experience = { weight: WEIGHTS.experience, points: Math.round(expRatio*WEIGHTS.experience), ratio: expRatio, detail: userExp>=reqExp?'Experience meets requirement':`Listing prefers ${listing.experienceLevelRequired||'NONE'}` }
    const workMode = { weight: WEIGHTS.workMode, points: Math.round(modeRatio*WEIGHTS.workMode), ratio: modeRatio, detail: modeRatio?`Work mode matches your preference`:`You prefer ${pref}, listing is ${listing.workMode}` }
    const score = skills.points+interests.points+availability.points+experience.points+workMode.points
    return { score: Math.max(0,Math.min(100,score)), breakdown: { skills, interests, availability, experience, workMode } }
}
export const rankSideHustles = (profile, listings, minScore=0) => listings.map((l)=>{ const {score,breakdown}=computeMatchScore(profile,l); return {listing:l,score,breakdown} }).filter((e)=>e.score>=minScore).sort((a,b)=>b.score-a.score)
