import { createContext, useContext, useState, useEffect } from 'react'
import { format, parseISO, startOfDay, addDays, differenceInDays, differenceInHours, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

const AttendanceContext = createContext()

export const useAttendance = () => {
  const context = useContext(AttendanceContext)
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider')
  }
  return context
}

export const AttendanceProvider = ({ children }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [currentStatus, setCurrentStatus] = useState(null)
  const [userInfo] = useState({
    id: '123456',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    username: 'johndoe',
    dateOfBirth: '1990-05-15',
    bloodGroup: 'o+ve',
    phone: '+1-555-123-4567',
    address: {
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62704',
      country: 'USA'
    },
    joinDate: 'August 1, 2023',
    lastLogin: 'May 19, 2025'
  })

  // Check for auto punch-out every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentStatus?.punchIn && !currentStatus?.punchOut) {
        const punchInTime = new Date(`${currentStatus.date.split('T')[0]}T${currentStatus.punchIn}`)
        const now = new Date()
        const hoursDiff = differenceInHours(now, punchInTime)
        
        if (hoursDiff >= 6) {
          punchOut(true) // Auto punch-out
        }
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [currentStatus])

  useEffect(() => {
    const storedAttendance = localStorage.getItem('attendanceRecords')
    if (storedAttendance) {
      setAttendanceRecords(JSON.parse(storedAttendance))
    }
    checkTodayStatus()
  }, [])

  useEffect(() => {
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords))
    checkTodayStatus()
  }, [attendanceRecords])

  const checkTodayStatus = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayRecord = attendanceRecords.find(record => 
      format(parseISO(record.date), 'yyyy-MM-dd') === today
    )
    setCurrentStatus(todayRecord ? todayRecord : null)
  }

  const punchIn = () => {
    const now = new Date()
    const newRecord = {
      id: Date.now().toString(),
      date: now.toISOString(),
      punchIn: format(now, 'HH:mm:ss'),
      punchOut: null
    }
    setAttendanceRecords([...attendanceRecords, newRecord])
    setCurrentStatus(newRecord)
    return newRecord
  }

  const punchOut = (isAuto = false) => {
    if (!currentStatus) return null
    
    const now = new Date()
    const updatedRecord = {
      ...currentStatus,
      punchOut: format(now, 'HH:mm:ss'),
      isAutoPunchOut: isAuto
    }
    
    const updatedRecords = attendanceRecords.map(record => 
      record.id === currentStatus.id ? updatedRecord : record
    )
    
    setAttendanceRecords(updatedRecords)
    setCurrentStatus(updatedRecord)
    return updatedRecord
  }

  const addRegularization = (date, punchIn, punchOut, reason) => {
    const newRecord = {
      id: Date.now().toString(),
      date: date.toISOString(),
      punchIn,
      punchOut,
      reason,
      isRegularized: true
    }
    
    setAttendanceRecords([...attendanceRecords, newRecord])
    return newRecord
  }

  const getMissingDays = (startDate, endDate) => {
    const start = startOfDay(startDate)
    const end = startOfDay(endDate)
    const dayCount = differenceInDays(end, start) + 1
    
    const allDays = [...Array(dayCount)].map((_, i) => 
      startOfDay(addDays(start, i))
    )
    
    return allDays.filter(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      return !attendanceRecords.some(record => 
        format(parseISO(record.date), 'yyyy-MM-dd') === dayStr
      )
    })
  }

  const checkMissingWeek = () => {
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
    
    const missingDays = getMissingDays(weekStart, weekEnd)
    return {
      hasMissingDays: missingDays.length > 0,
      missingDays,
      weekStart,
      weekEnd
    }
  }

  const checkMissingMonth = () => {
    const today = new Date()
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)
    
    const missingDays = getMissingDays(monthStart, monthEnd)
    return {
      hasMissingDays: missingDays.length > 0,
      missingDays,
      monthStart,
      monthEnd
    }
  }

  const hasAttendance = (date) => {
    const dayStr = format(date, 'yyyy-MM-dd')
    return attendanceRecords.some(record => 
      format(parseISO(record.date), 'yyyy-MM-dd') === dayStr
    )
  }

  const getAttendanceForDay = (date) => {
    const dayStr = format(date, 'yyyy-MM-dd')
    return attendanceRecords.find(record => 
      format(parseISO(record.date), 'yyyy-MM-dd') === dayStr
    )
  }

  const value = {
    attendanceRecords,
    currentStatus,
    userInfo,
    punchIn,
    punchOut,
    addRegularization,
    getMissingDays,
    checkMissingWeek,
    checkMissingMonth,
    hasAttendance,
    getAttendanceForDay
  }

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  )
}