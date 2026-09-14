import { prisma } from "../../db";
import { logActivity } from "../activity/activity.service";

export async function archiveObject(userId: string, objectId: string) {
  const existing = await prisma.object.findFirst({
    where: { id: objectId, userId },
  });
  if (!existing) return null;

  const updated = await prisma.object.update({
    where: { id: objectId },
    data: {
      status: "archived",
      archivedAt: new Date(),
    },
  });

  await logActivity(userId, objectId, "archived");
  return updated;
}

export async function unarchiveObject(userId: string, objectId: string) {
  const existing = await prisma.object.findFirst({
    where: { id: objectId, userId },
  });
  if (!existing) return null;

  const updated = await prisma.object.update({
    where: { id: objectId },
    data: {
      status: "active",
      archivedAt: null,
    },
  });

  await logActivity(userId, objectId, "unarchived");
  return updated;
}

export async function getArchivedObjects(userId: string) {
  return prisma.object.findMany({
    where: { userId, status: "archived" },
    orderBy: { archivedAt: "desc" },
  });
}
