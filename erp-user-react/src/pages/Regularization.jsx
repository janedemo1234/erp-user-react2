import React, { useState, useEffect } from 'react';
import { Check, X, Clock, Edit, Save, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getLastDayOfMonth = (year, month) => {
  return new Date(year, month + 1, 0).toISOString().split('T')[0];
};

const Regularization = () => {
  const [attendance, setAttendance] = useState([]);
  const [pendingRegularizations, setPendingRegularizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingDate, setEditingDate] = useState(null);
  const [punchIn, setPunchIn] = useState('');
  const [punchOut, setPunchOut] = useState('');
  const [reason, setReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLateAttendance, setIsLateAttendance] = useState(false);
  const [lateAttendanceData, setLateAttendanceData] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { getEmployeeSerialNumber } = useAuth();
  const today = new Date();
  const lastDayOfMonth = getLastDayOfMonth(today.getFullYear(), today.getMonth());
  
  // Get employee serial number from authenticated user
  const employeeSerialNumber = getEmployeeSerialNumber();

  const reasonOptions = [
    { value: 'onsite-work', label: 'Onsite Work' },
    { value: 'on-duty', label: 'On Duty' },
    { value: 'forgot-punch', label: 'Forgot to Punch In' },
    { value: 'system-error', label: 'System Error' },
    { value: 'late-attendance', label: 'Late Attendance' },
    { value: 'traffic-delay', label: 'Traffic Delay' },
    { value: 'personal-emergency', label: 'Personal Emergency' }
  ];

  // Fetch all regularizations (both pending and approved) from API
  const fetchPendingRegularizations = async () => {
    try {
      // First try to get all regularizations, if that API doesn't exist, fall back to pending only
      let response;
      let allRegularizations = [];
      
      // Try to fetch pending regularizations
      try {
        response = await fetch(`http://localhost:8080/api/attendance-regularization/pending`);
        if (response.ok) {
          const pendingData = await response.json();
          if (pendingData.success) {
            allRegularizations = [...(pendingData.data || [])];
          }
        }
      } catch (err) {
        console.error('Error fetching pending regularizations:', err);
      }
      
      // Try to fetch approved regularizations (if such API exists)
      try {
        response = await fetch(`http://localhost:8080/api/attendance-regularization/approved`);
        if (response.ok) {
          const approvedData = await response.json();
          if (approvedData.success) {
            allRegularizations = [...allRegularizations, ...(approvedData.data || [])];
          }
        }
      } catch (err) {
        console.log('Approved regularizations API not available, using pending only');
      }
      
      // Filter for current employee
      const employeeRegularizations = allRegularizations.filter(reg => 
        reg.employee?.employeeSerialNumber === employeeSerialNumber
      );
      
      setPendingRegularizations(employeeRegularizations);
      
    } catch (err) {
      console.error('Error fetching regularizations:', err);
      // Don't set error here as it's not critical - just log it
      setPendingRegularizations([]);
    }
  };

  // Check if a date has pending regularization with MD approval status "N"
  const hasPendingMDApproval = (date) => {
    return pendingRegularizations.some(reg => 
      reg.date === date && reg.mdApprovalStatus === 'N'
    );
  };

  // Check if a date has approved regularization with MD approval status "Y"
  const hasApprovedMDApproval = (date) => {
    return pendingRegularizations.some(reg => 
      reg.date === date && reg.mdApprovalStatus === 'Y'
    );
  };

  // Get regularization data for a specific date (pending or approved)
  const getPendingRegularizationData = (date) => {
    return pendingRegularizations.find(reg => 
      reg.date === date
    );
  };

  // Fetch attendance data from API
  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current month's attendance data
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
      
      const response = await fetch(
        `http://localhost:8080/api/attendance/monthly/summary?employeeSerialNumber=${employeeSerialNumber}&year=${currentYear}&month=${currentMonth}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Process attendance data to find absent dates and pending regularizations
        const attendanceRecords = data.data.records || [];
        const processedData = processAttendanceData(attendanceRecords, currentYear, currentMonth);
        setAttendance(processedData);
      } else {
        throw new Error(data.message || 'Failed to fetch attendance data');
      }
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError(err.message);
      // Fallback to showing only late attendance if any
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  // Process attendance data to identify absent dates and regularization status
  const processAttendanceData = (attendanceRecords, year, month) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const processedData = [];
    
    // Create a map of existing attendance records
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.attendanceDate] = record;
    });
    
    // Check each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(dateStr);
      
      // Skip future dates and Sundays
      if (date > today || date.getDay() === 0) {
        continue;
      }
      
      const attendanceRecord = attendanceMap[dateStr];
      
      if (!attendanceRecord || !attendanceRecord.punchInTime) {
        // No attendance record or no punch in - mark as absent
        processedData.push({
          date: dateStr,
          status: 'absent',
          punchIn: null,
          punchOut: null,
          reason: null,
          attendanceId: attendanceRecord?.id || null
        });
      } else if (attendanceRecord.regularizationStatus === 'PENDING') {
        // Has regularization pending
        processedData.push({
          date: dateStr,
          status: 'pending',
          punchIn: attendanceRecord.punchInTime ? new Date(attendanceRecord.punchInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null,
          punchOut: attendanceRecord.punchOutTime ? new Date(attendanceRecord.punchOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null,
          reason: attendanceRecord.regularizationReason,
          attendanceId: attendanceRecord.id
        });
      } else if (attendanceRecord.regularizationStatus === 'APPROVED') {
        // Regularization approved
        processedData.push({
          date: dateStr,
          status: 'approved',
          punchIn: attendanceRecord.punchInTime ? new Date(attendanceRecord.punchInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null,
          punchOut: attendanceRecord.punchOutTime ? new Date(attendanceRecord.punchOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null,
          reason: attendanceRecord.regularizationReason,
          attendanceId: attendanceRecord.id
        });
      }
      // Skip present days (those with punch in and no regularization needed)
    }
    
    return processedData.sort((a, b) => new Date(b.date) - new Date(a.date)); // Most recent first
  };

  // Check for late attendance data from navigation
  useEffect(() => {
    if (location.state?.isLateAttendance && location.state?.prefilledData) {
      const data = location.state.prefilledData;
      setIsLateAttendance(true);
      setLateAttendanceData(data);
      setEditingDate(data.date);
      setPunchIn(data.punchInTime);
      setPunchOut(data.punchOutTime);
      setReason('late-attendance'); // Pre-select late attendance reason
      setIsEditing(false);
    }
  }, [location.state]);
  
  // Check if user came late on a specific date (after 10:15 AM)
  const checkIfLateOnDate = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Only restrict for today's date
    if (dateStr !== today) {
      return false;
    }
    
    // Check if current time is after 10:15 AM
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const lateTimeLimit = 10 * 60 + 15; // 10:15 AM in minutes
    
    return currentTimeInMinutes > lateTimeLimit;
  };

  // Fetch attendance data and pending regularizations on component mount
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchAttendanceData(),
        fetchPendingRegularizations()
      ]);
    };
    fetchData();
  }, []);

  const handleRequestRegularization = (date) => {
    setEditingDate(date);
    setPunchIn('');
    setPunchOut('');
    setReason('');
    setIsEditing(false);
    setIsLateAttendance(false);
    setLateAttendanceData(null);
  };

  const handleEditRegularization = (entry) => {
    setEditingDate(entry.date);
    setPunchIn(entry.punchIn || '');
    setPunchOut(entry.punchOut || '');
    setReason(entry.reason || '');
    setIsEditing(true);
    setIsLateAttendance(false);
    setLateAttendanceData(null);
  };

  const handleSubmit = async () => {
    if (!punchIn || !punchOut || !reason) return;
    
    try {
      // Submit regularization request using the attendance-regularization API
      const response = await fetch('http://localhost:8080/api/attendance-regularization/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeSerialNumber: employeeSerialNumber,
          date: editingDate,
          punchInTime: punchIn,
          punchOutTime: punchOut,
          reason: reason
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('Regularization request submitted successfully!');
          
          // If it's late attendance, navigate back to attendance page
          if (isLateAttendance) {
            navigate('/attendance', { replace: true });
          } else {
            // Refresh attendance data and pending regularizations
            await Promise.all([
              fetchAttendanceData(),
              fetchPendingRegularizations()
            ]);
            setEditingDate(null);
            setPunchIn('');
            setPunchOut('');
            setReason('');
            setIsEditing(false);
          }
        } else {
          throw new Error(result.message || 'Failed to submit regularization');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit regularization');
      }
    } catch (err) {
      console.error('Error submitting regularization:', err);
      alert('Failed to submit regularization: ' + err.message);
    }
  };

  const handleApprove = (date) => {
    setAttendance(prev =>
      prev.map(entry =>
        entry.date === date ? { ...entry, status: 'approved' } : entry
      )
    );
  };

  const handleCancel = () => {
    if (isLateAttendance) {
      navigate('/attendance'); // Go back to attendance page
    } else {
      setEditingDate(null);
      setIsEditing(false);
    }
    setPunchIn('');
    setPunchOut('');
    setReason('');
    setIsLateAttendance(false);
    setLateAttendanceData(null);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600 mr-2" size={24} />
          <span className="text-gray-600">Loading attendance data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <Clock className="text-blue-600 mr-2" /> Attendance Regularization
        </h1>
        <button
          onClick={() => {
            fetchAttendanceData();
            fetchPendingRegularizations();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Clock size={16} className="mr-2" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="text-red-600 mr-2" size={20} />
            <span className="font-medium text-red-900">Error Loading Data</span>
          </div>
          <p className="text-sm text-red-700 mt-2">{error}</p>
        </div>
      )}

      {/* Late Attendance Alert */}
      {isLateAttendance && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="text-red-600 mr-2" size={20} />
            <span className="font-medium text-red-900">Late Attendance Detected</span>
          </div>
          <p className="text-sm text-red-700 mt-2">
            You clicked punch in after 10:15 AM. Please provide a reason for your late attendance.
          </p>
        </div>
      )}

      {!isLateAttendance && (
        <div className="overflow-x-auto">
          {attendance.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No attendance issues found for this month</p>
              <p className="text-sm text-gray-400 mt-2">All attendance records are complete</p>
            </div>
          ) : (
            <table className="min-w-full table-auto border border-gray-200 rounded-lg">
              <thead className="bg-blue-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Notion-Punch In</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Notion-Punch Out</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Reason</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((entry, index) => {
                  const pendingData = getPendingRegularizationData(entry.date);
                  const displayPunchIn = pendingData?.punchInTime ? 
                    new Date(`2000-01-01T${pendingData.punchInTime}`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 
                    (entry.punchIn || '—');
                  const displayPunchOut = pendingData?.punchOutTime ? 
                    new Date(`2000-01-01T${pendingData.punchOutTime}`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 
                    (entry.punchOut || '—');
                  const displayReason = pendingData?.reason || entry.reason;
                  
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {new Date(entry.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          weekday: 'short'
                        })}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-800">
                        {entry.status === 'absent' && hasApprovedMDApproval(entry.date) && <span className="text-green-700">Approved</span>}
                        {entry.status === 'absent' && hasPendingMDApproval(entry.date) && <span className="text-orange-600">Pending Approval</span>}
                        {entry.status === 'absent' && !hasPendingMDApproval(entry.date) && !hasApprovedMDApproval(entry.date) && <span className="text-red-600">Absent</span>}
                        {entry.status === 'pending' && <span className="text-yellow-600">Pending</span>}
                        {entry.status === 'approved' && <span className="text-green-700">Approved</span>}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {displayPunchIn}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {displayPunchOut}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {displayReason ? reasonOptions.find(r => r.value === displayReason)?.label || displayReason : '—'}
                      </td>
                    <td className="px-4 py-2 text-sm">
                      {entry.status === 'absent' &&
                        new Date(entry.date) <= new Date(lastDayOfMonth) && (
                          hasApprovedMDApproval(entry.date) ? (
                            <span className="text-green-600 flex items-center space-x-1">
                              <CheckCircle size={14} />
                              <span>Approved</span>
                            </span>
                          ) : hasPendingMDApproval(entry.date) ? (
                            <span className="text-orange-600 flex items-center space-x-1">
                              <Clock size={14} />
                              <span>Pending for approval</span>
                            </span>
                          ) : (
                            checkIfLateOnDate(entry.date) ? (
                              <div className="flex flex-col">
                                <button
                                  disabled
                                  className="text-gray-400 cursor-not-allowed flex items-center space-x-1"
                                  title="Cannot regularize same day after 10:15 AM"
                                >
                                  <Edit size={16} />
                                  <span>Regularize</span>
                                </button>
                               
                              </div>
                            ) : (
                              <button
                                onClick={() => handleRequestRegularization(entry.date)}
                                className="text-blue-600 hover:underline flex items-center space-x-1"
                              >
                                <Edit size={16} />
                                <span>Regularize</span>
                              </button>
                            )
                          )
                        )}
                      {(entry.status === 'pending' || entry.status === 'approved') && (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">Regularized</span>
                          {entry.status === 'pending' && (
                            <button
                              onClick={() => handleEditRegularization(entry)}
                              className="text-blue-600 hover:underline flex items-center space-x-1"
                            >
                              <Edit size={14} />
                              <span>Edit</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>);
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal for Regularization Request */}
      {editingDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {isLateAttendance 
                ? `Late Attendance for ${new Date(editingDate).toLocaleDateString('en-IN')}`
                : isEditing 
                ? `Edit Regularization for ${new Date(editingDate).toLocaleDateString('en-IN')}`
                : `Regularize for ${new Date(editingDate).toLocaleDateString('en-IN')}`
              }
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Punch In Time</label>
                <input
                  type="time"
                  value={punchIn}
                  onChange={(e) => setPunchIn(e.target.value)}
                  disabled={isLateAttendance} // Disable for late attendance
                  className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isLateAttendance ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  required
                />
                {isLateAttendance && (
                  <p className="text-xs text-gray-500 mt-1">Auto-filled with actual punch in time</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Punch Out Time</label>
                <input
                  type="time"
                  value={punchOut}
                  onChange={(e) => setPunchOut(e.target.value)}
                  disabled={isLateAttendance} // Disable for late attendance
                  className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isLateAttendance ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  required
                />
                {isLateAttendance && (
                  <p className="text-xs text-gray-500 mt-1">Auto-calculated (punch in + 9 hours)</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isLateAttendance} // Disable for late attendance
                  className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isLateAttendance ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  required
                >
                  <option value="">Select a reason</option>
                  {reasonOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {isLateAttendance && (
                  <p className="text-xs text-gray-500 mt-1">Auto-selected for late attendance</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                <X size={16} className="inline mr-1" />
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!punchIn || !punchOut || !reason}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={16} className="inline mr-1" />
                {isLateAttendance ? 'Submit Late Attendance' : isEditing ? 'Update' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Regularization;