import { format, parseISO, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

// Format dates for display
export const formatDate = (date) => {
  if (!date) return ''
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  return format(parsedDate, 'dd MMM yyyy')
}

// Format time for display
export const formatTime = (time) => {
  if (!time) return ''
  return time
}

// Format date and time together
export const formatDateTime = (date) => {
  if (!date) return ''
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  return format(parsedDate, 'dd MMM yyyy, HH:mm:ss')
}

// Check if a date is within the current week
export const isInCurrentWeek = (date) => {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  
  return isWithinInterval(date, {
    start: weekStart,
    end: weekEnd
  })
}

// Check if a date is within the current month
export const isInCurrentMonth = (date) => {
  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  
  return isWithinInterval(date, {
    start: monthStart,
    end: monthEnd
  })
}

// Get current date in IST
export const getCurrentDateIST = () => {
  // India is UTC+5:30
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000 // 5.5 hours in milliseconds
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000
  const istTime = new Date(utc + istOffset)
  
  return istTime
}

// Get current time string in IST
export const getCurrentTimeIST = () => {
  return format(getCurrentDateIST(), 'HH:mm:ss')
}