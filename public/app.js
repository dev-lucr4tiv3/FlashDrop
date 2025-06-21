const { io } = require("socket.io-client");
class FlashDropApp {
    constructor() {
        this.socket = null;
        this.roomId = null;
        this.username = null;        this.peers = new Map();
        this.dataChannels = new Map();
        this.fileTransfers = new Map();
        this.emojis = this.initializeEmojis();
        
        this.init();
    }

    initializeEmojis() {
        return {
            smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
            gestures: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤝', '🙏'],
            objects: ['📱', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏰', '🕰️', '⏲️', '⏱️', '🧭'],
            nature: ['🌟', '⭐', '🌠', '☀️', '🌤️', '⛅', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌪️', '🌈', '🌙', '🌛', '🌜', '🌚', '🌝', '🌞', '🪐', '💫', '⚡', '🔥', '💥', '☄️'],
            food: ['🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🥗', '🍿', '🧈', '🥞', '🧇', '🥓', '🍗', '🍖', '🌭', '🥩', '🍤', '🦞', '🦀', '🦑', '🐙', '🦪', '🍣'],
            travel: ['✈️', '🛫', '🛬', '🪂', '💺', '🚁', '🚟', '🚠', '🚡', '🛰️', '🚀', '🛸', '🚉', '🚊', '🚝', '🚞', '🚋', '🚃', '🚋', '🚆', '🚄', '🚅', '🚈', '🚂', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕']        };
    }

    init() {
        this.setupEventListeners();
        this.initializeEmojiPicker();
        this.showScreen('landing-screen');
    }    setupEventListeners() {
        document.getElementById('create-room-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createRoom();
        });

        document.getElementById('join-room-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.joinRoom();
        });

        // Emoji picker events
        document.getElementById('emoji-btn').addEventListener('click', () => {
            this.toggleEmojiPicker();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.emoji-picker') && !e.target.closest('#emoji-btn')) {
                this.hideEmojiPicker();
            }
        });

        document.querySelectorAll('.emoji-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchEmojiCategory(e.target.dataset.category);
            });
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
        });        this.socket.on('room-users', (users) => {
            console.log('Received room users:', users);
            this.updateUserList(users);
            
            // Create peer connections for existing users
            users.forEach(user => {
                if (!this.peers.has(user.userId)) {
                    console.log(`Creating peer connection for existing user: ${user.username}`);
                    this.createPeerConnection(user.userId, true);
                }
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
    }    showChatScreen() {
        this.showScreen('chat-screen');
        document.getElementById('current-room-id').textContent = this.roomId;
        this.showNotification(`Chat-Raum ${this.roomId} erstellt!`);
        
        // Setup chat-specific event listeners after screen is shown
        setTimeout(() => {
            this.setupChatEventListeners();
        }, 100);
    }    setupChatEventListeners() {
        console.log('Setting up chat event listeners...');
        
        // Chat input events
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
            console.log('Message input listener attached');
        }

        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
            console.log('Send button listener attached');
        }        // File upload events
        const fileBtn = document.getElementById('file-btn');
        const fileInput = document.getElementById('file-input');
        
        console.log('File elements found:', { 
            fileBtn: !!fileBtn, 
            fileInput: !!fileInput,
            fileBtnId: fileBtn?.id,
            fileInputId: fileInput?.id 
        });
        
        if (fileBtn && fileInput) {
            // Remove any existing listeners first
            fileBtn.replaceWith(fileBtn.cloneNode(true));
            fileInput.replaceWith(fileInput.cloneNode(true));
            
            // Get fresh references
            const newFileBtn = document.getElementById('file-btn');
            const newFileInput = document.getElementById('file-input');
            
            newFileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📎 File button clicked, checking connections...');
                
                // Debug connection status
                console.log('🔍 Debug Info:');
                console.log('- Peers:', this.peers.size);
                console.log('- Data Channels:', this.dataChannels.size);
                console.log('- Active Channels:', Array.from(this.dataChannels.values()).filter(dc => dc.readyState === 'open').length);
                
                newFileInput.click();
            });

            newFileInput.addEventListener('change', (e) => {
                console.log('📁 File input changed:', e.target.files);
                if (e.target.files.length > 0) {
                    this.handleFileSelect(e);
                }
            });
            
            console.log('File upload listeners attached');
        } else {
            console.warn('File upload elements not found:', { 
                fileBtn: !!fileBtn, 
                fileInput: !!fileInput 
            });
        }

        // Room controls
        const copyBtn = document.getElementById('copy-room-id');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyRoomId();
            });
            console.log('Copy button listener attached');
        }

        const leaveBtn = document.getElementById('leave-chat');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => {
                this.leaveChat();
            });
            console.log('Leave button listener attached');
        }
        
        console.log('All chat event listeners setup complete');
    }    createPeerConnection(userId, isInitiator = false) {
        // Check if peer connection already exists
        if (this.peers.has(userId)) {
            console.log(`Peer connection already exists for ${userId}`);
            const existingPc = this.peers.get(userId);
            if (existingPc.connectionState === 'connected' && this.dataChannels.has(userId)) {
                return existingPc;
            }
            // If connection is broken, close and recreate
            if (existingPc.connectionState === 'failed' || existingPc.connectionState === 'disconnected') {
                console.log(`Closing broken connection for ${userId}`);
                existingPc.close();
                this.peers.delete(userId);
                this.dataChannels.delete(userId);
            }
        }
        
        console.log(`Creating new peer connection for ${userId}, initiator: ${isInitiator}`);
        
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };

        const peerConnection = new RTCPeerConnection(configuration);
        this.peers.set(userId, peerConnection);

        // Always create a data channel for the initiator
        if (isInitiator) {
            console.log(`Creating data channel as initiator for ${userId}`);
            // Add a small delay to ensure the peer connection is ready
            setTimeout(() => {
                const dataChannel = peerConnection.createDataChannel('fileTransfer', {
                    ordered: true
                });
                this.setupDataChannel(dataChannel, userId);
            }, 100);
        }

        // Handle incoming data channel from the other peer
        peerConnection.ondatachannel = (event) => {
            console.log(`Received data channel from ${userId}`);
            this.setupDataChannel(event.channel, userId);
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`Sending ICE candidate to ${userId}:`, event.candidate.type);
                this.socket.emit('ice-candidate', {
                    target: userId,
                    candidate: event.candidate
                });
            } else {
                console.log(`ICE gathering completed for ${userId}`);
            }
        };

        peerConnection.onconnectionstatechange = () => {
            console.log(`🔗 Connection state with ${userId}:`, peerConnection.connectionState);
            
            if (peerConnection.connectionState === 'connected') {
                console.log(`✅ P2P connection established with ${userId}`);
                this.showNotification(`P2P-Verbindung zu ${this.getUsernameById(userId)} hergestellt`);
            } else if (peerConnection.connectionState === 'failed') {
                console.log(`❌ P2P connection failed with ${userId}`);
                this.showNotification(`Verbindung zu ${this.getUsernameById(userId)} fehlgeschlagen`, 'error');
                // Attempt reconnection after failure
                setTimeout(() => {
                    console.log(`Attempting to reconnect to ${userId}`);
                    this.createPeerConnection(userId, true);
                }, 2000);
            } else if (peerConnection.connectionState === 'disconnected') {
                console.log(`🔌 P2P connection disconnected with ${userId}`);
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log(`🧊 ICE connection state with ${userId}:`, peerConnection.iceConnectionState);
            if (peerConnection.iceConnectionState === 'failed') {
                console.log(`ICE connection failed with ${userId}, attempting restart`);
                peerConnection.restartIce();
            }
        };

        if (isInitiator) {
            // Start the offer process with a delay to ensure everything is set up
            setTimeout(() => {
                this.createOffer(userId);
            }, 200);
        }
        
        return peerConnection;
    }setupDataChannel(dataChannel, userId) {
        console.log(`Setting up data channel for user ${userId}, current state: ${dataChannel.readyState}`);
        this.dataChannels.set(userId, dataChannel);

        dataChannel.onopen = () => {
            console.log(`✅ Data channel opened with ${userId}! Ready for file transfer.`);
            console.log(`Total active data channels: ${Array.from(this.dataChannels.values()).filter(dc => dc.readyState === 'open').length}`);
            this.showNotification(`P2P-Verbindung zu ${this.getUsernameById(userId)} hergestellt`);
        };

        dataChannel.onclose = () => {
            console.log(`❌ Data channel closed with ${userId}`);
            this.dataChannels.delete(userId);
        };

        dataChannel.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'file-start') {
                this.handleFileStart(data, userId);
            } else if (data.type === 'file-chunk') {
                this.handleFileChunk(data, userId);
            } else if (data.type === 'file-end') {
                this.handleFileEnd(data, userId);
            } else {
                this.displayMessage(data.username, data.message, false);
            }
        };

        dataChannel.onerror = (error) => {
            console.error(`Data channel error with ${userId}:`, error);
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
    }    async handleOffer(data) {
        try {
            let peerConnection = this.peers.get(data.sender);
            
            // Create new peer connection if it doesn't exist
            if (!peerConnection) {
                peerConnection = this.createPeerConnection(data.sender, false);
            }
            
            // Check if we can set remote description
            if (peerConnection.signalingState !== 'stable' && peerConnection.signalingState !== 'have-local-offer') {
                console.warn(`Invalid signaling state for offer: ${peerConnection.signalingState}`);
                return;
            }
            
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
    }    async handleAnswer(data) {
        try {
            const peerConnection = this.peers.get(data.sender);
            if (peerConnection) {
                // Check if we can set remote description
                if (peerConnection.signalingState !== 'have-local-offer') {
                    console.warn(`Invalid signaling state for answer: ${peerConnection.signalingState}`);
                    return;
                }
                
                await peerConnection.setRemoteDescription(data.answer);
            }
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }    async handleIceCandidate(data) {
        try {
            const peerConnection = this.peers.get(data.sender);
            if (peerConnection) {
                // Queue ICE candidates if remote description is not set yet
                if (peerConnection.remoteDescription) {
                    await peerConnection.addIceCandidate(data.candidate);
                    console.log(`ICE candidate added for ${data.sender}`);
                } else {
                    console.log(`Queuing ICE candidate for ${data.sender} (no remote description yet)`);
                    // We could queue candidates here if needed, but the browser handles this automatically
                }
            } else {
                console.warn(`No peer connection found for ICE candidate from ${data.sender}`);
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }    handleUserJoined(data) {
        console.log(`👤 User joined: ${data.username} (${data.userId})`);
        this.addUserToList(data);
        this.displaySystemMessage(`${data.username} ist dem Chat beigetreten`);
        
        // Wait a moment for the UI to update, then create peer connection
        setTimeout(() => {
            if (!this.peers.has(data.userId)) {
                console.log(`Creating peer connection for new user: ${data.username}`);
                this.createPeerConnection(data.userId, true);
            } else {
                console.log(`Peer connection already exists for ${data.username}`);
            }
        }, 500);
    }handleUserLeft(data) {
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
    }    leaveChat() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.peers.forEach(pc => pc.close());
        this.peers.clear();
        
        this.dataChannels.forEach(dc => dc.close());
        this.dataChannels.clear();
        
        this.fileTransfers.forEach(transfer => {
            if (transfer.reader) {
                transfer.reader.abort();
            }
        });
        this.fileTransfers.clear();
        
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
    }    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        console.log('📁 Files selected:', files);
        
        if (files.length === 0) return;

        // Detailed debugging information
        console.log('🔍 Connection Debug Information:');
        console.log('- Total peers:', this.peers.size);
        console.log('- Total data channels:', this.dataChannels.size);
        
        // Check each peer connection state
        this.peers.forEach((pc, userId) => {
            console.log(`Peer ${userId}: connection=${pc.connectionState}, signaling=${pc.signalingState}, ice=${pc.iceConnectionState}`);
        });
        
        // Check each data channel state
        this.dataChannels.forEach((dc, userId) => {
            console.log(`DataChannel ${userId}: state=${dc.readyState}`);
        });

        // Check if we have any active data channels
        const activeChannels = Array.from(this.dataChannels.values()).filter(
            channel => channel.readyState === 'open'
        );
        
        console.log(`📡 Active data channels: ${activeChannels.length}/${this.dataChannels.size}`);
        
        if (activeChannels.length === 0) {
            console.log('❌ No active P2P connections found');
            
            // Check if we have users in the room but no connections
            const userCount = document.querySelectorAll('.user-item:not([id="user-me"])').length;
            console.log(`👥 Users in room (excluding self): ${userCount}`);
            
            if (userCount > 0) {
                console.log('🔄 Users present but no P2P connections - attempting to re-establish...');
                this.reestablishConnections();
                this.showNotification('Versuche P2P-Verbindungen neu aufzubauen...', 'warning');
                
                // Retry after a short delay
                setTimeout(() => {
                    const newActiveChannels = Array.from(this.dataChannels.values()).filter(
                        channel => channel.readyState === 'open'
                    );
                    if (newActiveChannels.length === 0) {
                        this.showNotification('Keine P2P-Verbindung möglich. Versuche es später erneut.', 'error');
                    }
                }, 3000);
            } else {
                this.showNotification('Keine anderen Benutzer im Chat. Warte auf weitere Teilnehmer.', 'warning');
            }
            return;
        }

        console.log(`✅ Found ${activeChannels.length} active P2P connection(s), proceeding with file transfer`);
        
        files.forEach(file => {
            console.log(`📤 Sending file: ${file.name} (${file.size} bytes)`);
            this.sendFile(file);
        });

        event.target.value = '';
    }

    async sendFile(file) {
        if (file.size > 50 * 1024 * 1024) {
            this.showNotification('Datei zu groß (max. 50MB)', 'error');
            return;
        }

        const fileId = this.generateFileId();
        const fileMetadata = {
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        };

        this.displayFileMessage(this.username, fileMetadata, true, 'sending');

        const chunkSize = 16384;
        const totalChunks = Math.ceil(file.size / chunkSize);
        let chunkIndex = 0;

        for (const [userId, dataChannel] of this.dataChannels) {
            if (dataChannel.readyState === 'open') {
                dataChannel.send(JSON.stringify({
                    type: 'file-start',
                    metadata: fileMetadata,
                    totalChunks: totalChunks
                }));

                const reader = new FileReader();
                reader.onload = () => {
                    const chunk = new Uint8Array(reader.result);
                    dataChannel.send(JSON.stringify({
                        type: 'file-chunk',
                        fileId: fileId,
                        chunkIndex: chunkIndex,
                        chunk: Array.from(chunk)
                    }));

                    chunkIndex++;
                    if (chunkIndex < totalChunks) {
                        const start = chunkIndex * chunkSize;
                        const end = Math.min(start + chunkSize, file.size);
                        reader.readAsArrayBuffer(file.slice(start, end));                    } else {
                        dataChannel.send(JSON.stringify({
                            type: 'file-end',
                            fileId: fileId
                        }));
                        this.updateFileProgress(fileId, 100);
                          // Remove progress bar for sender after completion
                        setTimeout(() => {
                            const fileElement = document.getElementById(`file-${fileId}`);
                            if (fileElement) {
                                // Remove progress container
                                const progressContainer = fileElement.querySelector('.file-progress');
                                if (progressContainer) {
                                    progressContainer.remove();
                                }
                                
                                // Add sent icon to file-info
                                const fileInfo = fileElement.querySelector('.file-info');
                                if (fileInfo && !fileInfo.querySelector('.sent-icon')) {
                                    const sentIcon = document.createElement('i');
                                    sentIcon.className = 'fas fa-check-circle sent-icon';
                                    sentIcon.title = 'Gesendet';
                                    fileInfo.appendChild(sentIcon);
                                }
                            }
                        }, 500);
                    }
                };

                const start = chunkIndex * chunkSize;
                const end = Math.min(start + chunkSize, file.size);
                reader.readAsArrayBuffer(file.slice(start, end));
            }
        }
    }

    generateFileId() {
        return Math.random().toString(36).substring(2, 15);
    }

    displayFileMessage(username, fileMetadata, isOwn = false, status = 'completed') {
        const messagesContainer = document.getElementById('messages-container');
        const messageElement = document.createElement('div');
        messageElement.className = `message file-message ${isOwn ? 'own' : ''}`;
        messageElement.id = `file-${fileMetadata.id}`;
        
        const time = new Date().toLocaleTimeString('de-DE', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const fileIcon = this.getFileIcon(fileMetadata.type);
        const fileSize = this.formatFileSize(fileMetadata.size);
          let downloadIcon = '';
        let statusHtml = '';
        
        if (status === 'sending') {
            statusHtml = '<div class="file-progress"><div class="progress-bar" id="progress-' + fileMetadata.id + '"></div></div>';
        } else if (status === 'receiving') {
            statusHtml = '<div class="file-progress"><div class="progress-bar receiving" id="progress-' + fileMetadata.id + '"></div></div>';
        } else {
            downloadIcon = '<i class="fas fa-download download-icon" onclick="app.downloadFile(\'' + fileMetadata.id + '\')"></i>';
        }
        
        messageElement.innerHTML = `
            <div class="message-header">
                ${isOwn ? 'Du' : username} • ${time}
            </div>
            <div class="file-content">
                <div class="file-info">
                    <i class="fas ${fileIcon}"></i>
                    <div class="file-details">
                        <div class="file-name">${this.escapeHtml(fileMetadata.name)}</div>
                        <div class="file-size">${fileSize}</div>
                    </div>
                    ${downloadIcon}
                </div>
                ${statusHtml}
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return 'fa-image';
        if (mimeType.startsWith('video/')) return 'fa-video';
        if (mimeType.startsWith('audio/')) return 'fa-music';
        if (mimeType.includes('pdf')) return 'fa-file-pdf';
        if (mimeType.includes('word')) return 'fa-file-word';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel';
        if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-file-powerpoint';
        if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'fa-file-archive';
        return 'fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateFileProgress(fileId, progress) {
        const progressBar = document.getElementById(`progress-${fileId}`);
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }    downloadFile(fileId) {
        const fileData = this.fileTransfers.get(fileId);
        if (fileData) {
            // Combine all chunks into a single blob
            const combinedData = new Uint8Array(fileData.metadata.size);
            let offset = 0;
            
            fileData.chunks.forEach(chunk => {
                if (chunk) {
                    combinedData.set(chunk, offset);
                    offset += chunk.length;
                }
            });
            
            const blob = new Blob([combinedData], { type: fileData.metadata.type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileData.metadata.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification(`Datei "${fileData.metadata.name}" heruntergeladen`);
        }
    }

    initializeEmojiPicker() {
        this.switchEmojiCategory('smileys');
    }

    toggleEmojiPicker() {
        const emojiPicker = document.getElementById('emoji-picker');
        emojiPicker.classList.toggle('hidden');
    }

    hideEmojiPicker() {
        const emojiPicker = document.getElementById('emoji-picker');
        emojiPicker.classList.add('hidden');
    }    switchEmojiCategory(category) {
        document.querySelectorAll('.emoji-category').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        const emojiGrid = document.getElementById('emoji-grid');
        emojiGrid.innerHTML = '';

        this.emojis[category].forEach(emoji => {
            const emojiButton = document.createElement('button');
            emojiButton.className = 'emoji-item';
            emojiButton.textContent = emoji;
            emojiButton.addEventListener('click', () => {
                this.insertEmoji(emoji);
            });
            emojiGrid.appendChild(emojiButton);
        });
    }

    insertEmoji(emoji) {
        const messageInput = document.getElementById('message-input');
        const currentValue = messageInput.value;
        const cursorPosition = messageInput.selectionStart;
        
        const newValue = currentValue.slice(0, cursorPosition) + emoji + currentValue.slice(cursorPosition);
        messageInput.value = newValue;
        
        messageInput.setSelectionRange(cursorPosition + emoji.length, cursorPosition + emoji.length);
        messageInput.focus();
        
        this.hideEmojiPicker();
    }

    handleFileStart(data, userId) {
        const { metadata, totalChunks } = data;
        
        this.fileTransfers.set(metadata.id, {
            metadata: metadata,
            chunks: [],
            receivedChunks: 0,
            totalChunks: totalChunks,
            senderId: userId
        });

        const user = this.getUsernameById(userId);
        this.displayFileMessage(user, metadata, false, 'receiving');
        this.updateNoFileTransfersMessage();
    }

    handleFileChunk(data, userId) {
        const { fileId, chunkIndex, chunk } = data;
        const transfer = this.fileTransfers.get(fileId);
        
        if (transfer) {
            transfer.chunks[chunkIndex] = new Uint8Array(chunk);
            transfer.receivedChunks++;
            
            const progress = (transfer.receivedChunks / transfer.totalChunks) * 100;
            this.updateFileProgress(fileId, progress);
        }
    }    handleFileEnd(data, userId) {
        const { fileId } = data;
        const transfer = this.fileTransfers.get(fileId);
        
        if (transfer) {
            const fileElement = document.getElementById(`file-${fileId}`);
            if (fileElement) {
                // Remove progress container
                const progressContainer = fileElement.querySelector('.file-progress');
                if (progressContainer) {
                    progressContainer.remove();
                }
                
                // Add download icon to file-info
                const fileInfo = fileElement.querySelector('.file-info');
                if (fileInfo && !fileInfo.querySelector('.download-icon')) {
                    const downloadIcon = document.createElement('i');
                    downloadIcon.className = 'fas fa-download download-icon';
                    downloadIcon.onclick = () => this.downloadFile(fileId);
                    fileInfo.appendChild(downloadIcon);
                }
            }
            this.showNotification(`Datei "${transfer.metadata.name}" empfangen`);
        }
    }

    getUsernameById(userId) {
        const userElement = document.getElementById(`user-${userId}`);
        if (userElement) {
            const username = userElement.querySelector('span').textContent;
            return username;
        }
        return 'Unbekannter Benutzer';
    }

    updateNoFileTransfersMessage() {
        const noTransfers = document.getElementById('no-file-transfers');
        const hasActiveTransfers = this.fileTransfers.size > 0;
        
        if (noTransfers) {
            noTransfers.style.display = hasActiveTransfers ? 'none' : 'block';
        }
    }

    reestablishConnections() {
        console.log('🔄 Attempting to re-establish P2P connections...');
        
        // Close existing broken connections
        this.peers.forEach((pc, userId) => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                console.log(`Closing broken connection to ${userId}`);
                pc.close();
                this.peers.delete(userId);
                this.dataChannels.delete(userId);
            }
        });
        
        // Try to create new connections to all users in the room
        const userElements = document.querySelectorAll('.user-item:not([id="user-me"])');
        userElements.forEach(element => {
            const userId = element.id.replace('user-', '');
            if (!this.peers.has(userId)) {
                console.log(`Re-creating connection to ${userId}`);
                this.createPeerConnection(userId, true);
            }
        });
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
