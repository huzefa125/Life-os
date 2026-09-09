import type { GenericObject, ObjectConnection } from "@/lib/types";

export interface Assignee {
  person: GenericObject;
  relationId: string;
}

export function findAssignee(connections: ObjectConnection[]): Assignee | null {
  const match = connections.find(
    (c) => c.relation.type === "assigned_to" && c.relation.direction === "outgoing"
  );
  return match ? { person: match.object, relationId: match.relation.id } : null;
}
