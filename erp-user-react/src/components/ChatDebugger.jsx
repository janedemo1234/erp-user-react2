import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import chatService from '../services/ChatService';

const ChatDebugger = () => {
  const { getEmployeeSerialNumber } = useAuth();
  const [apiResults, setApiResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [serviceStatus, setServiceStatus] = useState(null);
  const { user, chatConnected } = useAuth();
  const [serviceConnected, setServiceConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastError, setLastError] = useState(null);
  
  const currentUserSerial = getEmployeeSerialNumber();

  // Check service status on component mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await chatService.testChatStatus();
        setServiceStatus({ success: true, data: status });
      } catch (error) {
        setServiceStatus({ success: false, error: error.message });
      }
    };
    
    if (currentUserSerial) {
      checkStatus();
    }
  }, [currentUserSerial]);

  useEffect(() => {
    const interval = setInterval(() => {
      setServiceConnected(chatService.stompClient?.connected || false);
    }, 1000);

    // Monitor connection state changes
    const handleConnectionState = (isConnected) => {
      setServiceConnected(isConnected);
      if (!isConnected) {
        setConnectionAttempts(prev => prev + 1);
      } else {
        setConnectionAttempts(0);
      }
    };

    chatService.addConnectionStateListener(handleConnectionState);

    return () => {
      clearInterval(interval);
      chatService.removeConnectionStateListener(handleConnectionState);
    };
  }, []);

  const testAPI = async (endpoint, apiCall) => {
    try {
      setLoading(true);
      console.log(`Testing ${endpoint}...`);
      const result = await apiCall();
      console.log(`${endpoint} result:`, result);
      
      setApiResults(prev => ({
        ...prev,
        [endpoint]: {
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error(`${endpoint} error:`, error);
      setApiResults(prev => ({
        ...prev,
        [endpoint]: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const testAll = async () => {
    if (!currentUserSerial) {
      alert('Please log in first');
      return;
    }

    // Test backend status first
    await testAPI('chatStatus', () => 
      chatService.testChatStatus()
    );

    // Test main API endpoints
    await testAPI('getAvailableUsers', () => 
      chatService.getAvailableUsers(currentUserSerial)
    );

    await testAPI('getRecentConversations', () => 
      chatService.getRecentConversations(currentUserSerial)
    );

    await testAPI('createChatRoom', () => 
      chatService.createChatRoom(currentUserSerial, 'EMP002')
    );

    await testAPI('getChatHistory', () => 
      chatService.getChatHistory(currentUserSerial, 'EMP002')
    );

    // Test main mark as read functionality
    await testAPI('markMessagesAsRead', () => 
      chatService.markMessagesAsRead(`${currentUserSerial}_EMP002`, currentUserSerial)
    );

    // Test debug endpoints
    await testAPI('testCreateChatRoom', () => 
      chatService.testCreateChatRoom(currentUserSerial, 'EMP002')
    );

    await testAPI('testSaveMessage', () => 
      chatService.testSaveMessage(currentUserSerial, 'EMP002', 'Test message from debugger')
    );

    await testAPI('testMarkAsRead', () => 
      chatService.testMarkAsRead(`${currentUserSerial}_EMP002`, currentUserSerial)
    );

    // Test WebSocket connection last (as it might be slower)
    await testAPI('connectWebSocket', () => 
      chatService.connect(currentUserSerial)
    );
  };

  const testBasicEndpoints = async () => {
    if (!currentUserSerial) {
      alert('Please log in first');
      return;
    }

    await testAPI('chatStatus', () => 
      chatService.testChatStatus()
    );

    await testAPI('getAvailableUsers', () => 
      chatService.getAvailableUsers(currentUserSerial)
    );
  };

  const testChatOperations = async () => {
    if (!currentUserSerial) {
      alert('Please log in first');
      return;
    }

    const testRoomId = `${currentUserSerial}_EMP002`;
    
    await testAPI('testCreateChatRoom', () => 
      chatService.testCreateChatRoom(currentUserSerial, 'EMP002')
    );

    await testAPI('testSaveMessage', () => 
      chatService.testSaveMessage(currentUserSerial, 'EMP002', 'Debug test message')
    );

    await testAPI('markMessagesAsRead', () => 
      chatService.markMessagesAsRead(testRoomId, currentUserSerial)
    );

    await testAPI('testMarkAsRead', () => 
      chatService.testMarkAsRead(testRoomId, currentUserSerial)
    );
  };

  const handleManualConnect = async () => {
    try {
      setLastError(null);
      await chatService.connect(getEmployeeSerialNumber());
      console.log('Manual connection successful');
    } catch (error) {
      setLastError(error.message);
      console.error('Manual connection failed:', error);
    }
  };

  const handleManualDisconnect = () => {
    chatService.disconnect();
    console.log('Manual disconnect triggered');
  };

  const handleForceSync = () => {
    console.log('🔄 Force syncing AuthContext with ChatService state');
    const isServiceConnected = chatService.stompClient?.connected || false;
    console.log('📡 ChatService connected:', isServiceConnected);
    console.log('🔌 AuthContext connected:', chatConnected);
    
    // Manually trigger the connection state notification
    chatService.notifyConnectionState(isServiceConnected);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Chat API Debugger</h2>
      
      <div className="mb-4 space-y-2">
        <p><strong>Current User Serial:</strong> {currentUserSerial || 'Not logged in'}</p>
        
        <div className="flex items-center space-x-2">
          <strong>Chat Service Status:</strong>
          {serviceStatus === null ? (
            <span className="text-gray-500">Checking...</span>
          ) : serviceStatus.success ? (
            <span className="text-green-600 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Online - {serviceStatus.data?.message || 'Running'}
            </span>
          ) : (
            <span className="text-red-600 flex items-center">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
              Offline - {serviceStatus.error}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={testAll}
          disabled={loading || !currentUserSerial}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Testing...' : 'Test All APIs'}
        </button>
        
        <button
          onClick={testBasicEndpoints}
          disabled={loading || !currentUserSerial}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          Test Basic
        </button>
        
        <button
          onClick={testChatOperations}
          disabled={loading || !currentUserSerial}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
        >
          Test Chat Ops
        </button>
        
        <button
          onClick={() => setApiResults({})}
          disabled={loading}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:bg-gray-400"
        >
          Clear Results
        </button>
      </div>

      {Object.keys(apiResults).length > 0 && (
        <div className="space-y-4">
          {Object.entries(apiResults).map(([endpoint, result]) => (
            <div key={endpoint} className="border rounded p-4">
              <h3 className="font-semibold text-lg mb-2">{endpoint}</h3>
              <p className="text-sm text-gray-600 mb-2">
                {result.timestamp} - 
                <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                  {result.success ? ' SUCCESS' : ' ERROR'}
                </span>
              </p>
              
              {result.success ? (
                <div>
                  <p className="font-medium mb-2">Response Data:</p>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-64">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                  
                  {endpoint === 'getAvailableUsers' && Array.isArray(result.data) && (
                    <div className="mt-2">
                      <p className="font-medium">Array Analysis:</p>
                      <p>Length: {result.data.length}</p>
                      <p>First item: {result.data[0] ? JSON.stringify(result.data[0], null, 2) : 'N/A'}</p>
                    </div>
                  )}
                  
                  {endpoint === 'getAvailableUsers' && result.data && !Array.isArray(result.data) && (
                    <div className="mt-2">
                      <p className="font-medium">Object Analysis:</p>
                      <p>Type: {typeof result.data}</p>
                      <p>Keys: {Object.keys(result.data).join(', ')}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-medium mb-2 text-red-600">Error:</p>
                  <p className="bg-red-50 p-3 rounded text-sm">{result.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Debug Instructions</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Test Basic:</strong> Check service status and user availability</p>
          <p><strong>Test Chat Ops:</strong> Test room creation, messaging, and mark-as-read functions</p>
          <p><strong>Test All APIs:</strong> Complete test of all endpoints including WebSocket</p>
        </div>
        
                <div className="mt-3">
          <h4 className="font-medium text-blue-800 mb-1">Backend Endpoints Being Tested:</h4>
          <div className="text-xs text-blue-600 space-y-1">
            <div>GET /api/chat/test/status</div>
            <div>GET /api/chat/users/available</div>
            <div>POST /api/chat/room/create</div>
            <div>POST /api/chat/test/create-room</div>
            <div>POST /api/chat/test/save-message</div>
            <div>POST /api/chat/messages/markRead <span className="text-green-600">(Simplified)</span></div>
            <div>POST /api/chat/test/mark-read</div>
            <div>WebSocket /ws-chat</div>
          </div>
        </div>
        
                  <div className="mt-3">
            <h4 className="font-medium text-blue-800 mb-1">Quick Manual Test:</h4>
            <div className="text-xs text-blue-600 bg-white p-2 rounded border">
              <div>Open browser console and run:</div>
              <pre className="block mt-1 text-xs">
{`fetch('http://localhost:8080/api/chat/test/status')
  .then(r => r.json()).then(d => console.log('Status:', d))`}
              </pre>
            </div>
          </div>
      </div>

      <div className="fixed top-4 left-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-sm">
        <h3 className="font-bold text-sm mb-2">🔍 Chat Connection Debug</h3>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span>User:</span>
            <span className="font-mono">{user?.employeeSerialNumber || 'None'}</span>
          </div>
          
          <div className="flex justify-between">
            <span>AuthContext Connected:</span>
            <span className={`font-bold ${chatConnected ? 'text-green-600' : 'text-red-600'}`}>
              {chatConnected ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Service Connected:</span>
            <span className={`font-bold ${serviceConnected ? 'text-green-600' : 'text-red-600'}`}>
              {serviceConnected ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Connection Attempts:</span>
            <span className="font-mono">{connectionAttempts}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Is Connecting:</span>
            <span className={`font-bold ${chatService.isConnecting ? 'text-orange-600' : 'text-gray-600'}`}>
              {chatService.isConnecting ? '🔄 Yes' : '⏸️ No'}
            </span>
          </div>
          
          {lastError && (
            <div className="text-red-600 text-xs mt-2">
              <strong>Last Error:</strong> {lastError}
            </div>
          )}
        </div>
        
                 <div className="flex flex-wrap gap-1 mt-3">
           <button
             onClick={handleManualConnect}
             disabled={chatService.isConnecting}
             className="text-xs bg-blue-500 text-white px-2 py-1 rounded disabled:bg-gray-400"
           >
             Connect
           </button>
           <button
             onClick={handleManualDisconnect}
             className="text-xs bg-red-500 text-white px-2 py-1 rounded"
           >
             Disconnect
           </button>
           <button
             onClick={handleForceSync}
             className="text-xs bg-green-500 text-white px-2 py-1 rounded"
           >
             Force Sync
           </button>
         </div>
      </div>
    </div>
  );
};

export default ChatDebugger; 