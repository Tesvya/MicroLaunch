import { ProtectedRoute } from './ProtectedRoute'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import AdminOverview from '../pages/dashboard/admin/Overview'
import AdminListings from '../pages/dashboard/admin/Listings'
import AdminUsers from '../pages/dashboard/admin/Users'
import AdminApplications from '../pages/dashboard/admin/Applications'
import AdminPayouts from '../pages/dashboard/admin/Payouts'
import AdminPwdVerifications from '../pages/dashboard/admin/PwdVerifications'
import AdminReports from '../pages/dashboard/admin/Reports'
import AdminActivityLogs from '../pages/dashboard/admin/ActivityLogs'
export const AdminRoutes = [
    {
        path: '/admin',
        element: <ProtectedRoute allowedRoles={['ADMIN']}><DashboardLayout variant="admin" /></ProtectedRoute>,
        children: [
            { path: 'dashboard', element: <AdminOverview /> },
            { path: 'listings', element: <AdminListings /> },
            { path: 'applications', element: <AdminApplications /> },
            { path: 'payouts', element: <AdminPayouts /> },
            { path: 'pwd-verifications', element: <AdminPwdVerifications /> },
            { path: 'users', element: <AdminUsers /> },
            { path: 'reports', element: <AdminReports /> },
            { path: 'activity-logs', element: <AdminActivityLogs /> }
        ]
    }
]
