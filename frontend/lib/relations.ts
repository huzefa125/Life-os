import type { GenericObject, ObjectConnection, RelationType } from "@/lib/types";

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

export interface ParentProject {
  project: GenericObject;
  relationId: string;
}

/**
 * Finds the project a task/note belongs to. The project is the relation's
 * source (e.g. Project --has_task--> Task), so from the item's own
 * connections this always shows up as "incoming".
 */
export function findParentProject(
  connections: ObjectConnection[],
  relationType: RelationType
): ParentProject | null {
  const match = connections.find(
    (c) => c.relation.type === relationType && c.relation.direction === "incoming"
  );
  return match ? { project: match.object, relationId: match.relation.id } : null;
}
