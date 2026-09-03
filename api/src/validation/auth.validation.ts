import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.email("email must be valid"),
  password: z.string().min(8, "password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.email("email must be valid"),
  password: z.string().min(1, "password is required"),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
