const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3005;

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();
const users = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId, username) => {
        socket.join(roomId);
        
        users.set(socket.id, { username, roomId });
        
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        
        rooms.get(roomId).add(socket.id);
        
        socket.to(roomId).emit('user-joined', { 
            userId: socket.id, 
            username: username 
        });
        
        const currentUsers = Array.from(rooms.get(roomId))
            .filter(id => id !== socket.id)
            .map(id => ({ 
                userId: id, 
                username: users.get(id)?.username 
            }));
        
        socket.emit('room-users', currentUsers);
        
        console.log(`${username} joined room ${roomId}`);
    });

    socket.on('offer', (data) => {
        socket.to(data.target).emit('offer', {
            offer: data.offer,
            sender: socket.id
        });
    });

    socket.on('answer', (data) => {
        socket.to(data.target).emit('answer', {
            answer: data.answer,
            sender: socket.id
        });
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.target).emit('ice-candidate', {
            candidate: data.candidate,
            sender: socket.id
        });
    });

    socket.on('chat-message', (data) => {
        const user = users.get(socket.id);
        if (user) {
            socket.to(user.roomId).emit('chat-message', {
                username: user.username,
                message: data.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            const room = rooms.get(user.roomId);
            if (room) {
                room.delete(socket.id);
                if (room.size === 0) {
                    rooms.delete(user.roomId);
                } else {
                    socket.to(user.roomId).emit('user-left', {
                        userId: socket.id,
                        username: user.username
                    });
                }
            }
            users.delete(socket.id);
            console.log(`${user.username} disconnected`);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`FlashDrop P2P Chat running on port ${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`Network access: http://192.168.178.29:${PORT}`);
    console.log(`Share this link with others in your network!`);
});
