import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.hook'
export const roleHomeRoute = (role) => { const r = (role||'').toUpperCase(); if (r==='ADMIN') return '/admin/dashboard'; if (r==='USER') return '/app/recommendations'; return '/login' }
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isAuthLoading } = useAuth()
  const location = useLocation()
  if (isAuthLoading) return null
  if (!isAuthenticated) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const userRole = (user?.role||'').toUpperCase()
    if (!allowedRoles.includes(userRole)) return <Navigate to={roleHomeRoute(user?.role)} replace />
  }
  return children
}
