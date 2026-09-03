import { prisma } from "../../db";
import type { CreateNoteBody, UpdateNoteBody } from "../../validation/note.validation";

const NOTE_TYPE = "note";

export async function createNote(userId: string, input: CreateNoteBody) {
  return prisma.object.create({
    data: {
      userId,
      type: NOTE_TYPE,
      title: input.title,
      properties: input.properties,
    },
  });
}

export async function getNotesByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: NOTE_TYPE },
    orderBy: { createdAt: "desc" },
  });
}

export async function getNoteById(id: string, userId: string) {
  return prisma.object.findFirst({
    where: { id, userId, type: NOTE_TYPE },
  });
}

export async function updateNote(id: string, userId: string, input: UpdateNoteBody) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: NOTE_TYPE },
  });
  if (!existing) return null;

  // properties, when provided, replaces the JSON blob wholesale (no deep merge)
  return prisma.object.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.properties !== undefined ? { properties: input.properties } : {}),
    },
  });
}

export async function deleteNote(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: NOTE_TYPE },
  });
  if (!existing) return null;

  await prisma.object.delete({ where: { id } });
  return existing;
}
