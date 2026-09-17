import { prisma } from "../../db";

type ObjectRecord = NonNullable<Awaited<ReturnType<typeof prisma.object.findFirst>>>;

export interface ObjectConnection {
  relation: {
    id: string;
    type: string;
    direction: "outgoing" | "incoming";
  };
  object: ObjectRecord;
}

export interface ObjectWithConnections {
  object: ObjectRecord;
  connections: ObjectConnection[];
}

export interface DetailedObject {
  object: ObjectRecord & { isFavorite: boolean };
  relations: Array<{
    id: string;
    type: string;
    direction: "outgoing" | "incoming";
    otherObject: {
      id: string;
      title: string;
      type: string;
      status: string;
      properties: unknown;
    };
  }>;
  files: Array<{
    id: string;
    title: string;
    properties: unknown;
    relationId?: string;
  }>;
  activities: Array<{
    id: string;
    action: string;
    details: unknown;
    createdAt: Date;
  }>;
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

export async function getObjectDetail(
  id: string,
  userId: string
): Promise<DetailedObject | null> {
  const object = await prisma.object.findFirst({
    where: { id, userId },
    include: {
      favorites: { where: { userId } },
    },
  });
  if (!object) return null;

  // Fetch all relations
  const relations = await prisma.relation.findMany({
    where: { userId, OR: [{ sourceId: id }, { targetId: id }] },
  });

  const otherIds = relations.map((r) => (r.sourceId === id ? r.targetId : r.sourceId));
  const otherObjects = await prisma.object.findMany({
    where: { userId, id: { in: otherIds } },
  });
  const otherObjectsMap = new Map(otherObjects.map((o) => [o.id, o]));

  const formattedRelations: DetailedObject["relations"] = [];
  const linkedFiles: DetailedObject["files"] = [];

  for (const rel of relations) {
    const otherId = rel.sourceId === id ? rel.targetId : rel.sourceId;
    const other = otherObjectsMap.get(otherId);
    if (!other) continue;

    formattedRelations.push({
      id: rel.id,
      type: rel.type,
      direction: rel.sourceId === id ? "outgoing" : "incoming",
      otherObject: {
        id: other.id,
        title: other.title,
        type: other.type,
        status: other.status,
        properties: other.properties,
      },
    });

    if (other.type === "file" || rel.type === "has_file") {
      linkedFiles.push({
        id: other.id,
        title: other.title,
        properties: other.properties,
        relationId: rel.id,
      });
    }
  }

  // Fetch activities
  let activities = await prisma.activity.findMany({
    where: { userId, objectId: id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  if (activities.length === 0) {
    // If no activity entries yet, synthesize initial creation & update
    activities = [
      {
        id: `synth-update-${object.id}`,
        userId,
        objectId: id,
        action: "updated",
        details: null,
        createdAt: object.updatedAt,
      },
      {
        id: `synth-create-${object.id}`,
        userId,
        objectId: id,
        action: "created",
        details: null,
        createdAt: object.createdAt,
      },
    ];
  }

  return {
    object: {
      ...object,
      isFavorite: object.favorites.length > 0,
    },
    relations: formattedRelations,
    files: linkedFiles,
    activities: activities.map((a) => ({
      id: a.id,
      action: a.action,
      details: a.details,
      createdAt: a.createdAt,
    })),
  };
}
