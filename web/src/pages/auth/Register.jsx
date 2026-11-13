import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { LuLayoutDashboard, LuMailCheck } from 'react-icons/lu'
import { useAuthStore } from '../../store/auth/auth.store'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Input'
import { ResendVerification } from '../../components/auth/ResendVerification'

const Register = () => {
  const registerUser = useAuthStore((s) => s.register)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [registered, setRegistered] = useState(null)
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const password = watch('password')

  const onSubmit = async (data) => {
    setServerError(''); setIsSubmitting(true)
    try {
      const r = await registerUser(data)
      const p = r.data?.properties || {}
      setRegistered({ email: p.email || data.email, emailSent: p.emailSent, devVerificationUrl: p.devVerificationUrl || null })
    } catch (e) { setServerError(e?.response?.data?.message || 'Something went wrong. Please try again.') }
    finally { setIsSubmitting(false) }
  }

  const Brand = () => (
    <Link to="/" className="mb-8 flex items-center justify-center gap-2"><LuLayoutDashboard className="h-5 w-5 text-amber-500" /><span className="font-display text-lg font-semibold text-ink-900">MICROLAUNCH</span></Link>
  )

  if (registered) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
        <div className="w-full max-w-sm">
          <Brand />
          <div className="rounded-2xl border border-ink-faint/15 bg-surface p-8 shadow-sm">
            <LuMailCheck className="mb-3 h-10 w-10 text-amber-500" />
            <h1 className="mb-1 text-xl font-semibold text-ink-900">Check your email</h1>
            <p className="mb-5 text-sm text-ink-muted">
              {registered.emailSent === false && !registered.devVerificationUrl
                ? <>We created your account but could not send an email to <span className="font-medium text-ink-900">{registered.email}</span>. Use the button below to try again.</>
                : <>We sent a verification link to <span className="font-medium text-ink-900">{registered.email}</span>. Open it to activate your account. The link expires in 24 hours.</>}
            </p>
            <ResendVerification email={registered.email} initialDevUrl={registered.devVerificationUrl} />
            <p className="mt-6 text-center text-sm text-ink-muted">Already verified? <Link to="/login" className="font-medium text-ink-900 hover:underline">Log in</Link></p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm">
        <Brand />
        <div className="rounded-2xl border border-ink-faint/15 bg-surface p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-ink-900">Create your account</h1>
          <p className="mb-6 text-sm text-ink-muted">Start finding side-hustles that fit your life.</p>
          {serverError ? <div className="mb-4 rounded-xl bg-danger-100 px-3.5 py-2.5 text-sm text-danger-600">{serverError}</div> : null}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Full name" error={errors.name?.message}><Input placeholder="Juan Dela Cruz" error={errors.name} {...register('name', { required: 'Name is required' })} /></Field>
            <Field label="Email" error={errors.email?.message}><Input type="email" placeholder="you@example.com" error={errors.email} {...register('email', { required: 'Email is required' })} /></Field>
            <Field label="Password" error={errors.password?.message} hint="At least 8 characters"><Input type="password" placeholder="********" error={errors.password} {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Password must be at least 8 characters' } })} /></Field>
            <Field label="Confirm password" error={errors.confirmPassword?.message}><Input type="password" placeholder="********" error={errors.confirmPassword} {...register('confirmPassword', { required: 'Please confirm your password', validate: (v) => v === password || 'Passwords do not match' })} /></Field>
            <Button type="submit" variant="accent" className="w-full" isLoading={isSubmitting}>Create account</Button>
          </form>
          <p className="mt-6 text-center text-sm text-ink-muted">Already have an account? <Link to="/login" className="font-medium text-ink-900 hover:underline">Log in</Link></p>
        </div>
      </div>
    </div>
  )
}
export default Register
