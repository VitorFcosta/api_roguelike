const { z } = require('zod');

const createEnemySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  maxHp: z.number().int().min(1),
  attack: z.number().int().min(0),
  defense: z.number().int().min(0).default(0),
  difficulty: z.number().int().min(1)
});

const updateEnemySchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  maxHp: z.number().int().min(1).optional(),
  attack: z.number().int().min(0).optional(),
  defense: z.number().int().min(0).optional(),
  difficulty: z.number().int().min(1).optional()
});

module.exports = { createEnemySchema, updateEnemySchema };
