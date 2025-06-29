import { FiAlertCircle, FiCalendar, FiClock } from 'react-icons/fi'
import { useAttendance } from '../../context/AttendanceContext'
import { formatDate } from '../../utils/dateUtils'

const AlertNotification = () => {
  const { checkMissingWeek, checkMissingMonth } = useAttendance()
  
  const weekStatus = checkMissingWeek()
  const monthStatus = checkMissingMonth()
  
  // No alerts needed
  if (!weekStatus.hasMissingDays && !monthStatus.hasMissingDays) {
    return null
  }
  
  // Check if entire week is missing
  const isEntireWeekMissing = weekStatus.missingDays.length >= 5
  
  // Check if entire month or a significant portion is missing
  const isSignificantMonthMissing = monthStatus.missingDays.length >= 15
  
  return (
    <div className="mb-6 animate-fadeIn">
      {isSignificantMonthMissing && (
        <div className="alert alert-danger flex items-start mb-4">
          <div className="text-error-600 mr-3 mt-1">
            <FiAlertCircle size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-error-700 mb-1">
              Monthly Attendance Alert
            </h3>
            <p className="text-error-600 mb-2">
              You have a significant number of missing attendance records this month.
              Please submit your attendance details as soon as possible.
            </p>
            <button 
              className="text-sm py-1 px-3 bg-white text-error-700 border border-error-300 rounded hover:bg-error-50 transition-colors duration-200 flex items-center"
            >
              <FiCalendar className="mr-1" />
              Add Monthly Records
            </button>
          </div>
        </div>
      )}
      
      {isEntireWeekMissing && !isSignificantMonthMissing && (
        <div className="alert alert-warning flex items-start mb-4">
          <div className="text-amber-600 mr-3 mt-1">
            <FiAlertCircle size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-amber-700 mb-1">
              Weekly Attendance Alert
            </h3>
            <p className="text-amber-600 mb-2">
              You have multiple missing attendance records this week.
              Please add your punch-in details.
            </p>
            <button 
              className="text-sm py-1 px-3 bg-white text-amber-700 border border-amber-300 rounded hover:bg-amber-50 transition-colors duration-200 flex items-center"
            >
              <FiCalendar className="mr-1" />
              Add Weekly Records
            </button>
          </div>
        </div>
      )}
      
      {weekStatus.hasMissingDays && !isEntireWeekMissing && !isSignificantMonthMissing && (
        <div className="alert alert-info flex items-start">
          <div className="text-blue-600 mr-3 mt-1">
            <FiClock size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-blue-700 mb-1">
              Attendance Reminder
            </h3>
            <p className="text-blue-600 mb-2">
              You have {weekStatus.missingDays.length} missing attendance record(s) this week.
              Please add your punch-in details.
            </p>
            <div className="text-sm text-blue-700">
              Missing dates: {weekStatus.missingDays.slice(0, 3).map(date => formatDate(date)).join(', ')}
              {weekStatus.missingDays.length > 3 ? ` and ${weekStatus.missingDays.length - 3} more` : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AlertNotification