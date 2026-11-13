import { ProtectedRoute } from './ProtectedRoute'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import Recommendations from '../pages/dashboard/user/Recommendations'
import Explore from '../pages/dashboard/user/Explore'
import SideHustleDetail from '../pages/dashboard/user/SideHustleDetail'
import Income from '../pages/dashboard/user/Income'
import Ratings from '../pages/dashboard/user/Ratings'
import Profile from '../pages/dashboard/user/Profile'
import MyApplications from '../pages/dashboard/user/MyApplications'
import Notifications from '../pages/dashboard/user/Notifications'
import Transactions from '../pages/dashboard/user/Transactions'
import { PaymentSuccess, PaymentCancel } from '../pages/dashboard/user/PaymentRedirect'
export const UserRoutes = [
    {
        path: '/app',
        element: <ProtectedRoute allowedRoles={['USER']}><DashboardLayout variant="user" /></ProtectedRoute>,
        children: [
            { path: 'recommendations', element: <Recommendations /> },
            { path: 'explore', element: <Explore /> },
            { path: 'explore/:id', element: <SideHustleDetail /> },
            { path: 'applications', element: <MyApplications /> },
            { path: 'income', element: <Income /> },
            { path: 'transactions', element: <Transactions /> },
            { path: 'ratings', element: <Ratings /> },
            { path: 'notifications', element: <Notifications /> },
            { path: 'profile', element: <Profile /> },
            { path: 'payments/paypal/success', element: <PaymentSuccess /> },
            { path: 'payments/paypal/cancel', element: <PaymentCancel /> }
        ]
    }
]
