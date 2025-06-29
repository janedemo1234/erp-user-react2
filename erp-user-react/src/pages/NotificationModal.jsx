import React from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const NotificationModal = ({ 
  isOpen, 
  onClose, 
  type = 'success', 
  title, 
  message, 
  autoClose = true 
}) => {
  React.useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, autoClose]);

  if (!isOpen) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          titleColor: 'text-green-900',
          messageColor: 'text-green-700',
          buttonColor: 'bg-green-600 hover:bg-green-700',
          accentColor: 'bg-green-500'
        };
      case 'error':
        return {
          icon: XCircle,
          bgColor: 'bg-gradient-to-br from-red-50 to-rose-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          titleColor: 'text-red-900',
          messageColor: 'text-red-700',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          accentColor: 'bg-red-500'
        };
      case 'warning':
        return {
          icon: AlertCircle,
          bgColor: 'bg-gradient-to-br from-yellow-50 to-amber-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-600',
          titleColor: 'text-yellow-900',
          messageColor: 'text-yellow-700',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
          accentColor: 'bg-yellow-500'
        };
      default:
        return {
          icon: CheckCircle,
          bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-900',
          messageColor: 'text-blue-700',
          buttonColor: 'bg-blue-600 hover:bg-blue-700',
          accentColor: 'bg-blue-500'
        };
    }
  };

  const config = getTypeConfig();
  const IconComponent = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-md transform transition-all duration-300 ease-out scale-100 opacity-100`}>
        <div className={`${config.bgColor} ${config.borderColor} border-2 rounded-2xl shadow-2xl overflow-hidden`}>
          {/* Accent Bar */}
          <div className={`${config.accentColor} h-1 w-full`} />
          
          {/* Content */}
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${config.bgColor.replace('from-', 'from-').replace('to-', 'to-').replace('50', '100')}`}>
                  <IconComponent className={`${config.iconColor} h-6 w-6`} />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${config.titleColor}`}>
                    {title}
                  </h3>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-1 rounded-full hover:bg-gray-100 transition-colors ${config.messageColor} hover:text-gray-600`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Message */}
            <div className="mb-6">
              <p className={`${config.messageColor} leading-relaxed`}>
                {message}
              </p>
            </div>
            
            {/* Action Button */}
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className={`px-6 py-2.5 ${config.buttonColor} text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 shadow-lg hover:shadow-xl`}
                style={{ 
                  focusRingColor: config.accentColor.replace('bg-', '').replace('-500', '-200')
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;