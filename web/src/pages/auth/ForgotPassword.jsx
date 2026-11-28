import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { LuLayoutDashboard, LuMailCheck } from 'react-icons/lu'
import { forgotPassword } from '../../services/auth/auth.service'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Input'

const ForgotPassword = () => {
  const [sentTo, setSentTo] = useState('')
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email }) => {
    setServerError(''); setIsSubmitting(true)
    try { await forgotPassword(email); setSentTo(email) }
    catch (e) { setServerError(e?.response?.data?.message || 'Something went wrong. Please try again.') }
    finally { setIsSubmitting(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2"><LuLayoutDashboard className="h-5 w-5 text-amber-500" /><span className="font-display text-lg font-semibold text-ink-900">MICROLAUNCH</span></Link>
        <div className="rounded-2xl border border-ink-faint/15 bg-surface p-8 shadow-sm">
          {sentTo ? (
            <div className="text-center">
              <LuMailCheck className="mx-auto mb-3 h-12 w-12 text-success-600" />
              <h1 className="text-xl font-semibold text-ink-900">Check your email</h1>
              <p className="mt-2 text-sm text-ink-muted">If an account exists for <span className="font-medium text-ink-900">{sentTo}</span>, we sent a link to reset your password. It expires in 1 hour.</p>
              <p className="mt-3 text-xs text-ink-muted">No email after a few minutes? Check your spam folder, or try again in a minute.</p>
              <Button variant="ghost" className="mt-6 w-full border border-ink-faint/30" onClick={() => setSentTo('')}>Use a different email</Button>
            </div>
          ) : (
            <>
              <h1 className="mb-1 text-xl font-semibold text-ink-900">Forgot your password?</h1>
              <p className="mb-6 text-sm text-ink-muted">Enter the email you signed up with and we&rsquo;ll send you a link to choose a new one.</p>
              {serverError ? <div role="alert" className="mb-4 rounded-xl bg-danger-100 px-3.5 py-2.5 text-sm text-danger-600">{serverError}</div> : null}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" placeholder="you@example.com" error={errors.email} {...register('email', { required: 'Email is required' })} /></Field>
                <Button type="submit" variant="accent" className="w-full" isLoading={isSubmitting}>Send reset link</Button>
              </form>
            </>
          )}
          <p className="mt-6 text-center text-sm text-ink-muted">Remembered it? <Link to="/login" className="font-medium text-ink-900 hover:underline">Back to log in</Link></p>
        </div>
      </div>
    </div>
  )
}
export default ForgotPassword
