import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { LuPlus, LuTrash2, LuCircleCheck, LuWallet, LuPencil, LuStar, LuBriefcase } from 'react-icons/lu'
import { useIncomeStore } from '../../../store/user/income.store'
import { useTransactionsStore } from '../../../store/user/transactions.store'
import { useApplicationsStore } from '../../../store/user/applications.store'
import { createRating } from '../../../services/user/ratings.service'
import { Card, Badge } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Field, Input, Select, Textarea } from '../../../components/ui/Input'

const peso = (n) => `\u20b1${Number(n || 0).toLocaleString('en-PH')}`

const AddEntryForm = ({ onAdd, onClose, approvedApplications }) => {
  const [selectedApp, setSelectedApp] = useState(null)
  const [form, setForm] = useState({ title: '', amountEarned: '', hoursSpent: '', status: 'COMPLETED', sideHustleId: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSelectApp = (app) => {
    if (!app) {
      setSelectedApp(null)
      setForm({ title: '', amountEarned: '', hoursSpent: '', status: 'COMPLETED', sideHustleId: '' })
      return
    }
    setSelectedApp(app)
    setForm((f) => ({ ...f, title: app.sideHustleId?.title || '', sideHustleId: app.sideHustleId?._id || '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.amountEarned) { toast.error('Title and amount are required'); return }
    setIsSubmitting(true)
    try {
      await onAdd({ title: form.title, amountEarned: Number(form.amountEarned), hoursSpent: Number(form.hoursSpent) || 0, status: form.status, sideHustleId: form.sideHustleId || undefined })
      onClose()
    } catch (error) { toast.error(error?.response?.data?.message || 'Could not add entry') }
    finally { setIsSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {approvedApplications.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-ink-900">Select from your approved opportunities</p>
          <div className="space-y-2 rounded-xl border border-ink-faint/20 bg-canvas p-3">
            {approvedApplications.map((app) => (
              <button
                key={app._id}
                type="button"
                onClick={() => handleSelectApp(selectedApp?._id === app._id ? null : app)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                  selectedApp?._id === app._id
                    ? 'border-amber-500 bg-amber-100/50 text-ink-900'
                    : 'border-ink-faint/20 bg-surface text-ink-muted hover:border-ink-900/30 hover:text-ink-900'
                }`}
              >
                <LuBriefcase className="h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{app.sideHustleId?.title}</p>
                  <p className="text-xs text-ink-muted">{app.sideHustleId?.workMode} · {app.sideHustleId?.payType?.replace('_', ' ')}</p>
                </div>
                {selectedApp?._id === app._id ? (
                  <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-ink-900">Selected</span>
                ) : null}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleSelectApp(null)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                !selectedApp
                  ? 'border-ink-900/30 bg-ink-900/5 text-ink-900'
                  : 'border-ink-faint/20 bg-surface text-ink-muted hover:border-ink-900/30 hover:text-ink-900'
              }`}
            >
              <LuPlus className="h-4 w-4 shrink-0" />
              <span className="font-medium">Log manually (not from a listing)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-ink-faint/15 bg-canvas px-4 py-3">
          <p className="text-sm text-ink-muted">
            No approved applications yet. You can still log income manually, or{' '}
            <a href="/app/explore" className="font-medium text-amber-500 hover:underline">browse side-hustles</a> to apply.
          </p>
        </div>
      )}

      <Field label={selectedApp ? 'Title (pre-filled from listing)' : 'What did you work on?'}>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Food delivery shift"
          readOnly={!!selectedApp}
          className={selectedApp ? 'bg-ink-900/5 cursor-default' : ''}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount earned (PHP)">
          <Input type="number" min="0" value={form.amountEarned} onChange={(e) => setForm({ ...form, amountEarned: e.target.value })} placeholder="0" />
        </Field>
        <Field label="Hours spent">
          <Input type="number" min="0" value={form.hoursSpent} onChange={(e) => setForm({ ...form, hoursSpent: e.target.value })} placeholder="0" />
        </Field>
      </div>

      <Field label="Status">
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In progress</option>
        </Select>
      </Field>

      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="accent" size="sm" isLoading={isSubmitting}>Add entry</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

const EditEntryForm = ({ entry, onSave, onClose }) => {
  const [form, setForm] = useState({ title: entry.title || '', amountEarned: entry.amountEarned || 0, hoursSpent: entry.hoursSpent || 0, status: entry.status || 'IN_PROGRESS' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const handleSubmit = async (e) => {
    e.preventDefault(); setIsSubmitting(true)
    try { await onSave(entry._id, { title: form.title, amountEarned: Number(form.amountEarned), hoursSpent: Number(form.hoursSpent) || 0, status: form.status }); onClose() }
    catch (error) { toast.error(error?.response?.data?.message || 'Could not update entry') }
    finally { setIsSubmitting(false) }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount earned (PHP)"><Input type="number" min="0" value={form.amountEarned} onChange={(e) => setForm({ ...form, amountEarned: e.target.value })} /></Field>
        <Field label="Hours spent"><Input type="number" min="0" value={form.hoursSpent} onChange={(e) => setForm({ ...form, hoursSpent: e.target.value })} /></Field>
      </div>
      <Field label="Status">
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </Field>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="accent" size="sm" isLoading={isSubmitting}>Save changes</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

const StarPicker = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1,2,3,4,5].map((star) => (
      <button key={star} type="button" onClick={() => onChange(star)} className="focus:outline-none">
        <LuStar className={`h-6 w-6 transition-colors ${star <= value ? 'fill-amber-500 text-amber-500' : 'text-ink-faint hover:text-amber-400'}`} />
      </button>
    ))}
  </div>
)

const RatingForm = ({ entry, onClose, onSubmitted }) => {
  const [stars, setStars] = useState(0)
  const [wasAccurateMatch, setWasAccurateMatch] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (stars === 0) { toast.error('Please select a star rating'); return }
    setIsSubmitting(true)
    try {
      await createRating({ sideHustleId: entry.sideHustleId || null, incomeEntryId: entry._id, stars, feedback, wasAccurateMatch })
      toast.success('Rating submitted!'); onSubmitted(entry._id); onClose()
    } catch (error) { toast.error(error?.response?.data?.message || 'Could not submit rating') }
    finally { setIsSubmitting(false) }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm font-medium text-ink-900">Rate: <span className="text-ink-muted">{entry.title}</span></p>
      <Field label="Star rating"><StarPicker value={stars} onChange={setStars} /></Field>
      <Field label="Was this an accurate match?">
        <div className="flex gap-2">
          <button type="button" onClick={() => setWasAccurateMatch(true)} className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${wasAccurateMatch === true ? 'border-success-600 bg-success-100 text-success-600' : 'border-ink-faint/30 text-ink-muted hover:border-ink-900/40'}`}>Yes, accurate</button>
          <button type="button" onClick={() => setWasAccurateMatch(false)} className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${wasAccurateMatch === false ? 'border-danger-600 bg-danger-100 text-danger-600' : 'border-ink-faint/30 text-ink-muted hover:border-ink-900/40'}`}>Not as expected</button>
        </div>
      </Field>
      <Field label="Feedback (optional)"><Textarea rows={3} placeholder="Share your experience..." value={feedback} onChange={(e) => setFeedback(e.target.value)} /></Field>
      <div className="flex gap-2">
        <Button type="submit" variant="accent" size="sm" isLoading={isSubmitting}>Submit rating</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

const PAY_METHODS = [
  { value: 'GCASH', label: 'GCash', hint: 'via PayMongo' },
  { value: 'MAYA', label: 'Maya', hint: 'via PayMongo' },
  { value: 'PAYPAL', label: 'PayPal', hint: 'sandbox' },
  { value: 'MOCK_GCASH', label: 'Simulated', hint: 'demo only, no real funds' }
]

const PayoutForm = ({ entry, onPay, onClose, isPaying }) => {
  const [method, setMethod] = useState('MOCK_GCASH')
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-ink-900">Payout for: <span className="text-ink-muted">{entry.title}</span> &middot; <span className="text-success-600">{peso(entry.amountEarned)}</span></p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PAY_METHODS.map((m) => (
          <button key={m.value} type="button" onClick={() => setMethod(m.value)}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${method === m.value ? 'border-amber-500 bg-amber-100/50' : 'border-ink-faint/30 hover:border-ink-900/40'}`}>
            <span className="block font-medium text-ink-900">{m.label}</span>
            <span className="block text-xs text-ink-muted">{m.hint}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="accent" isLoading={isPaying} onClick={() => onPay(entry, method)}>Confirm payout</Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}

const Income = () => {
  const { summary, entries, fetchSummary, fetchEntries, addEntry, removeEntry, editEntry } = useIncomeStore()
  const { pay } = useTransactionsStore()
  const { applications, fetchMyApplications } = useApplicationsStore()
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [ratingEntry, setRatingEntry] = useState(null)
  const [ratedIds, setRatedIds] = useState(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [payingId, setPayingId] = useState(null)
  const [payoutEntry, setPayoutEntry] = useState(null)

  useEffect(() => {
    Promise.all([fetchSummary(), fetchEntries(), fetchMyApplications()]).finally(() => setIsLoading(false))
  }, [])

  const approvedApplications = applications.filter((a) => a.applicationStatus === 'APPROVED')
  const refreshSummary = () => fetchSummary().catch(() => {})

  const handleMarkComplete = async (entry) => {
    await editEntry(entry._id, { status: 'COMPLETED' }); refreshSummary(); toast.success('Marked as completed')
  }

  const handleEdit = async (id, data) => {
    await editEntry(id, data); refreshSummary(); toast.success('Entry updated')
  }

  const handlePayout = async (entry, method) => {
    setPayingId(entry._id)
    try {
      const r = await pay({ incomeEntryId: entry._id, amount: entry.amountEarned, method })
      const url = r.data?.properties?.checkoutUrl
      if (url) { window.open(url, '_blank'); toast.success('Complete your payment in the new tab, then check its status under Transactions.') }
      else toast.success(`Payout of ${peso(entry.amountEarned)} recorded`)
      setPayoutEntry(null)
    } catch (error) { toast.error(error?.response?.data?.message || 'Payment failed') }
    finally { setPayingId(null) }
  }

  if (isLoading) return <p className="text-sm text-ink-muted">Loading your income data...</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Income Tracker</h1>
          <p className="mt-1 text-sm text-ink-muted">Track your earnings, hours, and progress toward your goal.</p>
        </div>
        <Button variant="accent" onClick={() => { setShowForm((s) => !s); setEditingEntry(null); setRatingEntry(null) }}>
          <LuPlus className="h-4 w-4" /> Add entry
        </Button>
      </div>

      {showForm ? (
        <Card>
          <AddEntryForm
            approvedApplications={approvedApplications}
            onAdd={async (data) => { await addEntry(data); refreshSummary(); toast.success('Entry added') }}
            onClose={() => setShowForm(false)}
          />
        </Card>
      ) : null}

      {approvedApplications.length > 0 && !showForm ? (
        <div className="rounded-xl border border-success-600/20 bg-success-100/30 px-4 py-3">
          <p className="text-sm font-medium text-success-600">
            You have {approvedApplications.length} approved application{approvedApplications.length > 1 ? 's' : ''} ready to track.
          </p>
          <p className="mt-0.5 text-xs text-success-600/80">Click &ldquo;Add entry&rdquo; above and select from your approved opportunities.</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-xs text-ink-muted">Total earned</p><p className="mt-1 text-2xl font-semibold tabular-nums text-ink-900">{peso(summary?.totalEarned)}</p></Card>
        <Card><p className="text-xs text-ink-muted">This month</p><p className="mt-1 text-2xl font-semibold tabular-nums text-success-600">{peso(summary?.thisMonthEarned)}</p></Card>
        <Card><p className="text-xs text-ink-muted">Hours logged</p><p className="mt-1 text-2xl font-semibold tabular-nums text-ink-900">{summary?.totalHours || 0}</p></Card>
        <Card><p className="text-xs text-ink-muted">Completed gigs</p><p className="mt-1 text-2xl font-semibold tabular-nums text-ink-900">{summary?.completedCount || 0}</p></Card>
      </div>

      {summary?.monthlyIncomeGoal > 0 ? (
        <Card>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-ink-900">Monthly goal progress</span>
            <span className="text-ink-muted">{peso(summary.thisMonthEarned)} / {peso(summary.monthlyIncomeGoal)}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-900/8">
            <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${summary.goalProgressPercent || 0}%` }} />
          </div>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">Last 6 months</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary?.monthlyTrend || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#14213d" strokeOpacity={0.08} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => peso(v)} cursor={{ fill: '#14213d', fillOpacity: 0.04 }} />
              <Bar dataKey="total" fill="#fca311" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">All entries</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-ink-muted">No entries yet. Add your first one above.</p>
        ) : (
          <div className="divide-y divide-ink-faint/15">
            {entries.map((entry) => (
              <div key={entry._id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{entry.title}</p>
                    <p className="text-xs text-ink-muted">
                      {entry.hoursSpent || 0} hrs · {new Date(entry.createdAt).toLocaleDateString()}
                      {entry.sideHustleId ? <span className="ml-2 text-amber-500">· From listing</span> : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-ink-900">{peso(entry.amountEarned)}</span>
                    <Badge tone={entry.status === 'COMPLETED' ? 'success' : entry.status === 'CANCELLED' ? 'danger' : 'amber'}>
                      {entry.status.replace('_', ' ')}
                    </Badge>
                    <Button size="sm" variant="ghost" className="border border-ink-faint/30" onClick={() => { setEditingEntry(editingEntry?._id === entry._id ? null : entry); setRatingEntry(null) }}>
                      <LuPencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    {entry.status === 'IN_PROGRESS' ? (
                      <Button size="sm" variant="ghost" className="border border-ink-faint/30" onClick={() => handleMarkComplete(entry)}>
                        <LuCircleCheck className="h-3.5 w-3.5" /> Complete
                      </Button>
                    ) : entry.status === 'COMPLETED' ? (
                      <>
                        <Button size="sm" variant="ghost" className="border border-ink-faint/30" onClick={() => { setPayoutEntry(payoutEntry?._id === entry._id ? null : entry); setEditingEntry(null); setRatingEntry(null) }}>
                          <LuWallet className="h-3.5 w-3.5" /> Payout
                        </Button>
                        {!ratedIds.has(entry._id) ? (
                          <Button size="sm" variant="ghost" className="border border-amber-500/40 text-amber-500" onClick={() => { setRatingEntry(ratingEntry?._id === entry._id ? null : entry); setEditingEntry(null) }}>
                            <LuStar className="h-3.5 w-3.5" /> Rate
                          </Button>
                        ) : <Badge tone="amber">Rated</Badge>}
                      </>
                    ) : null}
                    <button onClick={async () => { await removeEntry(entry._id); refreshSummary() }} className="text-ink-faint hover:text-danger-600">
                      <LuTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {editingEntry?._id === entry._id ? (
                  <div className="mt-3 rounded-xl border border-ink-faint/20 bg-canvas p-4">
                    <EditEntryForm entry={entry} onSave={handleEdit} onClose={() => setEditingEntry(null)} />
                  </div>
                ) : null}
                {payoutEntry?._id === entry._id ? (
                  <div className="mt-3 rounded-xl border border-ink-faint/20 bg-canvas p-4">
                    <PayoutForm entry={entry} isPaying={payingId === entry._id} onPay={handlePayout} onClose={() => setPayoutEntry(null)} />
                  </div>
                ) : null}
                {ratingEntry?._id === entry._id ? (
                  <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-100/30 p-4">
                    <RatingForm entry={entry} onClose={() => setRatingEntry(null)} onSubmitted={(id) => setRatedIds((prev) => new Set([...prev, id]))} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default Income
