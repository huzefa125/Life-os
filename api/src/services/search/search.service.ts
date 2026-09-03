import { prisma } from "../../db";

export async function searchObjects(userId: string, q: string, type?: string) {
  return prisma.object.findMany({
    where: {
      userId,
      title: { contains: q, mode: "insensitive" },
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}
