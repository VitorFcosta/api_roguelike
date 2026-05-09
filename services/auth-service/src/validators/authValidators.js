const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(1)
});

module.exports = { registerSchema, loginSchema };
