import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Users, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import chatService from '../services/ChatService';

const ChatPage = () => {
  const { getEmployeeSerialNumber, clearUnreadMessages, testNotification, addUnreadMessage } = useAuth();
  const [availableUsers, setAvailableUsers] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentConversations, setRecentConversations] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const currentUserSerial = getEmployeeSerialNumber();

  // Initialize chat connection and listeners when component mounts
  useEffect(() => {
    if (currentUserSerial) {
      // Clear unread messages when user visits chat page
      clearUnreadMessages();
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
      
      // Cleanup photo URLs to prevent memory leaks
      availableUsers.forEach(user => {
        if (user.photo && user.photo.startsWith('blob:')) {
          URL.revokeObjectURL(user.photo);
        }
      });
    };
  }, [currentUserSerial]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleConnectionStateChange = (connectionState) => {
    console.log(`📡 ChatPage: Connection state changed: ${connectionState}`);
    
    if (connectionState === 'reconnecting') {
      setConnected(false);
      setConnectionStatus('reconnecting');
    } else if (connectionState === true || connectionState === 'connected') {
      setConnected(true);
      setConnectionStatus('connected');
      // Load conversations when connected
      loadRecentConversations();
    } else {
      setConnected(false);
      setConnectionStatus('disconnected');
    }
  };

  const initializeChat = async () => {
    try {
      setLoading(true);
      setConnectionStatus('connecting');
      
      // Set up connection state listener first
      chatService.addConnectionStateListener(handleConnectionStateChange);
      
      // Check if already connected
      if (chatService.isConnected()) {
        console.log('🔗 ChatPage: Already connected to chat service');
        setConnected(true);
        setConnectionStatus('connected');
      } else {
        console.log('🚀 ChatPage: Establishing connection...');
        await chatService.connect(currentUserSerial);
        // Connection state will be updated via the listener
      }

      // Set up message and user handlers
      chatService.addNotificationHandler(handleNewMessageNotification);
      chatService.addOnlineUserHandler(handleOnlineUserUpdate);

      // Load available users (this works even if chat server is down)
      await loadAvailableUsers();
      
      // Load conversations if connected
      if (chatService.isConnected()) {
        await loadRecentConversations();
      }
      
    } catch (error) {
      console.error('❌ ChatPage: Failed to initialize chat:', error);
      setConnected(false);
      setConnectionStatus('disconnected');
      // Still try to load users for display
      await loadAvailableUsers();
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const result = await chatService.getAvailableUsers(currentUserSerial);
      console.log('Raw API response for users:', result);
      
      // Handle different API response formats
      let users = [];
      if (Array.isArray(result)) {
        users = result;
      } else if (result && Array.isArray(result.data)) {
        users = result.data;
      } else if (result && Array.isArray(result.users)) {
        users = result.users;
      } else {
        console.warn('Unexpected API response format:', result);
        users = [];
      }
      
      // Filter out any invalid user objects
      const validUsers = users.filter(user => 
        user && 
        typeof user === 'object' && 
        user.employeeSerialNumber && 
        user.employeeName
      );
      
      // Fetch photos for all users
      const usersWithPhotos = await Promise.all(
        validUsers.map(async (user) => {
          try {
            const photoResponse = await fetch(`http://localhost:8080/api/user-profiles/employee/${user.employeeSerialNumber}/photo`);
            if (photoResponse.ok) {
              const photoBlob = await photoResponse.blob();
              const photoUrl = URL.createObjectURL(photoBlob);
              return { ...user, photo: photoUrl };
            }
          } catch (error) {
            console.error(`Failed to fetch photo for ${user.employeeName}:`, error);
          }
          return { ...user, photo: null };
        })
      );
      
      console.log('Processed users with photos:', usersWithPhotos);
      setAvailableUsers(usersWithPhotos);
    } catch (error) {
      console.error('Failed to load users:', error);
      setAvailableUsers([]);
    }
  };

  const loadRecentConversations = async () => {
    try {
      const result = await chatService.getRecentConversations(currentUserSerial);
      console.log('Raw API response for conversations:', result);
      
      // Handle different API response formats
      let conversations = [];
      if (Array.isArray(result)) {
        conversations = result;
      } else if (result && Array.isArray(result.data)) {
        conversations = result.data;
      } else if (result && Array.isArray(result.conversations)) {
        conversations = result.conversations;
      } else {
        console.log('No recent conversations or unexpected format:', result);
        conversations = [];
      }
      
      // Filter out any invalid conversation objects
      const validConversations = conversations.filter(conv => 
        conv && 
        typeof conv === 'object' && 
        conv.otherUser && 
        conv.otherUser.employeeSerialNumber
      );
      
      console.log('Processed conversations:', validConversations);
      setRecentConversations(validConversations);
    } catch (error) {
      console.error('Failed to load recent conversations:', error);
      setRecentConversations([]);
    }
  };

  const handleNewMessageNotification = (notification) => {
    if (currentChat && notification.senderSerialNumber === currentChat.otherUser.employeeSerialNumber) {
      return;
    }
    
    // Update recent conversations or show notification
    loadRecentConversations();
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
        // Try to mark messages as read (non-blocking)
        if (room.roomId) {
          chatService.markMessagesAsRead(room.roomId, currentUserSerial);
        }
      });

      // Try to mark existing messages as read (non-blocking)
      if (room.roomId) {
        chatService.markMessagesAsRead(room.roomId, currentUserSerial);
      }
      
    } catch (error) {
      console.error('Failed to start chat:', error);
      // Still allow the chat to continue with limited functionality
      if (otherUser) {
        setCurrentChat({ 
          roomId: `fallback_${currentUserSerial}_${otherUser.employeeSerialNumber}`,
          otherUser,
          fallback: true 
        });
        setMessages([]);
      }
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

  const filteredUsers = availableUsers
    .filter(user => user && user.employeeSerialNumber && user.employeeName) // Filter out null/undefined users
    .filter(user =>
      user.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.designation && user.designation.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  if (!currentUserSerial) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MessageCircle size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Please log in to access chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white rounded-lg shadow-md overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center">
            <MessageCircle className="mr-2 text-blue-600" size={24} />
            Team Chat
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {connectionStatus === 'connected' ? `${onlineUsers.length} users online` : 
             connectionStatus === 'connecting' ? 'Connecting...' :
             connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}
          </p>
          {/* Temporary test buttons for debugging */}
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              onClick={testNotification}
              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Test Notification
            </button>
            <button
              onClick={addUnreadMessage}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Unread (+1)
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Recent Conversations */}
              {recentConversations.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <h3 className="text-sm font-medium text-gray-700">Recent Conversations</h3>
                  </div>
                  {recentConversations
                    .filter(conversation => conversation && conversation.otherUser && conversation.otherUser.employeeSerialNumber)
                    .map(conversation => {
                      // Find user with photo from availableUsers
                      const userWithPhoto = availableUsers.find(u => u.employeeSerialNumber === conversation.otherUser.employeeSerialNumber);
                      const photo = userWithPhoto?.photo;
                      
                      return (
                        <div
                          key={conversation.id}
                          onClick={() => startChat(conversation.otherUser)}
                          className={`p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
                            currentChat?.otherUser.employeeSerialNumber === conversation.otherUser.employeeSerialNumber ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              {photo ? (
                                <img 
                                  src={photo} 
                                  alt={conversation.otherUser.employeeName}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                                  <span className="text-white font-medium">
                                    {conversation.otherUser.employeeName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                                isUserOnline(conversation.otherUser.employeeSerialNumber) ? 'bg-green-400' : 'bg-gray-400'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-800 truncate">{conversation.otherUser.employeeName}</div>
                                <span className="text-xs text-gray-400 ml-2">
                                  {formatTime(conversation.lastMessageTime)}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 truncate">{conversation.lastMessage}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* All Users */}
              <div>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <h3 className="text-sm font-medium text-gray-700">
                    All Users ({filteredUsers.length})
                  </h3>
                </div>
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchTerm ? 'No users found' : 'No users available'}
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <div
                      key={user.employeeSerialNumber}
                      onClick={() => startChat(user)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
                        currentChat?.otherUser.employeeSerialNumber === user.employeeSerialNumber ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            {user.photo ? (
                              <img 
                                src={user.photo} 
                                alt={user.employeeName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                  {user.employeeName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                              isUserOnline(user.employeeSerialNumber) ? 'bg-green-400' : 'bg-gray-400'
                            }`} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{user.employeeName}</div>
                            <div className="text-sm text-gray-500">{user.designation}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {isUserOnline(user.employeeSerialNumber) ? 'Online' : 'Offline'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {(() => {
                    const userWithPhoto = availableUsers.find(u => u.employeeSerialNumber === currentChat.otherUser.employeeSerialNumber);
                    const photo = userWithPhoto?.photo;
                    
                    return photo ? (
                      <img 
                        src={photo} 
                        alt={currentChat.otherUser.employeeName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-white font-medium">
                          {currentChat.otherUser.employeeName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    );
                  })()}
                  <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                    isUserOnline(currentChat.otherUser.employeeSerialNumber) ? 'bg-green-400' : 'bg-gray-400'
                  }`} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">{currentChat.otherUser.employeeName}</h2>
                  <p className="text-sm text-gray-500">
                    {currentChat.otherUser.designation} • {isUserOnline(currentChat.otherUser.employeeSerialNumber) ? 'Online' : 'Offline'}
                    {(currentChat.fallback || currentChat.mock) && <span className="text-orange-600"> • Demo Mode</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Start your conversation with {currentChat.otherUser.employeeName}</p>
                  <p className="text-sm text-gray-400 mt-1">Say hello! 👋</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.senderSerialNumber === currentUserSerial;
                  const showDate = index === 0 || 
                    formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);
                  
                  return (
                    <div key={index}>
                      {showDate && (
                        <div className="text-center text-sm text-gray-500 my-4">
                          {formatDate(message.timestamp)}
                        </div>
                      )}
                      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-lg p-3 ${
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
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex space-x-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Message ${currentChat.otherUser.employeeName}...`}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!connected}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || !connected}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </div>
              {connectionStatus !== 'connected' && (
                <div className={`text-sm mt-2 ${
                  connectionStatus === 'reconnecting' ? 'text-orange-500' : 
                  connectionStatus === 'connecting' ? 'text-blue-500' : 'text-red-500'
                }`}>
                  {connectionStatus === 'connecting' && 'Connecting...'}
                  {connectionStatus === 'reconnecting' && 'Disconnected - Reconnecting...'}
                  {connectionStatus === 'disconnected' && 'Disconnected'}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle size={64} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">Welcome to Team Chat</h3>
              <p className="text-gray-500">Select a user from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage; 