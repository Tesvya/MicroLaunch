import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { LuReceipt, LuRefreshCw, LuExternalLink } from 'react-icons/lu'
import { useTransactionsStore } from '../../../store/user/transactions.store'
import { Card, Badge } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'

const peso = (n) => `\u20b1${Number(n || 0).toLocaleString('en-PH')}`
const TONE = { SUCCESS: 'success', PENDING: 'amber', FAILED: 'danger', REFUNDED: 'neutral' }

const Transactions = () => {
  const { transactions, isLoading, fetchTransactions, verify } = useTransactionsStore()
  const [busyId, setBusyId] = useState(null)

  useEffect(() => { fetchTransactions().catch(() => {}) }, [])

  const handleVerify = async (id) => {
    setBusyId(id)
    try {
      const r = await verify(id)
      const status = r.data?.properties?.transaction?.status
      toast[status === 'SUCCESS' ? 'success' : 'info'](status === 'SUCCESS' ? 'Payment confirmed' : 'Still pending at the payment provider')
    } catch (error) { toast.error(error?.response?.data?.message || 'Could not check status') }
    finally { setBusyId(null) }
  }

  const total = transactions.filter((t) => t.status === 'SUCCESS').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Transactions</h1>
        <p className="mt-1 text-sm text-ink-muted">Your payout history. Confirmed total: <span className="font-medium text-success-600">{peso(total)}</span></p>
      </div>
      {isLoading ? <p className="text-sm text-ink-muted">Loading transactions...</p>
        : transactions.length === 0 ? (
          <Card className="text-center"><LuReceipt className="mx-auto mb-3 h-8 w-8 text-ink-faint" /><p className="text-sm text-ink-muted">No transactions yet. Use &ldquo;Payout&rdquo; on a completed entry in your Income Tracker.</p></Card>
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => (
              <Card key={t._id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold tabular-nums text-ink-900">{peso(t.amount)}</p>
                      <Badge tone={TONE[t.status] || 'neutral'}>{t.status}</Badge>
                      <Badge tone="neutral">{t.method.replace('MOCK_', 'Simulated ')}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">{t.referenceNumber} &middot; {new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                  {t.status === 'PENDING' ? (
                    <div className="flex gap-2">
                      {t.checkoutUrl ? <a href={t.checkoutUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" className="border border-ink-faint/30"><LuExternalLink className="h-3.5 w-3.5" /> Open checkout</Button></a> : null}
                      <Button size="sm" variant="accent" isLoading={busyId === t._id} onClick={() => handleVerify(t._id)}><LuRefreshCw className="h-3.5 w-3.5" /> Check status</Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  )
}
export default Transactions
