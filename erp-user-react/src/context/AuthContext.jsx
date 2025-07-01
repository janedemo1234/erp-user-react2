import { createContext, useContext, useState, useEffect } from 'react'
import chatService from '../services/ChatService'

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
  const [chatConnected, setChatConnected] = useState(false)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)

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
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Notification permission:', permission);
      });
    }
  }, [])

  // Monitor and sync with actual connection state
  useEffect(() => {
    const syncWithActualConnection = () => {
      const actualConnectionState = chatService.stompClient?.connected || false;
      if (actualConnectionState !== chatConnected) {
        console.log('🔄 AuthContext: Syncing with actual connection state:', actualConnectionState);
        setChatConnected(actualConnectionState);
      }
    };

    // Add listener for immediate connection state changes
    const handleConnectionChange = (isConnected) => {
      console.log('📡 AuthContext: Received connection state change:', isConnected);
      setChatConnected(isConnected);
    };

    // Handle new message notifications for unread count
    const handleNewMessageNotification = (notification) => {
      console.log('📩 AuthContext: New message notification received:', notification);
      
      // Only increment unread count if user is not currently on chat page
      const currentPath = window.location.pathname;
      const isOnChatPage = currentPath === '/chat';
      
      if (!isOnChatPage) {
        setUnreadMessageCount(prev => {
          const newCount = prev + 1;
          console.log(`📊 AuthContext: Unread count updated from ${prev} to ${newCount}`);
          return newCount;
        });
      }
      
      // Always show browser notification if permitted (even on chat page for other conversations)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`New message from ${notification.senderName || notification.senderSerialNumber || 'Unknown'}`, {
          body: notification.content || 'New message received',
          icon: '/vite.svg',
          tag: `chat-${notification.senderSerialNumber}` // Prevent spam
        });
      }
    };

    chatService.addConnectionStateListener(handleConnectionChange);
    chatService.addNotificationHandler(handleNewMessageNotification);

    // Initial sync when user changes
    if (user?.employeeSerialNumber) {
      syncWithActualConnection();
      
      // If not connected, try to connect
      if (!chatService.stompClient?.connected && !chatService.isConnecting) {
        console.log('🚀 AuthContext: Initializing chat for user:', user.employeeSerialNumber);
        initializeChatConnection();
      }
    }

    // Periodic sync to catch state drift (fallback)
    const syncInterval = setInterval(syncWithActualConnection, 2000);
    
    return () => {
      clearInterval(syncInterval);
      chatService.removeConnectionStateListener(handleConnectionChange);
      chatService.removeNotificationHandler(handleNewMessageNotification);
    };
  }, [user, chatConnected])

  const initializeChatConnection = async () => {
    try {
      if (user?.employeeSerialNumber && !chatService.stompClient?.connected && !chatService.isConnecting) {
        console.log('🚀 AuthContext: Connecting chat service for user:', user.employeeSerialNumber)
        await chatService.connect(user.employeeSerialNumber)
        setChatConnected(chatService.stompClient?.connected || false)
        console.log('✅ AuthContext: Chat connection attempt completed')
      }
    } catch (error) {
      console.error('❌ AuthContext: Failed to initialize chat service:', error)
      setChatConnected(false)
    }
  }

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
    // Disconnect chat service on logout
    if (chatService.stompClient && chatService.stompClient.connected) {
      chatService.disconnect()
      setChatConnected(false)
      console.log('🔌 Chat service disconnected on logout')
    }
    
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

  // Function to clear unread message count
  const clearUnreadMessages = () => {
    console.log('📭 AuthContext: Clearing unread message count');
    setUnreadMessageCount(0);
  }

  // Function to manually add to unread count (for debugging)
  const addUnreadMessage = () => {
    setUnreadMessageCount(prev => prev + 1);
  }

  // Function to test notifications
  const testNotification = () => {
    console.log('🧪 Testing notification system...');
    console.log('📱 Notification permission:', Notification.permission);
    
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Test Notification', {
          body: 'This is a test notification from ERP Chat',
          icon: '/vite.svg',
          tag: 'test-notification'
        });
        console.log('✅ Test notification sent');
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('🔔 Permission result:', permission);
          if (permission === 'granted') {
            new Notification('Test Notification', {
              body: 'Notifications are now enabled!',
              icon: '/vite.svg',
              tag: 'test-notification'
            });
          }
        });
      } else {
        console.log('❌ Notifications are blocked');
      }
    } else {
      console.log('❌ Notifications not supported');
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
    refreshUserPhoto,
    chatConnected,
    initializeChatConnection,
    unreadMessageCount,
    clearUnreadMessages,
    addUnreadMessage,
    testNotification
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}