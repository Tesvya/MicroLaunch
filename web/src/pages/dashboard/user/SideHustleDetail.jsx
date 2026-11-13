import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { LuArrowLeft, LuMapPin, LuClock, LuWallet, LuStar, LuSend } from 'react-icons/lu'
import { getSideHustleById } from '../../../services/user/sidehustles.service'
import { getSideHustleRatingsSummary } from '../../../services/user/ratings.service'
import { useApplicationsStore } from '../../../store/user/applications.store'
import { Card, Badge } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Field, Textarea } from '../../../components/ui/Input'

const formatPay = (s) => {
    const suffix = s.payType === 'HOURLY' ? '/hr' : ''
    if (s.payAmountMin && s.payAmountMax && s.payAmountMin !== s.payAmountMax) {
        return `\u20b1${s.payAmountMin}\u2013${s.payAmountMax}${suffix}`
    }
    return `\u20b1${s.payAmountMin || s.payAmountMax || 0}${suffix}`
}

const SideHustleDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [sideHustle, setSideHustle] = useState(null)
    const [ratingsSummary, setRatingsSummary] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isApplying, setIsApplying] = useState(false)
    const [coverNote, setCoverNote] = useState('')
    const [showApplyForm, setShowApplyForm] = useState(false)
    const [hasApplied, setHasApplied] = useState(false)
    const { apply, applications, fetchMyApplications } = useApplicationsStore()

    useEffect(() => {
        setIsLoading(true)
        Promise.all([
            getSideHustleById(id),
            getSideHustleRatingsSummary(id),
            fetchMyApplications()
        ])
            .then(([detailRes, ratingsRes]) => {
                setSideHustle(detailRes.data?.properties?.sideHustle)
                setRatingsSummary(ratingsRes.data?.properties)
            })
            .catch(() => toast.error('Could not load this listing'))
            .finally(() => setIsLoading(false))
    }, [id])

    useEffect(() => {
        if (applications.length > 0 && id) {
            const alreadyApplied = applications.some(
                (app) => app.sideHustleId?._id === id && app.applicationStatus !== 'CANCELLED'
            )
            setHasApplied(alreadyApplied)
        }
    }, [applications, id])

    const handleApply = async (e) => {
        e.preventDefault()
        setIsApplying(true)
        try {
            await apply({ sideHustleId: id, coverNote })
            toast.success('Application submitted successfully!')
            setHasApplied(true)
            setShowApplyForm(false)
            navigate('/app/applications')
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not submit application')
        } finally {
            setIsApplying(false)
        }
    }

    if (isLoading) {
        return <p className="text-sm text-ink-muted">Loading...</p>
    }

    if (!sideHustle) {
        return <p className="text-sm text-ink-muted">Listing not found.</p>
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <Link to="/app/explore" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-900">
                <LuArrowLeft className="h-4 w-4" /> Back to listings
            </Link>

            <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge tone="amber">{sideHustle.workMode}</Badge>
                    <Badge tone="neutral">{sideHustle.payType.replace('_', ' ')}</Badge>
                    {ratingsSummary?.totalRatings > 0 ? (
                        <Badge tone="success">
                            <LuStar className="mr-1 inline h-3 w-3" />
                            {ratingsSummary.averageStars} ({ratingsSummary.totalRatings})
                        </Badge>
                    ) : null}
                </div>
                <h1 className="text-2xl font-semibold text-ink-900">{sideHustle.title}</h1>
            </div>

            <Card className="space-y-4">
                <p className="text-sm leading-relaxed text-ink-900">{sideHustle.description}</p>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex items-start gap-2">
                        <LuWallet className="mt-0.5 h-4 w-4 text-ink-faint" />
                        <div>
                            <p className="text-xs text-ink-muted">Pay</p>
                            <p className="text-sm font-medium text-success-600">{formatPay(sideHustle)}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <LuClock className="mt-0.5 h-4 w-4 text-ink-faint" />
                        <div>
                            <p className="text-xs text-ink-muted">Estimated hours/week</p>
                            <p className="text-sm font-medium text-ink-900">{sideHustle.estimatedWeeklyHours || 'Flexible'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <LuMapPin className="mt-0.5 h-4 w-4 text-ink-faint" />
                        <div>
                            <p className="text-xs text-ink-muted">Location</p>
                            <p className="text-sm font-medium text-ink-900">{sideHustle.location || 'Remote'}</p>
                        </div>
                    </div>
                </div>

                {sideHustle.requiredSkills?.length ? (
                    <div>
                        <p className="mb-1.5 text-xs text-ink-muted">Required skills</p>
                        <div className="flex flex-wrap gap-1.5">
                            {sideHustle.requiredSkills.map((skill) => (
                                <Badge key={skill} tone="neutral">{skill}</Badge>
                            ))}
                        </div>
                    </div>
                ) : null}
            </Card>

            {hasApplied ? (
                <div className="rounded-xl bg-success-100 px-4 py-3 text-sm font-medium text-success-600">
                    ✓ You have already applied to this opportunity. View status in My Applications.
                </div>
            ) : showApplyForm ? (
                <Card>
                    <h2 className="mb-4 text-sm font-semibold text-ink-900">Apply for this opportunity</h2>
                    <form onSubmit={handleApply} className="space-y-4">
                        <Field label="Cover note (optional)" hint="Tell them why you're a good fit">
                            <Textarea
                                rows={4}
                                placeholder="e.g. I have 2 years of experience in content writing and I'm available on weekends..."
                                value={coverNote}
                                onChange={(e) => setCoverNote(e.target.value)}
                            />
                        </Field>
                        <div className="flex gap-2">
                            <Button type="submit" variant="accent" isLoading={isApplying}>
                                <LuSend className="h-4 w-4" /> Submit application
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setShowApplyForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Card>
            ) : (
                <Button variant="accent" size="lg" onClick={() => setShowApplyForm(true)}>
                    <LuSend className="h-4 w-4" /> Apply for this opportunity
                </Button>
            )}
        </div>
    )
}

export default SideHustleDetail
