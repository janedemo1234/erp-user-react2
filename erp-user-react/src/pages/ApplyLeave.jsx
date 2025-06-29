"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import {
  Calendar,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Coffee,
  Heart,
  DollarSign,
  CreditCard,
  Save,
  RotateCcw,
  RefreshCw,
  Clock,
  Gift,
  Info,
  TrendingUp,
  CalendarDays,
} from "lucide-react"
import { faTrash } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

const ApplyLeave = () => {
  const [selectedModal, setSelectedModal] = useState(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDates, setSelectedDates] = useState([])
  const [leaveReason, setLeaveReason] = useState("")
  const [leaveToDelete, setLeaveToDelete] = useState(null)
  const [loading, setLoading] = useState(false)
  const [holidays, setHolidays] = useState([])
  const [tooltip, setTooltip] = useState({ show: false, content: "", x: 0, y: 0 })

  // State for specific date deletion
  const [specificDateDeleteModal, setSpecificDateDeleteModal] = useState(null)
  const [selectedDatesToDelete, setSelectedDatesToDelete] = useState([])

  // NEW: Renewal System State
  const [pendingRenewals, setPendingRenewals] = useState([])
  const [renewalHistory, setRenewalHistory] = useState([])
  const [showRenewalPanel, setShowRenewalPanel] = useState(false)
  const [renewalStats, setRenewalStats] = useState(null)
  const [autoRenewalProcessing, setAutoRenewalProcessing] = useState(false)

  // Backend base URL
  const API_BASE_URL = "http://localhost:8080"

  // State for API data
  const [leaveBalances, setLeaveBalances] = useState(null)
  const [leaveRequests, setLeaveRequests] = useState([])

  // Get employee serial number from authentication context
  const { getEmployeeSerialNumber } = useAuth()
  const currentUserEmployeeSerialNumber = getEmployeeSerialNumber()

  const leaveTypes = [
    {
      id: "CASUAL",
      title: "Casual Leave",
      balance: leaveBalances?.casualLeaveBalance,
      icon: Coffee,
      color: "blue",
      description: "For personal activities and relaxation",
      showBalance: true,
    },
    {
      id: "SICK",
      title: "Sick Leave",
      balance: leaveBalances?.sickLeaveBalance,
      icon: Heart,
      color: "red",
      description: "For medical reasons and health issues",
      showBalance: true,
    },
    {
      id: "LEAVE_WITH_PAY",
      title: "Leave With Pay",
      balance: leaveBalances?.leaveWithPayBalance,
      icon: DollarSign,
      color: "green",
      description: "Paid leave for special circumstances",
      showBalance: false,
    },
    {
      id: "LEAVE_WITHOUT_PAY",
      title: "Leave Without Pay",
      balance: leaveBalances?.leaveWithoutPayBalance,
      icon: CreditCard,
      color: "orange",
      description: "Unpaid leave for extended absence",
      showBalance: false,
    },
  ]

  const leaveReasonsByType = {
    CASUAL: ["Personal work", "Family event", "Travel plans", "Rest and relaxation"],
    SICK: ["Fever", "Medical check-up", "Recovery from illness", "Doctor appointment"],
    LEAVE_WITH_PAY: ["Special event", "Emergency time-off", "Personal project"],
    LEAVE_WITHOUT_PAY: ["Extended leave", "Travel abroad", "Family support"],
  }

  // NEW: Renewal Service Functions
  const renewalService = {
    // Get pending renewals for employee
    async getPendingRenewals(employeeSerialNumber) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/leave/renewals/pending/${employeeSerialNumber}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        })
        if (response.ok) {
          return await response.json()
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      } catch (error) {
        console.error("Error fetching pending renewals:", error)
        return []
      }
    },

    // Get renewal history for employee and year
    async getRenewalHistory(employeeSerialNumber, year) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/leave/renewals/${employeeSerialNumber}/${year}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        })
        if (response.ok) {
          return await response.json()
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      } catch (error) {
        console.error("Error fetching renewal history:", error)
        return []
      }
    },

    // Process renewals manually
    async processRenewalsManually() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/leave/renewals/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        })
        if (response.ok) {
          return await response.json()
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      } catch (error) {
        console.error("Error processing renewals manually:", error)
        throw error
      }
    },

    // Trigger yearly renewal for current employee
    async triggerEmployeeYearlyRenewal(employeeSerialNumber, year) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/leave/renewals/yearly/${employeeSerialNumber}/${year}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        })
        if (response.ok) {
          return await response.json()
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      } catch (error) {
        console.error("Error triggering yearly renewal:", error)
        throw error
      }
    },

    // Get yearly renewal report
    async getYearlyRenewalReport(employeeSerialNumber, year) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/leave/renewals/yearly/report/${employeeSerialNumber}/${year}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        })
        if (response.ok) {
          return await response.json()
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      } catch (error) {
        console.error("Error fetching yearly renewal report:", error)
        return null
      }
    }
  }

  // API Functions
  const fetchLeaveBalance = async () => {
    try {
      const currentYear = new Date().getFullYear()
      const response = await fetch(
        `${API_BASE_URL}/api/leave/balance/${currentUserEmployeeSerialNumber}/${currentYear}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
      if (response.ok) {
        const data = await response.json()
        setLeaveBalances(data)
      } else {
        console.error("Failed to fetch leave balance:", response.status)
      }
    } catch (error) {
      console.error("Error fetching leave balance:", error)
    }
  }

  const fetchLeaveHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leave/history/${currentUserEmployeeSerialNumber}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      if (response.ok) {
        const data = await response.json()
        setLeaveRequests(data)
      } else {
        console.error("Failed to fetch leave history:", response.status)
      }
    } catch (error) {
      console.error("Error fetching leave history:", error)
    }
  }

  const fetchHolidays = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/holidays/all`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Filter holidays with mdApprovalStatus = 'Y'
          const approvedHolidays = data.data.filter((holiday) => holiday.mdApprovalStatus === "Y")
          setHolidays(approvedHolidays)
        }
      } else {
        console.error("Failed to fetch holidays:", response.status)
      }
    } catch (error) {
      console.error("Error fetching holidays:", error)
    }
  }

  // NEW: Fetch renewal data
  const fetchRenewalData = async () => {
    try {
      const currentYear = new Date().getFullYear()
      
      // Fetch pending renewals
      const pending = await renewalService.getPendingRenewals(currentUserEmployeeSerialNumber)
      setPendingRenewals(pending)

      // Fetch renewal history
      const history = await renewalService.getRenewalHistory(currentUserEmployeeSerialNumber, currentYear)
      setRenewalHistory(history)

      // Fetch yearly renewal report for stats
      const yearlyReport = await renewalService.getYearlyRenewalReport(currentUserEmployeeSerialNumber, currentYear)
      setRenewalStats(yearlyReport)
    } catch (error) {
      console.error("Error fetching renewal data:", error)
    }
  }

  const applyLeave = async (leaveData) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/leave/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(leaveData),
      })

      if (response.ok) {
        const result = await response.json()
        // Refresh data after successful application
        await fetchLeaveHistory()
        await fetchLeaveBalance()
        await fetchRenewalData() // Refresh renewal data
        return result
      } else {
        const errorText = await response.text()
        throw new Error(errorText || "Failed to apply leave")
      }
    } catch (error) {
      console.error("Error applying leave:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteLeave = async (requestId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leave/delete/${requestId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const updatedBalance = await response.json()
        setLeaveBalances(updatedBalance)
        await fetchLeaveHistory()
        await fetchRenewalData() // Refresh renewal data
      } else {
        const errorText = await response.text()
        throw new Error(errorText || "Failed to delete leave")
      }
    } catch (error) {
      console.error("Error deleting leave:", error)
      alert("Failed to delete leave: " + error.message)
    }
  }

  // Function for deleting specific dates
  const deleteSpecificDatesFromLeave = async (requestId, datesToDelete) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leave/delete-specific-dates/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ datesToDelete }),
      })

      if (response.ok) {
        await fetchLeaveHistory()
        await fetchLeaveBalance()
        await fetchRenewalData() // Refresh renewal data
        alert("Selected dates deleted successfully!")
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete specific dates")
      }
    } catch (error) {
      console.error("Error deleting specific dates:", error)
      alert("Failed to delete specific dates: " + error.message)
    }
  }

  // NEW: Function to process pending renewals manually
  const processPendingRenewals = async () => {
    try {
      setAutoRenewalProcessing(true)
      const result = await renewalService.processRenewalsManually()
      
      // Refresh all data after processing
      await fetchLeaveBalance()
      await fetchRenewalData()
      
      alert(`Renewal processing completed: ${result.message}`)
    } catch (error) {
      console.error("Error processing renewals:", error)
      alert("Failed to process renewals: " + error.message)
    } finally {
      setAutoRenewalProcessing(false)
    }
  }

  // NEW: Function to check and process leave credit renewal
  const checkAndProcessLeaveRenewal = async () => {
    try {
      const currentYear = new Date().getFullYear()
      const currentDate = new Date()

      // Get all approved leaves for the employee
      const approvedLeaves = leaveRequests.filter((leave) => leave.status === "APPROVED")

      if (approvedLeaves.length === 0) {
        return // No approved leaves to check
      }

      // Find the first approved leave date (earliest)
      const firstApprovedLeave = approvedLeaves.reduce((earliest, current) => {
        const currentApprovedDate = new Date(current.approvedDate)
        const earliestApprovedDate = new Date(earliest.approvedDate)
        return currentApprovedDate < earliestApprovedDate ? current : earliest
      })

      const firstApprovedDate = new Date(firstApprovedLeave.approvedDate)
      const oneYearLater = new Date(firstApprovedDate)
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)

      // Check if exactly 1 year has passed (same date)
      const isSameDate =
        currentDate.getDate() === oneYearLater.getDate() &&
        currentDate.getMonth() === oneYearLater.getMonth() &&
        currentDate.getFullYear() === oneYearLater.getFullYear()

      if (isSameDate) {
        console.log("Processing leave credit renewal for employee:", currentUserEmployeeSerialNumber)

        // Call the renewal API
        const response = await fetch(`${API_BASE_URL}/api/leave/renewals/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const result = await response.json()
          console.log("Leave credit renewal processed:", result.message)

          // Refresh leave balance to show updated credits
          await fetchLeaveBalance()
          await fetchRenewalData()
        } else {
          console.error("Failed to process leave credit renewal:", response.status)
        }
      }
    } catch (error) {
      console.error("Error checking leave credit renewal:", error)
    }
  }

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      await fetchLeaveBalance()
      await fetchLeaveHistory()
      await fetchHolidays()
      await fetchRenewalData() // Load renewal data
    }

    loadData()
  }, [currentUserEmployeeSerialNumber])

  // Check for leave renewal after leave history is loaded
  useEffect(() => {
    if (leaveRequests.length > 0) {
      checkAndProcessLeaveRenewal()
    }
  }, [leaveRequests])

  // Utility functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatDate = (date) => {
    // Fix: Use local date string to avoid timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const formatDisplayDate = (dateStr) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const isDateSelected = (date) => {
    const dateStr = formatDate(date)
    return selectedDates.includes(dateStr)
  }

  const hasLeaveOnDate = (date) => {
    const dateStr = formatDate(date)
    return leaveRequests.some((leave) => {
      const startDate = new Date(leave.startDate + "T00:00:00")
      const endDate = new Date(leave.endDate + "T00:00:00")
      const checkDate = new Date(dateStr + "T00:00:00")
      return checkDate >= startDate && checkDate <= endDate && leave.status === "APPROVED"
    })
  }

  const isHoliday = (date) => {
    const dateStr = formatDate(date)
    const holiday = holidays.find((holiday) => holiday.holidayDate === dateStr)
    return holiday
  }

  const isSunday = (date) => {
    return date.getDay() === 0
  }

  const isWeekend = (date) => {
    return date.getDay() === 0 || date.getDay() === 6 // Sunday = 0, Saturday = 6
  }

  const isDateDisabled = (date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return date < today || isSunday(date) || isHoliday(date)
    // Note: Only Sundays are non-working days, Saturdays are working days
  }

  const handleDateClick = (date) => {
    if (isDateDisabled(date)) return

    const dateStr = formatDate(date)

    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter((d) => d !== dateStr))
    } else {
      setSelectedDates([...selectedDates, dateStr].sort())
    }
  }

  const handleMouseEnter = (date, event) => {
    const holiday = isHoliday(date)
    const sunday = isSunday(date)

    if (holiday || sunday) {
      const rect = event.target.getBoundingClientRect()
      setTooltip({
        show: true,
        content: holiday ? holiday.holidayName : "Sunday",
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY,
      })
    }
  }

  const handleMouseLeave = () => {
    setTooltip({ show: false, content: "", x: 0, y: 0 })
  }

  const handleDeleteLeave = async (requestId) => {
    await deleteLeave(requestId)
  }

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const openModal = (leaveType) => {
    setSelectedModal(leaveType)
    setSelectedDates([])
    setLeaveReason("")
  }

  const closeModal = () => {
    setSelectedModal(null)
    setSelectedDates([])
    setLeaveReason("")
  }

  const handleSubmitLeave = async () => {
    if (selectedDates.length === 0 || !leaveReason.trim()) return

    try {
      const sortedDates = selectedDates.sort()
      const leaveData = {
        userProfile: {
          employeeSerialNumber: currentUserEmployeeSerialNumber,
        },
        leaveType: selectedModal,
        startDate: sortedDates[0],
        endDate: sortedDates[sortedDates.length - 1],
        reason: leaveReason.trim(),
        status: "PENDING",
        appliedDate: new Date().toLocaleDateString("en-CA"), // This gives YYYY-MM-DD format in local timezone
      }

      await applyLeave(leaveData)
      closeModal()
      alert("Leave application submitted successfully!")
    } catch (error) {
      alert("Failed to submit leave application: " + error.message)
    }
  }

  // Generate date range for a leave request - Include all calendar days in the range
  const generateLeaveDateRange = (leave) => {
    const startDate = new Date(leave.startDate + "T00:00:00")
    const endDate = new Date(leave.endDate + "T00:00:00")
    const dates = []

    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateStr = formatDate(currentDate)
      // Include ALL dates in the original leave range for editing
      dates.push(dateStr)
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return dates
  }

  // Handle opening specific date delete modal
  const openSpecificDateDeleteModal = (leave) => {
    const dateRange = generateLeaveDateRange(leave)
    setSpecificDateDeleteModal({ ...leave, dateRange })
    setSelectedDatesToDelete([])
  }

  // Handle specific date deletion
  const handleSpecificDateDeletion = async () => {
    if (selectedDatesToDelete.length === 0) return

    await deleteSpecificDatesFromLeave(specificDateDeleteModal.requestId, selectedDatesToDelete)
    setSpecificDateDeleteModal(null)
    setSelectedDatesToDelete([])
  }

  // Calculate working days correctly - exclude only Sundays and holidays
  const calculateWorkingDays = (dates) => {
    return dates.filter((dateStr) => {
      const date = new Date(dateStr + "T00:00:00")
      return !isSunday(date) && !isHoliday(date)
    }).length
  }

  // FIXED: Calculate actual working days from selected dates
  const getActualWorkingDaysCount = () => {
    return selectedDates.length // Since we only allow selection of working days, this is correct
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const isSelected = isDateSelected(date)
      const hasLeave = hasLeaveOnDate(date)
      const isToday = formatDate(date) === formatDate(new Date())
      const isDisabled = isDateDisabled(date)
      const holiday = isHoliday(date)
      const sunday = isSunday(date)

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(date)}
          onMouseEnter={(e) => handleMouseEnter(date, e)}
          onMouseLeave={handleMouseLeave}
          className={`
        h-10 flex items-center justify-center rounded-lg transition-all duration-200 text-sm font-medium relative
        ${isDisabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-gray-100"}
        ${isSelected ? "bg-blue-500 text-white shadow-sm hover:bg-blue-600" : ""}
        ${isToday && !isSelected ? "ring-2 ring-blue-400 ring-opacity-50" : ""}
        ${hasLeave && !isSelected ? "bg-gray-200 text-gray-700" : ""}
        ${holiday && !isSelected ? "bg-green-100 text-green-800" : ""}
        ${sunday && !isSelected && !holiday && !hasLeave ? "bg-orange-100 text-orange-800" : ""}
        ${date < new Date() && !isSelected && !hasLeave && !holiday && !sunday ? "bg-gray-50 text-gray-400" : ""}
      `}
        >
          {day}
        </div>,
      )
    }

    return days
  }

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: "text-blue-600",
        button:
          "bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 hover:from-blue-600 hover:via-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl",
        accent: "text-blue-600",
      },
      red: {
        bg: "bg-red-50",
        border: "border-red-200",
        icon: "text-red-600",
        button:
          "bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 hover:from-pink-600 hover:via-red-600 hover:to-orange-600 shadow-lg hover:shadow-xl",
        accent: "text-red-600",
      },
      green: {
        bg: "bg-green-50",
        border: "border-green-200",
        icon: "text-green-600",
        button:
          "bg-gradient-to-r from-green-400 via-green-500 to-teal-500 hover:from-green-500 hover:via-green-600 hover:to-teal-600 shadow-lg hover:shadow-xl",
        accent: "text-green-600",
      },
      orange: {
        bg: "bg-orange-50",
        border: "border-orange-200",
        icon: "text-orange-600",
        button:
          "bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 hover:from-orange-500 hover:via-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl",
        accent: "text-orange-600",
      },
    }
    return colors[color] || colors.blue
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "REJECTED":
        return "bg-red-100 text-red-800"
      case "CANCELLED":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const selectedLeaveType = leaveTypes.find((type) => type.id === selectedModal)

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="fixed z-[60] px-2 py-1 text-xs text-white bg-gray-800 rounded shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
            marginTop: "-8px",
          }}
        >
          {tooltip.content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="mr-3 text-blue-600" size={28} />
              Apply Leave
            </h1>
            <p className="text-gray-600 mt-1">Submit your leave applications and manage time off</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Current Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Renewal Notifications Panel */}
      {pendingRenewals.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-full p-2 mr-4">
                <Gift className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900">Leave Credits Available for Renewal!</h3>
                <p className="text-green-700 mt-1">
                  You have {pendingRenewals.length} leave credit{pendingRenewals.length > 1 ? 's' : ''} ready to be renewed.
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowRenewalPanel(!showRenewalPanel)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Info size={16} className="mr-2" />
                {showRenewalPanel ? 'Hide Details' : 'View Details'}
              </button>
              <button
                onClick={processPendingRenewals}
                disabled={autoRenewalProcessing}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center disabled:opacity-50"
              >
                {autoRenewalProcessing ? (
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                ) : (
                  <TrendingUp size={16} className="mr-2" />
                )}
                {autoRenewalProcessing ? 'Processing...' : 'Process Renewals'}
              </button>
            </div>
          </div>
          
          {showRenewalPanel && (
            <div className="mt-6 pt-6 border-t border-green-200">
              <h4 className="text-md font-medium text-green-900 mb-4">Pending Renewals:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingRenewals.map((renewal, index) => (
                  <div key={index} className="bg-white border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-900">{renewal.leaveType?.replace('_', ' ')}</span>
                      <span className="text-lg font-bold text-green-600">{renewal.daysRenewed} days</span>
                    </div>
                    <p className="text-xs text-green-700">
                      Renewal Date: {new Date(renewal.renewalDate).toLocaleDateString()}
                    </p>
                    {renewal.leaveRequest && (
                      <p className="text-xs text-green-600 mt-1">
                        From Leave: {new Date(renewal.leaveRequest.startDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leave Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {leaveTypes.map((leaveType) => {
          const colors = getColorClasses(leaveType.color)
          const IconComponent = leaveType.icon

          return (
            <div
              key={leaveType.id}
              className={`bg-white rounded-xl shadow-sm border ${colors.border} p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
            >
              <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-4`}>
                <IconComponent className={colors.icon} size={24} />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{leaveType.title}</h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">{leaveType.description}</p>

              {leaveType.showBalance ? (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">Available Balance</span>
                    <span className={`text-lg font-bold ${colors.accent}`}>
                      {typeof leaveType.balance === "number" ? `${leaveType.balance} days` : "N/A"}
                    </span>
                  </div>
                  {typeof leaveType.balance === "number" && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          leaveType.color === "blue"
                            ? "bg-gradient-to-r from-blue-500 to-blue-600"
                            : leaveType.color === "red"
                              ? "bg-gradient-to-r from-red-500 to-red-600"
                              : leaveType.color === "green"
                                ? "bg-gradient-to-r from-green-500 to-green-600"
                                : "bg-gradient-to-r from-orange-500 to-orange-600"
                        }`}
                        style={{ width: `${Math.min((leaveType.balance / 15) * 100, 100)}%` }}
                      ></div>
                    </div>
                  )}
                  
                  {/* Renewal Information */}
                  {renewalHistory.filter(r => r.leaveType === leaveType.id).length > 0 && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center text-xs text-green-700">
                        <CalendarDays size={12} className="mr-1" />
                        <span className="font-medium">
                          {renewalHistory.filter(r => r.leaveType === leaveType.id).reduce((sum, r) => sum + r.daysRenewed, 0)} days renewed this year
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Pending Renewals for this type */}
                  {pendingRenewals.filter(r => r.leaveType === leaveType.id).length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center text-xs text-yellow-700">
                        <Clock size={12} className="mr-1" />
                        <span className="font-medium">
                          {pendingRenewals.filter(r => r.leaveType === leaveType.id).reduce((sum, r) => sum + r.daysRenewed, 0)} days pending renewal
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-1 h-[68px]"></div>
              )}

              <button
                onClick={() => openModal(leaveType.id)}
                className={`w-full ${colors.button} text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center justify-center font-semibold text-sm tracking-wide transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${
                  leaveType.color === "blue"
                    ? "focus:ring-purple-300"
                    : leaveType.color === "red"
                      ? "focus:ring-pink-300"
                      : leaveType.color === "green"
                        ? "focus:ring-teal-300"
                        : "focus:ring-orange-300"
                }`}
              >
                <Plus size={18} className="mr-2" />
                Apply for Leave
              </button>
            </div>
          )
        })}
      </div>

      {/* Recent Leave Requests */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Leave Requests</h2>
        {leaveRequests.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No leave requests yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaveRequests.slice(0, 10).map((leave) => (
              <div
                key={leave.requestId}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        leave.status === "APPROVED"
                          ? "bg-green-500"
                          : leave.status === "PENDING"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                    ></div>
                    <h3 className="font-medium text-gray-900">{leave.leaveType.replace("_", " ")}</h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(leave.status)}`}
                    >
                      {leave.status.toLowerCase()}
                    </span>

                    {/* Both options available for PENDING and APPROVED leaves */}
                    {(leave.status === "PENDING" || leave.status === "APPROVED") && (
                      <>
                        {/* Delete entire leave */}
                        <button
                          onClick={() => setLeaveToDelete(leave.requestId)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete Entire Leave"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>

                        {/* Delete specific dates */}
                        <button
                          onClick={() => openSpecificDateDeleteModal(leave)}
                          className="text-orange-500 hover:text-orange-700 text-sm px-2 py-1 border border-orange-300 rounded"
                          title="Delete Specific Dates"
                        >
                          Edit Dates
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">From: </span>
                    {formatDisplayDate(leave.startDate)}
                  </div>
                  <div>
                    <span className="font-medium">To: </span>
                    {formatDisplayDate(leave.endDate)}
                  </div>
                  <div>
                    <span className="font-medium">Duration: </span>
                    {(() => {
                      // Calculate calendar days from start to end date
                      const start = new Date(leave.startDate + "T00:00:00");
                      const end = new Date(leave.endDate + "T00:00:00");
                      const calendarDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
                      
                      if (calendarDays === leave.totalDays) {
                        return `${leave.totalDays} day${leave.totalDays > 1 ? "s" : ""}`;
                      } else if (leave.totalDays === 0) {
                        return `${calendarDays} calendar day${calendarDays > 1 ? "s" : ""} (non-working day${calendarDays > 1 ? "s" : ""})`;
                      } else {
                        return `${calendarDays} calendar day${calendarDays > 1 ? "s" : ""} (${leave.totalDays} working day${leave.totalDays > 1 ? "s" : ""})`;
                      }
                    })()}
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Reason: </span>
                  {leave.reason}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Renewal History Section */}
      {renewalHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="mr-3 text-green-600" size={24} />
            Leave Credit Renewal History
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renewalHistory.map((renewal, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{renewal.leaveType?.replace("_", " ")}</h3>
                  <span className="text-lg font-bold text-green-600">+{renewal.daysRenewed}</span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Renewed on:</span>{" "}
                    {new Date(renewal.createdDate).toLocaleDateString()}
                  </p>
                  {renewal.leaveRequest ? (
                    <p>
                      <span className="font-medium">Type:</span> Individual Renewal
                    </p>
                  ) : (
                    <p>
                      <span className="font-medium">Type:</span> Yearly Renewal
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {leaveToDelete !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Delete Entire Leave?</h2>
              <p className="text-sm text-gray-600 mb-6">
                Do you really want to delete this entire leave request? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setLeaveToDelete(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDeleteLeave(leaveToDelete)
                    setLeaveToDelete(null)
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                >
                  Yes, Delete All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Specific Date Delete Modal */}
      {specificDateDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Delete Specific Dates</h2>
                <button onClick={() => setSpecificDateDeleteModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">Select the dates you want to delete from your leave request:</p>

              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                {specificDateDeleteModal.dateRange.map((date) => (
                  <label key={date} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={selectedDatesToDelete.includes(date)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDatesToDelete([...selectedDatesToDelete, date])
                        } else {
                          setSelectedDatesToDelete(selectedDatesToDelete.filter((d) => d !== date))
                        }
                      }}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">{formatDisplayDate(date)}</span>
                  </label>
                ))}
              </div>

              {selectedDatesToDelete.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4">
                  <p className="text-sm text-orange-800">
                    <strong>{selectedDatesToDelete.length}</strong> date{selectedDatesToDelete.length > 1 ? "s" : ""}{" "}
                    selected for deletion
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSpecificDateDeleteModal(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSpecificDateDeletion}
                  disabled={selectedDatesToDelete.length === 0}
                  className={`px-4 py-2 rounded-lg ${
                    selectedDatesToDelete.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-orange-600 text-white hover:bg-orange-700"
                  }`}
                >
                  Delete Selected Dates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {selectedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Apply for {selectedLeaveType?.title}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Calendar Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Select Dates</h3>

                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-medium text-gray-700">
                      {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigateMonth(-1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => navigateMonth(1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                        <div
                          key={`${day}-${index}`}
                          className="h-8 flex items-center justify-center text-xs font-medium text-gray-500"
                        >
                          {day}
                        </div>
                      ))}
                      {renderCalendar()}
                    </div>
                  </div>

                  {/* Color Legend */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Legend:</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-orange-400 border border-orange-500 rounded"></div>
                        <span className="text-gray-600">Sunday</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-400 border border-green-500 rounded"></div>
                        <span className="text-gray-600">Holiday</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-gray-400 border border-gray-500 rounded"></div>
                        <span className="text-gray-600">Approved Leave</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-blue-500 border border-blue-600 rounded"></div>
                        <span className="text-gray-600">Selected</span>
                      </div>
                    </div>
                  </div>

                  {/* Selected Dates */}
                  {selectedDates.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Dates:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedDates.map((date) => (
                          <span
                            key={date}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {formatDisplayDate(date)}
                            <button
                              onClick={() => setSelectedDates(selectedDates.filter((d) => d !== date))}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Leave Details</h3>

                  <div className="space-y-4">
                    {/* Leave Type Display */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {selectedLeaveType && (
                            <>
                              <selectedLeaveType.icon
                                className={getColorClasses(selectedLeaveType.color).icon}
                                size={20}
                              />
                              <span className="font-medium text-gray-900">{selectedLeaveType.title}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">-- Select a reason --</option>
                        {(leaveReasonsByType[selectedModal] || []).map((reason, index) => (
                          <option key={index} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Summary - FIXED: Show correct working days count */}
                    {selectedDates.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Leave Summary</h4>
                        <div className="text-sm text-blue-800 space-y-1">
                          <p>
                            <span className="font-medium">Duration:</span> {getActualWorkingDaysCount()} working day
                            {getActualWorkingDaysCount() > 1 ? "s" : ""}
                          </p>
                          <p>
                            <span className="font-medium">From:</span> {formatDisplayDate(selectedDates[0])}
                          </p>
                          {selectedDates.length > 1 && (
                            <p>
                              <span className="font-medium">To:</span>{" "}
                              {formatDisplayDate(selectedDates[selectedDates.length - 1])}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                >
                  <X size={16} className="mr-2" />
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setSelectedDates([])
                    setLeaveReason("")
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                >
                  <RotateCcw size={16} className="mr-2" />
                  Reset
                </button>
                <button
                  onClick={handleSubmitLeave}
                  disabled={selectedDates.length === 0 || !leaveReason.trim() || loading}
                  className={`px-6 py-2 rounded-lg transition-colors flex items-center font-medium ${
                    selectedDates.length === 0 || !leaveReason.trim() || loading
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : `${getColorClasses(selectedLeaveType?.color || "blue").button} text-white`
                  }`}
                >
                  <Save size={16} className="mr-2" />
                  {loading ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApplyLeave
