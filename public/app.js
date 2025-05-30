class FlashDropApp {
    constructor() {
        this.socket = null;
        this.roomId = null;
        this.username = null;
        this.peers = new Map(); // Store peer connections
        this.dataChannels = new Map(); // Store data channels
        this.localStream = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showScreen('landing-screen');
    }

    setupEventListeners() {
        document.getElementById('create-room-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createRoom();
        });

        document.getElementById('join-room-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.joinRoom();
        });

        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        document.getElementById('send-btn').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('copy-room-id').addEventListener('click', () => {
            this.copyRoomId();
        });

        document.getElementById('leave-chat').addEventListener('click', () => {
            this.leaveChat();
        });
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    createRoom() {
        const username = document.getElementById('create-username').value.trim();
        if (!username) {
            this.showNotification('Bitte gib einen Namen ein', 'error');
            return;
        }

        this.roomId = this.generateRoomId();
        this.username = username;
        this.connectToServer();
    }

    joinRoom() {
        const username = document.getElementById('join-username').value.trim();
        const roomId = document.getElementById('room-id').value.trim().toUpperCase();
        
        if (!username || !roomId) {
            this.showNotification('Bitte fülle alle Felder aus', 'error');
            return;
        }

        this.roomId = roomId;
        this.username = username;
        this.connectToServer();
    }

    connectToServer() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.socket.emit('join-room', this.roomId, this.username);
            this.showChatScreen();
        });

        this.socket.on('disconnect', () => {
            this.showNotification('Verbindung zum Server verloren', 'error');
        });

        this.socket.on('user-joined', (data) => {
            this.handleUserJoined(data);
        });

        this.socket.on('user-left', (data) => {
            this.handleUserLeft(data);
        });

        this.socket.on('room-users', (users) => {
            this.updateUserList(users);
            users.forEach(user => {
                this.createPeerConnection(user.userId, true);
            });
        });

        this.socket.on('offer', (data) => {
            this.handleOffer(data);
        });

        this.socket.on('answer', (data) => {
            this.handleAnswer(data);
        });

        this.socket.on('ice-candidate', (data) => {
            this.handleIceCandidate(data);
        });

        this.socket.on('chat-message', (data) => {
            this.displayMessage(data.username, data.message, false);
        });
    }

    showChatScreen() {
        this.showScreen('chat-screen');
        document.getElementById('current-room-id').textContent = this.roomId;
        this.showNotification(`Chat-Raum ${this.roomId} erstellt!`);
    }

    createPeerConnection(userId, isInitiator = false) {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        const peerConnection = new RTCPeerConnection(configuration);
        this.peers.set(userId, peerConnection);

        if (isInitiator) {
            const dataChannel = peerConnection.createDataChannel('messages', {
                ordered: true
            });
            this.setupDataChannel(dataChannel, userId);
        }

        peerConnection.ondatachannel = (event) => {
            this.setupDataChannel(event.channel, userId);
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', {
                    target: userId,
                    candidate: event.candidate
                });
            }
        };

        peerConnection.onconnectionstatechange = () => {
            console.log(`Connection state with ${userId}:`, peerConnection.connectionState);
        };

        if (isInitiator) {
            this.createOffer(userId);
        }
    }

    setupDataChannel(dataChannel, userId) {
        this.dataChannels.set(userId, dataChannel);

        dataChannel.onopen = () => {
            console.log(`Data channel opened with ${userId}`);
        };

        dataChannel.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.displayMessage(data.username, data.message, false);
        };

        dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
        };
    }

    async createOffer(userId) {
        try {
            const peerConnection = this.peers.get(userId);
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            this.socket.emit('offer', {
                target: userId,
                offer: offer
            });
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    }

    async handleOffer(data) {
        try {
            const peerConnection = this.peers.get(data.sender) || this.createPeerConnection(data.sender, false);
            await peerConnection.setRemoteDescription(data.offer);

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            this.socket.emit('answer', {
                target: data.sender,
                answer: answer
            });
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }

    async handleAnswer(data) {
        try {
            const peerConnection = this.peers.get(data.sender);
            if (peerConnection) {
                await peerConnection.setRemoteDescription(data.answer);
            }
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    async handleIceCandidate(data) {
        try {
            const peerConnection = this.peers.get(data.sender);
            if (peerConnection) {
                await peerConnection.addIceCandidate(data.candidate);
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }

    handleUserJoined(data) {
        this.addUserToList(data);
        this.displaySystemMessage(`${data.username} ist dem Chat beigetreten`);
        
        this.createPeerConnection(data.userId, true);
    }

    handleUserLeft(data) {
        this.removeUserFromList(data.userId);
        this.displaySystemMessage(`${data.username} hat den Chat verlassen`);
        
        const peerConnection = this.peers.get(data.userId);
        if (peerConnection) {
            peerConnection.close();
            this.peers.delete(data.userId);
        }
        
        const dataChannel = this.dataChannels.get(data.userId);
        if (dataChannel) {
            dataChannel.close();
            this.dataChannels.delete(data.userId);
        }
    }

    updateUserList(users) {
        const userList = document.getElementById('user-list');
        const userCount = document.getElementById('user-count');
        
        userList.innerHTML = '';
        
        this.addUserToList({ userId: 'me', username: this.username + ' (Du)' });
        
        users.forEach(user => {
            this.addUserToList(user);
        });
        
        userCount.textContent = users.length + 1;
    }

    addUserToList(user) {
        const userList = document.getElementById('user-list');
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.id = `user-${user.userId}`;
        userElement.innerHTML = `
            <div class="status"></div>
            <span>${user.username}</span>
        `;
        userList.appendChild(userElement);
        
        const userCount = document.getElementById('user-count');
        userCount.textContent = userList.children.length;
    }

    removeUserFromList(userId) {
        const userElement = document.getElementById(`user-${userId}`);
        if (userElement) {
            userElement.remove();
        }
        
        const userList = document.getElementById('user-list');
        const userCount = document.getElementById('user-count');
        userCount.textContent = userList.children.length;
    }

    sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();
        
        if (!message) return;

        this.displayMessage(this.username, message, true);

        const messageData = {
            username: this.username,
            message: message,
            timestamp: new Date().toISOString()
        };

        let sentViaP2P = false;
        this.dataChannels.forEach((dataChannel) => {
            if (dataChannel.readyState === 'open') {
                dataChannel.send(JSON.stringify(messageData));
                sentViaP2P = true;
            }
        });

        if (!sentViaP2P && this.socket) {
            this.socket.emit('chat-message', { message: message });
        }

        messageInput.value = '';
    }

    displayMessage(username, message, isOwn = false) {
        const messagesContainer = document.getElementById('messages-container');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isOwn ? 'own' : ''}`;
        
        const time = new Date().toLocaleTimeString('de-DE', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageElement.innerHTML = `
            <div class="message-header">
                ${isOwn ? 'Du' : username} • ${time}
            </div>
            <div class="message-content">
                ${this.escapeHtml(message)}
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    displaySystemMessage(message) {
        const messagesContainer = document.getElementById('messages-container');
        const messageElement = document.createElement('div');
        messageElement.className = 'system-message';
        messageElement.textContent = message;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    copyRoomId() {
        navigator.clipboard.writeText(this.roomId).then(() => {
            this.showNotification('Raum-ID in die Zwischenablage kopiert!');
        }).catch(() => {
            this.showNotification('Fehler beim Kopieren', 'error');
        });
    }

    leaveChat() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.peers.forEach(pc => pc.close());
        this.peers.clear();
        
        this.dataChannels.forEach(dc => dc.close());
        this.dataChannels.clear();
        
        this.roomId = null;
        this.username = null;
        
        this.showScreen('landing-screen');
        this.showNotification('Chat verlassen');
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

function showLanding() {
    app.showScreen('landing-screen');
}

function showCreateRoom() {
    app.showScreen('create-room-screen');
}

function showJoinRoom() {
    app.showScreen('join-room-screen');
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new FlashDropApp();
});
