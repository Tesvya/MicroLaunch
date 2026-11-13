import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { LuPlus, LuPencil, LuTrash2 } from 'react-icons/lu'
import { useAdminStore } from '../../../store/admin/admin.store'
import { Card, Badge } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Field, Input, Textarea, Select } from '../../../components/ui/Input'
const emptyForm = { title:'',description:'',requiredSkills:'',category:'',experienceLevelRequired:'NONE',estimatedWeeklyHours:0,workMode:'REMOTE',location:'',payType:'PER_TASK',payAmountMin:0,payAmountMax:0,status:'ACTIVE' }
const ListingForm = ({ initial, onSubmit, onCancel }) => {
  const [form, setForm] = useState(initial ? { ...emptyForm, ...initial, requiredSkills:(initial.requiredSkills||[]).join(', '), category:(initial.category||[]).join(', ') } : emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const handleSubmit = async (e) => {
    e.preventDefault(); setIsSubmitting(true)
    try { await onSubmit({ ...form, requiredSkills: form.requiredSkills.split(',').map((s)=>s.trim()).filter(Boolean), category: form.category.split(',').map((s)=>s.trim()).filter(Boolean), estimatedWeeklyHours: Number(form.estimatedWeeklyHours)||0, payAmountMin: Number(form.payAmountMin)||0, payAmountMax: Number(form.payAmountMax)||0 }) }
    catch (e) { toast.error(e?.response?.data?.message||'Could not save listing') }
    finally { setIsSubmitting(false) }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Title"><Input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} required /></Field>
      <Field label="Description"><Textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Required skills" hint="Comma-separated"><Input value={form.requiredSkills} onChange={(e)=>setForm({...form,requiredSkills:e.target.value})} placeholder="writing, excel" /></Field>
        <Field label="Category" hint="Comma-separated"><Input value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})} placeholder="writing, marketing" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Experience required"><Select value={form.experienceLevelRequired} onChange={(e)=>setForm({...form,experienceLevelRequired:e.target.value})}><option value="NONE">None</option><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="EXPERIENCED">Experienced</option></Select></Field>
        <Field label="Work mode"><Select value={form.workMode} onChange={(e)=>setForm({...form,workMode:e.target.value})}><option value="REMOTE">Remote</option><option value="ONSITE">Onsite</option><option value="HYBRID">Hybrid</option></Select></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estimated hrs/week"><Input type="number" min="0" value={form.estimatedWeeklyHours} onChange={(e)=>setForm({...form,estimatedWeeklyHours:e.target.value})} /></Field>
        <Field label="Location"><Input value={form.location} onChange={(e)=>setForm({...form,location:e.target.value})} placeholder="Remote / City" /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Pay type"><Select value={form.payType} onChange={(e)=>setForm({...form,payType:e.target.value})}><option value="HOURLY">Hourly</option><option value="PER_TASK">Per task</option><option value="FIXED">Fixed</option><option value="COMMISSION">Commission</option></Select></Field>
        <Field label="Pay min (PHP)"><Input type="number" min="0" value={form.payAmountMin} onChange={(e)=>setForm({...form,payAmountMin:e.target.value})} /></Field>
        <Field label="Pay max (PHP)"><Input type="number" min="0" value={form.payAmountMax} onChange={(e)=>setForm({...form,payAmountMax:e.target.value})} /></Field>
      </div>
      <Field label="Status"><Select value={form.status} onChange={(e)=>setForm({...form,status:e.target.value})}><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="CLOSED">Closed</option></Select></Field>
      <div className="flex gap-2 pt-2"><Button type="submit" variant="accent" isLoading={isSubmitting}>{initial?'Save changes':'Create listing'}</Button><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button></div>
    </form>
  )
}
const AdminListings = () => {
  const { sideHustles, isLoading, fetchSideHustles, addSideHustle, editSideHustle, removeSideHustle } = useAdminStore()
  const [formMode, setFormMode] = useState(null)
  useEffect(() => { fetchSideHustles() }, [])
  const handleCreate = async (data) => { await addSideHustle(data); toast.success('Listing created'); setFormMode(null) }
  const handleUpdate = async (data) => { await editSideHustle(formMode._id, data); toast.success('Listing updated'); setFormMode(null) }
  const handleDelete = async (id) => { if (!confirm('Delete this listing?')) return; await removeSideHustle(id); toast.success('Listing deleted') }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold text-ink-900">Side-Hustle Listings</h1><p className="mt-1 text-sm text-ink-muted">Create and manage opportunities shown to users.</p></div>
        {!formMode && <Button variant="accent" onClick={()=>setFormMode('create')}><LuPlus className="h-4 w-4" /> New listing</Button>}
      </div>
      {formMode === 'create' ? <Card><h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">New listing</h2><ListingForm onSubmit={handleCreate} onCancel={()=>setFormMode(null)} /></Card>
        : formMode ? <Card><h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">Edit listing</h2><ListingForm initial={formMode} onSubmit={handleUpdate} onCancel={()=>setFormMode(null)} /></Card> : null}
      {isLoading ? <p className="text-sm text-ink-muted">Loading listings...</p> : (
        <div className="space-y-3">{sideHustles.map((s)=>(
          <Card key={s._id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="mb-1 flex flex-wrap items-center gap-2"><h3 className="font-semibold text-ink-900">{s.title}</h3><Badge tone={s.status==='ACTIVE'?'success':s.status==='DRAFT'?'neutral':'danger'}>{s.status}</Badge></div><p className="line-clamp-1 text-sm text-ink-muted">{s.description}</p></div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="border border-ink-faint/30" onClick={()=>setFormMode(s)}><LuPencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="border border-ink-faint/30 text-danger-600" onClick={()=>handleDelete(s._id)}><LuTrash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card>
        ))}</div>
      )}
    </div>
  )
}
export default AdminListings
