import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LuLayoutDashboard } from 'react-icons/lu'
import { useAuthStore } from '../../store/auth/auth.store'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Input'
import { ResendVerification } from '../../components/auth/ResendVerification'
const roleHomeRoute = (role) => { const r = (role||'').toUpperCase(); if (r==='ADMIN') return '/admin/dashboard'; if (r==='USER') return '/app/recommendations'; return '/login' }
const Login = () => {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm()
  const onSubmit = async (data) => {
    setServerError(''); setUnverifiedEmail(''); setIsSubmitting(true)
    try { const r = await login(data); navigate(searchParams.get('next') || roleHomeRoute(r.data?.properties?.user?.role), { replace: true }) }
    catch (e) {
      if (e?.response?.data?.code === 'EMAIL_NOT_VERIFIED') setUnverifiedEmail(data.email)
      setServerError(e?.response?.data?.message || 'Something went wrong. Please try again.')
    }
    finally { setIsSubmitting(false) }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2"><LuLayoutDashboard className="h-5 w-5 text-amber-500" /><span className="font-display text-lg font-semibold text-ink-900">MICROLAUNCH</span></Link>
        <div className="rounded-2xl border border-ink-faint/15 bg-surface p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-ink-900">Welcome back</h1>
          <p className="mb-6 text-sm text-ink-muted">Log in to see your side-hustle matches.</p>
          {serverError ? <div className="mb-4 rounded-xl bg-danger-100 px-3.5 py-2.5 text-sm text-danger-600">{serverError}</div> : null}
          {unverifiedEmail ? <div className="mb-4"><ResendVerification email={unverifiedEmail} startCooldown={false} /></div> : null}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Email" error={errors.email?.message}><Input type="email" placeholder="you@example.com" error={errors.email} {...register('email', { required: 'Email is required' })} /></Field>
            <div className="-mb-2 flex justify-end"><Link to="/forgot-password" className="text-xs font-medium text-ink-muted hover:text-ink-900 hover:underline">Forgot password?</Link></div>
            <Field label="Password" error={errors.password?.message}><Input type="password" placeholder="********" error={errors.password} {...register('password', { required: 'Password is required' })} /></Field>
            <Button type="submit" variant="accent" className="w-full" isLoading={isSubmitting}>Log in</Button>
          </form>
          <p className="mt-6 text-center text-sm text-ink-muted">Don&rsquo;t have an account? <Link to="/register" className="font-medium text-ink-900 hover:underline">Sign up</Link></p>
        </div>
      </div>
    </div>
  )
}
export default Login
