import { useState, useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Menu, User, LogOut } from "lucide-react"
import { useAuth } from "../context/AuthContext"

const Header = ({ toggleMobileMenu }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showZoomedPhoto, setShowZoomedPhoto] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    // Add event listener when dropdown is open
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    // Cleanup event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/attendance":
        return "Attendance"
      case "/regularization":
        return "Attendance Regularization"
      case "/user-info":
        return "User Information"
      case "/apply-leave":
        return "Apply Leave"
      case "/apply-leave1":
        return "Apply Leave 1"
      case "/calendar_view":
        return "Calendar View"
      case "/holiday_list":
        return "Holiday List"
      case "/resignation_view":
        return "Resignation View"
      default:
        return "ERP System"
    }
  }

  const handleLogout = () => {
    setShowDropdown(false) // Close dropdown
    logout()
    navigate("/login")
  }

  const handleImageError = (e) => {
    console.error("🖼️ Image failed to load")
    e.target.style.display = "none"
    const fallbackIcon = e.target.parentElement.querySelector(".fallback-icon")
    if (fallbackIcon) {
      fallbackIcon.style.display = "flex"
    }
  }

  const hasPhoto = Boolean(user?.photo)

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm z-10">
      <div className="px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleMobileMenu}
            className="md:hidden text-gray-600 hover:text-gray-900 focus:outline-none"
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>

          <div>
            <h1 className="text-xl font-semibold text-gray-900">{getPageTitle()}</h1>
          </div>
        </div>

        {/* User section */}
        <div className="flex items-center gap-4">
          <div className="relative" ref={dropdownRef}>
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setShowDropdown(!showDropdown)
              }}
            >
              <div 
                className="relative w-8 h-8"
                onClick={(e) => {
                  e.stopPropagation()
                  if (hasPhoto) {
                    setShowZoomedPhoto(true)
                    setShowDropdown(false) // Close dropdown when opening zoomed photo
                  }
                }}
              >
                {hasPhoto ? (
                  <img
                    src={user.photo}
                    alt="User"
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 transition-transform hover:scale-105"
                    onError={handleImageError}
                  />
                ) : null}
                <div
                  className={`fallback-icon absolute inset-0 rounded-full bg-blue-100 p-2 text-blue-600 items-center justify-center ${
                    hasPhoto ? "hidden" : "flex"
                  }`}
                >
                  <User size={16} />
                </div>
              </div>
              <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user?.employeeName || 'User'}
                </div>
                <div className="text-xs text-gray-500">
                  {user?.employeeSerialNumber || ''}
                </div>
              </div>
            </div>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-900">{user?.employeeName}</div>
                  <div className="text-xs text-gray-500">{user?.emailAddress}</div>
                  <div className="text-xs text-gray-500">{user?.department} - {user?.designation}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zoomed Photo Modal */}
      {showZoomedPhoto && hasPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowZoomedPhoto(false)}
        >
          <div className="relative bg-white p-2 rounded-lg">
            <img
              src={user.photo}
              alt="User"
              className="max-h-[80vh] max-w-[80vw] object-contain rounded-lg"
              onError={handleImageError}
            />
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
