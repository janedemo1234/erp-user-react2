import { useState, useEffect } from 'react'
import { useAttendance } from '../../context/AttendanceContext'
import { format } from 'date-fns'

const RegularizationForm = ({ selectedDate, onSuccess }) => {
  const { addRegularization } = useAttendance()
  
  const [formData, setFormData] = useState({
    date: '',
    punchIn: '',
    punchOut: '',
    reason: ''
  })
  
  const [errors, setErrors] = useState({})
  
  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: format(selectedDate, 'yyyy-MM-dd')
      }))
    }
  }, [selectedDate])
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      })
    }
  }
  
  const validate = () => {
    const newErrors = {}
    
    if (!formData.date) {
      newErrors.date = 'Date is required'
    }
    
    if (!formData.punchIn) {
      newErrors.punchIn = 'Punch in time is required'
    }
    
    if (!formData.punchOut) {
      newErrors.punchOut = 'Punch out time is required'
    }
    
    if (!formData.reason) {
      newErrors.reason = 'Reason is required'
    } else if (formData.reason.length < 10) {
      newErrors.reason = 'Reason should be at least 10 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validate()) return
    
    addRegularization(
      new Date(formData.date),
      formData.punchIn,
      formData.punchOut,
      formData.reason
    )
    
    setFormData({
      date: '',
      punchIn: '',
      punchOut: '',
      reason: ''
    })
    
    if (onSuccess) {
      onSuccess()
    }
  }
  
  return (
    <div className="card mt-6 animate-fadeIn">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Request Attendance Regularization
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div>
            <label 
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date
            </label>
            <input 
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className={`w-full rounded-lg border ${errors.date ? 'border-error-500' : 'border-gray-300'} px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-error-600">{errors.date}</p>
            )}
          </div>
          
          <div>
            <label 
              htmlFor="punchIn"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Punch In Time
            </label>
            <input 
              type="time"
              id="punchIn"
              name="punchIn"
              value={formData.punchIn}
              onChange={handleChange}
              className={`w-full rounded-lg border ${errors.punchIn ? 'border-error-500' : 'border-gray-300'} px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
            {errors.punchIn && (
              <p className="mt-1 text-sm text-error-600">{errors.punchIn}</p>
            )}
          </div>
          
          <div>
            <label 
              htmlFor="punchOut"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Punch Out Time
            </label>
            <input 
              type="time"
              id="punchOut"
              name="punchOut"
              value={formData.punchOut}
              onChange={handleChange}
              className={`w-full rounded-lg border ${errors.punchOut ? 'border-error-500' : 'border-gray-300'} px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
            {errors.punchOut && (
              <p className="mt-1 text-sm text-error-600">{errors.punchOut}</p>
            )}
          </div>
        </div>
        
        <div className="mb-6">
          <label 
            htmlFor="reason"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Reason for Regularization
          </label>
          <textarea 
            id="reason"
            name="reason"
            rows={4}
            value={formData.reason}
            onChange={handleChange}
            className={`w-full rounded-lg border ${errors.reason ? 'border-error-500' : 'border-gray-300'} px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500`}
            placeholder="Explain why you need to regularize your attendance..."
          />
          {errors.reason && (
            <p className="mt-1 text-sm text-error-600">{errors.reason}</p>
          )}
        </div>
        
        <div className="flex justify-end">
          <button 
            type="submit"
            className="btn btn-primary"
          >
            Submit Request
          </button>
        </div>
      </form>
    </div>
  )
}

export default RegularizationForm