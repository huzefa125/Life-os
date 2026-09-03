import { prisma } from "../../db";
import type { CreateEventBody, UpdateEventBody } from "../../validation/event.validation";

const EVENT_TYPE = "event";

export async function createEvent(userId: string, input: CreateEventBody) {
  return prisma.object.create({
    data: {
      userId,
      type: EVENT_TYPE,
      title: input.title,
      properties: input.properties,
    },
  });
}

export async function getEventsByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: EVENT_TYPE },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEventById(id: string, userId: string) {
  return prisma.object.findFirst({
    where: { id, userId, type: EVENT_TYPE },
  });
}

export async function updateEvent(id: string, userId: string, input: UpdateEventBody) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: EVENT_TYPE },
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

export async function deleteEvent(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: EVENT_TYPE },
  });
  if (!existing) return null;

  await prisma.object.delete({ where: { id } });
  return existing;
}
