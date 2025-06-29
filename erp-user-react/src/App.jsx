import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Attendance from './pages/Attendance'
import Regularization from './pages/Regularization'
import UserInfo from './pages/UserInfo'
import ApplyLeave from './pages/ApplyLeave'
// import ApplyLeave1 from './pages/ApplyLeave1'
import HolidayList from './pages/HolidayList'
import CalendarView from './pages/CalendarView'
import ResignationView from './pages/ResignationView'
import Login from './pages/Login'
import { AttendanceProvider } from './context/AttendanceContext'
import { AuthProvider, useAuth } from './context/AuthContext'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

// App Routes Component (needs to be inside AuthProvider)
const AppRoutes = () => {
  return (
    <AttendanceProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/attendance" replace />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="apply-leave" element={<ApplyLeave />} />
          {/* <Route path="apply-leave1" element={<ApplyLeave1 />} /> */}
          <Route path="regularization" element={<Regularization />} />
          <Route path="calendar_view" element={<CalendarView />} />
          <Route path="holiday_list" element={<HolidayList />} />
          <Route path="user-info" element={<UserInfo />} />
          <Route path="resignation_view" element={<ResignationView />} />
        </Route>
      </Routes>
    </AttendanceProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
