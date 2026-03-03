const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const users = {};
const messages = {};

io.on('connection', (socket) => {
    socket.on('login', (data) => {
        const { username, profilePhoto, isAdmin } = data;
        if (users[username]) return socket.emit('loginError', 'Username taken!');
        users[username] = { id: socket.id, profilePhoto, isAdmin, online: true };
        socket.username = username;
        socket.isAdmin = isAdmin;
        socket.broadcast.emit('userJoined', users);
        socket.emit('loginSuccess', { users, profilePhoto });
    });

    socket.on('privateMessage', (data) => {
        const { from, to, message, timestamp } = data;
        if (!messages[to]) messages[to] = [];
        if (!messages[from]) messages[from] = [];
        const msgData = { from, to, message, timestamp };
        messages[to].push(msgData);
        messages[from].push(msgData);
        if (users[to]) io.to(users[to].id).emit('privateMessage', msgData);
        socket.emit('privateMessage', msgData);
    });

    socket.on('disconnect', () => {
        if (socket.username && users[socket.username]) {
            delete users[socket.username];
            io.emit('userLeft', users);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`PixelChat on port ${PORT}`));

