import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Users, X, Minimize2, Maximize2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import chatService from '../services/ChatService';

const Chat = () => {
  const { getEmployeeSerialNumber, clearUnreadMessages } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const currentUserSerial = getEmployeeSerialNumber();

  // Set up connection state listener
  useEffect(() => {
    if (currentUserSerial) {
      initializeChat();
    }

    return () => {
      // Cleanup on unmount
      if (currentChat?.roomId) {
        chatService.unsubscribeFromChatRoom(currentChat.roomId);
      }
      chatService.removeConnectionStateListener(handleConnectionStateChange);
      chatService.removeNotificationHandler(handleNewMessageNotification);
      chatService.removeOnlineUserHandler(handleOnlineUserUpdate);
    };
  }, [currentUserSerial]);

  // Clear unread messages when chat is opened
  useEffect(() => {
    if (isOpen) {
      clearUnreadMessages();
      setUnreadCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleConnectionStateChange = (connectionState) => {
    console.log(`📡 Chat: Connection state changed: ${connectionState}`);
    
    if (connectionState === 'reconnecting') {
      setConnected(false);
      setConnectionStatus('reconnecting');
    } else if (connectionState === true || connectionState === 'connected') {
      setConnected(true);
      setConnectionStatus('connected');
    } else {
      setConnected(false);
      setConnectionStatus('disconnected');
    }
  };

  const initializeChat = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Set up connection state listener first
      chatService.addConnectionStateListener(handleConnectionStateChange);
      
      // Check if already connected
      if (chatService.isConnected()) {
        console.log('🔗 Chat: Already connected to chat service');
        setConnected(true);
        setConnectionStatus('connected');
      } else {
        console.log('🚀 Chat: Establishing connection...');
        await chatService.connect(currentUserSerial);
        // Connection state will be updated via the listener
      }

      // Set up message and user handlers
      setupChatHandlers();
      
      // Load available users
      await loadAvailableUsers();
      
    } catch (error) {
      console.error('❌ Chat: Failed to initialize:', error);
      setConnected(false);
      setConnectionStatus('disconnected');
    }
  };

  const setupChatHandlers = () => {
    // Remove existing handlers to prevent duplicates
    chatService.removeNotificationHandler(handleNewMessageNotification);
    chatService.removeOnlineUserHandler(handleOnlineUserUpdate);
    
    // Add handlers
    chatService.addNotificationHandler(handleNewMessageNotification);
    chatService.addOnlineUserHandler(handleOnlineUserUpdate);
  };

  const loadAvailableUsers = async () => {
    try {
      const users = await chatService.getAvailableUsers(currentUserSerial);
      setAvailableUsers(users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleNewMessageNotification = (notification) => {
    if (currentChat && notification.senderSerialNumber === currentChat.otherUser.employeeSerialNumber) {
      return;
    }
    
    setUnreadCount(prev => prev + 1);
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`New message from ${notification.senderName}`, {
        body: notification.content,
        icon: '/vite.svg'
      });
    }
  };

  const handleOnlineUserUpdate = (userData) => {
    setOnlineUsers(userData.onlineUsers || []);
  };

  const startChat = async (otherUser) => {
    try {
      setLoading(true);
      
      if (currentChat?.roomId) {
        chatService.unsubscribeFromChatRoom(currentChat.roomId);
      }

      const room = await chatService.createChatRoom(currentUserSerial, otherUser.employeeSerialNumber);
      const history = await chatService.getChatHistory(currentUserSerial, otherUser.employeeSerialNumber);
      
      setCurrentChat({ ...room, otherUser });
      setMessages(history || []);
      
      chatService.subscribeToChatRoom(room.roomId, (message) => {
        setMessages(prev => [...prev, message]);
        
        if (!isMinimized) {
          chatService.markMessagesAsRead(currentUserSerial, otherUser.employeeSerialNumber);
        }
      });

      await chatService.markMessagesAsRead(currentUserSerial, otherUser.employeeSerialNumber);
      setUnreadCount(0);
      
    } catch (error) {
      console.error('Failed to start chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && currentChat && connected) {
      const success = chatService.sendMessage(currentChat.otherUser.employeeSerialNumber, newMessage.trim());
      if (success) {
        setNewMessage('');
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isUserOnline = (userSerial) => {
    return onlineUsers.some(user => user.userSerial === userSerial);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (!currentUserSerial) {
    return null;
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105"
        >
          <MessageCircle size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-24 right-6 bg-white rounded-lg shadow-2xl border border-gray-200 z-40 transition-all duration-200 ${
          isMinimized ? 'w-80 h-16' : 'w-96 h-[32rem]'
        }`}>
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle size={20} />
              <span className="font-medium">
                {currentChat ? `Chat with ${currentChat.otherUser.employeeName}` : 'Team Chat'}
              </span>
              {currentChat && (
                <span className={`w-2 h-2 rounded-full ${
                  isUserOnline(currentChat.otherUser.employeeSerialNumber) ? 'bg-green-400' : 'bg-gray-400'
                }`} />
              )}
              {/* Connection Status */}
              <div className="flex items-center space-x-1">
                <span className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-400' : 
                  connectionStatus === 'reconnecting' ? 'bg-orange-400' : 'bg-red-400'
                }`} />
                <span className="text-xs">
                  {connectionStatus === 'connected' ? 'Connected' : 
                   connectionStatus === 'reconnecting' ? 'Reconnecting' : 'Disconnected'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-blue-700 p-1 rounded"
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-blue-700 p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex h-[28rem]">
              {/* User List */}
              {!currentChat && (
                <div className="w-full border-r border-gray-200">
                  <div className="p-3 border-b border-gray-200">
                    <h3 className="font-medium text-gray-800 flex items-center">
                      <Users size={16} className="mr-2" />
                      Available Users ({availableUsers.length})
                    </h3>
                  </div>
                  <div className="overflow-y-auto h-[24rem]">
                    {loading ? (
                      <div className="p-4 text-center text-gray-500">Loading...</div>
                    ) : availableUsers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No users available</div>
                    ) : (
                      availableUsers.map(user => (
                        <div
                          key={user.employeeSerialNumber}
                          onClick={() => startChat(user)}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-800">{user.employeeName}</div>
                              <div className="text-sm text-gray-500">{user.designation}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`w-2 h-2 rounded-full ${
                                isUserOnline(user.employeeSerialNumber) ? 'bg-green-400' : 'bg-gray-400'
                              }`} />
                              <span className="text-xs text-gray-400">
                                {isUserOnline(user.employeeSerialNumber) ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Chat Area */}
              {currentChat && (
                <div className="flex-1 flex flex-col">
                  <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setCurrentChat(null)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        ← Back to users
                      </button>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {isUserOnline(currentChat.otherUser.employeeSerialNumber) ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageCircle size={48} className="mx-auto mb-2 text-gray-300" />
                        <p>Start your conversation with {currentChat.otherUser.employeeName}</p>
                      </div>
                    ) : (
                      messages.map((message, index) => {
                        const isOwn = message.senderSerialNumber === currentUserSerial;
                        const showDate = index === 0 || 
                          formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);
                        
                        return (
                          <div key={index}>
                            {showDate && (
                              <div className="text-center text-xs text-gray-500 my-2">
                                {formatDate(message.timestamp)}
                              </div>
                            )}
                            <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] rounded-lg p-2 ${
                                isOwn 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                <div className="text-sm">{message.content}</div>
                                <div className={`text-xs mt-1 ${
                                  isOwn ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                  {formatTime(message.timestamp)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-3 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={`Message ${currentChat.otherUser.employeeName}...`}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        disabled={!connected}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || !connected}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                    {connectionStatus !== 'connected' && (
                      <div className="text-xs mt-1">
                        {connectionStatus === 'reconnecting' && (
                          <span className="text-orange-500">Disconnected - Reconnecting...</span>
                        )}
                        {connectionStatus === 'disconnected' && (
                          <span className="text-red-500">Disconnected</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Chat; 