require('dotenv').config();
const express = require('express');

const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const Game = require('./models/Game');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);


const connectDB = require('./config/database');

const PORT = process.env.PORT || 3000;
const path = require('path');

app.use(express.static(path.join(__dirname, "public")));

// [Optional] Handle root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});




app.get('/ping', (req, res) => {
  res.json({ message: 'Server is alive!' });
});

// Get game by ID (Postman)
app.get('/games/:id', async (req, res) => {
  try {
    const game = await Game.findOne({ gameId: req.params.id });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// WebSocket Logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

 socket.on('joinGame', async ({ gameId }) => {
  let game = await Game.findOne({ gameId });

  if (!game) {
    game = new Game({
      gameId,
      players: [socket.id],
      board: Array(9).fill(''),
      currentTurn: 'O',
    });
    await game.save();

    // Send startGame to first player immediately
    socket.emit('startGame', {
      gameId,
      symbol: 'O', // First player is 'O'
    });
  } else if (game.players.length < 2 && !game.players.includes(socket.id)) {
    game.players.push(socket.id);
    await game.save();

    // Send startGame to both players
    game.players.forEach((playerId, idx) => {
      io.to(playerId).emit('startGame', {
        gameId,
        symbol: idx === 0 ? 'O' : 'X',
      });
    });
  } else {
    socket.emit('errorMessage', 'Game is full');
  }

  socket.join(gameId);
});


  socket.on('makeMove', async ({ gameId, index }) => {
    const game = await Game.findOne({ gameId });
    if (!game) return;

    const playerIndex = game.players.indexOf(socket.id);
    if (playerIndex === -1) return;

    const playerSymbol = playerIndex === 0 ? 'O' : 'X';

    if (game.currentTurn !== playerSymbol) {
      return socket.emit('errorMessage', 'Not your turn');
    }

    if (game.board[index] !== '') {
      return socket.emit('errorMessage', 'Cell already occupied');
    }

    game.board[index] = playerSymbol;
    game.currentTurn = playerSymbol === 'O' ? 'X' : 'O';
    await game.save();

    io.to(gameId).emit('updateBoard', {
      board: game.board,
      currentTurn: game.currentTurn,
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});


connectDB().then(()=>{
    console.log("Connected to MongoDB");
    server.listen(PORT, () =>{
        console.log(`Server running on port ${PORT}`)
    })
}).catch((err)=>{
    console.log("Error connecting to MongoDB", err);
})


