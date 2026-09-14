import { prisma } from "../../db";
import type { CreateEventBody, UpdateEventBody } from "../../validation/event.validation";
import { logActivity } from "../activity/activity.service";

const EVENT_TYPE = "event";

export async function createEvent(userId: string, input: CreateEventBody) {
  const event = await prisma.object.create({
    data: {
      userId,
      type: EVENT_TYPE,
      title: input.title,
      status: "active",
      properties: input.properties,
    },
  });

  await logActivity(userId, event.id, "created", { title: event.title });
  return event;
}

export async function getEventsByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: EVENT_TYPE, status: "active" },
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

export async function deleteEvent(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: EVENT_TYPE },
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
