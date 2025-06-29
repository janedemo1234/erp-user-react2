import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('erpUser')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
      } catch (error) {
        console.error('Error parsing stored user data:', error)
        localStorage.removeItem('erpUser')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Fetching user profiles from API...')
      const response = await fetch('http://localhost:8080/api/user-profiles/all')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const users = await response.json()
      console.log('📊 API Response received, users count:', users.length)

      // Find user with matching email and password
      const matchedUser = users.find((user) => 
        user.emailAddress === email && user.password === password
      )

      if (matchedUser) {
        console.log('👤 Found matching user:', matchedUser.employeeName)
        
        // Fetch user photo from the dedicated photo API endpoint
        let userPhotoUrl = null
        try {
          const photoResponse = await fetch(`http://localhost:8080/api/user-profiles/employee/${matchedUser.employeeSerialNumber}/photo`)
          if (photoResponse.ok) {
            const photoBlob = await photoResponse.blob()
            userPhotoUrl = URL.createObjectURL(photoBlob)
            console.log('🖼️ Photo fetched successfully from API')
          } else {
            console.log('📷 No photo found for user, will use fallback')
          }
        } catch (photoError) {
          console.error('❌ Error fetching photo:', photoError)
        }

        // Create user data object for our application
        const userData = {
          employeeSerialNumber: matchedUser.employeeSerialNumber,
          employeeName: matchedUser.employeeName,
          emailAddress: matchedUser.emailAddress,
          department: matchedUser.department,
          designation: matchedUser.designation,
          photo: userPhotoUrl, // Use API photo
          status: matchedUser.status,
          // Include other relevant fields
          dateOfJoining: matchedUser.dateOfJoining,
          reportingOfficer: matchedUser.reportingOfficer
        }

        console.log('💾 Storing user data for employee:', userData.employeeSerialNumber)
        
        setUser(userData)
        localStorage.setItem('erpUser', JSON.stringify(userData))
        return { success: true, user: userData }
      } else {
        throw new Error('Invalid email or password')
      }
    } catch (err) {
      console.error('❌ Login error:', err)
      const errorMessage = err.message || 'Failed to login. Please try again.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    // Clean up photo blob URL if it exists
    if (user?.photo && user.photo.startsWith('blob:')) {
      URL.revokeObjectURL(user.photo)
    }
    setUser(null)
    localStorage.removeItem('erpUser')
  }

  // Function to get current employee serial number
  const getEmployeeSerialNumber = () => {
    return user?.employeeSerialNumber || null
  }

  // Function to check if user is authenticated
  const isAuthenticated = () => {
    return user !== null
  }

  // Function to refresh user photo
  const refreshUserPhoto = async () => {
    if (!user?.employeeSerialNumber) return

    try {
      const photoResponse = await fetch(`http://localhost:8080/api/user-profiles/employee/${user.employeeSerialNumber}/photo`)
      if (photoResponse.ok) {
        // Clean up old photo URL
        if (user.photo && user.photo.startsWith('blob:')) {
          URL.revokeObjectURL(user.photo)
        }
        
        const photoBlob = await photoResponse.blob()
        const newPhotoUrl = URL.createObjectURL(photoBlob)
        
        const updatedUser = { ...user, photo: newPhotoUrl }
        setUser(updatedUser)
        localStorage.setItem('erpUser', JSON.stringify(updatedUser))
        
        console.log('🔄 User photo refreshed successfully')
      }
    } catch (error) {
      console.error('❌ Error refreshing user photo:', error)
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    getEmployeeSerialNumber,
    isAuthenticated,
    refreshUserPhoto
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}