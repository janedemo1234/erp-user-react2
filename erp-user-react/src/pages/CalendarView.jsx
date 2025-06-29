import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CalendarView = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // Current month (0-indexed)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [attendanceData, setAttendanceData] = useState({});
  const [regularizationData, setRegularizationData] = useState({});
  const [holidays, setHolidays] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { getEmployeeSerialNumber } = useAuth();
  const employeeSerialNumber = getEmployeeSerialNumber();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Fetch attendance history from API
  const fetchAttendanceHistory = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/attendance/history?employeeSerialNumber=${employeeSerialNumber}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Convert array to object with date as key
        const attendanceMap = {};
        data.data.forEach(record => {
          const date = record.attendanceDate; // Format: "2024-12-20"
          attendanceMap[date] = {
            type: 'present',
            punchInTime: record.punchInTime,
            punchOutTime: record.punchOutTime,
            status: record.status,
            source: record.source,
            isAutoPunchOut: record.isAutoPunchOut
          };
        });
        return attendanceMap;
      }
      return {};
    } catch (err) {
      console.error('Error fetching attendance history:', err);
      return {};
    }
  };

  // Fetch regularization data from API
  const fetchRegularizationData = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/attendance-regularization/all`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Filter for current employee and convert to object with date as key
        const regularizationMap = {};
        data.data
          .filter(record => record.employee?.employeeSerialNumber === employeeSerialNumber)
          .forEach(record => {
            const date = record.date; // Format: "2025-01-15"
            regularizationMap[date] = {
              type: record.mdApprovalStatus === 'Y' ? 'present' : 
                    record.mdApprovalStatus === 'R' ? 'absent' : 'pending',
              punchInTime: record.punchInTime,
              punchOutTime: record.punchOutTime,
              reason: record.reason,
              mdApprovalStatus: record.mdApprovalStatus,
              source: 'regularization'
            };
          });
        return regularizationMap;
      }
      return {};
    } catch (err) {
      console.error('Error fetching regularization data:', err);
      return {};
    }
  };

  // Fetch holidays from API
  const fetchHolidays = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/holidays/all`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Filter only MD approved holidays and convert to object with date as key
        const holidayMap = {};
        data.data
          .filter(holiday => holiday.mdApprovalStatus === 'Y')
          .forEach(holiday => {
            const date = holiday.holidayDate; // Format: "2025-01-01"
            holidayMap[date] = {
              name: holiday.holidayName,
              description: holiday.description,
              isOptional: holiday.isOptional,
              year: holiday.year
            };
          });
        return holidayMap;
      }
      return {};
    } catch (err) {
      console.error('Error fetching holidays:', err);
      return {};
    }
  };

  // Load data when component mounts or month/year changes
  useEffect(() => {
    const loadData = async () => {
      if (!employeeSerialNumber) {
        setError('Employee serial number not found');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const [attendanceMap, regularizationMap, holidayMap] = await Promise.all([
          fetchAttendanceHistory(),
          fetchRegularizationData(),
          fetchHolidays()
        ]);
        
        setAttendanceData(attendanceMap);
        setRegularizationData(regularizationMap);
        setHolidays(holidayMap);
      } catch (err) {
        setError('Failed to load attendance data');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [employeeSerialNumber, currentMonth, currentYear]);

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isWeekend = (dayOfWeek) => {
    return dayOfWeek === 0; // Only Sunday
  };

  const isHoliday = (dateStr) => {
    return holidays.hasOwnProperty(dateStr);
  };

  const getHolidayInfo = (dateStr) => {
    return holidays[dateStr] || null;
  };

  // Format time from datetime string to HH:MM format
  const formatTime = (timeString) => {
    if (!timeString) return null;
    
    try {
      // Handle different time formats
      if (timeString.includes('T')) {
        // ISO datetime format: "2024-12-20T09:00:00"
        const date = new Date(timeString);
        return date.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      } else if (timeString.includes(':')) {
        // Time only format: "09:00:00" or "09:00"
        const timeParts = timeString.split(':');
        return `${timeParts[0]}:${timeParts[1]}`;
      }
      return timeString;
    } catch (err) {
      console.error('Error formatting time:', err);
      return timeString;
    }
  };

  // Get attendance data for a specific date
  const getAttendanceForDate = (dateStr) => {
    // First check attendance history
    if (attendanceData[dateStr]) {
      return {
        ...attendanceData[dateStr],
        punchInFormatted: formatTime(attendanceData[dateStr].punchInTime),
        punchOutFormatted: formatTime(attendanceData[dateStr].punchOutTime)
      };
    }
    
    // Then check regularization data
    if (regularizationData[dateStr]) {
      return {
        ...regularizationData[dateStr],
        punchInFormatted: formatTime(regularizationData[dateStr].punchInTime),
        punchOutFormatted: formatTime(regularizationData[dateStr].punchOutTime)
      };
    }
    
    // No data found - mark as absent (only for past dates, excluding weekends and holidays)
    const today = new Date();
    const checkDate = new Date(dateStr);
    const dayOfWeek = checkDate.getDay();
    
    if (checkDate < today && !isWeekend(dayOfWeek) && !isHoliday(dateStr)) {
      return { type: 'absent' };
    }
    
    return null; // Future date or weekend/holiday
  };

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-gray-200"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(currentYear, currentMonth, day);
      const dayOfWeek = (firstDay + day - 1) % 7;
      const isWeekendDay = isWeekend(dayOfWeek);
      const isHolidayDay = isHoliday(dateStr);
      const attendance = getAttendanceForDate(dateStr);

      days.push(
        <div key={day} className="h-24 border border-gray-200 relative p-2">
          <div className="absolute top-2 right-2 text-sm font-medium text-gray-800">
            {day}
          </div>
          
          {/* Weekend background */}
          {isWeekendDay && (
            <div className="absolute inset-0 bg-blue-100 opacity-50"></div>
          )}
          
          {/* Holiday marker */}
          {isHolidayDay && (
            <div className="absolute top-2 left-2 w-2 h-2 bg-green-500 rounded-full" 
                 title={getHolidayInfo(dateStr)?.name || 'Holiday'}></div>
          )}
          
          {/* Attendance bars */}
          <div className="absolute bottom-1 left-1 right-1 flex flex-col gap-0.5">
            {isHolidayDay ? (
              <div className="bg-green-500 text-white text-xs px-1 py-0.5 rounded text-center" 
                   title={getHolidayInfo(dateStr)?.description || ''}>
                {getHolidayInfo(dateStr)?.isOptional ? 'OPT HOLIDAY' : 'HOLIDAY'}
              </div>
            ) : isWeekendDay ? (
              <div className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded text-center">
                SUNDAY
              </div>
            ) : attendance?.type === 'present' ? (
              <>
                {attendance.punchInFormatted && (
                  <div className="bg-orange-400 text-white text-xs px-1 py-0.5 rounded text-center">
                    IN {attendance.punchInFormatted}
                  </div>
                )}
                {attendance.punchOutFormatted && (
                  <div className="bg-yellow-400 text-black text-xs px-1 py-0.5 rounded text-center">
                    OUT {attendance.punchOutFormatted}
                  </div>
                )}
                {attendance.source === 'regularization' && (
                  <div className="bg-blue-600 text-white text-xs px-1 py-0.5 rounded text-center">
                    REG
                  </div>
                )}
              </>
            ) : attendance?.type === 'pending' ? (
              <div className="bg-orange-500 text-white text-xs px-1 py-0.5 rounded text-center">
                PENDING
              </div>
            ) : attendance?.type === 'absent' ? (
              <div className="bg-red-500 text-white text-xs px-1 py-0.5 rounded text-center">
                ABSENT
              </div>
            ) : (
              // Future dates or no data
              <div className="bg-gray-300 text-gray-600 text-xs px-1 py-0.5 rounded text-center">
                -
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <div className="p-4 bg-white">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-blue-600 mr-3" size={32} />
          <span className="text-xl text-gray-700">Loading attendance data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white">
        <div className="flex items-center justify-center py-16 flex-col">
          <div className="bg-red-100 rounded-full p-4 mb-4">
            <AlertTriangle className="text-red-600" size={48} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Error Loading Data</h3>
          <p className="text-red-700 text-center">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const days = renderCalendar();

  return (
    <div className="p-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">
            {months[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-red-500 text-white px-3 py-1 rounded text-sm">
            Attendance & Leave
          </div>
          <div className="text-sm text-gray-600">
            Employee: {employeeSerialNumber}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-gray-300">
        {/* Header row */}
        <div className="grid grid-cols-7 bg-gray-50">
          {daysOfWeek.map(day => (
            <div key={day} className="p-2 text-center font-medium text-gray-700 border-r border-gray-200">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar body */}
        <div className="grid grid-cols-7">
          {days}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-400"></div>
          <span>Check In</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-400"></div>
          <span>Check Out</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600"></div>
          <span>Regularized</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500"></div>
          <span>Pending Approval</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500"></div>
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border"></div>
          <span>Sunday (Holiday)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500"></div>
          <span>Company Holiday</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;