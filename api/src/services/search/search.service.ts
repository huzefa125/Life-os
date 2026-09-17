import { prisma } from "../../db";

export async function searchObjects(userId: string, q: string, type?: string) {
  return prisma.object.findMany({
    where: {
      userId,
      status: "active",
      title: { contains: q, mode: "insensitive" },
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}
