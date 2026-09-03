import { prisma } from "../../db";
import type { ObjectResponse } from "../../types/objects/object.types";

export interface ObjectConnection {
  relation: {
    id: string;
    type: string;
    direction: "outgoing" | "incoming";
  };
  object: ObjectResponse;
}

export interface ObjectWithConnections {
  object: ObjectResponse;
  connections: ObjectConnection[];
}

export async function getObjectWithConnections(
  id: string,
  userId: string
): Promise<ObjectWithConnections | null> {
  const object = await prisma.object.findFirst({ where: { id, userId } });
  if (!object) return null;

  const relations = await prisma.relation.findMany({
    where: { userId, OR: [{ sourceId: id }, { targetId: id }] },
  });

  const connectedIds = relations.map((relation) =>
    relation.sourceId === id ? relation.targetId : relation.sourceId
  );

  const connectedObjects = await prisma.object.findMany({
    where: { userId, id: { in: connectedIds } },
  });
  const connectedObjectsById = new Map(connectedObjects.map((o) => [o.id, o]));

  const connections: ObjectConnection[] = relations.flatMap((relation) => {
    const otherId = relation.sourceId === id ? relation.targetId : relation.sourceId;
    const otherObject = connectedObjectsById.get(otherId);
    if (!otherObject) return [];

    return [
      {
        relation: {
          id: relation.id,
          type: relation.type,
          direction: relation.sourceId === id ? "outgoing" : "incoming",
        },
        object: otherObject,
      },
    ];
  });

  return { object, connections };
}
