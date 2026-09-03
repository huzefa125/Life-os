import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../db";
import { env } from "../../config/env";
import type { RegisterBody, LoginBody } from "../../validation/auth.validation";

const SALT_ROUNDS = 10;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export type RegisterResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: "EMAIL_TAKEN" };

export async function registerUser(input: RegisterBody): Promise<RegisterResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) return { ok: false, reason: "EMAIL_TAKEN" };

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, password: hashedPassword },
  });

  return { ok: true, user: { id: user.id, name: user.name, email: user.email } };
}

function signToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export type LoginResult =
  | { ok: true; token: string; user: AuthUser }
  | { ok: false };

export async function loginUser(input: LoginBody): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) return { ok: false };

  const passwordMatches = await bcrypt.compare(input.password, user.password);
  if (!passwordMatches) return { ok: false };

  const token = signToken(user.id);
  return { ok: true, token, user: { id: user.id, name: user.name, email: user.email } };
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email };
}
