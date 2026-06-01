const mongoose = require('mongoose');

const battleSchema = new mongoose.Schema(
  {
    runId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Run',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['common', 'boss'],
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'victory', 'defeat'],
      required: true,
      default: 'active'
    },
    // Dados do inimigo (snapshot para não depender do catalog em leitura)
    enemyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    enemyName: {
      type: String,
      required: true
    },
    enemyMaxHp: {
      type: Number,
      required: true
    },
    enemyCurrentHp: {
      type: Number,
      required: true,
      min: 0
    },
    enemyAttack: {
      type: Number,
      required: true
    },
    enemyDefense: {
      type: Number,
      required: true,
      default: 0
    },
    enemySpecialAttack: {
      type: Number,
      default: 0
    },
    // Estado do jogador no momento da batalha
    playerHpAtStart: {
      type: Number,
      required: true
    },
    playerCurrentHp: {
      type: Number,
      required: true,
      min: 0
    },
    playerBlock: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    // Contador de turnos para alternar entre ataque normal e especial do boss
    turn: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    finishedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const Battle = mongoose.model('Battle', battleSchema);

module.exports = { Battle };
