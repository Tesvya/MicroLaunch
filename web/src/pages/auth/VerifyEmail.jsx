import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LuLayoutDashboard, LuCircleCheck, LuCircleX, LuLoader } from 'react-icons/lu'
import { verifyEmail } from '../../services/auth/auth.service'
import { Button } from '../../components/ui/Button'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState(token ? 'loading' : 'error')
  const [message, setMessage] = useState(token ? '' : 'This verification link is missing its token.')
  const started = useRef(false) // the token is single-use, so guard against React StrictMode running the effect twice

  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    verifyEmail(token)
      .then((r) => { setStatus('success'); setMessage(r.data?.message || 'Email verified.') })
      .catch((e) => { setStatus('error'); setMessage(e?.response?.data?.message || 'Could not verify your email.') })
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2"><LuLayoutDashboard className="h-5 w-5 text-amber-500" /><span className="font-display text-lg font-semibold text-ink-900">MICROLAUNCH</span></Link>
        <div className="rounded-2xl border border-ink-faint/15 bg-surface p-8 text-center shadow-sm">
          {status === 'loading' ? (<><LuLoader className="mx-auto mb-3 h-10 w-10 animate-spin text-amber-500" /><h1 className="text-xl font-semibold text-ink-900">Verifying your email...</h1></>) : null}
          {status === 'success' ? (<><LuCircleCheck className="mx-auto mb-3 h-12 w-12 text-success-600" /><h1 className="text-xl font-semibold text-ink-900">Email verified</h1><p className="mt-2 mb-6 text-sm text-ink-muted">{message}</p><Link to="/login"><Button variant="accent" className="w-full">Continue to log in</Button></Link></>) : null}
          {status === 'error' ? (<><LuCircleX className="mx-auto mb-3 h-12 w-12 text-danger-600" /><h1 className="text-xl font-semibold text-ink-900">Verification failed</h1><p className="mt-2 mb-6 text-sm text-ink-muted">{message}</p><Link to="/login"><Button variant="accent" className="w-full">Go to log in</Button></Link><p className="mt-4 text-xs text-ink-muted">Need a new link? Try logging in and use &ldquo;Resend verification email&rdquo;.</p></>) : null}
        </div>
      </div>
    </div>
  )
}
export default VerifyEmail
