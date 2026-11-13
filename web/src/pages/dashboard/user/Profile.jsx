import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { LuPlus, LuX } from 'react-icons/lu'
import { useProfileStore } from '../../../store/user/profile.store'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Field, Input, Textarea, Select } from '../../../components/ui/Input'
const DAYS = [{ value:'MON',label:'Mon'},{value:'TUE',label:'Tue'},{value:'WED',label:'Wed'},{value:'THU',label:'Thu'},{value:'FRI',label:'Fri'},{value:'SAT',label:'Sat'},{value:'SUN',label:'Sun'}]
const TagInput = ({ value = [], onChange, placeholder }) => {
  const [draft, setDraft] = useState('')
  const add = () => { const c = draft.trim().toLowerCase(); if (c && !value.includes(c)) onChange([...value, c]); setDraft('') }
  return (
    <div>
      <div className="flex gap-2"><Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder={placeholder} /><Button type="button" variant="ghost" onClick={add} className="shrink-0 border border-ink-faint/30"><LuPlus className="h-4 w-4" /></Button></div>
      {value.length > 0 ? <div className="mt-2.5 flex flex-wrap gap-2">{value.map((tag) => <span key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-ink-900/5 px-3 py-1 text-xs font-medium text-ink-900">{tag}<button type="button" onClick={() => onChange(value.filter((t) => t !== tag))}><LuX className="h-3 w-3 text-ink-muted hover:text-danger-600" /></button></span>)}</div> : null}
    </div>
  )
}
const Profile = () => {
  const { profile, fetchProfile, saveProfile } = useProfileStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { register, control, handleSubmit, reset, watch, setValue } = useForm({ defaultValues: { bio:'',skills:[],interests:[],qualifications:'',experienceLevel:'NONE',weeklyAvailabilityHours:0,availableDays:[],preferredWorkMode:'ANY',userGroup:'OTHER',monthlyIncomeGoal:0,savingsGoal:0,location:'' } })
  const selectedDays = watch('availableDays')
  useEffect(() => { fetchProfile().then((r) => { const e = r.data?.properties?.profile; if (e) reset(e) }).finally(() => setIsLoading(false)) }, [])
  const toggleDay = (day) => setValue('availableDays', selectedDays.includes(day) ? selectedDays.filter((d) => d !== day) : [...selectedDays, day])
  const onSubmit = async (data) => {
    setIsSaving(true)
    try { await saveProfile({ ...data, weeklyAvailabilityHours: Number(data.weeklyAvailabilityHours)||0, monthlyIncomeGoal: Number(data.monthlyIncomeGoal)||0, savingsGoal: Number(data.savingsGoal)||0 }); toast.success('Profile saved') }
    catch (e) { toast.error(e?.response?.data?.message || 'Could not save profile') }
    finally { setIsSaving(false) }
  }
  if (isLoading) return <p className="text-sm text-ink-muted">Loading your profile...</p>
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div><h1 className="text-2xl font-semibold text-ink-900">My Profile</h1><p className="mt-1 text-sm text-ink-muted">The more accurate this is, the better your matches will be.</p></div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">About you</h2>
          <Field label="Short bio"><Textarea placeholder="Tell us a bit about yourself" {...register('bio')} /></Field>
          <Field label="Qualifications"><Input placeholder="e.g. BS Information Technology" {...register('qualifications')} /></Field>
          <Field label="I am currently a..."><Select {...register('userGroup')}><option value="STUDENT">Student</option><option value="FREELANCER">Freelancer</option><option value="UNEMPLOYED">Unemployed / Job seeker</option><option value="PART_TIME_WORKER">Part-time worker</option><option value="SENIOR_CITIZEN">Senior citizen</option><option value="PWD">Person with Disability (PWD)</option><option value="OTHER">Other</option></Select></Field>
          <Field label="Location"><Input placeholder="e.g. Cebu City" {...register('location')} /></Field>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Skills &amp; interests</h2>
          <Field label="Skills" hint="Press Enter to add each skill"><Controller control={control} name="skills" render={({ field }) => <TagInput value={field.value} onChange={field.onChange} placeholder="e.g. writing, excel, driving" />} /></Field>
          <Field label="Interests" hint="Categories of work you'd enjoy"><Controller control={control} name="interests" render={({ field }) => <TagInput value={field.value} onChange={field.onChange} placeholder="e.g. tutoring, delivery, design" />} /></Field>
          <Field label="Experience level"><Select {...register('experienceLevel')}><option value="NONE">No prior experience</option><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="EXPERIENCED">Experienced</option></Select></Field>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Availability</h2>
          <Field label="Hours you can commit per week"><Input type="number" min="0" max="168" {...register('weeklyAvailabilityHours')} /></Field>
          <Field label="Days you're generally free"><div className="flex flex-wrap gap-2">{DAYS.map((day) => <button key={day.value} type="button" onClick={() => toggleDay(day.value)} className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${selectedDays.includes(day.value) ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-faint/30 text-ink-muted hover:border-ink-900/40'}`}>{day.label}</button>)}</div></Field>
          <Field label="Preferred work mode"><Select {...register('preferredWorkMode')}><option value="ANY">No preference</option><option value="REMOTE">Remote</option><option value="ONSITE">Onsite</option><option value="HYBRID">Hybrid</option></Select></Field>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Financial goals</h2>
          <Field label="Monthly income goal (PHP)"><Input type="number" min="0" {...register('monthlyIncomeGoal')} /></Field>
          <Field label="Monthly savings goal (PHP)"><Input type="number" min="0" {...register('savingsGoal')} /></Field>
        </Card>
        <Button type="submit" variant="accent" isLoading={isSaving}>Save profile</Button>
      </form>
    </div>
  )
}
export default Profile
