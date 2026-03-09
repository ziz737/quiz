const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let rooms = {}; // لتخزين بيانات الغرف والأسئلة واللاعبين

io.on('connection', (socket) => {
    // إنشاء غرفة (المضيف)
    socket.on('createRoom', () => {
        const roomId = Math.floor(100 + Math.random() * 900).toString(); // كود من 3 أرقام
        rooms[roomId] = { host: socket.id, players: [], currentQuestion: null, locked: false };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    // دخول لاعب (الضيف)
    socket.on('joinRoom', ({ roomId, playerName }) => {
        if (rooms[roomId]) {
            const player = { id: socket.id, name: playerName, score: 0 };
            rooms[roomId].players.push(player);
            socket.join(roomId);
            io.to(roomId).emit('updatePlayerList', rooms[roomId].players);
            socket.emit('joinSuccess', roomId);
        } else {
            socket.emit('error', 'الغرفة غير موجودة!');
        }
    });

    // إرسال سؤال (المضيف)
    socket.on('sendQuestion', ({ roomId, question }) => {
        rooms[roomId].currentQuestion = question;
        rooms[roomId].locked = false; // فتح استقبال الإجابات
        io.to(roomId).emit('newQuestion', question);
    });

    // استقبال إجابة (أسرع واحد)
    socket.on('submitAnswer', ({ roomId, answerIndex }) => {
        let room = rooms[roomId];
        if (room && !room.locked) {
            if (answerIndex === room.currentQuestion.correct) {
                room.locked = true; // قفل السؤال بعد أول إجابة صحيحة
                let player = room.players.find(p => p.id === socket.id);
                player.score += 1;
                io.to(roomId).emit('winnerFound', { name: player.name, score: player.score });
                io.to(roomId).emit('updatePlayerList', room.players);
            }
        }
    });
});

server.listen(3000, () => console.log('Server running on port 3000'));