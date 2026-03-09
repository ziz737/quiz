const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// توجيه السيرفر لقراءة ملفات الـ HTML و CSS
app.use(express.static(__dirname));

// التأكد من فتح ملف index.html عند الدخول للرابط الرئيسي
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// بنك الأسئلة (الـ 50 سؤالاً)
const questionsBank = [
    { q: "ما هو الكوكب الذي يلقب بالكوكب الأحمر؟", options: ["الأرض", "المريخ", "زحل", "المشتري"], correct: 1 },
    { q: "كم عدد ألوان قوس قزح؟", options: ["5", "8", "7", "6"], correct: 2 },
    // ... بقية الأسئلة التي زودتك بها سابقاً
];

let rooms = {};

io.on('connection', (socket) => {
    socket.on('createRoom', () => {
        const roomId = Math.floor(100 + Math.random() * 900).toString();
        rooms[roomId] = { host: socket.id, players: [], currentQIndex: 0, locked: false };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', ({ roomId, playerName }) => {
        if (rooms[roomId]) {
            const player = { id: socket.id, name: playerName, score: 0 };
            rooms[roomId].players.push(player);
            socket.join(roomId);
            io.to(roomId).emit('updatePlayers', rooms[roomId].players);
            socket.emit('joinSuccess');
        } else {
            socket.emit('errorMsg', 'الكود غير صحيح!');
        }
    });

    socket.on('sendQuestion', (roomId) => {
        let room = rooms[roomId];
        if (room && room.currentQIndex < questionsBank.length) {
            room.locked = false;
            const question = questionsBank[room.currentQIndex];
            io.to(roomId).emit('newQuestion', { ...question, index: room.currentQIndex });
            room.currentQIndex++;
        }
    });

    socket.on('submitAnswer', ({ roomId, answerIndex }) => {
        let room = rooms[roomId];
        if (room && !room.locked) {
            const correctIndex = questionsBank[room.currentQIndex - 1].correct;
            if (answerIndex === correctIndex) {
                room.locked = true;
                let player = room.players.find(p => p.id === socket.id);
                player.score += 1;
                io.to(roomId).emit('winnerFound', { name: player.name });
                io.to(roomId).emit('updatePlayers', room.players);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
