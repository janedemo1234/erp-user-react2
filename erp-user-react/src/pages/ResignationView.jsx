"use client"

import { useState, useEffect } from "react"
import { Calendar, FileText, AlertCircle, CheckCircle, Loader2, Clock, User, Send, Undo2, Eye } from "lucide-react"
import { useAuth } from "../context/AuthContext"

// Constants
const API_BASE_URL = "http://localhost:8080/api/resignation" // Adjust this to match your backend URL

const ResignationManagement = () => {
  const [activeTab, setActiveTab] = useState("resignation")
  const [resignationSubmitted, setResignationSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apiResponse, setApiResponse] = useState(null)
  const [error, setError] = useState(null)
  const [registrationId, setRegistrationId] = useState(null)
  const [existingResignation, setExistingResignation] = useState(null)
  const [isViewOnly, setIsViewOnly] = useState(false)
  
  // Get employee serial number from authentication context
  const { getEmployeeSerialNumber } = useAuth()
  const EMPLOYEE_SERIAL_NUMBER = getEmployeeSerialNumber()

  // Resignation form state
  const [resignationForm, setResignationForm] = useState({
    dateOfResignation: new Date().toISOString().split("T")[0],
    reasonOfResignation: "",
    earlyExit: false,
    earlyExitDate: "",
    reasonForEarlyExit: "",
  })

  // Withdraw form state
  const [withdrawForm, setWithdrawForm] = useState({
    withdrawDate: new Date().toISOString().split("T")[0],
    reasonForWithdraw: "",
  })

  // Compute approval status
  const isApproved = 
    (existingResignation && existingResignation.status === 'Y') || 
    (apiResponse && apiResponse.status === 'Y');

  // Fetch existing resignation data
  useEffect(() => {
    const fetchResignationData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/all`)
        if (response.ok) {
          const data = await response.json()
          const employeeResignation = data.resignations?.find(
            (resignation) => resignation.employeeSerialNumber === EMPLOYEE_SERIAL_NUMBER,
          )

          if (employeeResignation) {
            setExistingResignation(employeeResignation)
            setIsViewOnly(true)
            setResignationSubmitted(true)
            setRegistrationId(employeeResignation.registrationId)

            // If status is Y, show API data; if status is N, show user's filled data
            if (employeeResignation.status === "Y") {
              // Show API data for approved resignations
              setResignationForm({
                dateOfResignation: employeeResignation.resignationDate || new Date().toISOString().split("T")[0],
                reasonOfResignation: employeeResignation.reasonOfResignation || "",
                earlyExit: !!employeeResignation.earlyExitDate,
                earlyExitDate: employeeResignation.earlyExitDate || "",
                reasonForEarlyExit: employeeResignation.earlyExitReason || "",
              })
            } else {
              // For status N, keep the user's filled data (current form state)
              // Only update if form is empty (first load)
              if (!resignationForm.reasonOfResignation) {
                setResignationForm({
                  dateOfResignation: employeeResignation.resignationDate || new Date().toISOString().split("T")[0],
                  reasonOfResignation: employeeResignation.reasonOfResignation || "",
                  earlyExit: !!employeeResignation.earlyExitDate,
                  earlyExitDate: employeeResignation.earlyExitDate || "",
                  reasonForEarlyExit: employeeResignation.earlyExitReason || "",
                })
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch resignation data:", err)
      }
    }

    fetchResignationData()
  }, [])

  // Calculate exit date (resignation date + 30 days)
  const calculateExitDate = (resignationDate) => {
    const date = new Date(resignationDate)
    date.setDate(date.getDate() + 30)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Handle resignation form changes (only when not in view-only mode)
  const handleResignationChange = (e) => {
    if (isViewOnly) return

    const { name, value, type, checked } = e.target

    setResignationForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

    // Clear early exit fields when checkbox is unchecked
    if (name === "earlyExit" && !checked) {
      setResignationForm((prev) => ({
        ...prev,
        earlyExitDate: "",
        reasonForEarlyExit: "",
      }))
    }

    // Clear any previous errors
    if (error) {
      setError(null)
    }
  }

  // Handle withdraw form changes
  const handleWithdrawChange = (e) => {
    const { name, value } = e.target
    setWithdrawForm((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear any previous errors
    if (error) {
      setError(null)
    }
  }

  // Validate resignation form
  const isResignationFormValid = () => {
    const { reasonOfResignation, earlyExit, earlyExitDate, reasonForEarlyExit } = resignationForm

    if (!reasonOfResignation.trim()) return false

    if (earlyExit) {
      if (!earlyExitDate || !reasonForEarlyExit.trim()) return false
    }

    return true
  }

  // Validate withdraw form
  const isWithdrawFormValid = () => {
    return withdrawForm.reasonForWithdraw.trim() !== "" && withdrawForm.withdrawDate.trim() !== ""
  }

  // API call to submit resignation
  const submitResignation = async (formData) => {
    const requestBody = {
      reasonOfResignation: formData.reasonOfResignation,
    }

    // Add early exit data if provided
    if (formData.earlyExit && formData.earlyExitDate) {
      requestBody.earlyExitDate = formData.earlyExitDate
      requestBody.earlyExitReason = formData.reasonForEarlyExit
    }

    const response = await fetch(`${API_BASE_URL}/apply/${EMPLOYEE_SERIAL_NUMBER}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Failed to submit resignation")
    }

    return await response.json()
  }

  // Handle resignation submission
  const handleResignationSubmit = async () => {
    if (!isResignationFormValid()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await submitResignation(resignationForm)
      setApiResponse(response)
      setRegistrationId(response.registrationId)
      setResignationSubmitted(true)
      setIsViewOnly(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle withdraw submission
  const handleWithdrawSubmit = async () => {
    if (!isWithdrawFormValid()) return

    setIsLoading(true)
    setError(null)

    try {
      // Simulate API call for withdrawal
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Reset state as if withdrawal was successful
      setResignationSubmitted(false)
      setIsViewOnly(false)
      setActiveTab("resignation")
      setApiResponse(null)
      setRegistrationId(null)
      setExistingResignation(null)

      // Reset forms
      setResignationForm({
        dateOfResignation: new Date().toISOString().split("T")[0],
        reasonOfResignation: "",
        earlyExit: false,
        earlyExitDate: "",
        reasonForEarlyExit: "",
      })
      setWithdrawForm({
        withdrawDate: new Date().toISOString().split("T")[0],
        reasonForWithdraw: "",
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Get display data based on status
  const getDisplayData = () => {
    if (existingResignation && existingResignation.status === "Y") {
      // Show API data for approved resignations
      return {
        dateOfResignation: existingResignation.resignationDate,
        reasonOfResignation: existingResignation.reasonOfResignation,
        earlyExit: !!existingResignation.earlyExitDate,
        earlyExitDate: existingResignation.earlyExitDate,
        reasonForEarlyExit: existingResignation.earlyExitReason,
        exitDate: existingResignation.exitDay,
      }
    } else {
      // Show user's filled data for pending or new submissions
      return {
        dateOfResignation: resignationForm.dateOfResignation,
        reasonOfResignation: resignationForm.reasonOfResignation,
        earlyExit: resignationForm.earlyExit,
        earlyExitDate: resignationForm.earlyExitDate,
        reasonForEarlyExit: resignationForm.reasonForEarlyExit,
        exitDate: existingResignation
          ? existingResignation.exitDay
          : calculateExitDate(resignationForm.dateOfResignation),
      }
    }
  }

  const displayData = getDisplayData()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        
        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                className={`py-4 px-6 text-sm font-medium transition-colors duration-200 ${
                  activeTab === "resignation"
                    ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => {
                  setActiveTab("resignation")
                  setError(null)
                }}
              >
                <div className="flex items-center">
                  {isViewOnly ? <Eye className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {isViewOnly ? "View Resignation" : "Resignation Application"}
                </div>
              </button>
              {resignationSubmitted && (
                <button
                  className={`py-4 px-6 text-sm font-medium transition-colors duration-200 ${
                    activeTab === "withdraw"
                      ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setActiveTab("withdraw")
                    setError(null)
                  }}
                >
                  <div className="flex items-center">
                    <Undo2 className="w-4 h-4 mr-2" />
                    Withdrawal Request
                  </div>
                </button>
              )}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Resignation Tab */}
            {activeTab === "resignation" && (
              <div className="space-y-6">
                {/* Status Display for View Mode */}
                {isViewOnly && existingResignation && (
                  <div
                    className={`p-4 rounded-lg border ${
                      existingResignation.status === "Y" 
                        ? "bg-green-50 border-green-200"
                        : "bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    <div className="flex items-start">
                      {existingResignation.status === "Y" ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-800">
                          {existingResignation.status === "Y" ? "Resignation Approved" : "Resignation Pending Approval"}
                        </h3>
                        <div className="mt-3 text-xs text-gray-600 space-y-1">
                          
                          <div>
                            Employee Name: <span className="font-medium">{existingResignation.employeeName}</span>
                          </div>
                          <div>
                            Designation: <span className="font-medium">{existingResignation.designation}</span>
                          </div>
                          <div>
                            Department: <span className="font-medium">{existingResignation.department}</span>
                          </div>
                          <div>
                            Resignation Date:{" "}
                            <span className="font-medium">{formatDate(existingResignation.resignationDate)}</span>
                          </div>
                         
                          {existingResignation.status === "Y" && existingResignation.mdApprovalDate && (
                            <div>
                              Approval Date:{" "}
                              <span className="font-medium">{formatDate(existingResignation.mdApprovalDate)}</span>
                            </div>
                          )}
                          {existingResignation.earlyExitDate && (
                            <div>
                              Early Exit Date Requested:{" "}
                              <span className="font-medium">{formatDate(existingResignation.earlyExitDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Display for New Submissions */}
                {apiResponse && !existingResignation && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-green-800">Resignation Submitted Successfully</h3>
                        <p className="text-sm text-green-700 mt-1">{apiResponse.message}</p>
                        <div className="mt-3 text-xs text-green-600 space-y-1">
                          <div>
                            Registration ID: <span className="font-medium">{apiResponse.registrationId}</span>
                          </div>
                          <div>
                            Resignation Date:{" "}
                            <span className="font-medium">{formatDate(apiResponse.resignationDate)}</span>
                          </div>
                          <div>
                            Expected Exit Date: <span className="font-medium">{formatDate(apiResponse.exitDay)}</span>
                          </div>
                          <div>
                            Status:{" "}
                            <span className="font-medium">
                              {apiResponse.status === "N" ? "Pending Approval" : "Approved"}
                            </span>
                          </div>
                          {apiResponse.earlyExitDate && (
                            <div>
                              Early Exit Date:{" "}
                              <span className="font-medium">{formatDate(apiResponse.earlyExitDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Fields - Only show if not approved */}
                {!isApproved ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Date of Resignation <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="dateOfResignation"
                          value={displayData.dateOfResignation}
                          onChange={handleResignationChange}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md transition-colors ${
                            isViewOnly
                              ? "bg-gray-50 text-gray-700 cursor-default"
                              : "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          }`}
                          required
                          readOnly={isViewOnly}
                          disabled={isViewOnly}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Company Rule - Exit Date
                        </label>
                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                          {formatDate(displayData.exitDate)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FileText className="w-4 h-4 inline mr-1" />
                        Reason for Resignation <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="reasonOfResignation"
                        value={displayData.reasonOfResignation}
                        onChange={handleResignationChange}
                        rows="4"
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md transition-colors resize-vertical ${
                          isViewOnly
                            ? "bg-gray-50 text-gray-700 cursor-default"
                            : "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        }`}
                        placeholder="Please provide your reason for resignation..."
                        required
                        readOnly={isViewOnly}
                        disabled={isViewOnly}
                      />
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <div className="flex items-center mb-4">
                        <input
                          type="checkbox"
                          name="earlyExit"
                          id="earlyExit"
                          checked={displayData.earlyExit}
                          onChange={handleResignationChange}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          disabled={isViewOnly}
                        />
                        <label htmlFor="earlyExit" className="ml-2 text-sm font-medium text-gray-700">
                          Request Early Exit
                        </label>
                      </div>

                      {displayData.earlyExit && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Early Exit Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              name="earlyExitDate"
                              value={displayData.earlyExitDate}
                              onChange={handleResignationChange}
                              className={`w-full px-3 py-2 border border-gray-300 rounded-md transition-colors ${
                                isViewOnly
                                  ? "bg-gray-50 text-gray-700 cursor-default"
                                  : "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              }`}
                              required
                              readOnly={isViewOnly}
                              disabled={isViewOnly}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Reason for Early Exit <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              name="reasonForEarlyExit"
                              value={displayData.reasonForEarlyExit}
                              onChange={handleResignationChange}
                              rows="3"
                              className={`w-full px-3 py-2 border border-gray-300 rounded-md transition-colors resize-vertical ${
                                isViewOnly
                                  ? "bg-gray-50 text-gray-700 cursor-default"
                                  : "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              }`}
                              placeholder="Please provide reason for early exit..."
                              required
                              readOnly={isViewOnly}
                              disabled={isViewOnly}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {!isViewOnly && (
                      <div className="pt-6">
                        <button
                          type="button"
                          onClick={handleResignationSubmit}
                          disabled={!isResignationFormValid() || isLoading}
                          className={`w-full py-3 px-4 rounded-md font-medium transition-colors duration-200 flex items-center justify-center ${
                            !isResignationFormValid() || isLoading
                              ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          }`}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Submit Resignation
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Next Steps Message for View Mode */}
                    {isViewOnly && existingResignation && existingResignation.status === "N" && (
                      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start">
                          <AlertCircle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                          <div>
                            <h3 className="text-sm font-medium text-yellow-800">Next Steps</h3>
                            <p className="text-sm text-yellow-700 mt-1">
                              Your resignation is pending approval. You can withdraw your resignation using the "Withdrawal
                              Request" tab if needed.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // Show completion message if approved
                  <div className="text-center py-8 bg-white rounded-lg border border-green-200">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Resignation Process Complete</h3>
                    <p className="mt-2 text-gray-600 max-w-md mx-auto">
                    Your resignation has been approved. your approved resignation date is <strong>{formatDate(existingResignation.mdApprovalDate)}</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Withdraw Tab */}
            {activeTab === "withdraw" && resignationSubmitted && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Withdrawal Information</h3>
                  <p className="text-sm text-blue-700">
                    You are about to withdraw your resignation application (Registration ID: {registrationId}). This
                    action will cancel your current resignation request.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Withdrawal Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="withdrawDate"
                      value={withdrawForm.withdrawDate}
                      onChange={handleWithdrawChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Reason for Withdrawal <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="reasonForWithdraw"
                    value={withdrawForm.reasonForWithdraw}
                    onChange={handleWithdrawChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-vertical"
                    placeholder="Please provide your reason for withdrawing the resignation..."
                    required
                  />
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    onClick={handleWithdrawSubmit}
                    disabled={!isWithdrawFormValid() || isLoading}
                    className={`w-full py-3 px-4 rounded-md font-medium transition-colors duration-200 flex items-center justify-center ${
                      !isWithdrawFormValid() || isLoading
                        ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Undo2 className="w-4 h-4 mr-2" />
                        Submit Withdrawal Request
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResignationManagement