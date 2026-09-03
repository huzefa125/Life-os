import { prisma } from "../../db";

const DEFAULT_LIMIT = 50;

export async function getTimeline(userId: string) {
  return prisma.object.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: DEFAULT_LIMIT,
  });
}
