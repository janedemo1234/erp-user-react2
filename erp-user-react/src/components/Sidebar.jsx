import { NavLink } from 'react-router-dom'
import { FiClock, FiCalendar, FiUser, FiX, FiMessageCircle } from 'react-icons/fi'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserTie } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isMobile, isOpen, onClose }) => {
  const { unreadMessageCount } = useAuth();
  
  if (isMobile && !isOpen) return null
  
  return (
    <>
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-20"
          onClick={onClose}
        />
      )}
      
      <aside 
        className={`
          bg-white border-r border-gray-200 z-30
          ${isMobile 
            ? 'fixed top-0 left-0 h-full w-64 shadow-lg animate-slideIn' 
            : 'w-64 h-full'}
        `}
      >
        {isMobile && (
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900">ERP System</h1>
            <button 
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
              aria-label="Close menu"
            >
              <FiX size={24} />
            </button>
          </div>
        )}
        
        <div className={`p-4 ${isMobile ? '' : 'pt-6'}`}>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            erp-user
          </h2>
          
          <nav className="space-y-1">
            <NavLink 
              to="/attendance" 
              className={({ isActive }) => 
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={isMobile ? onClose : undefined}
            >
              <FiClock />
              <span>Attendance</span>
            </NavLink>

            <NavLink 
              to="/apply-leave" 
              className={({ isActive }) => 
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={isMobile ? onClose : undefined}
            >
              <FiClock />
              <span>Apply Leave</span>
            </NavLink>
            
            <NavLink 
              to="/regularization" 
              className={({ isActive }) => 
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={isMobile ? onClose : undefined}
            >
              <FiCalendar />
              <span>Regularization</span>
            </NavLink>
            <NavLink 
              to="/calendar_view" 
              className={({ isActive }) => 
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={isMobile ? onClose : undefined}
            >
              <FiCalendar />
              <span>Calndar-view</span>
            </NavLink>
            <NavLink 
              to="/holiday_list" 
              className={({ isActive }) => 
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={isMobile ? onClose : undefined}
            >
              <FiCalendar />
              <span>Holiday-List</span>
            </NavLink>
            <NavLink 
              to="/user-info" 
              className={({ isActive }) => 
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={isMobile ? onClose : undefined}
            >
              <FiUser />
              <span>User Info</span>
            </NavLink>
            <NavLink 
              to="/chat" 
              className={({ isActive }) => 
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={isMobile ? onClose : undefined}
            >
              <FiMessageCircle />
              <span>Team Chat</span>
              {unreadMessageCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </span>
              )}
            </NavLink>
            <NavLink
               to="/resignation_view" 
              className={({ isActive }) => 
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={isMobile ? onClose : undefined}
              >
<FontAwesomeIcon icon={faUserTie} />
                              <span>Resignation</span>

            </NavLink>
          </nav>
        </div>
      </aside>
    </>
  )
}

export default Sidebar