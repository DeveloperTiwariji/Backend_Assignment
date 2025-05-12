// models/Game.js
const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  gameId: { type: String, unique: true },
  players: [String], 
  board: [String], 
  currentTurn: { type: String }, 
  createdAt: { type: Date, default: Date.now },
}, {timestamps: true});

module.exports = mongoose.model('Game', GameSchema);
