import React, { useState, useEffect } from 'react'
import { FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiDroplet, FiBriefcase, FiCreditCard, FiFileText, FiImage, FiDownload, FiEye, FiFile } from 'react-icons/fi'
import { User, Phone, Mail, MapPin, Calendar, Building, Briefcase, CreditCard, FileText, Download, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const UserInfo = () => {
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fileUrls, setFileUrls] = useState({})
  const { getEmployeeSerialNumber } = useAuth()
  
  const employeeSerialNumber = getEmployeeSerialNumber()

  // Helper function to create blob URLs
  const createBlobUrl = (data, contentType = 'application/octet-stream') => {
    if (!data) return null;
    
    try {
      // If it's already a data URL, return it directly
      if (typeof data === 'string' && data.startsWith('data:')) return data;
      
      // Handle base64 strings
      if (typeof data === 'string') {
        // Check if it looks like base64 data
        const isBase64 = /^[A-Za-z0-9+/=]+$/.test(data);
        
        if (isBase64) {
          const byteCharacters = atob(data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: contentType });
          return URL.createObjectURL(blob);
        }
      }
      
      // Handle binary data
      if (typeof data === 'string') {
        const byteArray = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
          byteArray[i] = data.charCodeAt(i) & 0xff;
        }
        const blob = new Blob([byteArray], { type: contentType });
        return URL.createObjectURL(blob);
      }
      
      // Fallback: return null
      return null;
    } catch (error) {
      console.error('Error creating blob URL:', error);
      return null;
    }
  };

  // Detect file type from data
  const detectFileType = (data) => {
    if (!data) return 'unknown';
    
    if (typeof data === 'string' && data.startsWith('data:')) {
      return data.split(';')[0].split('/')[1];
    }
    
    // Try to detect from magic numbers
    if (typeof data === 'string') {
      if (data.startsWith('/9j') || data.startsWith('ÿØÿà')) {
        return 'jpeg';
      }
      
      if (data.startsWith('iVBORw')) {
        return 'png';
      }
      
      if (data.startsWith('JVBER')) {
        return 'pdf';
      }
    }
    
    return 'file';
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true)
        const response = await fetch(`http://localhost:8080/api/user-profiles/employee/${employeeSerialNumber}`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        setUserProfile(data)
        
        // Create blob URLs for files
        const urls = {}
        const fileFields = [
          'photo', 'medicalBackground', 'qualificationDocument', 'legalBackground',
          'panFile', 'adhaarFile', 'passbookFile', 'addressProofFile', 'offerLetter'
        ]
        
        fileFields.forEach(field => {
          if (data[field]) {
            const fileType = detectFileType(data[field])
            const contentType = fileType === 'pdf' ? 'application/pdf' : 
                              fileType === 'jpeg' ? 'image/jpeg' :
                              fileType === 'png' ? 'image/png' : 'application/octet-stream'
            urls[field] = createBlobUrl(data[field], contentType)
          }
        })
        
        setFileUrls(urls)
        setError(null)
      } catch (err) {
        console.error('Error fetching user profile:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [employeeSerialNumber])

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getInitials = (name) => {
    if (!name) return 'N/A'
    const names = name.split(' ')
    return names.length >= 2 ? `${names[0][0]}${names[1][0]}` : name[0]
  }

  const FileDisplay = ({ fileUrl, fileName, fileType }) => {
    if (!fileUrl) return null

    const isImage = fileType === 'jpeg' || fileType === 'png'
    const isPdf = fileType === 'pdf'

    return (
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{fileName}</span>
          <div className="flex space-x-2">
            {isImage && (
              <button
                onClick={() => window.open(fileUrl, '_blank')}
                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                title="View Image"
              >
                <FiEye size={16} />
              </button>
            )}
            <a
              href={fileUrl}
              download={fileName}
              className="p-1 text-green-600 hover:bg-green-100 rounded"
              title="Download"
            >
              <FiDownload size={16} />
            </a>
          </div>
        </div>
        
        {isImage && (
          <div className="mt-2">
            <img 
              src={fileUrl} 
              alt={fileName}
              className="w-full h-32 object-cover rounded border"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </div>
        )}
        
        {isPdf && (
          <div className="flex items-center text-red-600 text-sm">
            <FiFile className="mr-1" />
            PDF Document
          </div>
        )}
        
        {!isImage && !isPdf && (
          <div className="flex items-center text-gray-600 text-sm">
            <FiFile className="mr-1" />
            File Document
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
          <div className="flex items-center mb-8">
            <div className="w-20 h-20 bg-gray-300 rounded-full"></div>
            <div className="ml-6">
              <div className="h-6 bg-gray-300 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-32"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-2 bg-gray-300 rounded-lg h-96"></div>
            <div className="bg-gray-300 rounded-lg h-96"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Profile</div>
            <p className="text-gray-600">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <p className="text-gray-600">No user profile found for employee: {employeeSerialNumber}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Header Section with Photo */}
        <div className="flex items-center mb-8">
          <div className="relative">
            {fileUrls.photo ? (
              <img 
                src={fileUrls.photo}
                alt="Employee Photo"
                className="w-20 h-20 object-cover rounded-full border-2 border-gray-200"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-semibold">
                {getInitials(userProfile.employeeName)}
              </div>
            )}
          </div>
          <div className="ml-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              {userProfile.employeeName || 'N/A'}
            </h1>
            <p className="text-gray-500">Employee ID: {userProfile.employeeSerialNumber}</p>
            <p className="text-sm text-gray-400">
              Status: <span className={`font-medium ${userProfile.status === 'Y' ? 'text-green-600' : 'text-yellow-600'}`}>
                {userProfile.status === 'Y' ? 'Onboarded' : 'Onboarded Pending'}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800">Personal Information</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center">
                  <FiMail className="text-gray-400 w-5 h-5" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900">{userProfile.emailAddress || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FiPhone className="text-gray-400 w-5 h-5" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-500">Emergency Contact</p>
                    <p className="text-gray-900">{userProfile.emergencyContactNumber || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FiCalendar className="text-gray-400 w-5 h-5" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <p className="text-gray-900">{formatDate(userProfile.dateOfBirth)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FiDroplet className="text-gray-400 w-5 h-5" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-500">Blood Group</p>
                    <p className="text-gray-900">{userProfile.bloodGroup || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FiFileText className="text-gray-400 w-5 h-5" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-500">Qualification</p>
                    <p className="text-gray-900">{userProfile.qualification || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800">Professional Information</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center">
                  <FiBriefcase className="text-gray-400 w-5 h-5" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-500">Designation</p>
                    <p className="text-gray-900">{userProfile.designation || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FiBriefcase className="text-gray-400 w-5 h-5" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="text-gray-900">{userProfile.department || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FiUser className="text-gray-400 w-5 h-5" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-500">Reporting Officer</p>
                    <p className="text-gray-900">{userProfile.reportingOfficer || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FiCalendar className="text-gray-400 w-5 h-5" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-500">Date of Joining</p>
                    <p className="text-gray-900">{formatDate(userProfile.dateOfJoining)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FiCreditCard className="text-gray-400 w-5 h-5" />
                  <div className="ml-3">
                    <p className="text-sm text-gray-500">Gross Salary</p>
                    <p className="text-gray-900">
                      {userProfile.grossSalary ? `₹${userProfile.grossSalary.toLocaleString()}` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800">Documents</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {fileUrls.qualificationDocument && (
                  <FileDisplay 
                    fileUrl={fileUrls.qualificationDocument} 
                    fileName="Qualification Document" 
                    fileType={detectFileType(userProfile.qualificationDocument)}
                  />
                )}
                {fileUrls.medicalBackground && (
                  <FileDisplay 
                    fileUrl={fileUrls.medicalBackground} 
                    fileName="Medical Background" 
                    fileType={detectFileType(userProfile.medicalBackground)}
                  />
                )}
                {fileUrls.legalBackground && (
                  <FileDisplay 
                    fileUrl={fileUrls.legalBackground} 
                    fileName="Legal Background" 
                    fileType={detectFileType(userProfile.legalBackground)}
                  />
                )}
                {fileUrls.panFile && (
                  <FileDisplay 
                    fileUrl={fileUrls.panFile} 
                    fileName="PAN Card" 
                    fileType={detectFileType(userProfile.panFile)}
                  />
                )}
                {fileUrls.adhaarFile && (
                  <FileDisplay 
                    fileUrl={fileUrls.adhaarFile} 
                    fileName="Aadhaar Card" 
                    fileType={detectFileType(userProfile.adhaarFile)}
                  />
                )}
                {fileUrls.passbookFile && (
                  <FileDisplay 
                    fileUrl={fileUrls.passbookFile} 
                    fileName="Bank Passbook" 
                    fileType={detectFileType(userProfile.passbookFile)}
                  />
                )}
                {fileUrls.addressProofFile && (
                  <FileDisplay 
                    fileUrl={fileUrls.addressProofFile} 
                    fileName="Address Proof" 
                    fileType={detectFileType(userProfile.addressProofFile)}
                  />
                )}
                {fileUrls.offerLetter && (
                  <FileDisplay 
                    fileUrl={fileUrls.offerLetter} 
                    fileName="Offer Letter" 
                    fileType={detectFileType(userProfile.offerLetter)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Address */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800">Address</h2>
              </div>
              <div className="p-6">
                <div className="flex items-start">
                  <FiMapPin className="text-gray-400 w-5 h-5 mt-1" />
                  <div className="ml-3">
                    <p className="text-gray-900">{userProfile.address || 'Address not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800">Bank Details</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Bank Name</p>
                  <p className="text-gray-900">{userProfile.bankName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Account Number</p>
                  <p className="text-gray-900">{userProfile.bankAccountNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IFSC Code</p>
                  <p className="text-gray-900">{userProfile.ifscCode || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Identity Details */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800">Identity Details</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-500">PAN Number</p>
                  <p className="text-gray-900">{userProfile.pan || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">UAN Number</p>
                  <p className="text-gray-900">{userProfile.uan || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">EPF Number</p>
                  <p className="text-gray-900">{userProfile.epfNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Aadhaar Number</p>
                  <p className="text-gray-900">
                    {userProfile.adhaar ? `****-****-${userProfile.adhaar.slice(-4)}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Personal File Number</p>
                  <p className="text-gray-900">{userProfile.personalFileNumber || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Profile Photo Section (Bottom Corner) */}
            {fileUrls.photo && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-800">Profile Photo</h2>
                </div>
                <div className="p-6 text-center">
                  <img 
                    src={fileUrls.photo}
                    alt="Employee Photo"
                    className="w-32 h-32 object-cover rounded-lg mx-auto border border-gray-200 shadow-sm"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                  <div className="mt-3">
                    <a
                      href={fileUrls.photo}
                      download="profile-photo"
                      className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      <FiDownload className="mr-1" size={14} />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserInfo