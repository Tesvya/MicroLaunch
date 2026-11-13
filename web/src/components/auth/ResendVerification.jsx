import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { resendVerification } from '../../services/auth/auth.service'
import { Button } from '../ui/Button'

const COOLDOWN_SECONDS = 60
// The server hands back a full URL in dev mode; keep only the path so it works on whatever port the app runs on.
const toLocalPath = (url) => { try { const u = new URL(url); return u.pathname + u.search } catch { return null } }

export const ResendVerification = ({ email, initialDevUrl = null, startCooldown = true }) => {
  const [secondsLeft, setSecondsLeft] = useState(startCooldown ? COOLDOWN_SECONDS : 0)
  const [isSending, setIsSending] = useState(false)
  const [devUrl, setDevUrl] = useState(initialDevUrl)

  useEffect(() => {
    if (secondsLeft <= 0) return undefined
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft])

  const handleResend = async () => {
    setIsSending(true)
    try {
      const r = await resendVerification(email)
      setDevUrl(r.data?.properties?.devVerificationUrl || null)
      toast.success('If your account is awaiting verification, a new email is on its way.')
      setSecondsLeft(COOLDOWN_SECONDS)
    } catch (error) { toast.error(error?.response?.data?.message || 'Could not resend the email') }
    finally { setIsSending(false) }
  }

  const devPath = devUrl ? toLocalPath(devUrl) : null

  return (
    <div className="space-y-3">
      <Button type="button" variant="ghost" className="w-full border border-ink-faint/30" isLoading={isSending} disabled={secondsLeft > 0} onClick={handleResend}>
        {secondsLeft > 0 ? `Resend email in ${secondsLeft}s` : 'Resend verification email'}
      </Button>
      {devPath ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-100/40 px-3.5 py-3 text-xs text-ink-900">
          <p className="font-medium">Developer mode: email delivery is not configured on this server.</p>
          <p className="mt-1 text-ink-muted">Use this link instead of the email:</p>
          <Link to={devPath} className="mt-1.5 inline-block font-medium text-amber-500 underline">Verify my email now</Link>
        </div>
      ) : null}
    </div>
  )
}
