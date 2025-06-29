import { useState } from 'react'
import { DataGrid } from '@mui/x-data-grid'
import { parseISO, format, startOfDay, isWeekend } from 'date-fns'
import { useAttendance } from '../../context/AttendanceContext'
import { formatDate } from '../../utils/dateUtils'

const RegularizationTable = ({ onRegularize }) => {
  const { attendanceRecords, hasAttendance } = useAttendance()
  const [pageSize, setPageSize] = useState(10)
  
  const generateLastDays = (days) => {
    const result = []
    const today = startOfDay(new Date())
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      
      if (isWeekend(date)) continue
      
      const hasRecord = hasAttendance(date)
      
      result.push({
        id: format(date, 'yyyy-MM-dd'),
        date,
        hasAttendance: hasRecord,
      })
    }
    
    return result
  }
  
  const days = generateLastDays(30)
  
  const columns = [
    { 
      field: 'date', 
      headerName: 'Date', 
      flex: 1, 
      minWidth: 150,
      renderCell: (params) => (
        <div className="py-2">{formatDate(params.value)}</div>
      )
    },
    { 
      field: 'dayOfWeek', 
      headerName: 'Day', 
      width: 120,
      valueGetter: (params) => format(params.row.date, 'EEEE'),
      renderCell: (params) => (
        <div className="py-2">{params.value}</div>
      )
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      flex: 1, 
      minWidth: 150,
      renderCell: (params) => {
        return params.row.hasAttendance ? (
          <div className="py-1 px-3 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
            Present
          </div>
        ) : (
          <div className="py-1 px-3 bg-error-100 text-error-800 rounded-full text-xs font-semibold">
            Absent
          </div>
        )
      }
    },
    { 
      field: 'action', 
      headerName: 'Action',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        if (params.row.hasAttendance) {
          return (
            <div className="py-2 text-gray-500 text-sm">No action needed</div>
          )
        }
        
        return (
          <button 
            className="py-1 px-3 bg-primary-50 text-primary-600 border border-primary-200 rounded text-sm font-medium hover:bg-primary-100 transition-colors duration-200"
            onClick={() => onRegularize(params.row.date)}
          >
            Request Regularization
          </button>
        )
      }
    }
  ]

  return (
    <div className="card animate-fadeIn">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Attendance Status (Last 30 Days)</h2>
      
      <div className="h-[400px] w-full">
        <DataGrid
          rows={days}
          columns={columns}
          pageSize={pageSize}
          rowsPerPageOptions={[5, 10, 20, 30]}
          onPageSizeChange={setPageSize}
          disableSelectionOnClick
          disableColumnSelector
          disableColumnMenu
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-columnHeader:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-row': {
              '&:nth-of-type(odd)': {
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
              }
            },
            '& .MuiDataGrid-row.absent': {
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
            },
          }}
          getRowClassName={(params) => 
            !params.row.hasAttendance ? 'absent' : ''
          }
        />
      </div>
    </div>
  )
}

export default RegularizationTable