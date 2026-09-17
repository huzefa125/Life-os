import { prisma } from "../../db";
import type { CreateNoteBody, UpdateNoteBody } from "../../validation/note.validation";
import { logActivity } from "../activity/activity.service";

const NOTE_TYPE = "note";

export async function createNote(userId: string, input: CreateNoteBody) {
  const note = await prisma.object.create({
    data: {
      userId,
      type: NOTE_TYPE,
      title: input.title,
      status: "active",
      properties: input.properties,
    },
  });

  await logActivity(userId, note.id, "created", { title: note.title });
  return note;
}

export async function getNotesByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: NOTE_TYPE, status: "active" },
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
  const updated = await prisma.object.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.properties !== undefined ? { properties: input.properties } : {}),
    },
  });

  await logActivity(userId, id, "updated");
  return updated;
}

export async function deleteNote(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: NOTE_TYPE },
  });
  if (!existing) return null;

  const trashed = await prisma.object.update({
    where: { id },
    data: {
      status: "trash",
      deletedAt: new Date(),
    },
  });

  await logActivity(userId, id, "trashed");
  return trashed;
}
