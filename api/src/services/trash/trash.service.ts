import { prisma } from "../../db";
import { logActivity } from "../activity/activity.service";

export async function moveToTrash(userId: string, objectId: string) {
  const existing = await prisma.object.findFirst({
    where: { id: objectId, userId },
  });
  if (!existing) return null;

  const updated = await prisma.object.update({
    where: { id: objectId },
    data: {
      status: "trash",
      deletedAt: new Date(),
    },
  });

  await logActivity(userId, objectId, "trashed");
  return updated;
}

export async function restoreFromTrash(userId: string, objectId: string) {
  const existing = await prisma.object.findFirst({
    where: { id: objectId, userId },
  });
  if (!existing) return null;

  const updated = await prisma.object.update({
    where: { id: objectId },
    data: {
      status: "active",
      deletedAt: null,
    },
  });

  await logActivity(userId, objectId, "restored");
  return updated;
}

export async function getTrashObjects(userId: string) {
  return prisma.object.findMany({
    where: { userId, status: "trash" },
    orderBy: { deletedAt: "desc" },
  });
}

export async function permanentDelete(userId: string, objectId: string) {
  const existing = await prisma.object.findFirst({
    where: { id: objectId, userId },
  });
  if (!existing) return null;

  await prisma.object.delete({
    where: { id: objectId },
  });

  return existing;
}

export async function emptyTrash(userId: string) {
  const result = await prisma.object.deleteMany({
    where: { userId, status: "trash" },
  });
  return result;
}
