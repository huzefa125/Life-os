import { prisma } from "../../db";
import type { Prisma } from "../../generated/prisma/client";

export async function logActivity(
  userId: string,
  objectId: string,
  action: string,
  details?: Record<string, unknown> | null
) {
  try {
    return await prisma.activity.create({
      data: {
        userId,
        objectId,
        action,
        ...(details ? { details: details as Prisma.InputJsonValue } : {}),
      },
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
    return null;
  }
}

export async function getActivityForObject(userId: string, objectId: string) {
  return prisma.activity.findMany({
    where: { userId, objectId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
