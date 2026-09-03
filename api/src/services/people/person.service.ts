import { prisma } from "../../db";
import type { CreatePersonBody, UpdatePersonBody } from "../../validation/person.validation";

const PERSON_TYPE = "person";

export async function createPerson(userId: string, input: CreatePersonBody) {
  return prisma.object.create({
    data: {
      userId,
      type: PERSON_TYPE,
      title: input.name,
      properties: input.properties ?? {},
    },
  });
}

export async function getPeopleByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: PERSON_TYPE },
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
  return prisma.object.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { title: input.name } : {}),
      ...(input.properties !== undefined ? { properties: input.properties } : {}),
    },
  });
}

export async function deletePerson(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: PERSON_TYPE },
  });
  if (!existing) return null;

  await prisma.object.delete({ where: { id } });
  return existing;
}
