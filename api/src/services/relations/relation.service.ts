import { prisma } from "../../db";
import type { CreateRelationBody } from "../../validation/relation.validation";

export type CreateRelationResult =
  | { ok: true; relation: Awaited<ReturnType<typeof prisma.relation.create>> }
  | { ok: false; reason: "SOURCE_NOT_FOUND" | "TARGET_NOT_FOUND" };

export async function createRelation(
  userId: string,
  input: CreateRelationBody
): Promise<CreateRelationResult> {
  const [source, target] = await Promise.all([
    prisma.object.findFirst({ where: { id: input.sourceId, userId } }),
    prisma.object.findFirst({ where: { id: input.targetId, userId } }),
  ]);

  if (!source) return { ok: false, reason: "SOURCE_NOT_FOUND" };
  if (!target) return { ok: false, reason: "TARGET_NOT_FOUND" };

  const relation = await prisma.relation.create({
    data: {
      userId,
      sourceId: input.sourceId,
      targetId: input.targetId,
      type: input.type,
    },
  });

  return { ok: true, relation };
}

export async function getRelationsForObject(objectId: string, userId: string) {
  const object = await prisma.object.findFirst({ where: { id: objectId, userId } });
  if (!object) return null;

  return prisma.relation.findMany({
    where: {
      userId,
      OR: [{ sourceId: objectId }, { targetId: objectId }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteRelation(id: string, userId: string) {
  const existing = await prisma.relation.findFirst({ where: { id, userId } });
  if (!existing) return null;

  await prisma.relation.delete({ where: { id } });
  return existing;
}
