import { prisma } from "../../db";
import type { CreatePersonBody, UpdatePersonBody } from "../../validation/person.validation";
import { logActivity } from "../activity/activity.service";

const PERSON_TYPE = "person";

export async function createPerson(userId: string, input: CreatePersonBody) {
  const person = await prisma.object.create({
    data: {
      userId,
      type: PERSON_TYPE,
      title: input.name,
      status: "active",
      properties: input.properties ?? {},
    },
  });

  await logActivity(userId, person.id, "created", { title: person.title });
  return person;
}

export async function getPeopleByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: PERSON_TYPE, status: "active" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPersonById(id: string, userId: string) {
  return prisma.object.findFirst({
    where: { id, userId, type: PERSON_TYPE },
  });
}

export async function updatePerson(id: string, userId: string, input: UpdatePersonBody) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: PERSON_TYPE },
  });
  if (!existing) return null;

  // properties, when provided, replaces the JSON blob wholesale (no deep merge)
  const updated = await prisma.object.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { title: input.name } : {}),
      ...(input.properties !== undefined ? { properties: input.properties } : {}),
    },
  });

  await logActivity(userId, id, "updated");
  return updated;
}

export async function deletePerson(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: PERSON_TYPE },
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
