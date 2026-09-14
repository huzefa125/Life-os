import { prisma } from "../../db";
import { logActivity } from "../activity/activity.service";

export async function getAllTags(userId: string) {
  const objects = await prisma.object.findMany({
    where: { userId, status: { not: "trash" } },
    select: { tags: true },
  });

  const tagCounts: Record<string, number> = {};
  for (const obj of objects) {
    for (const tag of obj.tags) {
      const cleanTag = tag.startsWith("#") ? tag.slice(1).trim() : tag.trim();
      if (cleanTag) {
        tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
      }
    }
  }

  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function updateObjectTags(userId: string, objectId: string, rawTags: string[]) {
  const existing = await prisma.object.findFirst({
    where: { id: objectId, userId },
  });
  if (!existing) return null;

  const cleanTags = Array.from(
    new Set(
      rawTags
        .map((t) => (t.startsWith("#") ? t.slice(1).trim() : t.trim()))
        .filter((t) => t.length > 0)
    )
  );

  const updated = await prisma.object.update({
    where: { id: objectId },
    data: { tags: cleanTags },
  });

  await logActivity(userId, objectId, "tagged", { tags: cleanTags });
  return updated;
}

export async function getObjectsByTag(userId: string, tag: string) {
  const cleanTag = tag.startsWith("#") ? tag.slice(1).trim() : tag.trim();
  return prisma.object.findMany({
    where: {
      userId,
      status: "active",
      tags: { has: cleanTag },
    },
    orderBy: { updatedAt: "desc" },
  });
}
