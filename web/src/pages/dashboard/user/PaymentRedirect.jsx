import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { LuCircleCheck, LuCircleX } from 'react-icons/lu'

export const PaymentSuccess = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const ref = searchParams.get('ref')

    useEffect(() => {
        toast.success('Payment confirmed successfully!')
        const timer = setTimeout(() => navigate('/app/income'), 3000)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className="flex min-h-screen items-center justify-center bg-canvas">
            <div className="rounded-2xl border border-ink-faint/15 bg-surface p-10 text-center shadow-sm">
                <LuCircleCheck className="mx-auto mb-4 h-14 w-14 text-success-600" />
                <h1 className="text-xl font-semibold text-ink-900">Payment confirmed!</h1>
                {ref ? <p className="mt-1 text-sm text-ink-muted">Reference: {ref}</p> : null}
                <p className="mt-3 text-sm text-ink-muted">Redirecting you to your Income Tracker...</p>
            </div>
        </div>
    )
}

export const PaymentCancel = () => {
    const navigate = useNavigate()

    useEffect(() => {
        toast.error('Payment was cancelled')
        const timer = setTimeout(() => navigate('/app/income'), 3000)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className="flex min-h-screen items-center justify-center bg-canvas">
            <div className="rounded-2xl border border-ink-faint/15 bg-surface p-10 text-center shadow-sm">
                <LuCircleX className="mx-auto mb-4 h-14 w-14 text-danger-600" />
                <h1 className="text-xl font-semibold text-ink-900">Payment cancelled</h1>
                <p className="mt-3 text-sm text-ink-muted">Redirecting you back...</p>
            </div>
        </div>
    )
}
