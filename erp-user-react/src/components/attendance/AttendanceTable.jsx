import React, { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const AttendanceTable = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const { getEmployeeSerialNumber } = useAuth()
  
  const recordsPerPage = 10
  const employeeSerialNumber = getEmployeeSerialNumber()

  useEffect(() => {
    fetchAttendanceHistory()
  }, [])

  const fetchAttendanceHistory = async (customStartDate = null, customEndDate = null) => {
    try {
      setLoading(true)
      setError(null)
      
      let url = `http://localhost:8080/api/attendance/history?employeeSerialNumber=${employeeSerialNumber}`
      
      if (customStartDate && customEndDate) {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`
      } else if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setAttendanceRecords(data.data || [])
      } else {
        setError(data.message || 'Failed to fetch attendance history')
      }
    } catch (err) {
      console.error('Error fetching attendance history:', err)
      setError('Failed to fetch attendance history')
    } finally {
      setLoading(false)
    }
  }

  const handleDateFilter = () => {
    if (startDate && endDate) {
      setCurrentPage(1)
      fetchAttendanceHistory(startDate, endDate)
    }
  }

  const handleClearFilter = () => {
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
    fetchAttendanceHistory()
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    if (!timeString) return '—'
    
    // Handle different time formats
    if (timeString.includes('T')) {
      return new Date(timeString).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return timeString.substring(0, 5) // Extract HH:MM from HH:MM:SS
    }
  }

  const getStatus = (record) => {
    const hasIn = !!record.punchInTime
    const hasOut = !!record.punchOutTime
    
    if (hasIn && hasOut) {
      return { text: 'Complete', color: 'bg-green-100 text-green-800' }
    } else if (hasIn) {
      return { text: 'Punched In', color: 'bg-blue-100 text-blue-800' }
    } else {
      return { text: 'Absent', color: 'bg-red-100 text-red-800' }
    }
  }

  const getSource = (record) => {
    return record.isRegularized ? 
      { text: 'Regularized', color: 'bg-amber-100 text-amber-800' } :
      { text: 'Normal', color: 'bg-gray-100 text-gray-800' }
  }

  // Sort records in descending order (newest first)
  const sortedRecords = [...attendanceRecords].sort((a, b) => 
    new Date(b.attendanceDate) - new Date(a.attendanceDate)
  )

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / recordsPerPage)
  const startIndex = (currentPage - 1) * recordsPerPage
  const endIndex = startIndex + recordsPerPage
  const currentRecords = sortedRecords.slice(startIndex, endIndex)

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 bg-white rounded-lg shadow-md mt-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600 mr-2" size={24} />
          <span className="text-gray-600">Loading attendance history...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-lg shadow-md mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <Calendar className="mr-2 text-blue-600" size={24} />
          Attendance History
        </h2>
        <button
          onClick={() => fetchAttendanceHistory()}
          className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
        >
          <RefreshCw size={16} className="mr-1" />
          Refresh
        </button>
      </div>

      {/* Date Filter */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleDateFilter}
            disabled={!startDate || !endDate}
            className="px-4 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Filter
          </button>
          <button
            onClick={handleClearFilter}
            className="px-4 py-1 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {currentRecords.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="text-gray-400 mx-auto mb-4" size={48} />
          <p className="text-gray-600">No attendance records found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border border-gray-200 rounded-lg">
              <thead className="bg-blue-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Punch In</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Punch Out</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Hours</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Source</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((record, index) => {
                  const status = getStatus(record)
                  const source = getSource(record)
                  const globalIndex = startIndex + index + 1

                  return (
                    <tr key={record.attendanceId || index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{globalIndex}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(record.attendanceDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatTime(record.punchInTime)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatTime(record.punchOutTime)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{record.totalHoursWorked || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${source.color}`}>
                          {source.text}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, sortedRecords.length)} of {sortedRecords.length} records
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-1 rounded-md text-sm ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-4 text-sm text-gray-500 text-center">
        Total Records: {attendanceRecords.length}
      </div>
    </div>
  )
}

export default AttendanceTable