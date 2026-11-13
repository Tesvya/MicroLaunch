import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAdminStore } from '../../../store/admin/admin.store'
import { Card, Badge } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
const AdminUsers = () => {
  const { users, isLoading, fetchUsers, toggleUserActive, verifyEmail } = useAdminStore()
  const [busyId, setBusyId] = useState(null)
  useEffect(() => { fetchUsers() }, [])
  const handleToggle = async (user) => {
    setBusyId(user._id)
    try { await toggleUserActive(user._id, !user.isActive); toast.success(user.isActive ? 'User suspended' : 'User reactivated') }
    catch { toast.error('Could not update user status') }
    finally { setBusyId(null) }
  }
  const handleVerify = async (user) => {
    setBusyId(user._id)
    try { await verifyEmail(user._id); toast.success(`${user.name} is now verified`) }
    catch (error) { toast.error(error?.response?.data?.message || 'Could not verify this account') }
    finally { setBusyId(null) }
  }
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-ink-900">Manage Users</h1><p className="mt-1 text-sm text-ink-muted">View registered users and manage account access.</p></div>
      {isLoading ? <p className="text-sm text-ink-muted">Loading users...</p> : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-faint/15 bg-canvas text-xs uppercase tracking-wide text-ink-muted">
              <tr><th className="px-5 py-3 font-medium">Name</th><th className="px-5 py-3 font-medium">Email</th><th className="px-5 py-3 font-medium">Role</th><th className="px-5 py-3 font-medium">Profile</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium" /></tr>
            </thead>
            <tbody className="divide-y divide-ink-faint/10">
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="px-5 py-3 font-medium text-ink-900">{user.name}</td>
                  <td className="px-5 py-3 text-ink-muted">{user.email}</td>
                  <td className="px-5 py-3"><Badge tone={user.roleId?.name==='ADMIN'?'amber':'neutral'}>{user.roleId?.name}</Badge></td>
                  <td className="px-5 py-3 text-ink-muted">{user.hasCompletedProfile?'Complete':'Incomplete'}</td>
                  <td className="px-5 py-3"><Badge tone={user.isActive?'success':'danger'}>{user.isActive?'Active':'Suspended'}</Badge>{user.isEmailVerified===false?<Badge tone="amber" className="ml-1.5">Email unverified</Badge>:null}</td>
                  <td className="px-5 py-3 text-right"><div className="flex justify-end gap-2">{user.isEmailVerified===false?<Button size="sm" variant="accent" isLoading={busyId===user._id} onClick={()=>handleVerify(user)}>Verify email</Button>:null}{user.roleId?.name!=='ADMIN'?<Button size="sm" variant="ghost" className="border border-ink-faint/30" isLoading={busyId===user._id} onClick={()=>handleToggle(user)}>{user.isActive?'Suspend':'Reactivate'}</Button>:null}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
export default AdminUsers
