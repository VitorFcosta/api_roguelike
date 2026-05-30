const { z } = require('zod');

const createCardSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  type: z.enum(['attack', 'block', 'heal']),
  cost: z.number().int().min(0),
  value: z.number().int().min(1),
  rarity: z.enum(['basic', 'common', 'rare']),
  isStarter: z.boolean().default(false)
});

const updateCardSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  type: z.enum(['attack', 'block', 'heal']).optional(),
  cost: z.number().int().min(0).optional(),
  value: z.number().int().min(1).optional(),
  rarity: z.enum(['basic', 'common', 'rare']).optional(),
  isStarter: z.boolean().optional()
});

module.exports = { createCardSchema, updateCardSchema };
