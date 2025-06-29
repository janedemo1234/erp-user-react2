// src/pages/Attendance.jsx
import PunchInOut from '../components/attendance/PunchInOut'
import AttendanceTable from '../components/attendance/AttendanceTable'
import AlertNotification from '../components/regularization/AlertNotification'

const Attendance = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        
        <PunchInOut />
        {/* <AttendanceTable /> */}
      </div>
    </div>
  )
}

export default Attendance