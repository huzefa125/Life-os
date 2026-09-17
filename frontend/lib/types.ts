export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ApiUser {
  id: string;
  name: string;
  email: string;
}

export interface Person {
  id: string;
  type: "person";
  title: string;
  properties: Record<string, JsonValue> | null;
}

export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskProperties {
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  notes?: string;
}

export interface Task {
  id: string;
  type: "task";
  title: string;
  properties: TaskProperties | null;
}

export interface ProjectProperties {
  status?: string;
  description?: string;
  deadline?: string;
}

export interface Project {
  id: string;
  type: "project";
  title: string;
  properties: ProjectProperties | null;
}

export interface NoteProperties {
  content: string;
}

export interface Note {
  id: string;
  type: "note";
  title: string;
  properties: NoteProperties | null;
}

export type EventMode = "online" | "in_person";

export interface EventProperties {
  description?: string;
  startAt: string;
  endAt: string;
  mode?: EventMode;
  location?: string;
  link?: string;
}

export interface Event {
  id: string;
  type: "event";
  title: string;
  properties: EventProperties | null;
}

export interface FileProperties {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

// Named FileRecord, not File, to avoid shadowing the browser's built-in File type.
export interface FileRecord {
  id: string;
  type: "file";
  title: string;
  properties: FileProperties | null;
}

export interface ExpenseProperties {
  amount: number;
  currency: string;
  category: string;
  date: string;
  description?: string;
}

export interface Expense {
  id: string;
  type: "expense";
  title: string;
  properties: ExpenseProperties | null;
}

export interface GenericObject {
  id: string;
  type: string;
  title: string;
  properties: Record<string, JsonValue> | null;
}

export type RelationType =
  | "works_on"
  | "has_task"
  | "has_file"
  | "has_note"
  | "has_event"
  | "knows"
  | "related_to"
  | "assigned_to";

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
}

export interface ObjectConnection {
  relation: { id: string; type: RelationType; direction: "outgoing" | "incoming" };
  object: GenericObject;
}

export interface ObjectWithConnections {
  object: GenericObject;
  connections: ObjectConnection[];
}
