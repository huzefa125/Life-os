import { prisma } from "../../db";
import { logActivity } from "../activity/activity.service";

export async function addFavorite(userId: string, objectId: string) {
  const object = await prisma.object.findFirst({
    where: { id: objectId, userId },
  });
  if (!object) return null;

  const favorite = await prisma.favorite.upsert({
    where: {
      userId_objectId: { userId, objectId },
    },
    update: {},
    create: {
      userId,
      objectId,
    },
    include: {
      object: true,
    },
  });

  await logActivity(userId, objectId, "favorited");
  return favorite;
}

export async function removeFavorite(userId: string, idOrObjectId: string) {
  const existing = await prisma.favorite.findFirst({
    where: {
      userId,
      OR: [{ id: idOrObjectId }, { objectId: idOrObjectId }],
    },
  });
  if (!existing) return null;

  await prisma.favorite.delete({
    where: { id: existing.id },
  });

  await logActivity(userId, existing.objectId, "unfavorited");
  return existing;
}

export async function getFavorites(userId: string) {
  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
      object: {
        status: { not: "trash" },
      },
    },
    include: {
      object: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return favorites.map((f) => ({
    favoriteId: f.id,
    favoritedAt: f.createdAt,
    ...f.object,
    isFavorite: true,
  }));
}
