import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(128),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;