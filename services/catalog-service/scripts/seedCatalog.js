const { loadConfig } = require('../src/config/env');
const { connectToDatabase, disconnectFromDatabase } = require('../src/config/database');
const { Card } = require('../src/models/Card');
const { Enemy } = require('../src/models/Enemy');
const { Boss } = require('../src/models/Boss');

const initialCards = [
  // Básicas (starter)
  {
    name: 'Golpe',
    description: 'Causa 6 de dano ao inimigo.',
    type: 'attack',
    cost: 1,
    value: 6,
    rarity: 'basic',
    isStarter: true
  },
  {
    name: 'Defesa',
    description: 'Ganha 5 de bloqueio.',
    type: 'block',
    cost: 1,
    value: 5,
    rarity: 'basic',
    isStarter: true
  },
  {
    name: 'Cura Menor',
    description: 'Recupera 4 pontos de vida.',
    type: 'heal',
    cost: 1,
    value: 4,
    rarity: 'basic',
    isStarter: true
  },
  // Comuns
  {
    name: 'Golpe Duplo',
    description: 'Causa 4 de dano duas vezes.',
    type: 'attack',
    cost: 1,
    value: 8,
    rarity: 'common',
    isStarter: false
  },
  {
    name: 'Escudo de Ferro',
    description: 'Ganha 8 de bloqueio.',
    type: 'block',
    cost: 2,
    value: 8,
    rarity: 'common',
    isStarter: false
  },
  {
    name: 'Poção de Cura',
    description: 'Recupera 8 pontos de vida.',
    type: 'heal',
    cost: 2,
    value: 8,
    rarity: 'common',
    isStarter: false
  },
  // Raras
  {
    name: 'Tempestade de Lâminas',
    description: 'Causa 5 de dano a cada turno por 3 turnos.',
    type: 'attack',
    cost: 2,
    value: 15,
    rarity: 'rare',
    isStarter: false
  },
  {
    name: 'Fortaleza',
    description: 'Ganha 15 de bloqueio.',
    type: 'block',
    cost: 3,
    value: 15,
    rarity: 'rare',
    isStarter: false
  },
  {
    name: 'Regeneração',
    description: 'Recupera 20 pontos de vida.',
    type: 'heal',
    cost: 3,
    value: 20,
    rarity: 'rare',
    isStarter: false
  }
];

const initialEnemies = [
  {
    name: 'Goblin',
    description: 'Um goblin pequeno e ágil. Fraco mas rápido.',
    maxHp: 15,
    attack: 4,
    defense: 0,
    difficulty: 1
  },
  {
    name: 'Esqueleto',
    description: 'Um guerreiro morto-vivo que não sente dor.',
    maxHp: 20,
    attack: 6,
    defense: 2,
    difficulty: 2
  },
  {
    name: 'Orc',
    description: 'Um orc brutal com muita força bruta.',
    maxHp: 35,
    attack: 10,
    defense: 3,
    difficulty: 3
  },
  {
    name: 'Troll',
    description: 'Um troll com regeneração passiva e força descomunal.',
    maxHp: 50,
    attack: 12,
    defense: 5,
    difficulty: 4
  }
];
// boss(es)
const initialBosses = [
  {
    name: 'Leshen',
    description: 'Um antigo espírito da floresta que guarda o final da masmorra. Possui ataques devastadores e uma habilidade especial que drena a vida do oponente.',
    maxHp: 150,
    attack: 20,
    specialAttack: 35,
    difficulty: 10
  }
];

async function upsertCards() {
  for (const cardData of initialCards) {
    await Card.findOneAndUpdate(
      { name: cardData.name },
      { $setOnInsert: { ...cardData, isActive: true } },
      { upsert: true, new: true }
    );
  }

  console.log(`${initialCards.length} cartas verificadas.`);
}

async function upsertEnemies() {
  for (const enemyData of initialEnemies) {
    await Enemy.findOneAndUpdate(
      { name: enemyData.name },
      { $setOnInsert: { ...enemyData, isActive: true } },
      { upsert: true, new: true }
    );
  }

  console.log(`${initialEnemies.length} inimigos verificados.`);
}

async function upsertBosses() {
  for (const bossData of initialBosses) {
    await Boss.findOneAndUpdate(
      { name: bossData.name },
      { $setOnInsert: { ...bossData, isActive: true } },
      { upsert: true, new: true }
    );
  }

  console.log(`${initialBosses.length} boss(es) verificado(s).`);
}

async function seedCatalog() {
  const config = loadConfig();
  await connectToDatabase(config.mongoUri);

  await upsertCards();
  await upsertEnemies();
  await upsertBosses();

  console.log('Seed do catálogo concluído.');
}

seedCatalog()
  .catch((error) => {
    console.error('Falha ao executar seed do catálogo:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectFromDatabase();
  });
