import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

class ChatService {
    constructor() {
        this.stompClient = null;
        this.currentUserSerial = null;
        this.sessionId = null;
        this.messageHandlers = new Map();
        this.onlineUserHandlers = [];
        this.notificationHandlers = [];
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectInterval = null;
        this.connectionStateCallbacks = [];
    }

    connect(userSerial) {
        console.log(`🔄 ChatService.connect called for user: ${userSerial}`);
        console.log(`🔍 Current state - isConnecting: ${this.isConnecting}, connected: ${this.stompClient?.connected}`);
        
        // Prevent multiple simultaneous connection attempts
        if (this.isConnecting) {
            console.log('⚠️ Connection already in progress, skipping...');
            return Promise.resolve();
        }

        // If already connected, just return
        if (this.stompClient && this.stompClient.connected) {
            console.log('✅ Already connected to chat server, skipping...');
            return Promise.resolve();
        }

        this.currentUserSerial = userSerial;
        this.sessionId = this.generateSessionId();
        this.isConnecting = true;
        
        return new Promise((resolve, reject) => {
            try {
                // Clear any existing reconnect interval
                if (this.reconnectInterval) {
                    clearInterval(this.reconnectInterval);
                    this.reconnectInterval = null;
                }

                const socket = new SockJS('http://localhost:8080/ws-chat');
                this.stompClient = Stomp.over(socket);
                
                // Disable debug logging in production
                this.stompClient.debug = (str) => {
                    console.log('STOMP: ' + str);
                };
                
                // Set heartbeat for better connection stability
                this.stompClient.heartbeat.outgoing = 20000;
                this.stompClient.heartbeat.incoming = 20000;
                
                // Auto-reconnect configuration
                this.stompClient.reconnectDelay = 0; // We'll handle reconnection manually
                
                this.stompClient.connect({}, 
                    (frame) => {
                        console.log('✅ Connected to chat server');
                        this.isConnecting = false;
                        this.reconnectAttempts = 0;
                        this.subscribeToChannels();
                        this.markUserOnline();
                        this.notifyConnectionState(true);
                        resolve(frame);
                    },
                    (error) => {
                        console.error('❌ Chat connection error:', error);
                        this.isConnecting = false;
                        this.notifyConnectionState(false);
                        this.handleConnectionError();
                        reject(new Error('Failed to connect to chat server. Please check if the backend is running.'));
                    }
                );

                // Handle connection close
                socket.onclose = () => {
                    console.log('🔌 WebSocket connection closed');
                    this.isConnecting = false;
                    this.notifyConnectionState(false);
                    this.handleConnectionError();
                };

            } catch (error) {
                console.error('Error initializing chat connection:', error);
                this.isConnecting = false;
                this.notifyConnectionState(false);
                reject(new Error('Failed to initialize chat connection: ' + error.message));
            }
        });
    }

    subscribeToChannels() {
        // Subscribe to personal notifications
        this.stompClient.subscribe(`/user/${this.currentUserSerial}/queue/notifications`, (message) => {
            const notification = JSON.parse(message.body);
            this.handleNewMessageNotification(notification);
        });

        // Subscribe to online users updates
        this.stompClient.subscribe('/topic/users/online', (message) => {
            const userData = JSON.parse(message.body);
            this.handleOnlineUserUpdate(userData);
        });
    }

    subscribeToChatRoom(roomId, handler) {
        if (this.stompClient && this.stompClient.connected) {
            const subscription = this.stompClient.subscribe(`/topic/chat/${roomId}`, (message) => {
                const chatMessage = JSON.parse(message.body);
                handler(chatMessage);
            });
            
            this.messageHandlers.set(roomId, subscription);
            return subscription;
        }
        return null;
    }

    unsubscribeFromChatRoom(roomId) {
        const subscription = this.messageHandlers.get(roomId);
        if (subscription) {
            subscription.unsubscribe();
            this.messageHandlers.delete(roomId);
        }
    }

    sendMessage(receiverSerial, content) {
        if (this.stompClient && this.stompClient.connected) {
            const chatMessage = {
                senderSerialNumber: this.currentUserSerial,
                receiverSerialNumber: receiverSerial,
                content: content,
                messageType: 'CHAT'
            };
            
            this.stompClient.send('/app/chat.sendMessage', {}, JSON.stringify(chatMessage));
            return true;
        }
        return false;
    }

    markUserOnline() {
        if (this.stompClient && this.stompClient.connected) {
            const payload = {
                userSerial: this.currentUserSerial,
                sessionId: this.sessionId
            };
            
            this.stompClient.send('/app/chat.userOnline', {}, JSON.stringify(payload));
        }
    }

    markUserOffline() {
        if (this.stompClient && this.stompClient.connected) {
            const payload = {
                userSerial: this.currentUserSerial,
                sessionId: this.sessionId
            };
            
            this.stompClient.send('/app/chat.userOffline', {}, JSON.stringify(payload));
        }
    }

    handleConnectionError() {
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.currentUserSerial) {
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30 seconds
            this.reconnectAttempts++;
            
            console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay/1000} seconds...`);
            
            // Notify UI about reconnecting state
            this.notifyConnectionState('reconnecting');
            
            this.reconnectInterval = setTimeout(() => {
                this.connect(this.currentUserSerial).catch(error => {
                    console.error('Reconnection attempt failed:', error);
                });
            }, delay);
        } else {
            console.error('❌ Max reconnection attempts reached or no user serial');
            this.notifyConnectionState(false);
        }
    }

    notifyConnectionState(isConnected) {
        console.log(`📢 ChatService: Notifying ${this.connectionStateCallbacks.length} listeners about connection state: ${isConnected}`);
        this.connectionStateCallbacks.forEach((callback, index) => {
            try {
                console.log(`📞 Calling listener ${index + 1}`);
                callback(isConnected);
            } catch (error) {
                console.error(`❌ Error in connection state callback ${index + 1}:`, error);
            }
        });
    }

    addConnectionStateListener(callback) {
        this.connectionStateCallbacks.push(callback);
    }

    removeConnectionStateListener(callback) {
        const index = this.connectionStateCallbacks.indexOf(callback);
        if (index > -1) {
            this.connectionStateCallbacks.splice(index, 1);
        }
    }

    isConnected() {
        return this.stompClient && this.stompClient.connected;
    }

    disconnect() {
        // Clear reconnect interval
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
        
        // Reset reconnection attempts
        this.reconnectAttempts = 0;
        
        if (this.stompClient && this.stompClient.connected) {
            this.markUserOffline();
            this.stompClient.disconnect();
        }
        
        this.notifyConnectionState(false);
        console.log('🔌 Disconnected from chat server');
    }

    handleNewMessageNotification(notification) {
        this.notificationHandlers.forEach(handler => handler(notification));
    }

    handleOnlineUserUpdate(userData) {
        this.onlineUserHandlers.forEach(handler => handler(userData));
    }

    addNotificationHandler(handler) {
        this.notificationHandlers.push(handler);
    }

    addOnlineUserHandler(handler) {
        this.onlineUserHandlers.push(handler);
    }

    removeNotificationHandler(handler) {
        const index = this.notificationHandlers.indexOf(handler);
        if (index > -1) {
            this.notificationHandlers.splice(index, 1);
        }
    }

    removeOnlineUserHandler(handler) {
        const index = this.onlineUserHandlers.indexOf(handler);
        if (index > -1) {
            this.onlineUserHandlers.splice(index, 1);
        }
    }

    generateSessionId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    // Test endpoints for debugging
    async testChatStatus() {
        try {
            const response = await fetch('http://localhost:8080/api/chat/test/status');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error testing chat status:', error);
            throw error;
        }
    }

    async testCreateChatRoom(user1, user2) {
        try {
            const params = new URLSearchParams();
            params.append('user1', user1);
            params.append('user2', user2);

            const response = await fetch('http://localhost:8080/api/chat/test/create-room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error testing chat room creation:', error);
            throw error;
        }
    }

    async testSaveMessage(sender, receiver, content) {
        try {
            const params = new URLSearchParams();
            params.append('sender', sender);
            params.append('receiver', receiver);
            params.append('content', content);

            const response = await fetch('http://localhost:8080/api/chat/test/save-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error testing message save:', error);
            throw error;
        }
    }

    async testMarkAsRead(roomId, userSerial) {
        try {
            const params = new URLSearchParams();
            params.append('roomId', roomId);
            params.append('userSerial', userSerial);

            const response = await fetch('http://localhost:8080/api/chat/test/mark-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error testing mark as read:', error);
            throw error;
        }
    }

    async testMarkAsReadFallback(roomId, userSerial) {
        try {
            const params = new URLSearchParams();
            params.append('roomId', roomId);
            params.append('userSerial', userSerial);

            const response = await fetch('http://localhost:8080/api/chat/test/mark-read-fallback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error testing mark as read fallback:', error);
            throw error;
        }
    }

    // REST API methods
    async getAvailableUsers(userSerial) {
        try {
            const response = await fetch(`http://localhost:8080/api/chat/users/available?userSerial=${encodeURIComponent(userSerial)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching available users:', error);
            throw error;
        }
    }

    async getChatHistory(userSerial, otherUserSerial) {
        try {
            const response = await fetch(`http://localhost:8080/api/chat/history/${encodeURIComponent(otherUserSerial)}?userSerial=${encodeURIComponent(userSerial)}`);
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('Chat history API not available, returning empty history');
                    return [];
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return Array.isArray(result) ? result : (result.data || result.messages || []);
        } catch (error) {
            console.error('Error fetching chat history:', error);
            // Return empty array to allow chat to continue functioning
            return [];
        }
    }

    async createChatRoom(userSerial, otherUserSerial) {
        try {
            const params = new URLSearchParams();
            params.append('userSerial', userSerial);
            params.append('otherUserSerial', otherUserSerial);

            const response = await fetch('http://localhost:8080/api/chat/room/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString()
            });
            
            if (!response.ok) {
                // For now, return a mock room if the API doesn't exist
                if (response.status === 404) {
                    console.warn('Chat room API not available, using mock room');
                    return { 
                        roomId: `room_${userSerial}_${otherUserSerial}`,
                        success: true,
                        mock: true
                    };
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error creating chat room:', error);
            // Return a mock room to allow UI to continue functioning
            return { 
                roomId: `room_${userSerial}_${otherUserSerial}`,
                success: false,
                error: error.message,
                mock: true
            };
        }
    }

    async getRecentConversations(userSerial) {
        try {
            const response = await fetch(`http://localhost:8080/api/chat/conversations/recent?userSerial=${encodeURIComponent(userSerial)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching recent conversations:', error);
            throw error;
        }
    }

    async markMessagesAsRead(roomId, userSerial) {
        try {
            const params = new URLSearchParams();
            params.append('roomId', roomId);
            params.append('userSerial', userSerial);

            const response = await fetch('http://localhost:8080/api/chat/messages/markRead', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.text();
        } catch (error) {
            console.error('Error marking messages as read:', error);
            // Don't throw error - this is not critical for chat functionality
            return null;
        }
    }
}

// Create a singleton instance
const chatService = new ChatService();

export default chatService; 