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
  userId: string;
  type: "person";
  title: string;
  properties: Record<string, JsonValue> | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskProperties {
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface Task {
  id: string;
  userId: string;
  type: "task";
  title: string;
  properties: TaskProperties | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectProperties {
  status?: string;
  description?: string;
  deadline?: string;
}

export interface Project {
  id: string;
  userId: string;
  type: "project";
  title: string;
  properties: ProjectProperties | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteProperties {
  content: string;
}

export interface Note {
  id: string;
  userId: string;
  type: "note";
  title: string;
  properties: NoteProperties | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventProperties {
  description?: string;
  startAt: string;
  endAt: string;
  location?: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  type: "event";
  title: string;
  properties: EventProperties | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileProperties {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface StoredFile {
  id: string;
  userId: string;
  type: "file";
  title: string;
  properties: FileProperties | null;
  createdAt: string;
  updatedAt: string;
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
  userId: string;
  type: "expense";
  title: string;
  properties: ExpenseProperties | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenericObject {
  id: string;
  userId: string;
  type: string;
  title: string;
  properties: Record<string, JsonValue> | null;
  createdAt: string;
  updatedAt: string;
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
  userId: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  createdAt: string;
}

export interface ObjectConnection {
  relation: { id: string; type: RelationType; direction: "outgoing" | "incoming" };
  object: GenericObject;
}

export interface ObjectWithConnections {
  object: GenericObject;
  connections: ObjectConnection[];
}
