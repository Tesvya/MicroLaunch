import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { LuLayoutDashboard, LuCircleCheck, LuCircleX } from 'react-icons/lu'
import { resetPassword } from '../../services/auth/auth.service'
import { useAuthStore } from '../../store/auth/auth.store'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Input'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const validLink = /^[a-f0-9]{64}$/.test(token)
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm()

  const onSubmit = async ({ password, confirmPassword }) => {
    setServerError(''); setIsSubmitting(true)
    try {
      await resetPassword({ token, password, confirmPassword })
      useAuthStore.setState({ user: null, isAuthenticated: false, hasCheckedAuth: true }) // the server ended all sessions
      setDone(true)
    } catch (e) { setServerError(e?.response?.data?.message || 'Something went wrong. Please try again.') }
    finally { setIsSubmitting(false) }
  }

  const Failed = ({ message }) => (
    <div className="text-center">
      <LuCircleX className="mx-auto mb-3 h-12 w-12 text-danger-600" />
      <h1 className="text-xl font-semibold text-ink-900">Link not valid</h1>
      <p className="mt-2 mb-6 text-sm text-ink-muted">{message}</p>
      <Link to="/forgot-password"><Button variant="accent" className="w-full">Request a new link</Button></Link>
    </div>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2"><LuLayoutDashboard className="h-5 w-5 text-amber-500" /><span className="font-display text-lg font-semibold text-ink-900">MICROLAUNCH</span></Link>
        <div className="rounded-2xl border border-ink-faint/15 bg-surface p-8 shadow-sm">
          {!validLink ? <Failed message="This reset link is incomplete. Open the link from your email again, or request a new one." />
            : done ? (
              <div className="text-center">
                <LuCircleCheck className="mx-auto mb-3 h-12 w-12 text-success-600" />
                <h1 className="text-xl font-semibold text-ink-900">Password reset</h1>
                <p className="mt-2 mb-6 text-sm text-ink-muted">Your password has been changed. For your security, you were logged out everywhere.</p>
                <Link to="/login"><Button variant="accent" className="w-full">Log in</Button></Link>
              </div>
            ) : (
              <>
                <h1 className="mb-1 text-xl font-semibold text-ink-900">Choose a new password</h1>
                <p className="mb-6 text-sm text-ink-muted">Use at least 8 characters.</p>
                {serverError ? (
                  <div role="alert" className="mb-4 rounded-xl bg-danger-100 px-3.5 py-2.5 text-sm text-danger-600">
                    {serverError} <Link to="/forgot-password" className="font-medium underline">Request a new link</Link>
                  </div>
                ) : null}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <Field label="New password" error={errors.password?.message}><Input type="password" autoComplete="new-password" error={errors.password} {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Password must be at least 8 characters' } })} /></Field>
                  <Field label="Confirm new password" error={errors.confirmPassword?.message}><Input type="password" autoComplete="new-password" error={errors.confirmPassword} {...register('confirmPassword', { required: 'Confirm your password', validate: (v) => v === watch('password') || 'Passwords do not match' })} /></Field>
                  <Button type="submit" variant="accent" className="w-full" isLoading={isSubmitting}>Reset password</Button>
                </form>
              </>
            )}
        </div>
      </div>
    </div>
  )
}
export default ResetPassword
