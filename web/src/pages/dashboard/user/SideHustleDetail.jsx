import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { LuArrowLeft, LuMapPin, LuClock, LuWallet, LuStar, LuSend, LuPaperclip, LuX } from 'react-icons/lu'
import { getSideHustleById } from '../../../services/user/sidehustles.service'
import { getSideHustleRatingsSummary } from '../../../services/user/ratings.service'
import { useApplicationsStore } from '../../../store/user/applications.store'
import { Card, Badge } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Field, Textarea } from '../../../components/ui/Input'
import { FavoriteButton } from '../../../components/dashboard/FavoriteButton'
import { OpeningsBadge } from '../../../components/dashboard/OpeningsBadge'

const MAX_FILES = 3
const MAX_MB = 3
const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx']
const prettySize = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
const formatPay = (s) => { const sfx = s.payType === 'HOURLY' ? '/hr' : ''; return s.payAmountMin && s.payAmountMax && s.payAmountMin !== s.payAmountMax ? `\u20b1${s.payAmountMin}\u2013${s.payAmountMax}${sfx}` : `\u20b1${s.payAmountMin || s.payAmountMax || 0}${sfx}` }

const STATUS_BANNER = {
  PENDING: { tone: 'border-amber-500/30 bg-amber-100/40 text-ink-900', text: 'Your application is pending review.' },
  APPROVED: { tone: 'border-success-600/30 bg-success-100/50 text-success-600', text: 'Your application was approved!' },
  REJECTED: { tone: 'border-danger-600/30 bg-danger-100/50 text-danger-600', text: 'Your application was not approved.' },
  COMPLETED: { tone: 'border-ink-faint/30 bg-ink-900/5 text-ink-900', text: 'This application is completed.' }
}

const SideHustleDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInput = useRef(null)
  const [sideHustle, setSideHustle] = useState(null)
  const [ratingsSummary, setRatingsSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isApplying, setIsApplying] = useState(false)
  const [coverNote, setCoverNote] = useState('')
  const [files, setFiles] = useState([])
  const [fileError, setFileError] = useState('')
  const [showApplyForm, setShowApplyForm] = useState(false)
  const { apply, applications, fetchMyApplications } = useApplicationsStore()

  useEffect(() => {
    setIsLoading(true)
    Promise.all([getSideHustleById(id), getSideHustleRatingsSummary(id), fetchMyApplications()])
      .then(([detailRes, ratingsRes]) => { setSideHustle(detailRes.data?.properties?.sideHustle); setRatingsSummary(ratingsRes.data?.properties) })
      .catch(() => toast.error('Could not load this listing'))
      .finally(() => setIsLoading(false))
  }, [id])

  const myApp = applications.find((a) => a.sideHustleId?._id === id)
  const canApply = !myApp || myApp.applicationStatus === 'CANCELLED' // a cancelled application can be redone
  const isOpen = sideHustle?.status === 'ACTIVE'

  const onPickFiles = (e) => {
    const picked = [...e.target.files]
    e.target.value = '' // lets the same file be chosen again after removing it
    const problems = []
    const next = [...files]
    for (const f of picked) {
      const ext = f.name.split('.').pop().toLowerCase()
      if (!ALLOWED_EXT.includes(ext)) { problems.push(`"${f.name}" is not a PDF, PNG, JPG or Word file.`); continue }
      if (f.size === 0) { problems.push(`"${f.name}" is empty.`); continue }
      if (f.size > MAX_MB * 1024 * 1024) { problems.push(`"${f.name}" is larger than ${MAX_MB} MB.`); continue }
      if (next.some((x) => x.name === f.name && x.size === f.size)) continue
      if (next.length >= MAX_FILES) { problems.push(`You can attach up to ${MAX_FILES} files.`); break }
      next.push(f)
    }
    setFiles(next)
    setFileError(problems.join(' '))
  }

  const handleApply = async (e) => {
    e.preventDefault()
    setIsApplying(true)
    try {
      const form = new FormData()
      form.append('sideHustleId', id)
      form.append('coverNote', coverNote)
      files.forEach((f) => form.append('files', f))
      await apply(form)
      toast.success('Application submitted!')
      navigate('/app/applications')
    } catch (error) { toast.error(error?.response?.data?.message || 'Could not submit your application') }
    finally { setIsApplying(false) }
  }

  if (isLoading) return <p className="text-sm text-ink-muted">Loading...</p>
  if (!sideHustle) return <p className="text-sm text-ink-muted">Listing not found.</p>
  const banner = myApp && STATUS_BANNER[myApp.applicationStatus]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/app/explore" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-900"><LuArrowLeft className="h-4 w-4" /> Back to listings</Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="amber">{sideHustle.workMode}</Badge>
            <Badge tone="neutral">{sideHustle.payType.replace('_', ' ')}</Badge>
            {isOpen ? <OpeningsBadge sideHustle={sideHustle} /> : null}
            {ratingsSummary?.totalRatings > 0 ? <Badge tone="success"><LuStar className="mr-1 inline h-3 w-3" />{ratingsSummary.averageStars} ({ratingsSummary.totalRatings})</Badge> : null}
          </div>
          <h1 className="text-2xl font-semibold text-ink-900">{sideHustle.title}</h1>
        </div>
        <FavoriteButton sideHustleId={sideHustle._id} className="shrink-0" />
      </div>

      <Card className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-900">{sideHustle.description}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-2"><LuWallet className="mt-0.5 h-4 w-4 text-ink-faint" /><div><p className="text-xs text-ink-muted">Pay</p><p className="text-sm font-medium text-success-600">{formatPay(sideHustle)}</p></div></div>
          <div className="flex items-start gap-2"><LuClock className="mt-0.5 h-4 w-4 text-ink-faint" /><div><p className="text-xs text-ink-muted">Estimated hours/week</p><p className="text-sm font-medium text-ink-900">{sideHustle.estimatedWeeklyHours || 'Flexible'}</p></div></div>
          <div className="flex items-start gap-2"><LuMapPin className="mt-0.5 h-4 w-4 text-ink-faint" /><div><p className="text-xs text-ink-muted">Location</p><p className="text-sm font-medium text-ink-900">{sideHustle.location || 'Remote'}</p></div></div>
        </div>
        {sideHustle.requiredSkills?.length ? (
          <div><p className="mb-1.5 text-xs text-ink-muted">Required skills</p><div className="flex flex-wrap gap-1.5">{sideHustle.requiredSkills.map((skill) => <Badge key={skill} tone="neutral">{skill}</Badge>)}</div></div>
        ) : null}
      </Card>

      {banner ? (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${banner.tone}`}>
          {banner.text} <Link to="/app/applications" className="underline">See details in My Applications</Link>
        </div>
      ) : null}

      {canApply && !isOpen ? (
        <div className="rounded-xl border border-ink-faint/30 bg-ink-900/5 px-4 py-3 text-sm text-ink-muted">This side-hustle is no longer accepting applications.</div>
      ) : null}

      {canApply && isOpen ? (
        showApplyForm ? (
          <Card>
            <h2 className="mb-1 text-sm font-semibold text-ink-900">Apply for this opportunity</h2>
            <p className="mb-4 text-xs text-ink-muted">Your message and any files you attach are sent to the admin who reviews applications.</p>
            <form onSubmit={handleApply} className="space-y-4">
              <Field label="Message (optional)" hint="Tell them why you're a good fit.">
                <Textarea rows={4} maxLength={1000} placeholder="e.g. I have 2 years of experience in content writing and I'm available on weekends..." value={coverNote} onChange={(e) => setCoverNote(e.target.value)} />
              </Field>
              <div>
                <p className="mb-1.5 text-sm font-medium text-ink-900">Resume or certificates (optional)</p>
                <input ref={fileInput} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={onPickFiles} className="hidden" />
                <Button type="button" variant="ghost" size="sm" className="border border-ink-faint/30" onClick={() => fileInput.current?.click()} disabled={files.length >= MAX_FILES}><LuPaperclip className="h-4 w-4" /> Attach files</Button>
                <p className="mt-1.5 text-xs text-ink-muted">PDF, PNG, JPG or Word &middot; up to {MAX_FILES} files &middot; {MAX_MB} MB each</p>
                {fileError ? <p role="alert" className="mt-1.5 text-xs text-danger-600">{fileError}</p> : null}
                {files.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {files.map((f) => (
                      <li key={`${f.name}-${f.size}`} className="flex items-center gap-2 rounded-xl border border-ink-faint/20 bg-canvas px-3 py-2 text-sm">
                        <LuPaperclip className="h-4 w-4 shrink-0 text-ink-faint" />
                        <span className="min-w-0 flex-1 truncate text-ink-900">{f.name}</span>
                        <span className="shrink-0 text-xs text-ink-muted">{prettySize(f.size)}</span>
                        <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((x) => x !== f))} className="text-ink-faint hover:text-danger-600"><LuX className="h-4 w-4" /></button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="accent" isLoading={isApplying}><LuSend className="h-4 w-4" /> Submit application</Button>
                <Button type="button" variant="ghost" onClick={() => setShowApplyForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        ) : (
          <Button variant="accent" size="lg" onClick={() => setShowApplyForm(true)}><LuSend className="h-4 w-4" /> {myApp ? 'Apply again' : 'Apply for this opportunity'}</Button>
        )
      ) : null}
    </div>
  )
}
export default SideHustleDetail
