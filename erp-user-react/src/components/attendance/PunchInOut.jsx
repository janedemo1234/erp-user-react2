import { useState, useEffect } from 'react'
import { CheckCircle, Clock, Loader2, AlertTriangle } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const PunchInOut = () => {
  const [attendance, setAttendance] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [canPunchIn, setCanPunchIn] = useState(true)
  const [timeStatus, setTimeStatus] = useState('normal') // 'normal', 'grace', 'late'
  const [pendingRegularization, setPendingRegularization] = useState(null)
  
  const navigate = useNavigate()
  const location = useLocation()
  const { getEmployeeSerialNumber } = useAuth()
  
  // Get employee serial number from authenticated user
  const employeeSerialNumber = getEmployeeSerialNumber()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
      checkTimeStatus() // Check time status every second
      checkMidnightReset() // Check if it's past midnight to reset
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchTodaysAttendance()
    fetchPendingRegularizations()
    checkTimeStatus()
  }, [])

  // Refresh data when component becomes visible (user returns from regularization page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPendingRegularizations()
        fetchTodaysAttendance()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Refresh data when location changes (user navigates back from regularization)
  useEffect(() => {
    if (location.pathname === '/attendance') {
      fetchPendingRegularizations()
      fetchTodaysAttendance()
    }
  }, [location.pathname])

  // Check if it's past midnight to reset the pending regularization state
  const checkMidnightReset = () => {
    const now = new Date()
    if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
      setPendingRegularization(null)
      fetchTodaysAttendance()
      fetchPendingRegularizations()
    }
  }

  // Fetch all regularizations (both pending and approved) for current employee and today's date
  const fetchPendingRegularizations = async () => {
    try {
      let allRegularizations = []
      
      // Try to fetch pending regularizations
      try {
        const pendingResponse = await fetch(`http://localhost:8080/api/attendance-regularization/pending`)
        if (pendingResponse.ok) {
          const pendingData = await pendingResponse.json()
          if (pendingData.success) {
            allRegularizations = [...(pendingData.data || [])]
          }
        }
      } catch (err) {
        console.error('Error fetching pending regularizations:', err)
      }
      
      // Try to fetch approved regularizations (if such API exists)
      try {
        const approvedResponse = await fetch(`http://localhost:8080/api/attendance-regularization/approved`)
        if (approvedResponse.ok) {
          const approvedData = await approvedResponse.json()
          if (approvedData.success) {
            allRegularizations = [...allRegularizations, ...(approvedData.data || [])]
          }
        }
      } catch (err) {
        console.log('Approved regularizations API not available, using pending only')
      }
      
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      
      // Find regularization for today and current employee (pending or approved)
      const todayRegularization = allRegularizations.find(reg => 
        reg.date === today && 
        reg.employee?.employeeSerialNumber === employeeSerialNumber
      )
      
      setPendingRegularization(todayRegularization || null)
      
    } catch (err) {
      console.error('Error fetching regularizations:', err)
      setPendingRegularization(null)
    }
  }

  // Check if current time is normal, grace, or late
  const checkTimeStatus = () => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Convert current time to minutes for easier comparison
    const currentTimeInMinutes = currentHour * 60 + currentMinute
    const normalTime = 10 * 60 // 10:00 AM in minutes
    const graceTime = 10 * 60 + 15 // 10:15 AM in minutes
    
    if (currentTimeInMinutes <= normalTime) {
      setTimeStatus('normal')
    } else if (currentTimeInMinutes <= graceTime) {
      setTimeStatus('grace')
    } else {
      setTimeStatus('late')
    }
  }

  const fetchTodaysAttendance = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `http://localhost:8080/api/attendance/today?employeeSerialNumber=${employeeSerialNumber}`
      )
      const data = await response.json()
      
      if (data.success) {
        setAttendance(data.data)
        setCanPunchIn(data.canPunchIn)
      } else {
        setAttendance(null)
      }
    } catch (err) {
      console.error('Error fetching attendance:', err)
      setError('Failed to fetch attendance status')
    } finally {
      setLoading(false)
    }
  }

  const handlePunchIn = async () => {
    // Check if there's a pending regularization - button should be disabled
    if (pendingRegularization) {
      return
    }

    // Check if it's late attendance
    if (timeStatus === 'late') {
      handleLateAttendance()
      return
    }

    // Normal or grace punch in
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(
        `http://localhost:8080/api/attendance/punch-in`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `employeeSerialNumber=${employeeSerialNumber}`
        }
      )
      
      const data = await response.json()
      
      if (data.success) {
        // Refetch updated status
        await fetchTodaysAttendance()
        await fetchPendingRegularizations()
      } else {
        setError(data.message || 'Failed to punch in')
      }
    } catch (err) {
      console.error('Error punching in:', err)
      setError('Failed to punch in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLateAttendance = () => {
    const now = new Date()
    const punchInTime = now.toTimeString().slice(0, 8) // HH:MM:SS format
    
    // Calculate punch out time (punch in + 9 hours)
    const punchOutDate = new Date(now.getTime() + 9 * 60 * 60 * 1000) // Add 9 hours
    const punchOutTime = punchOutDate.toTimeString().slice(0, 8) // HH:MM:SS format
    
    const today = now.toISOString().split('T')[0] // YYYY-MM-DD format
    
    // Navigate to regularization with pre-filled data
    navigate('/regularization', {
      state: {
        isLateAttendance: true,
        prefilledData: {
          date: today,
          status: 'Late Attendance',
          punchInTime: punchInTime,
          punchOutTime: punchOutTime,
          employeeSerialNumber: employeeSerialNumber
        }
      }
    })
  }

  const formatTime = (timeString) => {
    if (!timeString) return ''
    
    try {
      const date = new Date(timeString)
      return isNaN(date) 
        ? timeString 
        : date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
    } catch {
      return timeString
    }
  }

  const getCurrentTimeIST = () => {
    return currentTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getTimeStatusInfo = () => {
    // Check for regularization first
    if (pendingRegularization) {
      if (pendingRegularization.mdApprovalStatus === 'Y') {
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          message: 'Approved - Attendance Regularized'
        }
      } else if (pendingRegularization.mdApprovalStatus === 'N') {
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          message: 'Pending for Approval - Regularization Submitted'
        }
      }
    }

    switch (timeStatus) {
      case 'normal':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          message: 'On Time - Normal Entry'
        }
      case 'grace':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          message: 'Grace Period - Still On Time'
        }
      case 'late':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          message: 'Late Attendance - Regularization Required'
        }
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          message: 'Check Status'
        }
    }
  }

  const statusInfo = getTimeStatusInfo()
  
  if (loading && attendance === null) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600 mr-2" size={24} />
          <span className="text-gray-600">Loading attendance status...</span>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Today's Attendance</h2>
        <div className="flex items-center text-blue-600">
          <Clock className="mr-2" size={20} />
          <span className="font-mono text-lg">{getCurrentTimeIST()}</span>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Time Status Indicator */}
      {!attendance?.punchInTime && (
        <div className={`mb-6 p-4 rounded-lg border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
          <div className="flex items-center">
            {(timeStatus === 'late' || pendingRegularization) && <AlertTriangle className={`mr-2 ${statusInfo.color}`} size={20} />}
            <span className={`font-medium ${statusInfo.color}`}>
              {statusInfo.message}
            </span>
          </div>
          {timeStatus === 'late' && !pendingRegularization && (
            <p className="text-sm text-red-600 mt-2">
              Clicking punch in will redirect you to regularization form for late attendance approval.
            </p>
          )}
          {pendingRegularization && (
            <p className={`text-sm mt-2 ${pendingRegularization.mdApprovalStatus === 'Y' ? 'text-green-600' : 'text-orange-600'}`}>
              {pendingRegularization.mdApprovalStatus === 'Y' 
                ? 'Your attendance has been approved. Punch in will be available tomorrow.'
                : 'Your late attendance regularization is pending for management approval. Punch in will be available tomorrow.'
              }
            </p>
          )}
        </div>
      )}
      
      {/* Punch In Card - Centered */}
      <div className="flex justify-center">
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 w-full max-w-md">
          <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">Punch In</h3>
          
          {attendance?.punchInTime ? (
            <div className="flex flex-col items-center">
              <div className="text-green-500 mb-2">
                <CheckCircle size={40} />
              </div>
              <p className="text-gray-600 mb-1">You punched in at:</p>
              <p className="text-xl font-semibold text-gray-800">
                {formatTime(attendance.punchInTime)}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <button 
                onClick={handlePunchIn}
                disabled={loading || !canPunchIn || pendingRegularization}
                className={`px-6 py-2 rounded-md flex items-center mb-2 ${
                  pendingRegularization 
                    ? pendingRegularization.mdApprovalStatus === 'Y'
                      ? 'bg-green-600' 
                      : 'bg-orange-600'
                    : timeStatus === 'late' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : timeStatus === 'grace'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white ${loading || !canPunchIn || pendingRegularization ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Processing...
                  </>
                ) : pendingRegularization ? (
                  pendingRegularization.mdApprovalStatus === 'Y' 
                    ? 'Approved' 
                    : 'Pending for Approval'
                ) : timeStatus === 'late' ? (
                  'Apply for Regularization'
                ) : (
                  'Punch In Now'
                )}
              </button>
              <p className="text-sm text-gray-500 text-center">
                {pendingRegularization 
                  ? pendingRegularization.mdApprovalStatus === 'Y'
                    ? 'Attendance regularization approved'
                    : 'Regularization request submitted and pending approval'
                  : !canPunchIn 
                  ? 'Already punched in today' 
                  : timeStatus === 'late'
                  ? 'Late attendance requires regularization'
                  : timeStatus === 'grace'
                  ? 'Grace period - punch in available'
                  : 'Record your arrival time'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {attendance && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-gray-800 mb-2">Today's Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Date:</span>
              <div className="font-medium">
                {new Date(attendance.attendanceDate).toLocaleDateString('en-IN')}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Punch In:</span>
              <div className="font-medium">
                {attendance.punchInTime ? formatTime(attendance.punchInTime) : '—'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PunchInOut